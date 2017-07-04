// @flow

import { GraphQLSchema, buildASTSchema } from 'graphql'
import { addResolveFunctionsToSchema } from 'graphql-tools'

import { Client } from './client'
import transformSchema from './transformSchema'
import getResolvers from './resolvers/getResolvers'

import type { DocumentNode } from 'graphql'

export default function buildSchema (
  ast: DocumentNode,
  client: Client
): GraphQLSchema {
  const typeDefs = transformSchema(ast, client.relay)
  const schema = buildASTSchema(typeDefs)
  const resolvers = getResolvers(schema, client.relay)
  addResolveFunctionsToSchema(schema, resolvers)
  return schema
}
