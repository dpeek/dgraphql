// @flow

import { getMutationFields, payloadQuery } from './mutate'

import type { GraphQLResolveInfo, GraphQLObjectType } from 'graphql'
import type { Context } from '../client'

export default function resolveAdd (
  type: GraphQLObjectType,
  fieldName: string,
  source: void,
  args: { input: { id: string, clientMutationId?: string } },
  context: Context,
  info: GraphQLResolveInfo
) {
  const input = args.input
  const subject = input.id
  let mutation = 'mutation { set {\n'
  mutation += getMutationFields(info, context, type, input, `<${subject}>`, 0)
  mutation += '}}'
  return context.client.fetchQuery(mutation).then(() => {
    return payloadQuery(info, context, subject, args.input.clientMutationId)
  })
}
