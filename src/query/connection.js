// @flow

import invariant from 'invariant'
import query from './query'

import type { GraphQLResolveInfo } from 'graphql'
import type { Context, GraphResponse } from '../client'

export default function resolve (
  source: ?GraphResponse,
  args: any,
  context: Context,
  info: GraphQLResolveInfo
) {
  return query(source, context, info).then(result => {
    invariant(info.path && info.path.key, 'No path')
    const key = String(info.path.key)
    let nodes = result[key] || []
    nodes = nodes.filter(node => !!node.__typename)
    let countNodes = result[`_count_${key}_`]
    let count = countNodes ? countNodes[0].count : result[`count(${key})`] || 0
    let first = args.first || 0
    let hasPreviousPage = !!args.after
    let hasNextPage = false
    if (first && nodes.length > first) {
      nodes = nodes.slice(0, nodes.length - 1)
      hasNextPage = true
    }
    const edges = nodes.map(node => ({
      node,
      cursor: node.uid
    }))
    const firstEdge = edges[0]
    const lastEdge = edges[edges.length - 1]
    return {
      edges,
      count: count,
      pageInfo: {
        startCursor: firstEdge ? firstEdge.cursor : null,
        endCursor: lastEdge ? lastEdge.cursor : null,
        hasPreviousPage,
        hasNextPage
      }
    }
  })
}
