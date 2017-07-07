// @flow

import invariant from 'invariant'

import { GraphQLObjectType, GraphQLList } from 'graphql'
import { unwrapNonNull } from '../utils'

import type { GraphQLResolveInfo } from 'graphql'
import type { Context } from '../client'

export default function getMutation (
  info: GraphQLResolveInfo,
  context: Context,
  type: GraphQLObjectType,
  input: {},
  subject: string
) {
  const stamp = new Date().toISOString()
  const node = Object.assign({}, input, { createdAt: stamp, updatedAt: stamp })
  return getMutationFields(info, context, type, node, subject, 0)
}

function getMutationFields (
  info: GraphQLResolveInfo,
  context: Context,
  type: GraphQLObjectType,
  input: { id?: string, updatedAt: string, createdAt: string },
  subject: string,
  count: number
) {
  const isCreate = !input.id
  let query = ''
  if (subject.indexOf('node') !== -1) {
    query += `  ${subject} <__typename> "${type.name}" .\n`
  }
  const fields = type.getFields()
  Object.keys(input).forEach(key => {
    if (key === 'id') return
    if (key === 'createdAt' && !isCreate) return
    if (typeof fields[key] === 'undefined') return
    let fieldType = unwrapNonNull(fields[key].type)
    if (
      fieldType instanceof GraphQLObjectType ||
      fieldType instanceof GraphQLList
    ) {
      let nodes = []
      if (fieldType instanceof GraphQLList) {
        nodes = input[key]
        fieldType = unwrapNonNull(fieldType.ofType)
      } else {
        nodes = [input[key]]
      }
      nodes.forEach(node => {
        count++
        invariant(fieldType instanceof GraphQLObjectType, 'Invalid')
        let nodeIdent = node.id ? `<${node.id}>` : `_:node${count}`
        let child = getMutationFields(
          info,
          context,
          fieldType,
          Object.assign({}, node, {
            createdAt: input.createdAt,
            updatedAt: input.updatedAt
          }),
          nodeIdent,
          count
        )
        query = child + query
        query += `  ${subject} <${key}> ${nodeIdent} .\n`
        let reverse = context.client.getReversePredicate(key)
        if (reverse) {
          query += `  ${nodeIdent} <${reverse}> ${subject} .\n`
        }
      })
    } else {
      const value = context.client.localizeValue(
        input[key],
        key,
        context.language
      )
      query += `  ${subject} <${key}> ${value} .\n`
    }
  })
  return query
}
