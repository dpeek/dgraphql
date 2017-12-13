// @flow

const dgraph = require('dgraph-js')
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

const stub = new dgraph.DgraphClientStub()
const client = new dgraph.DgraphClient(stub)

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

    const op = new dgraph.Operation()
    op.setSchema(gql)
    this._updateSchema = client.alter(op)
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
  query (gql: string) {
    return client
      .newTxn()
      .query(gql)
      .then(res => {
        return JSON.parse(new Buffer(res.getJson_asU8()).toString())
      })
  }
  mutate (mutation: *) {
    mutation.setCommitNow(true)
    const txn = client.newTxn()
    return txn.mutate(mutation)
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
