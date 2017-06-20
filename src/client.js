// @flow

import invariant from 'invariant'
import fetch from 'isomorphic-fetch'
import { parse, GraphQLSchema, Source } from 'graphql'
import buildSchema from './buildSchema'
import { getValue } from './utils'

import type { Context } from './context'

export type ClientConfig = {
  schema: string,
  server?: string,
  relay?: boolean,
  language?: string,
  debug?: boolean
}

type PredicateInfo = {
  type: string,
  reverse: ?string,
  localize: boolean,
  indexes: Set<string>,
  orders: Set<string>,
  filters: Map<string, Set<string>>
}

export class Client {
  _predicates: Map<string, PredicateInfo>
  _server: string
  _debug: boolean
  _updateSchema: Promise<any>

  schema: GraphQLSchema
  relay: boolean

  constructor (config: ClientConfig) {
    const boiler = '\ntype Query { temp: String }'
    const ast = parse(new Source(config.schema + boiler))
    this._predicates = getPredicates(ast)

    this._server = config.server || 'http://localhost:8080/query'
    this._debug = config.debug || false

    this.relay = config.relay || false
    this.schema = buildSchema(ast, this)

    let query = 'mutation { schema {\n'
    for (var [key, value] of this._predicates) {
      query += '  ' + key + ': ' + value.type
      if (value.indexes.size) {
        query += ' @index(' + [...value.indexes].join(',') + ')'
      }
      query += ' .\n'
    }
    query += '}}'
    this._updateSchema = this.fetchQuery(query)
  }
  getFilters (typeName: string, fieldName: string): Set<string> {
    const info = this._predicates.get(fieldName)
    if (info) {
      const filters = info.filters.get(typeName)
      if (filters) {
        return filters
      }
    }
    return new Set()
  }
  getOrder (typeName: string, fieldName: string): boolean {
    const info = this._predicates.get(fieldName)
    if (info) {
      return info.orders.has(typeName)
    }
    return false
  }
  getReversePredicate (predicate: string): ?string {
    const info = this._predicates.get(predicate)
    return info ? info.reverse : null
  }
  localizePredicate (predicate: string, language: string): string {
    const info = this._predicates.get(predicate)
    if (info && info.localize) {
      return `${predicate}@${language}`
    }
    return predicate
  }
  localizeValue (value: mixed, predicate: string, language: string): string {
    const info = this._predicates.get(predicate)
    if (info && info.localize) {
      return `"${String(value)}"@${language}`
    }
    return `"${String(value)}"`
  }
  fetchQuery (query: string) {
    if (this._debug) {
      console.log('-- dgraph query')
      console.log(query)
    }
    return (this._updateSchema || Promise.resolve())
      .then(res => {
        return fetch(this._server, { method: 'POST', body: query })
      })
      .then(res => res.text())
      .then(res => {
        try {
          let json = JSON.parse(res)
          if (this._debug) {
            console.log('--dgraph response')
            console.log(JSON.stringify(json, null, '  '))
          }
          return json
        } catch (error) {
          throw new Error(res)
        }
      })
  }
  getContext (language?: string = 'en'): Context {
    return { client: this, language }
  }
}

function getPredicates (ast) {
  const info = new Map()
  info.set('__typename', {
    type: 'string',
    indexes: new Set(['hash']),
    localize: false,
    reverse: '',
    filters: new Map(),
    orders: new Set()
  })

  ast.definitions.forEach(definition => {
    if (definition.kind !== 'ObjectTypeDefinition') return
    const typeName = definition.name.value
    definition.fields.forEach(field => {
      const fieldType = getType(field.type)
      if (field.name === 'id') return
      if (!field.directives) return
      field.directives.forEach(directive => {
        const fieldName = field.name.value
        var fieldInfo = info.get(fieldName)
        if (!fieldInfo) {
          fieldInfo = {
            type: fieldType,
            indexes: new Set(),
            orders: new Set(),
            filters: new Map(),
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
        if (directiveName === 'order') {
          fieldInfo.orders.add(typeName)
        }
        if (directiveName === 'filter') {
          const types = directive.arguments[0]
          invariant(
            typeof types !== 'undefined' && types.name.value === 'types',
            'Filter directive requires argument "types"'
          )
          invariant(
            types.value.kind === 'ListValue',
            'Filter directive argument "types" must be an array of filter types'
          )
          types.value.values.forEach(filter => {
            invariant(filter.kind === 'EnumValue', 'Filter type must be enum')
            invariant(typeof fieldInfo !== 'undefined', 'No fieldInfo')
            let filters = fieldInfo.filters.get(typeName)
            if (!filters) {
              filters = new Set()
              fieldInfo.filters.set(typeName, filters)
            }
            filters.add(filter.value)
            switch (filter.value) {
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
        }
        directive.arguments.forEach(argument => {
          if (!fieldInfo) return
          const argumentName = argument.name.value
          if (argument.value.kind === 'StringValue') {
            if (directiveName === 'reverse' && argumentName === 'name') {
              fieldInfo.reverse = argument.value.value
            }
          }
        })
      })
    })
  })
  return info
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
