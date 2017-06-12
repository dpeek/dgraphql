// @flow

import {
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLList,
  GraphQLID
} from 'graphql'

import { mutationWithClientMutationId } from 'graphql-relay'

import { getInputType, getMutationFields, payloadQuery } from './common'
import { upperCamelCase, lowerCamelCase, unwrapNonNull } from '../utils'

import type { GraphQLType, GraphQLResolveInfo } from 'graphql'
import type { Client } from '../client'
import type { Context } from '../schema'

async function setAndGetPayload (
  client: Client,
  info: GraphQLResolveInfo,
  context: Context,
  type: GraphQLObjectType,
  input: any,
  predicate: string
) {
  let edges = {}
  let mutation = 'mutation {\n'
  const subject = input.id
  const payload = input[predicate]
  const value = payload && payload.id
  const reversePredicate = client.getReversePredicate(predicate)
  let query = 'query {\n'
  query += `  subject(id: ${subject}) { ${predicate} { _uid_ }}\n`
  if (value && reversePredicate) {
    query += `value(id: ${value}) { ${reversePredicate} { _uid_ }}`
  }
  query += '}'
  edges = await client.fetchQuery(query)

  let subjectEdge = edges.subject && edges.subject[0][predicate][0]._uid_
  let valueEdge = edges.value && edges.value[0][reversePredicate][0]._uid_
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
      client,
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
  await client.fetchQuery(mutation)
  return payloadQuery(client, info, context, subject)
}

function getObjectMutation (
  client: Client,
  type: GraphQLObjectType,
  fieldType: GraphQLObjectType,
  predicate: string
) {
  const name = type.name + upperCamelCase(predicate)
  const typeField = lowerCamelCase(type.name)
  const outputFields = {
    [typeField]: {
      type: type
    }
  }
  return {
    [`set${name}`]: mutationWithClientMutationId({
      name: `Set${name}Mutation`,
      inputFields: {
        id: {
          type: new GraphQLNonNull(GraphQLID)
        },
        [predicate]: {
          type: new GraphQLNonNull(getInputType(client, fieldType))
        }
      },
      outputFields,
      mutateAndGetPayload: (input, context, info) => {
        return setAndGetPayload(client, info, context, type, input, predicate)
      }
    }),
    [`unset${name}`]: mutationWithClientMutationId({
      name: `Unset${name}Mutation`,
      inputFields: {
        id: {
          type: new GraphQLNonNull(GraphQLID)
        }
      },
      outputFields,
      mutateAndGetPayload: (input, context, info) => {
        return setAndGetPayload(client, info, context, type, input, predicate)
      }
    })
  }
}

async function addAndGetPayload (
  client: Client,
  info: GraphQLResolveInfo,
  context: Context,
  type: GraphQLObjectType,
  input: any,
  predicate: string
) {
  const subject = input.id
  let mutation = 'mutation { set {\n'
  mutation += getMutationFields(
    client,
    info,
    context,
    type,
    input,
    `<${subject}>`,
    0
  )
  mutation += '}}'
  await client.fetchQuery(mutation)
  return payloadQuery(client, info, context, subject)
}

async function removeAndGetPayload (
  client: Client,
  info: GraphQLResolveInfo,
  context: Context,
  type: GraphQLObjectType,
  input: any,
  predicate: string
) {
  const subject = input.id
  const values = input[predicate].map(node => node.id)
  const reversePredicate = client.getReversePredicate(predicate)
  let mutation = 'mutation { delete {\n'
  values.forEach(id => {
    mutation += `  <${subject}> <${predicate}> <${id}> .\n`
    if (reversePredicate) {
      mutation += `  <${id}> <${reversePredicate}> <${subject}> .\n`
    }
  })
  mutation += '}}'
  await client.fetchQuery(mutation)
  return payloadQuery(client, info, context, subject)
}

function getListMutation (
  client: Client,
  type: GraphQLObjectType,
  fieldType: GraphQLList<*>,
  predicate: string
) {
  const name = type.name + upperCamelCase(predicate)
  const typeField = lowerCamelCase(type.name)
  const inputFields = {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    },
    [predicate]: {
      type: new GraphQLList(
        getInputType(client, unwrapNonNull(fieldType.ofType))
      )
    }
  }
  const outputFields = {
    [typeField]: {
      type: type
    }
  }
  return {
    [`add${name}`]: mutationWithClientMutationId({
      name: `Add${name}Mutation`,
      inputFields,
      outputFields,
      mutateAndGetPayload: (input, context, info) => {
        return addAndGetPayload(client, info, context, type, input, predicate)
      }
    }),
    [`remove${name}`]: mutationWithClientMutationId({
      name: `Remove${name}Mutation`,
      inputFields,
      outputFields,
      mutateAndGetPayload: (input, context, info) => {
        return removeAndGetPayload(
          client,
          info,
          context,
          type,
          input,
          predicate
        )
      }
    })
  }
}

export default function getMutations (
  client: Client,
  type: GraphQLObjectType,
  fieldType: GraphQLType,
  predicate: string
) {
  return {
    ...(fieldType instanceof GraphQLObjectType
      ? getObjectMutation(client, type, fieldType, predicate)
      : {}),
    ...(fieldType instanceof GraphQLList
      ? getListMutation(client, type, fieldType, predicate)
      : {})
  }
}
