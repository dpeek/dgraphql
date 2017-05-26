/* @flow */

import {
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLID,
  isLeafType
} from 'graphql'

import { mutationWithClientMutationId } from 'graphql-relay'

import type { DgraphQLOptions } from './schema'
import { unwrap, unwrapNonNull, lowerCamelCase } from './utils'

import {
  createAndGetPayload,
  updateAndGetPayload,
  deleteAndGetPayload
} from './request'

const inputTypeCache = new Map()
function getInputType (
  options: DgraphQLOptions,
  type: GraphQLObjectType
): GraphQLInputObjectType {
  const name = type.name + 'Input'

  let inputType = inputTypeCache.get(name)
  if (inputType) return inputType

  inputType = new GraphQLInputObjectType({
    name: name,
    fields: () => getInputFields(options, type, false)
  })
  inputTypeCache.set(name, inputType)
  return inputType
}

function getInputFields (
  options: DgraphQLOptions,
  type: GraphQLObjectType,
  excludeId: boolean
) {
  const inputFields = {}
  const fields = type.getFields()
  Object.keys(fields).forEach(fieldName => {
    const field = fields[fieldName]
    const fieldType = unwrapNonNull(field.type)
    if (fieldType instanceof GraphQLList) {
      inputFields[fieldName] = {
        type: new GraphQLList(getInputType(options, fieldType.ofType))
      }
    } else if (fieldType instanceof GraphQLObjectType) {
      inputFields[fieldName] = { type: getInputType(options, fieldType) }
    } else if (isLeafType(fieldType)) {
      if (excludeId && fieldName === 'id') return
      inputFields[fieldName] = { type: fieldType }
    }
  })
  return inputFields
}

export function getDeleteMutation (
  options: DgraphQLOptions,
  type: GraphQLObjectType
) {
  return mutationWithClientMutationId({
    name: `Delete${type.name}Mutation`,
    inputFields: {
      id: { type: new GraphQLNonNull(GraphQLID) }
    },
    outputFields: {
      [lowerCamelCase(type.name)]: {
        type: type
      }
    },
    mutateAndGetPayload: (input, context, info) => {
      return deleteAndGetPayload(options, info, type, input)
    }
  })
}

export function getUpdateMutation (
  options: DgraphQLOptions,
  type: GraphQLObjectType
) {
  const name = type.name
  const fields = type.getFields()
  const inputFields = {}
  Object.keys(fields).forEach(fieldName => {
    const field = fields[fieldName]
    const fieldType = unwrap(field.type)
    if (isLeafType(fieldType)) {
      if (fieldName === 'id') {
        inputFields[fieldName] = { type: new GraphQLNonNull(GraphQLID) }
      } else {
        inputFields[fieldName] = { type: fieldType }
      }
    }
  })
  return mutationWithClientMutationId({
    name: `Update${name}Mutation`,
    inputFields,
    outputFields: {
      [lowerCamelCase(name)]: {
        type: type
      }
    },
    mutateAndGetPayload: (input, context, info) => {
      return updateAndGetPayload(options, info, type, input)
    }
  })
}

export function getCreateMutation (
  options: DgraphQLOptions,
  type: GraphQLObjectType
) {
  const name = type.name
  const inputFields = getInputFields(options, type, true)
  return mutationWithClientMutationId({
    name: `Create${name}Mutation`,
    inputFields,
    outputFields: {
      [lowerCamelCase(name)]: {
        type: type
      }
    },
    mutateAndGetPayload: (input, context, info) => {
      return createAndGetPayload(options, info, type, input)
    }
  })
}
