// @flow

import { setAndGetPayload } from './mutate'

import type { GraphQLResolveInfo, GraphQLObjectType } from 'graphql'
import type { Context } from '../client'

export default function resolveSet (
  type: GraphQLObjectType,
  fieldName: string,
  source: void,
  args: { input: { id: string, clientMutationId?: string } },
  context: Context,
  info: GraphQLResolveInfo
) {
  return setAndGetPayload(info, context, type, args.input, fieldName)
}
