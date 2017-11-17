// @flow

import fetch from 'isomorphic-fetch'
import { parse, GraphQLSchema, Source } from 'graphql'

import transformSchema from './transformSchema'
import buildSchema from './buildSchema'
import getInfo from './getInfo'

import type { SchemaInfo } from './getInfo'

export type ClientConfig = {
  schema: string,
  server?: string,
  relay?: boolean,
  language?: string,
  debug?: boolean
}

export class Client {
  _info: SchemaInfo
  _server: string
  _debug: boolean
  _updateSchema: Promise<any>

  schema: GraphQLSchema
  relay: boolean

  constructor (config: ClientConfig) {
    this._server = config.server || 'http://localhost:8080'
    this._debug = config.debug || false
    this.relay = config.relay || false

    const ast = transformSchema(parse(new Source(config.schema)), this.relay)

    this._info = getInfo(ast)
    this.schema = buildSchema(ast, this)

    let gql = ''
    for (var [key, value] of this._info) {
      gql += key + ': ' + value.type
      if (value.indexes.size) {
        gql += ' @index(' + [...value.indexes].join(',') + ')'
      }
      gql += ' .\n'
    }
    this._updateSchema = this.alter(gql)
  }
  getReversePredicate (predicate: string): ?string {
    const info = this._info.get(predicate)
    return info ? info.reverse : null
  }
  localizePredicate (predicate: string, language: string): string {
    const info = this._info.get(predicate)
    if (info && info.localize) {
      return `${predicate}@${language}`
    }
    return predicate
  }
  localizeValue (value: mixed, predicate: string, language: string): string {
    const info = this._info.get(predicate)
    if (info && info.localize) {
      return `"${String(value)}"@${language}`
    }
    return `"${String(value)}"`
  }
  alter (gql: string) {
    return this.fetchQuery('alter', gql)
  }
  query (gql: string) {
    return this.fetchQuery('query', gql)
  }
  mutate (gql: string) {
    return this.fetchQuery('mutate', gql)
  }
  fetchQuery (action: string, gql: string): Promise<GraphResponse> {
    if (this._debug) {
      console.log(`${this._server}/${action}`)
      console.log(gql)
    }
    return (this._updateSchema || Promise.resolve())
      .then(res => {
        const headers = {}
        if (action === 'mutate') headers['X-Dgraph-CommitNow'] = 'true'
        return fetch(`${this._server}/${action}`, { method: 'POST', body: gql, headers: headers })
      })
      .then(res => res.text())
      .then(res => {
        try {
          let json = JSON.parse(res)
          if (this._debug) {
            console.log('--dgraph response')
            console.log(JSON.stringify(json, null, '  '))
          }
          if (json.error) {
            throw json.error
          }
          return json.data || {}
        } catch (error) {
          throw new Error(res)
        }
      })
  }
  getContext (language?: string = 'en'): Context {
    return { client: this, language }
  }
}

export type Context = {
  client: Client,
  language: string
}

export type GraphNode = {
  uid: string,
  __typename?: string,
  [string]: Array<GraphNode>
}

export type GraphResponse = {
  uids: { [string]: string },
  [string]: Array<GraphNode>
}
