// @flow

import { GraphQLObjectType } from 'graphql'
import { getMutationFields, payloadQuery } from './mutate'

import type { GraphQLResolveInfo } from 'graphql'

import type { Context } from '../client'

export default function resolveUpdate (
  type: GraphQLObjectType,
  source: void,
  args: { input: { id: string, clientMutationId?: string } },
  context: Context,
  info: GraphQLResolveInfo
) {
  const input = args.input
  const id = input.id
  let subject = id ? '<' + String(id) + '>' : '_:node'
  let query = 'mutation { set {\n'
  query += getMutationFields(info, context, type, input, subject, 0)
  query += '}}'
  return context.client.fetchQuery(query).then(res => {
    const uid = id || res.uids.node
    return payloadQuery(info, context, uid, input.clientMutationId)
  })
}
