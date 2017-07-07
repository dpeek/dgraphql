// @flow

import payloadQuery from '../query/payload'

import type { GraphQLResolveInfo, GraphQLObjectType } from 'graphql'
import type { Context, GraphResponse } from '../client'

export default function resolveRemove (
  type: GraphQLObjectType,
  fieldName: string,
  source: ?GraphResponse,
  args: { input: { id: string, clientMutationId?: string } },
  context: Context,
  info: GraphQLResolveInfo
) {
  const input = args.input
  const subject = input.id
  const values = input[fieldName].map(node => node.id)
  const reversePredicate = context.client.getReversePredicate(fieldName)
  let mutation = 'mutation { delete {\n'
  values.forEach(id => {
    mutation += `  <${subject}> <${fieldName}> <${id}> .\n`
    if (reversePredicate) {
      mutation += `  <${id}> <${reversePredicate}> <${subject}> .\n`
    }
  })
  mutation += '}}'
  return context.client.fetchQuery(mutation).then(() => {
    return payloadQuery(info, context, subject, input.clientMutationId)
  })
}
