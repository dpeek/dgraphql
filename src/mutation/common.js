/* @flow */

import invariant from 'invariant'

import {
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLList,
  isLeafType
} from 'graphql'

import { unwrapNonNull } from '../utils'
import { getSelections } from '../request'
import { processSelections } from '../response'

import type { GraphQLResolveInfo, FieldNode } from 'graphql'
import type { Client } from '../client'
import type { Context } from '../schema'

export function payloadQuery (
  client: Client,
  info: GraphQLResolveInfo,
  context: Context,
  id: string
) {
  const mutation = info.fieldNodes[0] // info.operation.selectionSet.selections[0]
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
  query += getSelections(
    client,
    info,
    context,
    [payloadQuery],
    queryType,
    '  ',
    true
  )
  query += '}'
  return client.fetchQuery(query).then(res => {
    processSelections(
      client,
      info,
      mutation.selectionSet.selections,
      queryType,
      res
    )
    return res
  })
}

const inputTypes = new Map()
export function getInputType (
  client: Client,
  type: GraphQLObjectType
): GraphQLInputObjectType {
  const name = type.name + 'Input'

  let inputType = inputTypes.get(name)
  if (inputType) return inputType

  inputType = new GraphQLInputObjectType({
    name: name,
    fields: () => getInputFields(client, type, false)
  })
  inputTypes.set(name, inputType)
  return inputType
}

export function getInputFields (
  client: Client,
  type: GraphQLObjectType,
  excludeId: boolean
) {
  const inputFields = {}
  const fields = type.getFields()
  Object.keys(fields).forEach(fieldName => {
    const field = fields[fieldName]
    const fieldType = unwrapNonNull(field.type)
    if (fieldType instanceof GraphQLList) {
      if (fieldType.ofType instanceof GraphQLObjectType) {
        inputFields[fieldName] = {
          type: new GraphQLList(getInputType(client, fieldType.ofType))
        }
      } else {
        inputFields[fieldName] = {
          type: new GraphQLList(fieldType.ofType)
        }
      }
    } else if (fieldType instanceof GraphQLObjectType) {
      inputFields[fieldName] = { type: getInputType(client, fieldType) }
    } else if (isLeafType(fieldType)) {
      if (excludeId && fieldName === 'id') return
      inputFields[fieldName] = { type: fieldType }
    }
  })
  return inputFields
}

export function getMutationFields (
  client: Client,
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
          client,
          info,
          context,
          fieldType,
          node,
          nodeIdent,
          count
        )
        query = child + query
        query += `  ${subject} <${key}> ${nodeIdent} .\n`
        let reverse = client.getReversePredicate(key)
        if (reverse) {
          query += `  ${nodeIdent} <${reverse}> ${subject} .\n`
        }
      })
    } else {
      const value = client.localizeValue(input[key], key, context.language)
      query += `  ${subject} <${key}> ${value} .\n`
    }
  })
  return query
}
