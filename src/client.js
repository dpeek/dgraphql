// @flow

import fetch from 'isomorphic-fetch'
import { parse, GraphQLSchema, Source } from 'graphql'
import buildSchema from './buildSchema'

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
  indexes: Set<string>
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
    reverse: ''
  })

  ast.definitions.forEach(definition => {
    if (definition.kind !== 'ObjectTypeDefinition') return
    definition.fields.forEach(field => {
      if (field.name === 'id') return
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
  }
}
