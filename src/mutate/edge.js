// @flow

import getMutation from './getMutation'
import payloadQuery from '../query/payload'

import type { GraphQLResolveInfo, GraphQLObjectType } from 'graphql'
import type { Context } from '../client'

export default function resolve (
  type: GraphQLObjectType,
  fieldName: string,
  source: void,
  args: { input: { id: string, clientMutationId?: string } },
  context: Context,
  info: GraphQLResolveInfo
) {
  let mutation = 'mutation {\n'
  const input = args.input
  const subject = input.id
  const payload = input[fieldName]
  const value = payload && payload.id
  const reversePredicate = context.client.getReversePredicate(fieldName)
  let query = 'query {\n'
  query += `  subject(id: ${subject}) { ${fieldName} { _uid_ }}\n`
  if (value && reversePredicate) {
    query += `value(id: ${value}) { ${reversePredicate} { _uid_ }}`
  }
  query += '}'
  return context.client
    .fetchQuery(query)
    .then(edges => {
      let subjectEdge = edges.subject && edges.subject[0][fieldName][0]._uid_
      let valueEdge =
        edges.value &&
        reversePredicate &&
        edges.value[0][reversePredicate][0]._uid_
      if ((subjectEdge || valueEdge) && subjectEdge !== value) {
        mutation += '  delete {\n'
        if (subjectEdge) {
          mutation += `    <${subject}> <${fieldName}> <${subjectEdge}> .\n`
          if (reversePredicate) {
            mutation += `    <${subjectEdge}> <${reversePredicate}> <${subject}> .\n`
          }
        }
        if (valueEdge) {
          mutation += `    <${value}> <${fieldName}> <${valueEdge}> .\n`
          if (reversePredicate) {
            mutation += `    <${valueEdge}> <${reversePredicate}> <${value}> .\n`
          }
        }
        mutation += '  }\n'
      }

      if (input[fieldName]) {
        mutation += '  set {\n'
        mutation += getMutation(info, context, type, input, `<${subject}>`)
        mutation += '  }\n'
      }

      mutation += '}'
      return context.client.fetchQuery(mutation)
    })
    .then(() => {
      return payloadQuery(info, context, subject, input.clientMutationId)
    })
}
