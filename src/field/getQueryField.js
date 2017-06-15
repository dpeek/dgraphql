// @flow

import { GraphQLID, GraphQLNonNull, GraphQLObjectType } from 'graphql'

import resolve from '../resolve'

import type { GraphQLFieldConfig } from 'graphql'
import type { Context } from '../context'

export default function getQueryField (
  type: GraphQLObjectType
): GraphQLFieldConfig<{}, Context> {
  return {
    type,
    description: `Get a ${type.name} by \`id\``,
    args: {
      id: {
        type: new GraphQLNonNull(GraphQLID)
      }
    },
    resolve: async (source, args, context, info) => {
      const node = await resolve(source, context, info).then(nodes => nodes[0])
      // currently dgraph _always_ returns a result. I know, right?
      if (typeof node.__typename === 'undefined') return null
      return node
    }
  }
}
