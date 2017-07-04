// @flow

import invariant from 'invariant'

import { GraphQLObjectType, GraphQLList } from 'graphql'

import getSelections from './getSelections'
import { unwrapNonNull } from '../utils'

import type { GraphQLResolveInfo, FieldNode } from 'graphql'
import type { Context } from '../client'

export function setAndGetPayload (
  info: GraphQLResolveInfo,
  context: Context,
  type: GraphQLObjectType,
  input: { id: string, clientMutationId?: string },
  predicate: string
) {
  let mutation = 'mutation {\n'
  const subject = input.id
  const payload = input[predicate]
  const value = payload && payload.id
  const reversePredicate = context.client.getReversePredicate(predicate)
  let query = 'query {\n'
  query += `  subject(id: ${subject}) { ${predicate} { _uid_ }}\n`
  if (value && reversePredicate) {
    query += `value(id: ${value}) { ${reversePredicate} { _uid_ }}`
  }
  query += '}'
  return context.client
    .fetchQuery(query)
    .then(edges => {
      let subjectEdge = edges.subject && edges.subject[0][predicate][0]._uid_
      let valueEdge =
        edges.value &&
        reversePredicate &&
        edges.value[0][reversePredicate][0]._uid_
      if ((subjectEdge || valueEdge) && subjectEdge !== value) {
        mutation += '  delete {\n'
        if (subjectEdge) {
          mutation += `    <${subject}> <${predicate}> <${subjectEdge}> .\n`
          if (reversePredicate) {
            mutation += `    <${subjectEdge}> <${reversePredicate}> <${subject}> .\n`
          }
        }
        if (valueEdge) {
          mutation += `    <${value}> <${predicate}> <${valueEdge}> .\n`
          if (reversePredicate) {
            mutation += `    <${valueEdge}> <${reversePredicate}> <${value}> .\n`
          }
        }
        mutation += '  }\n'
      }

      if (input[predicate]) {
        mutation += '  set {\n'
        mutation += getMutationFields(
          info,
          context,
          type,
          input,
          `<${subject}>`,
          0
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

export function payloadQuery (
  info: GraphQLResolveInfo,
  context: Context,
  id: string,
  clientMutationId?: string
) {
  const mutation = info.fieldNodes[0]
  invariant(
    !!mutation && mutation.kind === 'Field' && mutation.selectionSet,
    'Selection not found'
  )
  const payload = mutation.selectionSet.selections[0]
  invariant(
    !!payload && payload.kind === 'Field' && payload.selectionSet,
    'Selection not found'
  )
  const payloadQuery: FieldNode = {
    ...payload,
    arguments: [
      {
        kind: 'Argument',
        name: { kind: 'Name', value: 'id' },
        value: { kind: 'StringValue', value: id }
      }
    ]
  }
  const fieldName = payload.name.value
  const queryType = info.schema.getQueryType()
  let query = 'query {\n'
  query += getSelections(info, context, [payloadQuery], queryType, '  ', true)
  query += '}'
  return context.client.fetchQuery(query).then(res => {
    const nodes = res[fieldName].filter(node => !!node.__typename)
    return nodes.length > 0 ? { [fieldName]: nodes[0], clientMutationId } : null
  })
}

export function getMutationFields (
  info: GraphQLResolveInfo,
  context: Context,
  type: GraphQLObjectType,
  input: {},
  subject: string,
  count: number
) {
  let query = ''
  if (subject.indexOf('node') !== -1) {
    query += `  ${subject} <__typename> "${type.name}" .\n`
  }

  const fields = type.getFields()
  Object.keys(input).forEach(key => {
    if (key === 'id') return
    if (typeof fields[key] === 'undefined') return
    let fieldType = unwrapNonNull(fields[key].type)
    if (
      fieldType instanceof GraphQLObjectType ||
      fieldType instanceof GraphQLList
    ) {
      let nodes = []
      if (fieldType instanceof GraphQLList) {
        nodes = input[key]
        fieldType = unwrapNonNull(fieldType.ofType)
      } else {
        nodes = [input[key]]
      }
      nodes.forEach(node => {
        count++
        invariant(fieldType instanceof GraphQLObjectType, 'Invalid')
        let nodeIdent = node.id ? `<${node.id}>` : `_:node${count}`
        let child = getMutationFields(
          info,
          context,
          fieldType,
          node,
          nodeIdent,
          count
        )
        query = child + query
        query += `  ${subject} <${key}> ${nodeIdent} .\n`
        let reverse = context.client.getReversePredicate(key)
        if (reverse) {
          query += `  ${nodeIdent} <${reverse}> ${subject} .\n`
        }
      })
    } else {
      const value = context.client.localizeValue(
        input[key],
        key,
        context.language
      )
      query += `  ${subject} <${key}> ${value} .\n`
    }
  })
  return query
}
