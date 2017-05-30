/* @flow */

import fetch from 'isomorphic-fetch'

type DgraphLatency = {
  json: string,
  parsing: string,
  processing: string,
  total: string
}

type DgraphResult = {
  code: void,
  uids?: { [string]: string },
  server_latency?: DgraphLatency
}

type DgraphError = {
  code: 'Error',
  message: string
}

function get (
  server: string,
  query: string
): Promise<DgraphResult | DgraphError> {
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
      if (res.code === 'Error') {
        throw new Error(res.message)
      }
      return res
    })
  }
  return { query }
}
