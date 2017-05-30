/* @flow */

import invariant from 'invariant'

import { GraphQLList, GraphQLObjectType, GraphQLInterfaceType } from 'graphql'

import type {
  GraphQLNamedType,
  GraphQLResolveInfo,
  SelectionNode,
  FragmentSpreadNode,
  InlineFragmentNode,
  FieldNode
} from 'graphql'

import {
  unwrap,
  unwrapNonNull,
  isConnection,
  findSelections,
  getConnectionType,
  flattenSelections,
  getValue
} from './utils'

import type { DgraphQLOptions } from './schema'

function processConnection (
  options: DgraphQLOptions,
  info: GraphQLResolveInfo,
  selections: Array<SelectionNode>,
  type: GraphQLObjectType,
  nodes: Array<any>,
  args: { first?: number, after?: string },
  count: number
) {
  let first = args.first || 0
  let hasPreviousPage = !!args.after
  let hasNextPage = false
  if (first && nodes.length > first) {
    nodes = nodes.slice(0, nodes.length - 1)
    hasNextPage = true
  }
  const edges = nodes.map(node => {
    processSelections(options, info, selections, type, node)
    return {
      node,
      cursor: node.id
    }
  })
  const firstEdge = edges[0]
  const lastEdge = edges[edges.length - 1]
  return {
    edges,
    count: count,
    pageInfo: {
      startCursor: firstEdge ? firstEdge.cursor : null,
      endCursor: lastEdge ? lastEdge.cursor : null,
      hasPreviousPage,
      hasNextPage
    }
  }
}

function processList (
  options: DgraphQLOptions,
  info: GraphQLResolveInfo,
  selections: Array<SelectionNode>,
  type: GraphQLObjectType,
  nodes: Array<any>,
  args: any
) {
  nodes.forEach(node =>
    processSelections(options, info, selections, type, node)
  )
  return nodes
}

function assertObjectType (type: ?GraphQLNamedType): GraphQLObjectType {
  invariant(
    type instanceof GraphQLObjectType || type instanceof GraphQLInterfaceType,
    `Expected ${String(type)} to be instance of GraphQLObjectType or GraphQLInterfaceType.`
  )
  return (type: any)
}

function processSelection (
  options: DgraphQLOptions,
  info: GraphQLResolveInfo,
  selection: SelectionNode,
  type: GraphQLObjectType,
  value: any
) {
  switch (selection.kind) {
    case 'FragmentSpread':
      processFragmentSpread(options, info, selection, value)
      break
    case 'InlineFragment':
      processInlineFragment(options, info, selection, value)
      break
    case 'Field':
      processField(options, info, selection, type, value)
      break
  }
}

function processFragmentSpread (
  options: DgraphQLOptions,
  info: GraphQLResolveInfo,
  selection: FragmentSpreadNode,
  value: any
) {
  const fragment = info.fragments[selection.name.value]
  const type = assertObjectType(
    info.schema.getType(fragment.typeCondition.name.value)
  )
  processSelections(
    options,
    info,
    fragment.selectionSet.selections,
    type,
    value
  )
}

function processInlineFragment (
  options: DgraphQLOptions,
  info: GraphQLResolveInfo,
  selection: InlineFragmentNode,
  value: any
) {
  if (selection.typeCondition) {
    const type = assertObjectType(
      info.schema.getType(selection.typeCondition.name.value)
    )
    processSelections(
      options,
      info,
      selection.selectionSet.selections,
      type,
      value
    )
  }
}

function processField (
  options: DgraphQLOptions,
  info: GraphQLResolveInfo,
  selection: FieldNode,
  type: GraphQLObjectType,
  value: any
) {
  const name = selection.name.value
  if (name.indexOf('__') === 0) {
    return
  }
  let alias = selection.alias ? selection.alias.value : name
  const fields = type.getFields()
  const field = fields[name]
  let fieldType = unwrapNonNull(field.type)
  let selections = selection.selectionSet
    ? selection.selectionSet.selections
    : []
  if (isConnection(fieldType)) {
    selections = flattenSelections(selections, info)
    selections = findSelections(selections, 'edges')
    selections = findSelections(selections, 'node')
    let count = 0
    let countKey = `_count_${alias}_`
    if (value[countKey]) {
      count = value[countKey][0].count
    }
    countKey = `count(${alias})`
    if (value[countKey]) {
      count = value[countKey]
    }
    value[alias] = processConnection(
      options,
      info,
      selections,
      assertObjectType(getConnectionType(fieldType)),
      value[alias] || [],
      getArguments(info, selection),
      count
    )
  } else if (fieldType instanceof GraphQLList) {
    value[alias] = processList(
      options,
      info,
      selections,
      unwrap(fieldType),
      value[alias] || [],
      getArguments(info, selection)
    )
  } else if (value[alias] && selection.selectionSet) {
    value[alias] = value[alias][0]
    processSelections(
      options,
      info,
      selections,
      assertObjectType(fieldType),
      value[alias]
    )
  }
}

function getArguments (info: GraphQLResolveInfo, selection: FieldNode): {} {
  const args = {}
  if (selection.arguments) {
    selection.arguments.forEach(arg => {
      args[arg.name.value] = getValue(info, arg.value)
    })
  }
  return args
}

export function processSelections (
  options: DgraphQLOptions,
  info: GraphQLResolveInfo,
  selections: Array<SelectionNode>,
  type: GraphQLObjectType,
  value: any
) {
  if (!value) {
    return
  }
  if (value._uid_) {
    value.id = value._uid_
    delete value._uid_
  }
  selections.forEach(selection => {
    processSelection(options, info, selection, type, value)
  })
}

export function processResponse (
  options: DgraphQLOptions,
  info: GraphQLResolveInfo,
  response: {}
): any {
  console.log('-- dgraph response')
  console.log(JSON.stringify(response, null, '  '))
  processSelections(
    options,
    info,
    info.operation.selectionSet.selections,
    info.schema.getQueryType(),
    response
  )
  console.log('-- processed response')
  console.log(JSON.stringify(response, null, '  '))
  return response
}
