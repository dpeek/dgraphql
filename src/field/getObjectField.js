// @flow

import { GraphQLObjectType } from 'graphql'

import resolve from '../resolve'

import type { GraphQLFieldConfig } from 'graphql'
import type { Context } from '../context'

export default function getObjectField (
  type: GraphQLObjectType
): GraphQLFieldConfig<{}, Context> {
  return {
    type,
    description: `Get a ${type.name} by \`id\``,
    resolve: async (source, args, context, info) => {
      return resolve(source, context, info).then(nodes => nodes[0])
    }
  }
}
