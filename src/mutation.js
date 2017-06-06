/* @flow */

import invariant from 'invariant'

import {
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLID,
  isLeafType
} from 'graphql'

import type { GraphQLResolveInfo, FieldNode } from 'graphql'
import { mutationWithClientMutationId } from 'graphql-relay'

import { getSelections } from './request'
import { processSelections } from './response'
import { unwrap, unwrapNonNull, lowerCamelCase, getFields } from './utils'

import type { Client } from './client'
import type { Context } from './schema'

const inputTypes = new Map()
function getInputType (
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

function getInputFields (
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

export function getDeleteMutation (client: Client, type: GraphQLObjectType) {
  return mutationWithClientMutationId({
    name: `Delete${type.name}Mutation`,
    inputFields: {
      id: { type: new GraphQLNonNull(GraphQLID) }
    },
    outputFields: {
      [lowerCamelCase(type.name)]: {
        type: type
      }
    },
    mutateAndGetPayload: (input, context, info) => {
      return deleteAndGetPayload(client, info, context, type, input.id)
    }
  })
}

async function deleteAndGetPayload (
  client: Client,
  info: GraphQLResolveInfo,
  context: Context,
  type: GraphQLObjectType,
  id: string
) {
  // first we need to find all the incoming edges to the node
  let edgeQuery = `query { node(id: ${id}) {\n`
  getFields(type).forEach(field => {
    const fieldType = unwrap(field.type)
    if (
      fieldType instanceof GraphQLObjectType ||
      fieldType instanceof GraphQLList
    ) {
      edgeQuery += '  ' + field.name + ' { _uid_ }\n'
    }
  })
  edgeQuery += '}}'

  const edges = await client.fetchQuery(edgeQuery)
  const subject = edges.node[0]
  let query = 'mutation { delete {\n'
  query += `  <${id}> * * .\n`
  Object.keys(subject).forEach(key => {
    const results = subject[key]
    const reverse = client.getReversePredicate(key)
    if (reverse) {
      results.forEach(node => {
        query += `  <${node._uid_}> <${reverse}> <${id}> .\n`
      })
    }
  })
  query += '}}'
  await client.fetchQuery(query)
  return {
    [lowerCamelCase(type.name)]: {
      id: id
    }
  }
}

export function getUpdateMutation (client: Client, type: GraphQLObjectType) {
  const name = type.name
  const fields = type.getFields()
  const inputFields = {}
  Object.keys(fields).forEach(fieldName => {
    const field = fields[fieldName]
    const fieldType = unwrap(field.type)
    if (isLeafType(fieldType)) {
      if (fieldName === 'id') {
        inputFields[fieldName] = { type: new GraphQLNonNull(GraphQLID) }
      } else {
        inputFields[fieldName] = { type: fieldType }
      }
    }
  })
  return mutationWithClientMutationId({
    name: `Update${name}Mutation`,
    inputFields,
    outputFields: {
      [lowerCamelCase(name)]: {
        type: type
      }
    },
    mutateAndGetPayload: (input, context, info) => {
      return createOrUpdate(client, info, context, type, input, input.id)
    }
  })
}

export function getCreateMutation (client: Client, type: GraphQLObjectType) {
  const name = type.name
  const inputFields = getInputFields(client, type, true)
  return mutationWithClientMutationId({
    name: `Create${name}Mutation`,
    inputFields,
    outputFields: {
      [lowerCamelCase(name)]: {
        type: type
      }
    },
    mutateAndGetPayload: (input, context, info) => {
      return createOrUpdate(client, info, context, type, input)
    }
  })
}

function getMutationFields (
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

async function createOrUpdate (
  client: Client,
  info: GraphQLResolveInfo,
  context: Context,
  type: GraphQLObjectType,
  input: {},
  id?: string
) {
  let subject = id ? '<' + String(id) + '>' : '_:node'
  let query = 'mutation { set {\n'
  query += getMutationFields(client, info, context, type, input, subject, 0)
  query += '}}'
  const res = await client.fetchQuery(query)

  const uid = id || res.uids.node
  const mutation = info.operation.selectionSet.selections[0]
  invariant(
    !!mutation && mutation.kind === 'Field' && mutation.selectionSet,
    'Selection not found'
  )
  const payload = mutation.selectionSet.selections[0]
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
        value: { kind: 'StringValue', value: uid }
      }
    ]
  }
  const queryType = info.schema.getQueryType()
  query = 'query {\n'
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
