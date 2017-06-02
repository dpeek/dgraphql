import fs from 'fs'
import path from 'path'

import { graphql } from 'graphql'

import { buildSchema } from './schema'

import type { ClientConfig } from './client'

export async function init (config: ClientConfig) {
  const schemaPath = path.resolve(__dirname, '__tests__/schema.graphql')
  const sourcePath = path.resolve(__dirname, '__tests__/source.graphql')

  const source = fs.readFileSync(sourcePath).toString()

  const time = String(new Date().getTime() - 1495660000000)
  let commonVariables = { time }

  // can't use the same schema as some tests are in relay mode, the query is not
  const dataSchema = buildSchema(fs.readFileSync(schemaPath).toString(), {})
  const data = await graphql({
    schema: dataSchema,
    source,
    variableValues: commonVariables,
    contextValue: { language: 'en' }
  })
  const walk = node => {
    if (node.id && node.name) {
      commonVariables[node.name.split(' ')[0].toLowerCase()] = node.id
    }
    Object.values(node).forEach(value => {
      if (typeof value === 'object') walk(value)
    })
  }
  walk(data)

  const schema = buildSchema(fs.readFileSync(schemaPath).toString(), config)
  return (source, variables, language) => {
    return graphql({
      schema,
      source,
      variableValues: { ...commonVariables, ...(variables || {}) },
      contextValue: { language: language || 'en' }
    })
  }
}
