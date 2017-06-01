/* @flow */

import fetch from 'isomorphic-fetch'

export type ClientConfig = {
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
  relay: boolean
  constructor (config: ClientConfig, predicates: Map<string, PredicateInfo>) {
    this._predicates = predicates
    this._server = config.server || 'http://localhost:8080/query'
    this._debug = config.debug || false
    this.relay = config.relay || false

    let query = 'mutation { schema {\n'
    for (var [key, value] of predicates) {
      if (key === 'id') continue
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
}
