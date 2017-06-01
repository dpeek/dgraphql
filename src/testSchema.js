/* @flow */

import fs from 'fs'
import path from 'path'

import { buildSchema } from './schema'
import type { ClientConfig } from './client'

export default async function initSchema (
  graphql: string,
  config: ClientConfig
) {
  const graphqlPath = path.resolve(__dirname, '__tests__', graphql)
  return buildSchema(fs.readFileSync(graphqlPath).toString(), config)
}
