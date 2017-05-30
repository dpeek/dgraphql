/* @flow */

import { GraphQLObjectType, GraphQLList } from 'graphql'

import type {
  GraphQLResolveInfo,
  ArgumentNode,
  FieldNode,
  SelectionNode
} from 'graphql'

import {
  unwrap,
  isConnection,
  getConnectionType,
  flattenSelections,
  findSelections,
  getValue,
  lowerCamelCase
} from './utils'

import invariant from 'invariant'
import { processResponse, processSelections } from './response'
import { getFilterQuery } from './filter'
import { orders } from './order'
import { connect } from './dgraph'

import type { DgraphQLOptions } from './schema'

const client = connect('http://localhost:8080')

function getArgument (
  options: DgraphQLOptions,
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
      value = parseInt(value, 10) + (options.relay ? 1 : 0)
      break
  }
  return name + ': ' + String(value)
}

function getArguments (
  options: DgraphQLOptions,
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
      return getArgument(options, info, arg, type)
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
    query += ' ' + getFilterQuery(info, filter, type)
  }
  return query
}

function isLocalised (field) {
  return field === 'name' || field === 'description'
}

function mapField (
  options: DgraphQLOptions,
  typeName: string,
  fieldName: string
): string {
  let key = typeName + '.' + fieldName
  if (options.predicateMap[key]) {
    return options.predicateMap[key]
  }
  if (isLocalised(fieldName)) {
    return fieldName + '@en'
  }
  return fieldName
}

function getSelection (
  options: DgraphQLOptions,
  info: GraphQLResolveInfo,
  selection: FieldNode,
  type: GraphQLObjectType,
  field,
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
  const fieldName = mapField(options, type.toString(), name)
  const connection = isConnection(fieldType)
  if (connection && selections) {
    selections = flattenSelections(selections, info)
    selections = findSelections(selections, 'edges')
    selections = findSelections(selections, 'node')
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
  let args = getArguments(options, info, selection, fieldType, isRoot, false)
  query += args
  if (selections) {
    query += ' {\n'
    query += `${indent}  _uid_\n`
    query += `${indent}  __typename\n`
    query += getSelections(
      options,
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
    args = getArguments(options, info, selection, fieldType, isRoot, true)
    query += `\n${indent}_count_${fieldName}_${args} { count() }`
  }
  return query + '\n'
}

function getSelections (
  options: DgraphQLOptions,
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
        options,
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
        options,
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

function getQuery (options: DgraphQLOptions, info: GraphQLResolveInfo) {
  let query = 'query {\n'
  query += getSelections(
    options,
    info,
    info.operation.selectionSet.selections,
    info.schema.getQueryType(),
    '  ',
    true
  )
  return query + '}'
}

function getMutation (options: DgraphQLOptions, info: GraphQLResolveInfo) {
  const mutationType = info.schema.getMutationType()
  invariant(mutationType, 'No mutation type defined in schema')
  const fields = mutationType.getFields()
  const selection = info.operation.selectionSet.selections[0]
  invariant(
    selection.kind === 'Field',
    'Mutation selection must be of kind field'
  )
  const type = fields[selection.name.value].type
  invariant(
    type instanceof GraphQLObjectType,
    'Mutation field type must be GraphQLObjectType'
  )
  invariant(
    selection.selectionSet,
    'Mutation field type must have selectionSet'
  )
  let query = 'query {\n'
  query += getSelections(
    options,
    info,
    selection.selectionSet.selections,
    type,
    '  ',
    true
  )
  return query + '}'
}

export function resolveQuery (
  options: DgraphQLOptions,
  info: GraphQLResolveInfo
): mixed {
  let req = info.operation.req
  if (!req) {
    const query = getQuery(options, info)
    req = info.operation.req = client.query(query).then(res => {
      return processResponse(options, info, res)
    })
  }
  return req.then(res => {
    return res[info.path.key]
  })
}

export async function deleteAndGetPayload (
  options: DgraphQLOptions,
  info: GraphQLResolveInfo,
  type: GraphQLObjectType,
  input: { id: string }
) {
  const typeName = type.name
  const typeField = lowerCamelCase(typeName)
  let query = 'mutation { delete {'
  query += `  <${input.id}> * * .`
  query += '}}'
  await client.query(query)
  return {
    [typeField]: {
      id: input.id
    }
  }
}

export async function updateAndGetPayload (
  options: DgraphQLOptions,
  info: GraphQLResolveInfo,
  type: GraphQLObjectType,
  input: { id: string }
) {
  return createOrUpdate(options, info, type, input, input.id)
}

export async function createAndGetPayload (
  options: DgraphQLOptions,
  info: GraphQLResolveInfo,
  type: GraphQLObjectType,
  input: {}
) {
  return createOrUpdate(options, info, type, input)
}

function getMutationFields (
  options: DgraphQLOptions,
  info: GraphQLResolveInfo,
  type: GraphQLObjectType,
  input: {},
  ident: string,
  count: number
) {
  let query = ''
  if (ident.indexOf('node') !== -1) {
    query += `  ${ident} <__typename> "${type.name}" .\n`
  }
  const fields = type.getFields()
  Object.keys(input).forEach(key => {
    if (key === 'id') return
    let fieldType = fields[key].type
    if (
      fieldType instanceof GraphQLObjectType ||
      fieldType instanceof GraphQLList
    ) {
      let nodes = []
      if (fieldType instanceof GraphQLList) {
        nodes = input[key]
        fieldType = fieldType.ofType
      } else {
        nodes = [input[key]]
      }
      nodes.forEach(node => {
        count++
        let nodeIdent = node.id ? `<${node.id}>` : `_:node${count}`
        let child = getMutationFields(
          options,
          info,
          fieldType,
          node,
          nodeIdent,
          count
        )
        query = child + query
        let predicate = mapField(options, type.name, key)
        if (predicate.indexOf('~') === 0) {
          predicate = predicate.substr(1)
          query += `  ${nodeIdent} <${predicate}> ${ident} .\n`
        } else {
          query += `  ${ident} <${predicate}> ${nodeIdent} .\n`
        }
      })
    } else {
      const locale = isLocalised(key) ? '@en' : ''
      query += `  ${ident} <${key}> "${input[key]}"${locale} .\n`
    }
  })
  return query
}

async function createOrUpdate (
  options: DgraphQLOptions,
  info: GraphQLResolveInfo,
  type: GraphQLObjectType,
  input: {},
  id?: string
) {
  const isCreate = typeof id === 'undefined'
  let ident = isCreate ? '_:node' : '<' + String(id) + '>'
  let query = 'mutation { set {\n'
  query += getMutationFields(options, info, type, input, ident, 0)
  query += '}}'
  const res = await client.query(query)
  query = getMutation(options, info)
  // TODO: good god lemmon
  query = query.replace(
    /func:eq\(__typename,[^)]+\)/m,
    'id:' + (id || res.uids.node)
  )
  return client.query(query).then(res => {
    const selections =
      info.operation.selectionSet.selections[0].selectionSet.selections
    processSelections(
      options,
      info,
      selections,
      info.schema.getQueryType(),
      res
    )
    return res
  })
}
