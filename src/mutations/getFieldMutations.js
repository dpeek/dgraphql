// @flow

import invariant from 'invariant'

import {
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLList,
  GraphQLID
} from 'graphql'

import mutationWithClientMutationId from './mutationWithClientMutationId'

import { getInputType, getMutationFields, payloadQuery } from './common'
import { upperCamelCase, lowerCamelCase, unwrapNonNull } from '../utils'

import type { GraphQLType, GraphQLResolveInfo } from 'graphql'
import type { Context } from '../context'

function setAndGetPayload (
  info: GraphQLResolveInfo,
  context: Context,
  type: GraphQLObjectType,
  input: any,
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
      return payloadQuery(info, context, subject)
    })
}

function getObjectMutation (
  type: GraphQLObjectType,
  fieldType: GraphQLObjectType,
  predicate: string
) {
  const name = type.name + upperCamelCase(predicate)
  const typeField = lowerCamelCase(type.name)
  const outputFields = {
    [typeField]: {
      type: type,
      resolve: (source, args, context, info) => {
        return source[info.path.key][0]
      }
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
          type: new GraphQLNonNull(getInputType(fieldType))
        }
      },
      outputFields,
      mutateAndGetPayload: (input, context, info) => {
        return setAndGetPayload(info, context, type, input, predicate)
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
        return setAndGetPayload(info, context, type, input, predicate)
      }
    })
  }
}

function addAndGetPayload (
  info: GraphQLResolveInfo,
  context: Context,
  type: GraphQLObjectType,
  input: any,
  predicate: string
) {
  const subject = input.id
  let mutation = 'mutation { set {\n'
  mutation += getMutationFields(info, context, type, input, `<${subject}>`, 0)
  mutation += '}}'
  return context.client.fetchQuery(mutation).then(() => {
    return payloadQuery(info, context, subject)
  })
}

function removeAndGetPayload (
  info: GraphQLResolveInfo,
  context: Context,
  type: GraphQLObjectType,
  input: any,
  predicate: string
) {
  const subject = input.id
  const values = input[predicate].map(node => node.id)
  const reversePredicate = context.client.getReversePredicate(predicate)
  let mutation = 'mutation { delete {\n'
  values.forEach(id => {
    mutation += `  <${subject}> <${predicate}> <${id}> .\n`
    if (reversePredicate) {
      mutation += `  <${id}> <${reversePredicate}> <${subject}> .\n`
    }
  })
  mutation += '}}'
  return context.client.fetchQuery(mutation).then(() => {
    return payloadQuery(info, context, subject)
  })
}

function getListMutation (
  type: GraphQLObjectType,
  fieldType: GraphQLList<*>,
  predicate: string
) {
  const objectType = unwrapNonNull(fieldType.ofType)
  invariant(objectType instanceof GraphQLObjectType, 'List item is not object')
  const name = type.name + upperCamelCase(predicate)
  const typeField = lowerCamelCase(type.name)
  const inputFields = {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    },
    [predicate]: {
      type: new GraphQLList(getInputType(objectType))
    }
  }
  const outputFields = {
    [typeField]: {
      type: type,
      resolve: (source, args, context, info) => {
        return source[info.path.key][0]
      }
    }
  }
  return {
    [`add${name}`]: mutationWithClientMutationId({
      name: `Add${name}Mutation`,
      inputFields,
      outputFields,
      mutateAndGetPayload: (input, context, info) => {
        return addAndGetPayload(info, context, type, input, predicate)
      }
    }),
    [`remove${name}`]: mutationWithClientMutationId({
      name: `Remove${name}Mutation`,
      inputFields,
      outputFields,
      mutateAndGetPayload: (input, context, info) => {
        return removeAndGetPayload(info, context, type, input, predicate)
      }
    })
  }
}

export default function getFieldMutations (
  type: GraphQLObjectType,
  fieldType: GraphQLType,
  predicate: string
) {
  return {
    ...(fieldType instanceof GraphQLObjectType
      ? getObjectMutation(type, fieldType, predicate)
      : {}),
    ...(fieldType instanceof GraphQLList
      ? getListMutation(type, fieldType, predicate)
      : {})
  }
}
