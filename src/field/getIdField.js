// @flow

import { GraphQLID, GraphQLNonNull } from 'graphql'

import type { GraphQLFieldConfig } from 'graphql'
import type { Context } from '../context'
import type { GraphNode } from '../resolve'

export default function getIdField (): GraphQLFieldConfig<GraphNode, Context> {
  return {
    name: 'id',
    description: 'The ID of an object',
    type: new GraphQLNonNull(GraphQLID),
    resolve: source => source._uid_
  }
}
