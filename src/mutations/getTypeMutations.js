// @flow

import {
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLID,
  GraphQLList,
  isLeafType
} from 'graphql'

import { mutationWithClientMutationId } from 'graphql-relay'

import { getInputFields, getMutationFields, payloadQuery } from './common'
import { unwrap, lowerCamelCase, getFields } from '../utils'

import type { GraphQLResolveInfo } from 'graphql'
import type { Client } from '../client'
import type { Context } from '../context'

async function createOrUpdate (
  info: GraphQLResolveInfo,
  context: Context,
  type: GraphQLObjectType,
  input: {},
  id?: string
) {
  let subject = id ? '<' + String(id) + '>' : '_:node'
  let query = 'mutation { set {\n'
  query += getMutationFields(info, context, type, input, subject, 0)
  query += '}}'
  const res = await context.client.fetchQuery(query)

  const uid = id || res.uids.node
  return payloadQuery(info, context, uid)
}

function getCreateMutation (
  client: Client,
  type: GraphQLObjectType,
  typeName: string
) {
  const inputFields = getInputFields(type, true)
  return mutationWithClientMutationId({
    name: `Create${typeName}Mutation`,
    inputFields,
    outputFields: {
      [lowerCamelCase(typeName)]: {
        type: type,
        resolve: (source, args, context, info) => {
          return source[info.path.key][0]
        }
      }
    },
    mutateAndGetPayload: (input, context, info) => {
      return createOrUpdate(info, context, type, input)
    }
  })
}

function getUpdateMutation (
  client: Client,
  type: GraphQLObjectType,
  typeName: string
) {
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
    name: `Update${typeName}Mutation`,
    inputFields,
    outputFields: {
      [lowerCamelCase(typeName)]: {
        type: type,
        resolve: (source, args, context, info) => {
          return source[info.path.key][0]
        }
      }
    },
    mutateAndGetPayload: (input, context, info) => {
      return createOrUpdate(info, context, type, input, input.id)
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
  let edgeQuery = `query { node(id: ${id}) {\n  __typename\n`
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
  if (edges.node) {
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
  }
  return {
    [lowerCamelCase(type.name)]: {
      _uid_: id
    }
  }
}

function getDeleteMutation (
  client: Client,
  type: GraphQLObjectType,
  typeName: string
) {
  return mutationWithClientMutationId({
    name: `Delete${typeName}Mutation`,
    inputFields: {
      id: { type: new GraphQLNonNull(GraphQLID) }
    },
    outputFields: {
      [lowerCamelCase(typeName)]: {
        type: type
      }
    },
    mutateAndGetPayload: (input, context, info) => {
      return deleteAndGetPayload(client, info, context, type, input.id)
    }
  })
}

export default function getTypeMutations (
  client: Client,
  type: GraphQLObjectType
) {
  const typeName = type.name
  return {
    [`create${typeName}`]: getCreateMutation(client, type, typeName),
    [`update${typeName}`]: getUpdateMutation(client, type, typeName),
    [`delete${typeName}`]: getDeleteMutation(client, type, typeName)
  }
}
