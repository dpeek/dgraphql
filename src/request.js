/* @flow */

import invariant from 'invariant'

import { GraphQLObjectType, GraphQLInterfaceType } from 'graphql'

import type {
  GraphQLResolveInfo,
  ArgumentNode,
  FieldNode,
  SelectionNode,
  GraphQLField
} from 'graphql'

import {
  unwrap,
  isConnection,
  getConnectionType,
  flattenSelections,
  findSelections,
  getValue
} from './utils'

import { processResponse } from './response'
import { getFilterQuery } from './filter'
import { orders } from './order'

import type { Client } from './client'

function getArgument (
  client: Client,
  info: GraphQLResolveInfo,
  argument: ArgumentNode,
  type: GraphQLObjectType
) {
  let name = argument.name.value
  let value = getValue(info, argument.value)
  if (value === null) {
    return null
  }
  switch (name) {
    case 'order':
      let field = String(value)
      let order = orders.find(order => {
        return field.endsWith(order.name)
      })
      if (!order) return ''
      name = order.operation
      value = field.substr(0, field.length - order.name.length)
      break
    case 'first':
      value = parseInt(value, 10) + (client.relay ? 1 : 0)
      break
  }
  return name + ': ' + String(value)
}

function getArguments (
  client: Client,
  info: GraphQLResolveInfo,
  selection: FieldNode,
  type: GraphQLObjectType,
  isRoot: boolean,
  isCount: boolean
) {
  let args = selection.arguments || []
  const hasId = args.find(arg => arg.name.value === 'id')
  let query = ''
  if (isCount) {
    args = args.filter(argument => {
      const name = argument.name.value
      return name !== 'first' && name !== ' after'
    })
  }
  const queryArgs = args
    .filter(argument => {
      return argument.name.value !== 'filter'
    })
    .map(arg => {
      return getArgument(client, info, arg, type)
    })
    .filter(arg => arg !== null)
  if (isRoot && !hasId && type.name !== 'Node') {
    queryArgs.unshift(`func:eq(__typename, "${type.name}")`)
  }
  if (queryArgs.length) {
    query += `(${queryArgs.join(', ')})`
  }
  const filter = args.find(argument => {
    return argument.name.value === 'filter'
  })
  if (filter) {
    query += ' ' + getFilterQuery(client, info, filter, type)
  }
  return query
}

function getSelection (
  client: Client,
  info: GraphQLResolveInfo,
  selection: FieldNode,
  type: GraphQLObjectType,
  field: GraphQLField<*, *>,
  indent: string,
  isRoot: boolean,
  map: Set<string>
) {
  let query = ''
  const name = selection.name.value
  if (name.indexOf('__') === 0) {
    return ''
  }
  let fieldType = unwrap(field.type)
  let selections = selection.selectionSet
    ? selection.selectionSet.selections
    : null
  const fieldName = client.getPredicate(type.toString(), name)
  const connection = isConnection(fieldType)
  if (connection && selections) {
    selections = flattenSelections(selections, info)
    selections = findSelections(selections, 'edges')
    selections = findSelections(selections, 'node')
    invariant(
      fieldType instanceof GraphQLObjectType,
      'Field is not object type'
    )
    fieldType = getConnectionType(fieldType)
  }
  let alias = name === fieldName ? '' : name + ':'
  if (isRoot || !map.has(fieldName)) {
    map.add(fieldName)
    if (isRoot) {
      if (selection.alias) query += indent + selection.alias.value
      else query += indent + name
    } else {
      query += indent + alias + fieldName
    }
  }
  if (
    fieldType instanceof GraphQLObjectType ||
    fieldType instanceof GraphQLInterfaceType
  ) {
    let args = getArguments(client, info, selection, fieldType, isRoot, false)
    query += args
    if (selections) {
      query += ' {\n'
      query += `${indent}  _uid_\n`
      query += `${indent}  __typename\n`
      query += getSelections(
        client,
        info,
        selections,
        fieldType,
        indent + '  ',
        false,
        null
      )
      query += indent + '}'
    }
    if (!isRoot && connection) {
      query += `\n${indent}count(${fieldName}${args})`
    }
    if (isRoot && connection) {
      args = getArguments(client, info, selection, fieldType, isRoot, true)
      query += `\n${indent}_count_${fieldName}_${args} { count() }`
    }
  }
  return query + '\n'
}

export function getSelections (
  client: Client,
  info: GraphQLResolveInfo,
  selections: Array<SelectionNode>,
  type: GraphQLObjectType,
  indent: string,
  isRoot: boolean,
  map: ?Set<string>
) {
  let nextMap = map || new Set()
  let query = ''
  const fields = type.getFields()
  selections.forEach(selection => {
    if (selection.kind === 'Field') {
      const fieldName = selection.name.value
      if (fieldName === 'id') {
        return
      }
      query += getSelection(
        client,
        info,
        selection,
        type,
        fields[fieldName],
        indent,
        isRoot,
        nextMap
      )
    } else {
      let fragment = null
      if (selection.kind === 'InlineFragment') {
        fragment = selection
      } else {
        fragment = info.fragments[selection.name.value]
      }
      invariant(fragment.typeCondition, 'No type condition found on fragment')
      const fragmentType = info.schema.getType(
        fragment.typeCondition.name.value
      )
      invariant(fragmentType, 'Fragment type not found')
      invariant(
        fragmentType instanceof GraphQLObjectType,
        'Fragment must be instance of GraphQLObjectType'
      )
      query += getSelections(
        client,
        info,
        fragment.selectionSet.selections,
        fragmentType,
        indent,
        false,
        nextMap
      )
    }
  })
  return query
}

function getQuery (client: Client, info: GraphQLResolveInfo) {
  let query = 'query {\n'
  query += getSelections(
    client,
    info,
    info.operation.selectionSet.selections,
    info.schema.getQueryType(),
    '  ',
    true
  )
  return query + '}'
}

export function resolveQuery (client: Client, info: GraphQLResolveInfo): mixed {
  // $FlowFixMe
  let req = info.operation.req
  if (!req) {
    const query = getQuery(client, info)
    // $FlowFixMe
    req = info.operation.req = client.fetchQuery(query).then(res => {
      return processResponse(client, info, res)
    })
  }
  return req.then(res => {
    invariant(!!info.path, 'No path defined')
    return res[info.path.key]
  })
}
