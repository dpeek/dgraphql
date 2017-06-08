/* @flow */

import { GraphQLObjectType } from 'graphql'

import { mutationWithClientMutationId } from 'graphql-relay'

import { lowerCamelCase } from '../utils'
import { getInputFields, createOrUpdate } from './common'

import type { Client } from '../client'

export default function getMutation (client: Client, type: GraphQLObjectType) {
  const name = type.name
  const inputFields = getInputFields(client, type, true)
  return mutationWithClientMutationId({
    name: `Create${name}Mutation`,
    inputFields,
    outputFields: {
      [lowerCamelCase(name)]: {
        type: type
      }
    },
    mutateAndGetPayload: (input, context, info) => {
      return createOrUpdate(client, info, context, type, input)
    }
  })
}
