import fs from 'fs'
import path from 'path'

import { graphql } from 'graphql'
import { buildSchema } from '../schema'
import { connect } from '../dgraph'

const client = connect('http://localhost:8080')

function getSchema (options) {
  const file = path.resolve(__dirname, 'test.graphql')
  const input = fs.readFileSync(file).toString()
  return buildSchema(input, options)
}

const schema = getSchema({ relay: true })

beforeAll(async () => {
  let dgraphSchemaPath = path.resolve(__dirname, 'test.dgraph')
  await client.query(fs.readFileSync(dgraphSchemaPath).toString())
})

describe('querying connection', () => {
  let time = 0
  beforeAll(() => {
    time = String(new Date().getTime() - 1495660000000)
    const create = `mutation {
      aaron: createPerson(input: {
        name: "Aaron Whitman",
        active: true,
        age:20,
        time: ${time}
      }) {
        person { id }
      }
      bobby: createPerson(input: {
        name: "Bobby Whitman",
        active: false,
        age: 16,
        time: ${time}
      }) {
        person { id }
      }
      catherine: createPerson(input: {
        name: "Catherine Harrison",
        active: true,
        age: 19,
        time: ${time}
      }) {
        person { id }
      }
    }`
    return graphql(schema, create)
  })
  test('edge node fields', async () => {
    const query = `query {
      people(
        order: name_desc,
        filter: {
          time_eq: ${time}
        }
      ) {
        edges {
          node {
            name
          }
        }
      }
    }`
    const queryResult = await graphql(schema, query)
    expect(queryResult).toMatchSnapshot()
  })
  test('edge cursor', async () => {
    const query = `query {
      people(
        order: name_desc,
        filter: {
          time_eq: ${time}
        }
      ) {
        edges {
          node {
            id
          }
          cursor
        }
      }
    }`
    const queryResult = await graphql(schema, query)
    expect(queryResult.data.people.edges[0].cursor).toEqual(
      queryResult.data.people.edges[0].node.id
    )
  })
  test('first n edges', async () => {
    const first = 2
    const query = `query {
      people(
        order: name_desc,
        filter: {
          time_eq: ${time}
        },
        first: ${first}
      ) {
        edges {
          node {
            name
          }
        }
      }
    }`
    const queryResult = await graphql(schema, query)
    expect(queryResult.data.people.edges.length).toEqual(first)
  })
  test('queries connection count ignoring first', async () => {
    const query = `query {
      people(
        filter: {
          time_eq: ${time}
        },
        first: 2
      ) {
        count
      }
    }`
    const queryResult = await graphql(schema, query)
    expect(queryResult.data.people.count).toEqual(3)
  })
  test('queries connection pageInfo.hasNextPage', async () => {
    const query = `query {
      people(
        filter: {
          time_eq: ${time}
        },
        first: 2
      ) {
        pageInfo {
          hasNextPage
        }
      }
    }`
    const queryResult = await graphql(schema, query)
    expect(queryResult.data.people.pageInfo.hasNextPage).toEqual(true)
  })
  test('pageInfo.hasNextPage indicates availability of next page', async () => {
    const query = `query {
      people(
        filter: {
          time_eq: ${time}
        },
        first: 10
      ) {
        pageInfo {
          hasNextPage
        }
      }
    }`
    const queryResult = await graphql(schema, query)
    expect(queryResult.data.people.pageInfo.hasNextPage).toEqual(false)
  })
  test('queries connection pageInfo.hasPreviousPage', async () => {
    const query = `query {
      people(
        filter: {
          time_eq: ${time}
        },
        first: 2
      ) {
        pageInfo {
          hasPreviousPage
        }
      }
    }`
    const queryResult = await graphql(schema, query)
    expect(queryResult.data.people.pageInfo.hasPreviousPage).toEqual(false)
  })
  test('pageInfo.hasPreviousPage indicates availability of previous page', async () => {
    const query = `query {
      people(
        filter: {
          time_eq: ${time}
        },
        first: 1
      ) {
        pageInfo {
          endCursor
        }
      }
    }`
    const queryResult = await graphql(schema, query)
    const firstId = queryResult.data.people.pageInfo.endCursor
    const afterQuery = `query {
      people(
        filter: {
          time_eq: ${time}
        },
        after: "${firstId}"
      ) {
        pageInfo {
          hasPreviousPage
        }
      }
    }`
    const afterQueryResult = await graphql(schema, afterQuery)
    expect(afterQueryResult.data.people.pageInfo.hasPreviousPage).toEqual(true)
  })
  test('pageInfo endCursor returns last cursor in query', async () => {
    const query = `query {
      people(
        filter: {
          time_eq: ${time}
        },
        first: 2
      ) {
        edges {
          cursor
        }
        pageInfo {
          endCursor
        }
      }
    }`
    const queryResult = await graphql(schema, query)
    expect(queryResult.data.people.pageInfo.endCursor).toEqual(
      queryResult.data.people.edges[queryResult.data.people.edges.length - 1]
        .cursor
    )
  })
  test('pageInfo startCursor returns first cursor in query', async () => {
    const query = `query {
      people(
        filter: {
          time_eq: ${time}
        },
        first: 2
      ) {
        edges {
          cursor
        }
        pageInfo {
          startCursor
        }
      }
    }`
    const queryResult = await graphql(schema, query)
    expect(queryResult.data.people.pageInfo.startCursor).toEqual(
      queryResult.data.people.edges[0].cursor
    )
  })
})
