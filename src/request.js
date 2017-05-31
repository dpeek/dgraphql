/* @flow */

import invariant from 'invariant'

import { GraphQLObjectType, GraphQLInterfaceType } from 'graphql'

import type {
  GraphQLResolveInfo,
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
  getArguments,
  quoteValue
} from './utils'

import { processResponse } from './response'
import type { Client } from './client'

function getParams (
  client: Client,
  info: GraphQLResolveInfo,
  selection: FieldNode,
  type: GraphQLObjectType,
  isRoot: boolean,
  isCount: boolean
) {
  const args = getArguments(info, selection)
  if (args.id) {
    // if we have an id we can bail early
    return `(id: ${args.id})`
  }
  let query = ''
  let params = []
  if (isRoot) {
    // root queries in dgraph query everything, so specify __typename
    params.push(`func:eq(__typename, "${type.name}")`)
  }
  if (!isCount) {
    if (args.first) {
      // overfetch by one in relay so that we can determine hasNextPage
      params.push(`first: ${args.first + (client.relay ? 1 : 0)}`)
    }
    if (args.after) {
      params.push(`after: "${args.after}"`)
    }
  }
  if (args.order) {
    const order = args.order
    const index = order.indexOf('_')
    params.push(`order${order.substr(index + 1)}: ${order.substr(0, index)}`)
  }
  query += params.length ? `(${params.join(', ')})` : ''
  const filter = args.filter
  if (filter) {
    // filters are specified as a directive, so process those last
    const params = Object.keys(filter).reduce((filters, key) => {
      const i = key.indexOf('_')
      const value = quoteValue(filter[key])
      filters.push(`${key.substr(i + 1)}(${key.substr(0, i)}, ${value})`)
      return filters
    }, [])
    query += ` @filter(${params.join(' AND ')})`
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
    let args = getParams(client, info, selection, fieldType, isRoot, false)
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
      args = getParams(client, info, selection, fieldType, isRoot, true)
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
