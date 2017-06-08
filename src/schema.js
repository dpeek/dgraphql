/* @flow */

import invariant from 'invariant'

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

import getCreateMutation from './mutation/create'
import getUpdateMutation from './mutation/update'
import getDeleteMutation from './mutation/delete'

import { getFilterType } from './filter'
import { getOrderType } from './order'
import { getConnectionType } from './connection'
import { Client } from './client'
import type { ClientConfig } from './client'

import pluralize from 'pluralize'

export type Context = {
  language: string
}

function getConnectionField (
  client: Client,
  type: GraphQLObjectType,
  isRoot: boolean
): GraphQLFieldConfig<{}, Context> {
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
      if (isRoot) return resolveQuery(client, info, context)
      invariant(info.path, 'Path is not defined')
      return obj[info.path.key]
    }
  }
}

function getQueryField (
  client: Client,
  type: GraphQLObjectType
): GraphQLFieldConfig<{}, Context> {
  return {
    type,
    description: `Get a ${type.name} by \`id\``,
    args: {
      id: {
        type: new GraphQLNonNull(GraphQLID)
      }
    },
    resolve: (obj, args, context, info) => resolveQuery(client, info, context)
  }
}

function transformType (client: Client, type: GraphQLObjectType) {
  // $FlowFixMe
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
  // $FlowFixMe
  type._fields = null
  return type
}

function getType (type) {
  switch (type.kind) {
    case 'NonNullType':
      return getType(type.type)
    case 'ListType':
      return 'uid'
    case 'NamedType':
      switch (type.name.value) {
        case 'Int':
        case 'Float':
        case 'String':
          return String(type.name.value).toLowerCase()
        case 'Boolean':
          return 'bool'
        case 'ID':
          return 'string'
        default:
          return 'uid'
      }
    default:
      return 'uid'
  }
}

export function buildSchema (
  graphql: string,
  config: ClientConfig
): GraphQLSchema {
  graphql += '\ntype Query { temp: String }'

  const ast = parse(new Source(graphql))

  const info = new Map()
  info.set('__typename', {
    type: 'string',
    indexes: new Set(['hash']),
    localize: false,
    reverse: ''
  })

  ast.definitions.forEach(definition => {
    if (definition.kind !== 'ObjectTypeDefinition') return
    definition.fields.forEach(field => {
      if (!field.directives) return
      field.directives.forEach(directive => {
        const fieldName = field.name.value
        var fieldInfo = info.get(fieldName)
        if (!fieldInfo) {
          fieldInfo = {
            type: getType(field.type),
            indexes: new Set(),
            localize: false,
            reverse: ''
          }
          info.set(fieldName, fieldInfo)
        }
        const directiveName = directive.name.value
        if (!directive.arguments) return
        if (directiveName === 'localize') {
          fieldInfo.localize = true
        }
        directive.arguments.forEach(argument => {
          if (!fieldInfo || argument.value.kind !== 'StringValue') return
          const argumentName = argument.name.value
          const argumentValue = argument.value.value
          if (directiveName === 'reverse' && argumentName === 'name') {
            fieldInfo.reverse = argumentValue
          }
          if (directiveName === 'index' && argumentName === 'type') {
            fieldInfo.indexes.add(argumentValue)
          }
        })
      })
    })
  })

  const client = new Client(config, info)
  const schema = buildASTSchema(ast)
  const queries = {}
  const mutations = {}
  const typeMap = schema.getTypeMap()

  const node = nodeDefinitions(
    (id, context, info) => resolveQuery(client, info, context),
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
