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

const pluralize: (input: string) => string = require('pluralize')

export type DgraphQLOptions = {
  relay: boolean,
  predicateMap: { [string]: string }
}

function getConnectionField (
  options: DgraphQLOptions,
  type: GraphQLObjectType,
  isRoot: boolean
): GraphQLFieldConfig<{}, {}> {
  const filterType = getFilterType(type)
  const orderType = getOrderType(type)
  return {
    type: options.relay ? getConnectionType(type) : new GraphQLList(type),
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
      if (isRoot) return resolveQuery(options, info)
      if (info.path) return obj[info.path.key]
      return null
    }
  }
}

function getQueryField (
  options: DgraphQLOptions,
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
    resolve: (obj, args, context, info) => resolveQuery(options, info)
  }
}

function transformType (options: DgraphQLOptions, type: GraphQLObjectType) {
  const typeFields = type._typeConfig.fields()
  type._typeConfig.fields = typeFields
  Object.keys(typeFields).forEach(key => {
    const field = typeFields[key]
    const fieldType = unwrapNonNull(field.type)
    if (fieldType instanceof GraphQLList) {
      const nodeType = unwrapNonNull(fieldType.ofType)
      if (nodeType instanceof GraphQLObjectType) {
        const newField = getConnectionField(options, nodeType, false)
        type._typeConfig.fields[key] = newField
      }
    }
  })
  type._fields = null
  return type
}

export function buildSchema (
  graphql: string,
  options: DgraphQLOptions
): GraphQLSchema {
  const predicateMap = {}
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
            predicateMap[definition.name.value + '.' + field.name.value] =
              argument.value.value
          }
        })
      })
    })
  })
  options.predicateMap = predicateMap
  const schema = buildASTSchema(ast)
  const queries = {}
  const mutations = {}
  const typeMap = schema.getTypeMap()

  const node = nodeDefinitions(
    (id, context, info) => resolveQuery(options, info),
    (value, context, info) => info.schema.getType(value.__typename)
  )

  Object.keys(typeMap).forEach(name => {
    if (name.indexOf('_') > -1 || name === 'Query') return
    let type = typeMap[name]
    if (!(type instanceof GraphQLObjectType)) return

    type = transformType(options, type)
    type._interfaces.push(node.nodeInterface)

    let singular = lowerCamelCase(name)
    queries[singular] = getQueryField(options, type)
    queries[pluralize(singular)] = getConnectionField(options, type, true)

    mutations['create' + name] = getCreateMutation(options, type)
    mutations['update' + name] = getUpdateMutation(options, type)
    mutations['delete' + name] = getDeleteMutation(options, type)

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
