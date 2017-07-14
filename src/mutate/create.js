// @flow

import getMutation from './getMutation'
import payloadQuery from '../query/payload'

import type { GraphQLResolveInfo, GraphQLObjectType } from 'graphql'
import type { Context } from '../client'
import type { MutationInput } from './getMutation'

export default function resolve (
  type: GraphQLObjectType,
  source: void,
  args: { input: MutationInput },
  context: Context,
  info: GraphQLResolveInfo
) {
  const input = args.input
  const ids = getIds(input)
  const typeQuery = `query { nodes(id: [${ids.join(',')}]) { _uid_, __typename }}`
  return context.client.fetchQuery(typeQuery).then(result => {
    const types = {}
    if (result.nodes) {
      result.nodes.forEach(node => (types[node._uid_] = node.__typename))
    }
    const subject = input.id ? `<${input.id}>` : '_:node'
    let query = 'mutation { set {\n'
    query += getMutation(info, context, type, input, subject, types)
    query += '}}'
    return context.client.fetchQuery(query).then(res => {
      const id = input.id || res.uids.node
      return payloadQuery(info, context, id, input.clientMutationId)
    })
  })
}

function getIds (input: {}): Array<string> {
  const ids = []
  Object.keys(input).forEach(key => {
    const value = input[key]
    if (key === 'id') ids.push(value)
    if (typeof value === 'object') {
      getIds(value).forEach(id => ids.push(id))
    }
  })
  return ids
}
