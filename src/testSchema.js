/* @flow */

import fs from 'fs'
import path from 'path'

import { buildSchema } from './schema'
import { Client } from './client'
import type { ClientConfig } from './client'

export default async function initSchema (
  graphql: string,
  dgraph: string,
  config: ClientConfig
) {
  const client = new Client(config, {})
  let dgraphPath = path.resolve(__dirname, '__tests__', dgraph)
  await client.fetchQuery(fs.readFileSync(dgraphPath).toString())

  const graphqlPath = path.resolve(__dirname, '__tests__', graphql)
  return buildSchema(fs.readFileSync(graphqlPath).toString(), config)
}
