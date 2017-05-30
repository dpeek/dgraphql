/* @flow */

import { connect } from './dgraph'

export type ClientConfig = {
  server: string,
  relay?: boolean,
  language?: string
}

export class Client {
  _language: string
  _predicates: Map<string, string>
  _localized: Set<string>
  _connection: any
  relay: boolean
  constructor (config: ClientConfig, predicates: { [string]: string }) {
    this._language = config.language || 'en'
    this._predicates = new Map()
    Object.keys(predicates).forEach(key =>
      this._predicates.set(key, predicates[key])
    )
    this._localized = new Set(['name', 'description'])
    this._connection = connect(config.server || 'http://localhost:8080')
    this.relay = config.relay || false
  }
  getPredicate (type: string, field: string): string {
    const key = `${type}.${field}`
    return this.localizePredicate(this._predicates.get(key) || field)
  }
  localizePredicate (predicate: string): string {
    if (this._localized.has(predicate)) {
      return `${predicate}@${this._language}`
    }
    return predicate
  }
  localizeValue (value: mixed, predicate: string): string {
    if (this._localized.has(predicate)) {
      return `"${String(value)}"@${this._language}`
    }
    return `"${String(value)}"`
  }
  fetchQuery (query: string) {
    return this._connection.query(query)
  }
}
