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
  return getTypes(input, context).then(types => {
    const subject = input.id ? `<${input.id}>` : '_:node'
    let query = 'mutation { set {\n'
    query += getMutation(context, type, input, subject, types)
    query += '}}'
    return context.client.fetchQuery(query).then(res => {
      const id = input.id || res.uids.node
      return payloadQuery(info, context, id, input.clientMutationId)
    })
  })
}

function getTypes (
  input: MutationInput,
  context: Context
): Promise<{ [string]: string }> {
  const ids = getIds(input)
  const query = `query { nodes(func:uid(${ids.join(',')})) { _uid_, __typename }}`
  return context.client.fetchQuery(query).then(result => {
    const types = {}
    if (result.nodes) {
      result.nodes.forEach(node => (types[node._uid_] = node.__typename))
    }
    return types
  })
}

function getIds (input: {}): Array<string> {
  const ids = []
  Object.keys(input).forEach(key => {
    const value = input[key]
    if (key === 'id') ids.push(String(value))
    if (typeof value === 'object') {
      getIds(value).forEach(id => ids.push(id))
    }
  })
  return ids
}
