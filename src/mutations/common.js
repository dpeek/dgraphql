// @flow

import invariant from 'invariant'

import {
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLList,
  isLeafType
} from 'graphql'

import { unwrapNonNull } from '../utils'
import getSelections from '../getSelections'

import type { GraphQLResolveInfo, FieldNode } from 'graphql'
import type { Context } from '../context'

export function payloadQuery (
  info: GraphQLResolveInfo,
  context: Context,
  id: string
) {
  const mutation = info.fieldNodes[0]
  invariant(
    !!mutation && mutation.kind === 'Field' && mutation.selectionSet,
    'Selection not found'
  )
  const payload = mutation.selectionSet.selections[0]
  console.log(payload)
  invariant(
    !!payload && payload.kind === 'Field' && payload.selectionSet,
    'Selection not found'
  )
  const payloadQuery: FieldNode = {
    ...payload,
    arguments: [
      {
        kind: 'Argument',
        name: { kind: 'Name', value: 'id' },
        value: { kind: 'StringValue', value: id }
      }
    ]
  }
  const queryType = info.schema.getQueryType()
  let query = 'query {\n'
  query += getSelections(info, context, [payloadQuery], queryType, '  ', true)
  query += '}'
  return context.client.fetchQuery(query)
}

const inputTypes = new Map()
export function getInputType (type: GraphQLObjectType): GraphQLInputObjectType {
  const name = type.name + 'Input'

  let inputType = inputTypes.get(name)
  if (inputType) return inputType

  inputType = new GraphQLInputObjectType({
    name: name,
    fields: () => getInputFields(type, false)
  })
  inputTypes.set(name, inputType)
  return inputType
}

export function getInputFields (type: GraphQLObjectType, excludeId: boolean) {
  const inputFields = {}
  const fields = type.getFields()
  Object.keys(fields).forEach(fieldName => {
    const field = fields[fieldName]
    const fieldType = unwrapNonNull(field.type)
    if (fieldType instanceof GraphQLList) {
      if (fieldType.ofType instanceof GraphQLObjectType) {
        inputFields[fieldName] = {
          type: new GraphQLList(getInputType(fieldType.ofType))
        }
      } else {
        inputFields[fieldName] = {
          type: new GraphQLList(fieldType.ofType)
        }
      }
    } else if (fieldType instanceof GraphQLObjectType) {
      inputFields[fieldName] = { type: getInputType(fieldType) }
    } else if (isLeafType(fieldType)) {
      if (excludeId && fieldName === 'id') return
      inputFields[fieldName] = { type: fieldType }
    }
  })
  return inputFields
}

export function getMutationFields (
  info: GraphQLResolveInfo,
  context: Context,
  type: GraphQLObjectType,
  input: {},
  subject: string,
  count: number
) {
  let query = ''
  if (subject.indexOf('node') !== -1) {
    query += `  ${subject} <__typename> "${type.name}" .\n`
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
          info,
          context,
          fieldType,
          node,
          nodeIdent,
          count
        )
        query = child + query
        query += `  ${subject} <${key}> ${nodeIdent} .\n`
        let reverse = context.client.getReversePredicate(key)
        if (reverse) {
          query += `  ${nodeIdent} <${reverse}> ${subject} .\n`
        }
      })
    } else {
      const value = context.client.localizeValue(
        input[key],
        key,
        context.language
      )
      query += `  ${subject} <${key}> ${value} .\n`
    }
  })
  return query
}
