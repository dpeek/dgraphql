// @flow

import { GraphQLNonNull, GraphQLInterfaceType, GraphQLID } from 'graphql'

import resolve from '../resolve'

import type { GraphQLResolveInfo } from 'graphql'
import type { Context } from '../context'

export default function getNodeField (nodeInterface: GraphQLInterfaceType) {
  return {
    name: 'node',
    description: 'Fetches an object given its ID',
    type: nodeInterface,
    args: {
      id: {
        type: new GraphQLNonNull(GraphQLID),
        description: 'The ID of an object'
      }
    },
    resolve: (
      source: {},
      args: {},
      context: Context,
      info: GraphQLResolveInfo
    ) => {
      return resolve({}, context, info).then(nodes => nodes[0])
    }
  }
}
