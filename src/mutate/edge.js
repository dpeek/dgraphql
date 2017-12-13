// @flow

const dgraph = require('dgraph-js')
import getMutation from './getMutation'
import payloadQuery from '../query/payload'

import type { GraphQLResolveInfo, GraphQLObjectType } from 'graphql'
import type { Context } from '../client'
import type { NodeInput } from './getMutation'

export default function resolve (
  type: GraphQLObjectType,
  predicate: string,
  source: void,
  args: {
    input: { id: string, clientMutationId: ?string, [string]: NodeInput }
  },
  context: Context,
  info: GraphQLResolveInfo
) {
  const input = args.input
  const subject = input.id
  const valueInput = input[predicate]
  const value = valueInput && valueInput.id
  const reverse = context.client.getReversePredicate(predicate)
  let query = '{\n'
  query += `  subject(func:uid(${subject})) { ${predicate} { uid }}\n`
  if (typeof value !== 'undefined') {
    query += `value(func:uid(${value})) { uid __typename`
    if (reverse) {
      query += ` ${reverse} { uid }`
    }
    query += '}\n'
  }
  query += '}'
  return context.client
    .query(query)
    .then(result => {
      const subjectNode = result.subject && result.subject[0]
      const valueNode = result.value && result.value[0]
      const types = {}
      if (valueNode) {
        types[valueNode.uid] = valueNode.__typename
      }
      let subjectEdge = subjectNode && subjectNode[predicate][0].uid
      let valueEdge =
        reverse && valueNode && valueNode[reverse] && valueNode[reverse][0].uid

      const mutation = new dgraph.Mutation()
      if ((subjectEdge || valueEdge) && subjectEdge !== value) {
        let deletes = ''
        if (subjectEdge) {
          deletes += `<${subject}> <${predicate}> <${subjectEdge}> .\n`
          if (reverse) {
            deletes += `<${subjectEdge}> <${reverse}> <${subject}> .\n`
          }
        }
        if (value && valueEdge) {
          deletes += `<${value}> <${predicate}> <${valueEdge}> .\n`
          if (reverse) {
            deletes += `<${valueEdge}> <${reverse}> <${value}> .\n`
          }
        }
        mutation.setDelNquads(new Uint8Array(new Buffer(deletes)))
      }

      if (valueInput) {
        const sets = getMutation(context, type, input, `<${subject}>`, types)
        mutation.setSetNquads(new Uint8Array(new Buffer(sets)))
      }

      return context.client.mutate(mutation)
    })
    .then(() => {
      return payloadQuery(info, context, subject, input.clientMutationId)
    })
}
