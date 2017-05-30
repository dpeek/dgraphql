/* @flow */

import {
  GraphQLID,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLNonNull,
  GraphQLList,
  GraphQLInt,
  parse,
  buildASTSchema,
  Source
} from 'graphql'

import type { GraphQLFieldConfig } from 'graphql'

import { nodeDefinitions } from 'graphql-relay'

import { unwrapNonNull, lowerCamelCase } from './utils'
import { resolveQuery } from './request'

import {
  getDeleteMutation,
  getCreateMutation,
  getUpdateMutation
} from './mutation'

import { getFilterType } from './filter'
import { getOrderType } from './order'
import { getConnectionType } from './connection'
import { Client } from './client'
import type { ClientConfig } from './client'

const pluralize: (input: string) => string = require('pluralize')

function getConnectionField (
  client: Client,
  type: GraphQLObjectType,
  isRoot: boolean
): GraphQLFieldConfig<{}, {}> {
  const filterType = getFilterType(type)
  const orderType = getOrderType(type)
  return {
    type: client.relay ? getConnectionType(type) : new GraphQLList(type),
    description: `Get filtered, ordered, paginated ${pluralize(type.name)}`,
    args: {
      first: {
        type: GraphQLInt
      },
      after: {
        type: GraphQLID
      },
      ...(filterType && { filter: { type: filterType } }),
      ...(orderType && { order: { type: orderType } })
    },
    resolve: (obj, args, context, info) => {
      if (isRoot) return resolveQuery(client, info)
      if (info.path) return obj[info.path.key]
      return null
    }
  }
}

function getQueryField (
  client: Client,
  type: GraphQLObjectType
): GraphQLFieldConfig<{}, {}> {
  return {
    type,
    description: `Get a ${type.name} by \`id\``,
    args: {
      id: {
        type: new GraphQLNonNull(GraphQLID)
      }
    },
    resolve: (obj, args, context, info) => resolveQuery(client, info)
  }
}

function transformType (client: Client, type: GraphQLObjectType) {
  const typeFields = type._typeConfig.fields()
  type._typeConfig.fields = typeFields
  Object.keys(typeFields).forEach(key => {
    const field = typeFields[key]
    const fieldType = unwrapNonNull(field.type)
    if (fieldType instanceof GraphQLList) {
      const nodeType = unwrapNonNull(fieldType.ofType)
      if (nodeType instanceof GraphQLObjectType) {
        const newField = getConnectionField(client, nodeType, false)
        type._typeConfig.fields[key] = newField
      }
    }
  })
  type._fields = null
  return type
}

export function buildSchema (
  graphql: string,
  config: ClientConfig
): GraphQLSchema {
  const predicates = {}
  const ast = parse(new Source(graphql))

  ast.definitions.forEach(definition => {
    if (definition.kind !== 'ObjectTypeDefinition') return
    definition.fields.forEach(field => {
      if (!field.directives) return
      field.directives.forEach(directive => {
        if (directive.name.value !== 'dgraph') return
        if (!directive.arguments) return
        directive.arguments.forEach(argument => {
          if (
            argument.value.kind === 'StringValue' &&
            argument.name.value === 'predicate'
          ) {
            predicates[definition.name.value + '.' + field.name.value] =
              argument.value.value
          }
        })
      })
    })
  })
  const client = new Client(config, predicates)
  const schema = buildASTSchema(ast)
  const queries = {}
  const mutations = {}
  const typeMap = schema.getTypeMap()

  const node = nodeDefinitions(
    (id, context, info) => resolveQuery(client, info),
    (value, context, info) => info.schema.getType(value.__typename)
  )

  Object.keys(typeMap).forEach(name => {
    if (name.indexOf('_') > -1 || name === 'Query') return
    let type = typeMap[name]
    if (!(type instanceof GraphQLObjectType)) return

    type = transformType(client, type)
    type._interfaces.push(node.nodeInterface)

    let singular = lowerCamelCase(name)
    queries[singular] = getQueryField(client, type)
    queries[pluralize(singular)] = getConnectionField(client, type, true)

    mutations['create' + name] = getCreateMutation(client, type)
    mutations['update' + name] = getUpdateMutation(client, type)
    mutations['delete' + name] = getDeleteMutation(client, type)

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
