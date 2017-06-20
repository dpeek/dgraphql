// @flow

import invariant from 'invariant'

import {
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLID
} from 'graphql'

import type { GraphQLResolveInfo } from 'graphql'
import type { Context } from '../context'
import type { GraphNode } from '../resolve'

export default function getNodeInterface () {
  return new GraphQLInterfaceType({
    name: 'Node',
    description: 'An object with an ID',
    fields: () => ({
      id: {
        type: new GraphQLNonNull(GraphQLID),
        description: 'The id of the object.'
      }
    }),
    resolveType: (
      value: GraphNode,
      context: Context,
      info: GraphQLResolveInfo
    ) => {
      invariant(typeof value.__typename !== 'undefined', 'Deleted node')
      const type = info.schema.getType(value.__typename)
      invariant(type instanceof GraphQLObjectType, 'Type is not an object')
      return type
    }
  })
}
