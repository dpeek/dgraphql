/* @flow */

import fetch from 'isomorphic-fetch'

export type DgraphError = {
  code: 'Error',
  message: string
}

export type DgraphLatency = {
  json: string,
  parsing: string,
  processing: string,
  total: string
}

export type DgraphResult = {
  uids?: { [string]: string },
  server_latency?: DgraphLatency
}

export type DgraphResponse = DgraphResult | DgraphError

function get (server: string, query: string): Promise<DgraphResponse> {
  console.log('-- dgraph query')
  console.log(query)
  return fetch(server + '/query', { method: 'POST', body: query })
    .then(res => res.text())
    .then(res => {
      try {
        return JSON.parse(res)
      } catch (error) {
        return { code: 'Error', message: res }
      }
    })
}

export function connect (server: string) {
  async function query (query: string): Promise<DgraphResult> {
    return get(server, query).then(res => {
      if (res.code === 'Error') throw new Error(res.message)
      return res
    })
  }
  return { query }
}
