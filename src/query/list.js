// @flow

import invariant from 'invariant'
import query from './query'

import type { GraphQLResolveInfo } from 'graphql'
import type { Context } from '../client'

export default function resolve (
  source: any,
  args: any,
  context: Context,
  info: GraphQLResolveInfo
) {
  return query(source, context, info).then(result => {
    invariant(info.path && info.path.key, 'No path')
    const nodes = result[String(info.path.key)] || []
    return nodes.filter(node => !!node.__typename)
  })
}
