// @flow

const dgraph = require('dgraph-js')
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
  return payloadQuery(info, context, id, args.input.clientMutationId).then(
    payload => {
      if (payload === null) {
        throw new GraphQLError(`There is no '${type.name}' with id '${id}'`)
      }

      let edgeQuery = `{ node(func:uid(${id})) {\n  __typename\n`
      getFields(type).forEach(field => {
        const fieldType = unwrap(field.type)
        if (
          fieldType instanceof GraphQLObjectType ||
          fieldType instanceof GraphQLList
        ) {
          edgeQuery += '  ' + field.name + ' { uid }\n'
        }
      })
      edgeQuery += '}}'

      return client
        .query(edgeQuery)
        .then(edges => {
          const subject = edges.node[0]
          let deletes = `<${id}> * * .\n`
          Object.keys(subject).forEach(key => {
            const results = subject[key]
            const reverse = client.getReversePredicate(key)
            if (reverse && Array.isArray(results)) {
              results.forEach(node => {
                deletes += `<${node.uid}> <${reverse}> <${id}> .\n`
              })
            }
          })
          const mutation = new dgraph.Mutation()
          mutation.setDelNquads(new Uint8Array(new Buffer(deletes)))
          return client.mutate(mutation)
        })
        .then(() => payload)
    }
  )
}
