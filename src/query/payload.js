// @flow

import invariant from 'invariant'

import getSelections from './getSelections'

import type { GraphQLResolveInfo, FieldNode } from 'graphql'
import type { Context } from '../client'

export default function resolve (
  info: GraphQLResolveInfo,
  context: Context,
  id: string,
  clientMutationId: ?string
) {
  const mutation = info.fieldNodes[0]
  invariant(
    !!mutation && mutation.kind === 'Field' && mutation.selectionSet,
    'Selection not found'
  )
  const payload = mutation.selectionSet.selections[0]
  invariant(
    !!payload && payload.kind === 'Field' && payload.selectionSet,
    'Selection not found'
  )
  const payloadQuery: FieldNode = {
    ...payload,
    arguments: [
      {
        kind: 'Argument',
        name: { kind: 'Name', value: 'id' },
        value: { kind: 'StringValue', value: id }
      }
    ]
  }
  const fieldName = payload.name.value
  const queryType = info.schema.getQueryType()
  let query = '{\n'
  query += getSelections(info, context, [payloadQuery], queryType, '  ', true)
  query += '}'
  return context.client.query(query).then(res => {
    const nodes = res[fieldName].filter(node => !!node.__typename)
    return nodes.length > 0 ? { [fieldName]: nodes[0], clientMutationId } : null
  })
}
