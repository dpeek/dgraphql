// @flow

import { DgraphClientStub, DgraphClient, Operation, Mutation } from 'dgraph-js'
import { parse, GraphQLSchema, Source } from 'graphql'

import transformSchema from './transformSchema'
import buildSchema from './buildSchema'
import getInfo from './getInfo'

import type { SchemaInfo } from './getInfo'

export type ClientConfig = {
  relay?: boolean,
  debug?: boolean
}

const stub = new DgraphClientStub()
const client = new DgraphClient(stub)
const updateTypeName = 'SchemaUpdate'

export class Client {
  _info: SchemaInfo
  _debug: boolean

  init: Promise<any>
  schema: GraphQLSchema
  relay: boolean

  constructor (config: ClientConfig) {
    this._debug = config.debug || false
    this.init = this.loadSchema()
    this.relay = config.relay || false
  }
  loadSchema () {
    return client
      .newTxn()
      .query(`{ updates(func:has(type${updateTypeName})) { schema }}`)
      .then(res => {
        const data = JSON.parse(new Buffer(res.getJson_asU8()).toString())
        const update = data.updates.pop()
        if (!update) throw new Error('dgraph not initialised with schema')
        const ast = transformSchema(
          parse(new Source(update.schema)),
          this.relay
        )
        this._info = getInfo(ast)
        this.schema = buildSchema(ast, this)
      })
  }
  async updateSchema (schema: string) {
    const ast = transformSchema(parse(new Source(schema)), this.relay)
    const info = getInfo(ast)

    let gql = ''
    for (var [key, value] of info) {
      gql += key + ': ' + value.type
      if (value.indexes.size) {
        gql += ' @index(' + [...value.indexes].join(',') + ')'
      }
      gql += ' .\n'
    }

    const op = new Operation()
    op.setSchema(gql)
    await client.alter(op)

    const version = 1
    schema = schema.replace(/\n/g, '\\n')
    schema = schema.replace(/"/g, '\\"')
    let sets = `_:node <type${updateTypeName}> "" .\n`
    sets += `_:node <__typename> "${updateTypeName}" .\n`
    sets += `_:node <schema> "${schema}" .\n`
    sets += `_:node <version> "${version}" .\n`
    const mutation = new Mutation()
    mutation.setCommitNow(true)
    mutation.setSetNquads(new Uint8Array(new Buffer(sets)))
    const txn = client.newTxn()
    await txn.mutate(mutation)
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
  dropAll () {
    const op = new Operation()
    op.setDropAll(true)
    return client.alter(op)
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
