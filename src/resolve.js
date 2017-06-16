// @flow

import invariant from 'invariant'

import getSelections from './getSelections'
import processResponse from './processResponse'

import type { GraphQLResolveInfo } from 'graphql'
import type { Context } from './context'

export type GraphNode = { _uid_: string, __typename?: string }
export type GraphNodes = Array<GraphNode>

function getQuery (info: GraphQLResolveInfo, context: Context) {
  let query = 'query {\n'
  query += getSelections(
    info,
    context,
    info.operation.selectionSet.selections,
    info.schema.getQueryType(),
    '  ',
    true
  )
  return query + '}'
}

function resolveQuery (
  context: Context,
  info: GraphQLResolveInfo
): Promise<{ [string]: GraphNodes }> {
  // $FlowFixMe
  let req = info.operation.req
  if (!req) {
    const query = getQuery(info, context)
    // $FlowFixMe
    req = info.operation.req = context.client.fetchQuery(query).then(res => {
      return processResponse(res)
    })
  }
  return req
}

export default function resolve (
  source: {},
  context: Context,
  info: GraphQLResolveInfo
): Promise<GraphNodes> {
  invariant(typeof info.path !== 'undefined', 'No path defined')
  if (typeof info.path.prev === 'undefined') {
    return resolveQuery(context, info).then(source => {
      return source[info.path.key] || []
    })
  }
  return Promise.resolve(source[info.path.key] || [])
}
