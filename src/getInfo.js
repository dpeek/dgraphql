// @flow

import invariant from 'invariant'
import { visit } from 'graphql'

import { getArguments } from './utils'

import type { DocumentNode } from 'graphql'

export type FieldInfo = {
  type: string,
  indexes: Set<string>,
  localize: boolean,
  reverse: string,
  orders: Set<string>
}

export type SchemaInfo = Map<string, FieldInfo>

export default function getInfo (ast: DocumentNode): SchemaInfo {
  const info = new Map()
  info.set('__typename', {
    type: 'string',
    indexes: new Set(['hash']),
    localize: false,
    reverse: '',
    orders: new Set()
  })
  const types = {}
  ast.definitions.forEach(def => {
    if (def.name && def.name.value) types[String(def.name.value)] = def
  })
  visit(ast, {
    Directive: (directive, key, parent, path, ancestors) => {
      const field = ancestors[ancestors.length - 1]
      if (field.kind === 'FieldDefinition') {
        const type = ancestors[ancestors.length - 4][0]
        if (type.kind === 'ObjectTypeDefinition') {
          const typeName = type.name.value
          const fieldName = field.name.value
          const fieldType = getType(field.type, types)
          const args = getArguments(null, directive.arguments || [])

          const fieldInfo = info.get(fieldName) || {
            type: fieldType,
            indexes: new Set(),
            orders: new Set(),
            filters: new Map(),
            localize: false,
            reverse: ''
          }
          info.set(fieldName, fieldInfo)
          switch (directive.name.value) {
            case 'localize':
              fieldInfo.localize = true
              break
            case 'order':
              fieldInfo.orders.add(typeName)
              break
            case 'reverse':
              invariant(
                typeof args.name === 'string',
                '@reverse must provide name'
              )
              fieldInfo.reverse = args.name
              break
            case 'filter':
              invariant(
                Array.isArray(args.types),
                '@reverse must provide array of filter types'
              )
              args.types.forEach(type => {
                switch (type) {
                  case 'EQUALITY':
                    if (fieldType === 'string') {
                      fieldInfo.indexes.add('exact')
                    } else {
                      fieldInfo.indexes.add(fieldType)
                    }
                    break
                  case 'TERM':
                    if (fieldType === 'string') {
                      fieldInfo.indexes.add('term')
                    } else {
                      throw new Error(
                        `Unsupported filter TERM on field type ${fieldType}`
                      )
                    }
                    break
                }
              })
              break
          }
        }
      }
    }
  })
  return info
}

function getType (type, types) {
  switch (type.kind) {
    case 'NonNullType':
      return getType(type.type, types)
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
        case 'Date':
        case 'DateTime':
          return 'datetime'
        default:
          if (types[type.name.value].kind === 'EnumTypeDefinition') {
            return 'string'
          }
          return 'uid'
      }
    default:
      return 'uid'
  }
}
