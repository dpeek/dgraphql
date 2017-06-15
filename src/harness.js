// @flow

import fs from 'fs'
import path from 'path'

import { graphql } from 'graphql'

import { Client } from './client'

export async function init (relay?: boolean = false) {
  const schemaPath = path.resolve(__dirname, '__tests__/schema.graphql')
  const schema = fs.readFileSync(schemaPath).toString()

  const sourcePath = path.resolve(__dirname, '__tests__/source.graphql')
  const source = fs.readFileSync(sourcePath).toString()

  const time = String(new Date().getTime() - 1495660000000)
  let commonVariables = { time }

  // can't use the same client as some tests are in relay mode, the query is not
  let client = new Client({ schema, debug: true })
  const result = await graphql({
    source,
    schema: client.schema,
    variableValues: commonVariables,
    contextValue: client.getContext()
  })

  const walk = node => {
    if (node && node.id && node.name && typeof node.name === 'string') {
      commonVariables[node.name.split(' ')[0].toLowerCase()] = node.id
    }
    Object.values(node).forEach(value => {
      if (typeof value === 'object') walk(value)
    })
  }
  console.log(result)
  if (result.data) walk(result.data)
  else throw new Error(result.errors)

  client = new Client({ schema, relay, debug: true })
  return (source, variables, language) => {
    return graphql({
      source,
      schema: client.schema,
      variableValues: { ...commonVariables, ...(variables || {}) },
      contextValue: client.getContext(language)
    })
  }
}
