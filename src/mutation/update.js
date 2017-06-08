/* @flow */

import {
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLID,
  isLeafType
} from 'graphql'

import { mutationWithClientMutationId } from 'graphql-relay'

import { unwrap, lowerCamelCase } from '../utils'
import { createOrUpdate } from './common'

import type { Client } from '../client'

export default function getMutation (client: Client, type: GraphQLObjectType) {
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
      return createOrUpdate(client, info, context, type, input, input.id)
    }
  })
}
