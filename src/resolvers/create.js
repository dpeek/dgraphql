// @flow

import { GraphQLObjectType } from 'graphql'
import { getMutationFields, payloadQuery } from './mutate'

import type { GraphQLResolveInfo } from 'graphql'

import type { Context } from '../client'

export default function resolveCreate (
  type: GraphQLObjectType,
  source: void,
  args: { input: { id: string, clientMutationId?: string } },
  context: Context,
  info: GraphQLResolveInfo
) {
  let query = 'mutation { set {\n'
  query += getMutationFields(info, context, type, args.input, '_:node', 0)
  query += '}}'
  return context.client.fetchQuery(query).then(res => {
    return payloadQuery(
      info,
      context,
      res.uids.node,
      args.input.clientMutationId
    )
  })
}
