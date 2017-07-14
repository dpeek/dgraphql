// @flow

import invariant from 'invariant'

import getMutation from './getMutation'
import payloadQuery from '../query/payload'

import type { GraphQLResolveInfo, GraphQLObjectType } from 'graphql'
import type { Context } from '../client'
import type { MutationInput } from './getMutation'

export default function resolve (
  type: GraphQLObjectType,
  fieldName: string,
  source: void,
  args: { input: MutationInput },
  context: Context,
  info: GraphQLResolveInfo
) {
  let mutation = 'mutation {\n'
  const input = args.input
  const subject = input.id
  invariant(typeof subject === 'string', 'No subject')
  const payload = input[fieldName]
  invariant(!Array.isArray(payload), 'Payload is array')
  const value = payload && payload.id
  const reversePredicate = context.client.getReversePredicate(fieldName)
  let query = 'query {\n'
  query += `  subject(id: ${subject}) { ${fieldName} { _uid_ }}\n`
  if (value) {
    query += `value(id: ${value}) { _uid_ __typename`
    if (reversePredicate) {
      query += ` ${reversePredicate} { _uid_ }`
    }
    query += '}\n'
  }
  query += '}'
  return context.client
    .fetchQuery(query)
    .then(edges => {
      const types = {}
      if (edges.value) {
        types[edges.value[0]._uid_] = edges.value[0].__typename
      }
      let subjectEdge = edges.subject && edges.subject[0][fieldName][0]._uid_
      let valueEdge =
        edges.value &&
        reversePredicate &&
        edges.value[0][reversePredicate] &&
        edges.value[0][reversePredicate][0]._uid_
      if ((subjectEdge || valueEdge) && subjectEdge !== value) {
        mutation += '  delete {\n'
        if (subjectEdge) {
          mutation += `    <${subject}> <${fieldName}> <${subjectEdge}> .\n`
          if (reversePredicate) {
            mutation += `    <${subjectEdge}> <${reversePredicate}> <${subject}> .\n`
          }
        }
        if (value && valueEdge) {
          mutation += `    <${value}> <${fieldName}> <${valueEdge}> .\n`
          if (reversePredicate) {
            mutation += `    <${valueEdge}> <${reversePredicate}> <${value}> .\n`
          }
        }
        mutation += '  }\n'
      }

      if (input[fieldName]) {
        mutation += '  set {\n'
        mutation += getMutation(
          info,
          context,
          type,
          input,
          `<${subject}>`,
          types
        )
        mutation += '  }\n'
      }

      mutation += '}'
      return context.client.fetchQuery(mutation)
    })
    .then(() => {
      return payloadQuery(info, context, subject, input.clientMutationId)
    })
}
