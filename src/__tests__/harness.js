// @flow

import { graphql } from 'graphql'
import { Client } from '../client'

function getVariables (node, variables) {
  const vars = variables || {}
  if (node && node.id && node.name && typeof node.name === 'string') {
    vars[node.name.split(' ')[0].toLowerCase()] = node.id
  }
  Object.values(node).forEach(value => {
    if (value && typeof value === 'object') getVariables(value, vars)
  })
  return vars
}

function sanitize (value: string | {}) {
  if (typeof value === 'string') return value.replace(/0x[a-zA-Z0-9]+/, '0x00')
  if (!value || typeof value !== 'object') return value
  const sanitized = {}
  Object.keys(value).forEach(key => {
    if (key !== 'id') {
      sanitized[key] = sanitize(value[key])
    }
  })
  return sanitized
}

export async function init (relay?: boolean = false) {
  const client = new Client({ relay, debug: false })
  await client.init

  const query1 = (source, variables, language) => {
    return graphql({
      source,
      schema: client.schema,
      variableValues: variables || {},
      contextValue: client.getContext(language)
    })
  }

  function sequence (queries, vars) {
    vars = vars || {}
    let result = Promise.resolve()
    queries.forEach(query => {
      result = result.then(() =>
        query1(query, vars).then(res => {
          vars = { ...vars, ...getVariables(res) }
          expect(sanitize(res)).toMatchSnapshot()
          return vars
        })
      )
    })
    return result
  }

  return { graphql: query1, sequence: sequence }
}
