/* @flow */

import { GraphQLNonNull, GraphQLObjectType, GraphQLList } from 'graphql'

import type {
  GraphQLType,
  SelectionNode,
  GraphQLNullableType,
  GraphQLResolveInfo,
  ValueNode
} from 'graphql'

import invariant from 'invariant'

export function unwrap (type: GraphQLType): GraphQLType {
  if (type instanceof GraphQLNonNull) {
    return unwrap((type: GraphQLNonNull<GraphQLNullableType>).ofType)
  }
  if (type instanceof GraphQLList) {
    return unwrap((type: GraphQLList<GraphQLType>).ofType)
  }
  return type
}

export function unwrapNonNull (type: GraphQLType): GraphQLType {
  if (type instanceof GraphQLNonNull) {
    return (type: GraphQLNonNull<GraphQLNullableType>).ofType
  }
  return type
}

export function isConnection (type: GraphQLType): boolean {
  if (type instanceof GraphQLObjectType) {
    return type.name.endsWith('Connection')
  }
  return false
}

export function findSelections (
  selections: Array<SelectionNode>,
  name: string
): Array<SelectionNode> {
  const selection = selections.find(selection => {
    return selection.kind === 'Field' && selection.name.value === name
  })
  invariant(
    selection && selection.kind === 'Field' && selection.selectionSet,
    'Selection should be of kind Field with a selectionSet'
  )
  return selection.selectionSet.selections
}

export function findSelection (
  selections: Array<SelectionNode>,
  name: string
): ?SelectionNode {
  return selections.find(selection => {
    return selection.kind === 'Field' && selection.name.value === name
  })
}

export function getConnectionType (type: GraphQLObjectType): GraphQLObjectType {
  if (type instanceof GraphQLObjectType) {
    const edgeType = unwrap(type.getFields()['edges'].type)
    if (edgeType instanceof GraphQLObjectType) {
      const node = edgeType.getFields()['node'].type
      if (node instanceof GraphQLObjectType) return node
    }
  }
  throw new Error('Invalid connection!')
}

export function flattenSelections (
  selections: Array<SelectionNode>,
  info: GraphQLResolveInfo
): Array<SelectionNode> {
  let flattened = []
  selections.forEach(selection => {
    if (selection.kind === 'FragmentSpread') {
      const fragment = info.fragments[selection.name.value]
      flattened = flattened.concat(fragment.selectionSet.selections)
    } else {
      flattened.push(selection)
    }
  })
  return flattened
}

export function getFields (type: GraphQLObjectType) {
  const fields = type.getFields()
  return Object.keys(fields).map(key => fields[key])
}

export function getValue (info: GraphQLResolveInfo, node: ValueNode): mixed {
  switch (node.kind) {
    case 'StringValue':
      return node.value
    case 'IntValue':
      return parseInt(node.value, 10)
    case 'FloatValue':
      return parseFloat(node.value)
    case 'BooleanValue':
      return node.value
    case 'NullValue':
      return null
    case 'EnumValue':
      return node.value
    case 'Variable':
      return info.variableValues[node.name.value]
    case 'ListValue':
      return node.values.map(value => getValue(info, value))
    case 'ObjectValue':
      const object = {}
      node.fields.forEach(field => {
        object[field.name.value] = getValue(info, field.value)
      })
      return object
    default:
      return null
  }
}

export function lowerCamelCase (str: string): string {
  return str[0].toLowerCase() + str.substr(1)
}
