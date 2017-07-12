// @flow

import invariant from 'invariant'

import { GraphQLObjectType, GraphQLList } from 'graphql'
import { unwrapNonNull } from '../utils'

import type { GraphQLResolveInfo } from 'graphql'
import type { Context } from '../client'

type NodeInput = {
  id?: string,
  updatedAt: string,
  createdAt: string,
  [string]: { id?: string }
}

export default function getMutation (
  info: GraphQLResolveInfo,
  context: Context,
  type: GraphQLObjectType,
  input: {},
  subject: string
) {
  const ident = getIdent()
  const stamp = new Date().toISOString()
  const node = Object.assign({}, input, { createdAt: stamp, updatedAt: stamp })
  return getMutationFields(context, type, node, subject, ident)
}

function getMutationFields (
  context: Context,
  type: GraphQLObjectType,
  input: NodeInput,
  subject: string,
  ident: (id?: string) => string
) {
  const isCreate = !input.id
  let query = ''
  if (isCreate) {
    query += `  ${subject} <__typename> "${type.name}" .\n`
  }
  const fields = type.getFields()
  Object.keys(input).forEach(key => {
    if (key === 'id') return
    if (key === 'createdAt' && !isCreate) return
    if (typeof fields[key] === 'undefined') return

    const value = input[key]
    let fieldType = unwrapNonNull(fields[key].type)

    if (
      fieldType instanceof GraphQLList ||
      fieldType instanceof GraphQLObjectType
    ) {
      if (fieldType instanceof GraphQLList) {
        fieldType = unwrapNonNull(fieldType.ofType)
      }
      const values = Array.isArray(value) ? value : [value]
      values
        .map(value => {
          invariant(typeof value === 'object', 'Input value is not object')
          return Object.assign({}, value, {
            createdAt: input.createdAt,
            updatedAt: input.updatedAt
          })
        })
        .forEach(node => {
          invariant(fieldType instanceof GraphQLObjectType, 'Type not object')
          query += getNodeQuery(context, node, fieldType, ident, subject, key)
        })
    } else {
      const locale = context.client.localizeValue(value, key, context.language)
      query += `  ${subject} <${key}> ${locale} .\n`
    }
  })
  return query
}

function getNodeQuery (
  context: Context,
  input: NodeInput,
  type: GraphQLObjectType,
  ident: (id?: string) => string,
  subject,
  predicate
) {
  let value = ident(input.id)
  let query = `  ${subject} <${predicate}> ${value} .\n`
  let reverse = context.client.getReversePredicate(predicate)
  if (reverse) {
    query += `  ${value} <${reverse}> ${subject} .\n`
  }
  query += getMutationFields(context, type, input, value, ident)
  return query
}

function getIdent () {
  let count = 0
  return (id?: string) => (id ? `<${id}>` : `_:node${count++}`)
}
