// @flow

import { GraphQLObjectType, GraphQLList, GraphQLError } from 'graphql'

import payloadQuery from '../query/payload'
import { getFields, unwrap } from '../utils'

import type { GraphQLResolveInfo } from 'graphql'
import type { Context } from '../client'

export default function resolve (
  type: GraphQLObjectType,
  source: void,
  args: { input: { id: string, clientMutationId?: string } },
  context: Context,
  info: GraphQLResolveInfo
) {
  const client = context.client
  const id = args.input.id
  // TODO: should merge payload and edge queries here
  return payloadQuery(
    info,
    context,
    id,
    args.input.clientMutationId
  ).then(res => {
    if (res === null) {
      throw new GraphQLError(`There is no '${type.name}' with id '${id}'`)
    }

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

    return client
      .fetchQuery(edgeQuery)
      .then(edges => {
        const subject = edges.node[0]
        let query = 'mutation { delete {\n'
        query += `  <${id}> * * .\n`
        Object.keys(subject).forEach(key => {
          const results = subject[key]
          const reverse = client.getReversePredicate(key)
          if (reverse && Array.isArray(results)) {
            results.forEach(node => {
              query += `  <${node._uid_}> <${reverse}> <${id}> .\n`
            })
          }
        })
        query += '}}'
        return client.fetchQuery(query)
      })
      .then(() => res)
  })
}
