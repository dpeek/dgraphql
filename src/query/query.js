// @flow

import getSelections from './getSelections'

import type { Context, GraphResponse } from '../client'

import type { GraphQLResolveInfo } from 'graphql'

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
): Promise<GraphResponse> {
  // $FlowFixMe
  let req = info.operation.req
  if (!req) {
    const query = getQuery(info, context)
    // $FlowFixMe
    req = info.operation.req = context.client.fetchQuery(query)
  }
  return req
}

export default function query (
  source: ?GraphResponse,
  context: Context,
  info: GraphQLResolveInfo
): Promise<GraphResponse> {
  if (source) return Promise.resolve(source)
  return resolveQuery(context, info)
}
