// @flow

import invariant from 'invariant'

import {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLList,
  buildASTSchema
} from 'graphql'

import { nodeDefinitions } from 'graphql-relay'

import { unwrapNonNull, lowerCamelCase } from './utils'
import resolve from './resolve'

import { Client } from './client'
import pluralize from 'pluralize'

import getIdField from './field/getIdField'
import getListField from './field/getListField'
import getQueryField from './field/getQueryField'
import getObjectField from './field/getObjectField'

import getTypeMutations from './mutations/getTypeMutations'
import getFieldMutations from './mutations/getFieldMutations'

import type { DocumentNode, GraphQLFieldConfig } from 'graphql'
import type { Context } from './context'

function transformType (client: Client, type: GraphQLObjectType, mutation: {}) {
  const typeFields: {
    [string]: GraphQLFieldConfig<any, Context>
    // $FlowFixMe
  } = type._typeConfig.fields()
  type._typeConfig.fields = typeFields
  Object.keys(typeFields).forEach(key => {
    const field = typeFields[key]
    if (key === 'id') {
      typeFields[key] = getIdField()
    }
    const fieldType = unwrapNonNull(field.type)
    Object.assign(mutation, getFieldMutations(type, fieldType, key))
    if (fieldType instanceof GraphQLList) {
      const nodeType = unwrapNonNull(fieldType.ofType)
      if (nodeType instanceof GraphQLObjectType) {
        typeFields[key] = getListField(nodeType, client.relay)
      }
    } else if (fieldType instanceof GraphQLObjectType) {
      typeFields[key] = getObjectField(fieldType)
    }
  })
  // $FlowFixMe
  type._fields = null
  return type
}

export default function buildSchema (
  ast: DocumentNode,
  client: Client
): GraphQLSchema {
  const schema = buildASTSchema(ast)
  const queries = {}
  const mutations = {}
  const typeMap = schema.getTypeMap()

  const node = nodeDefinitions(
    (id, context, info) => {
      return resolve({}, context, info).then(nodes => nodes[0])
    },
    (value, context, info) => {
      const type = info.schema.getType(value.__typename)
      invariant(type instanceof GraphQLObjectType, 'Type is not an object')
      return type
    }
  )

  Object.keys(typeMap).forEach(name => {
    if (name.indexOf('_') > -1 || name === 'Query') return
    let type = typeMap[name]
    if (!(type instanceof GraphQLObjectType)) return

    type = transformType(client, type, mutations)
    type._interfaces.push(node.nodeInterface)

    let singular = lowerCamelCase(name)
    queries[singular] = getQueryField(type)
    queries[pluralize(singular)] = getListField(type, client.relay)

    Object.assign(mutations, getTypeMutations(client, type))

    queries['node'] = node.nodeField
  })
  return new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'Query',
      fields: queries
    }),
    mutation: new GraphQLObjectType({
      name: 'Mutation',
      fields: mutations
    })
  })
}
