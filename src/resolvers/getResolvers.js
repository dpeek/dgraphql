// @flow

import pluralize from 'pluralize'

import { GraphQLSchema, GraphQLObjectType, GraphQLList } from 'graphql'

import { unwrapNonNull, upperCamelCase, lowerCamelCase } from '../utils'

import GraphQLJSON from '../scalar/GraphQLJSON'
import GraphQLDateTime from '../scalar/GraphQLDateTime'

import resolveId from './id'
import resolveNode from './node'
import resolveList from './list'
import resolveConnection from './connection'
import resolveCreate from './create'
import resolveUpdate from './update'
import resolveDelete from './delete'
import resolveSet from './set'
import resolveUnset from './unset'
import resolveAdd from './add'
import resolveRemove from './remove'

import type { GraphNode } from '../client'

export default function getResolvers (schema: GraphQLSchema, relay: boolean) {
  const query = {}
  const mutation = {}
  const types = {}
  types.JSON = GraphQLJSON
  types.Date = GraphQLDateTime
  types.DateTime = GraphQLDateTime
  types.Query = query
  types.Mutation = mutation
  if (relay) {
    query.node = {
      resolve: resolveNode
    }
    types.Node = {
      __resolveType: (node: GraphNode) => node.__typename
    }
  }

  const typeMap = schema.getTypeMap()
  Object.keys(typeMap).forEach(typeName => {
    if (typeName.indexOf('_') === 0) return
    if (typeName === 'Query' || typeName === 'Mutation') return
    if (typeName === 'PageInfo') return
    if (typeName.endsWith('Payload')) return
    if (typeName.endsWith('Connection')) return
    if (typeName.endsWith('Edge')) return
    const type = typeMap[typeName]
    if (type instanceof GraphQLObjectType) {
      query[lowerCamelCase(typeName)] = { resolve: resolveNode }
      query[lowerCamelCase(pluralize(typeName))] = {
        resolve: relay ? resolveConnection : resolveList
      }
      const typeResolver = (types[typeName] = {
        id: { resolve: resolveId }
      })
      mutation[`create${typeName}`] = {
        resolve: resolveCreate.bind(null, type)
      }
      mutation[`update${typeName}`] = {
        resolve: resolveUpdate.bind(null, type)
      }
      mutation[`delete${typeName}`] = {
        resolve: resolveDelete.bind(null, type)
      }
      const fields = type.getFields()
      Object.keys(fields).forEach(fieldName => {
        const field = fields[fieldName]
        const relationName = typeName + upperCamelCase(fieldName)
        const fieldType = unwrapNonNull(field.type)
        if (
          fieldType instanceof GraphQLList ||
          String(fieldType).endsWith('Connection')
        ) {
          typeResolver[fieldName] = {
            resolve: relay ? resolveConnection : resolveList
          }
          mutation[`add${relationName}`] = {
            resolve: resolveAdd.bind(null, type, fieldName)
          }
          mutation[`remove${relationName}`] = {
            resolve: resolveRemove.bind(null, type, fieldName)
          }
        } else if (fieldType instanceof GraphQLObjectType) {
          typeResolver[fieldName] = { resolve: resolveNode }
          mutation[`set${relationName}`] = {
            resolve: resolveSet.bind(null, type, fieldName)
          }
          mutation[`unset${relationName}`] = {
            resolve: resolveUnset.bind(null, type, fieldName)
          }
        }
      })
    }
  })
  return types
}
