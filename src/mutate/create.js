// @flow

import getMutation from './getMutation'
import payloadQuery from '../query/payload'

import type { GraphQLResolveInfo, GraphQLObjectType } from 'graphql'
import type { Context } from '../client'

export default function resolve (
  type: GraphQLObjectType,
  source: void,
  args: { input: { id?: string, clientMutationId?: string } },
  context: Context,
  info: GraphQLResolveInfo
) {
  const input = args.input
  const subject = input.id ? `<${input.id}>` : '_:node'
  let query = 'mutation { set {\n'
  query += getMutation(info, context, type, input, subject)
  query += '}}'
  return context.client.fetchQuery(query).then(res => {
    const id = input.id || res.uids.node
    return payloadQuery(info, context, id, input.clientMutationId)
  })
}
