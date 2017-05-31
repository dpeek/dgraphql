/* @flow */

import fetch from 'isomorphic-fetch'

export type ClientConfig = {
  server?: string,
  relay?: boolean,
  language?: string,
  debug?: boolean
}

export class Client {
  _language: string
  _predicates: Map<string, string>
  _localized: Set<string>
  _server: string
  _debug: boolean
  relay: boolean
  constructor (config: ClientConfig, predicates: { [string]: string }) {
    this._language = config.language || 'en'
    this._predicates = new Map()
    Object.keys(predicates).forEach(key =>
      this._predicates.set(key, predicates[key])
    )
    this._localized = new Set(['name', 'description'])
    this._server = config.server || 'http://localhost:8080/query'
    this._debug = config.debug || false
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
    if (this._debug) {
      console.log('-- dgraph query')
      console.log(query)
    }
    return fetch(this._server, { method: 'POST', body: query })
      .then(res => res.text())
      .then(res => {
        try {
          return JSON.parse(res)
        } catch (error) {
          throw new Error(res)
        }
      })
  }
}
