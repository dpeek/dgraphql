// @flow

import { GraphQLSchema, buildASTSchema } from 'graphql'
import { addResolveFunctionsToSchema } from 'graphql-tools'

import { Client } from './client'
import getResolvers from './getResolvers'

import type { DocumentNode } from 'graphql'

export default function buildSchema (
  ast: DocumentNode,
  client: Client
): GraphQLSchema {
  const schema = buildASTSchema(ast)
  const resolvers = getResolvers(schema, client.relay)
  addResolveFunctionsToSchema(schema, resolvers)
  return schema
}
