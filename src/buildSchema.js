// @flow

import {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLList,
  buildASTSchema
} from 'graphql'

import { unwrapNonNull, lowerCamelCase } from './utils'

import { Client } from './client'
import pluralize from 'pluralize'

import getIdField from './field/getIdField'
import getListField from './field/getListField'
import getQueryField from './field/getQueryField'
import getObjectField from './field/getObjectField'
import getNodeField from './field/getNodeField'

import getNodeInterface from './type/getNodeInterface'

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
        typeFields[key] = getListField(client, nodeType, client.relay)
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

  const nodeInterface = getNodeInterface()
  const nodeField = getNodeField(nodeInterface)

  Object.keys(typeMap).forEach(name => {
    if (name.indexOf('_') > -1 || name === 'Query') return
    let type = typeMap[name]
    if (!(type instanceof GraphQLObjectType)) return

    type = transformType(client, type, mutations)
    type._interfaces.push(nodeInterface)

    let singular = lowerCamelCase(name)
    queries[singular] = getQueryField(type)
    queries[pluralize(singular)] = getListField(client, type)

    Object.assign(mutations, getTypeMutations(client, type))

    queries['node'] = nodeField
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
