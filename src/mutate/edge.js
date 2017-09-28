// @flow

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
  let query = 'query {\n'
  query += `  subject(func:uid(${subject})) { ${predicate} { _uid_ }}\n`
  if (typeof value !== 'undefined') {
    query += `value(func:uid(${value})) { _uid_ __typename`
    if (reverse) {
      query += ` ${reverse} { _uid_ }`
    }
    query += '}\n'
  }
  query += '}'
  return context.client
    .fetchQuery(query)
    .then(result => {
      const subjectNode = result.subject && result.subject[0]
      const valueNode = result.value && result.value[0]
      const types = {}
      if (valueNode) {
        types[valueNode._uid_] = valueNode.__typename
      }
      let subjectEdge = subjectNode && subjectNode[predicate][0]._uid_
      let valueEdge =
        reverse &&
        valueNode &&
        valueNode[reverse] &&
        valueNode[reverse][0]._uid_
      let mutation = 'mutation {\n'
      if ((subjectEdge || valueEdge) && subjectEdge !== value) {
        mutation += '  delete {\n'
        if (subjectEdge) {
          mutation += `    <${subject}> <${predicate}> <${subjectEdge}> .\n`
          if (reverse) {
            mutation += `    <${subjectEdge}> <${reverse}> <${subject}> .\n`
          }
        }
        if (value && valueEdge) {
          mutation += `    <${value}> <${predicate}> <${valueEdge}> .\n`
          if (reverse) {
            mutation += `    <${valueEdge}> <${reverse}> <${value}> .\n`
          }
        }
        mutation += '  }\n'
      }

      if (valueInput) {
        mutation += '  set {\n'
        mutation += getMutation(context, type, input, `<${subject}>`, types)
        mutation += '  }\n'
      }

      mutation += '}'
      return context.client.fetchQuery(mutation)
    })
    .then(() => {
      return payloadQuery(info, context, subject, input.clientMutationId)
    })
}
