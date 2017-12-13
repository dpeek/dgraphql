// @flow

const dgraph = require('dgraph-js')
import payloadQuery from '../query/payload'

import type { GraphQLResolveInfo, GraphQLObjectType } from 'graphql'
import type { Context, GraphResponse } from '../client'

export default function resolve (
  type: GraphQLObjectType,
  fieldName: string,
  source: ?GraphResponse,
  args: {
    input: {
      id: string,
      clientMutationId?: string,
      [string]: Array<{ id: string }>
    }
  },
  context: Context,
  info: GraphQLResolveInfo
) {
  const input = args.input
  const subject = input.id
  const values = input[fieldName].map(node => node.id)
  const reversePredicate = context.client.getReversePredicate(fieldName)
  let deletes = ''
  values.forEach(id => {
    deletes += `  <${subject}> <${fieldName}> <${id}> .\n`
    if (reversePredicate) {
      deletes += `  <${id}> <${reversePredicate}> <${subject}> .\n`
    }
  })
  const mutation = new dgraph.Mutation()
  mutation.setDelNquads(new Uint8Array(new Buffer(deletes)))
  return context.client.mutate(mutation).then(() => {
    return payloadQuery(info, context, subject, input.clientMutationId)
  })
}
