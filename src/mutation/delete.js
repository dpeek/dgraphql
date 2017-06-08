// @flow

import {
  GraphQLList,
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLID
} from 'graphql'

import { mutationWithClientMutationId } from 'graphql-relay'

import type { GraphQLResolveInfo } from 'graphql'

import { unwrap, lowerCamelCase, getFields } from '../utils'

import type { Client } from '../client'
import type { Context } from '../schema'

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

export default function getMutation (client: Client, type: GraphQLObjectType) {
  const name = type.name
  return mutationWithClientMutationId({
    name: `Delete${name}Mutation`,
    inputFields: {
      id: { type: new GraphQLNonNull(GraphQLID) }
    },
    outputFields: {
      [lowerCamelCase(name)]: {
        type: type
      }
    },
    mutateAndGetPayload: (input, context, info) => {
      return deleteAndGetPayload(client, info, context, type, input.id)
    }
  })
}
