import { init } from './harness'

var graphql

beforeAll(async () => {
  graphql = await init(true)
})

test('queries node with fragment', async () => {
  const query = `query TestQuery($david: ID!) {
    node(id: $david) {
      ... on Person {
        name
      }
    }
  }`
  const result = await graphql(query)
  expect(result).toMatchSnapshot()
})

test('queries node with inline fragment', async () => {
  const query = `query TestQuery($david: ID!) {
    node(id: $david) {
      ... personFields
    }
  }
  fragment personFields on Person {
    name
  }`
  const result = await graphql(query)
  expect(result).toMatchSnapshot()
})

test('edge node fields', async () => {
  const query = `query TestQuery($time: Int) {
    people(
      order: name_desc,
      filter: {
        time_eq: $time
      }
    ) {
      edges {
        node {
          name
        }
      }
    }
  }`
  const result = await graphql(query)
  expect(result).toMatchSnapshot()
})

test('edge cursor', async () => {
  const query = `query TestQuery($time: Int) {
    people(
      order: name_desc,
      filter: {
        time_eq: $time
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
  const result = await graphql(query)
  expect(result.data.people.edges[0].cursor).toEqual(
    result.data.people.edges[0].node.id
  )
})

test('first n edges', async () => {
  const first = 2
  const query = `query TestQuery($time: Int) {
      people(
        order: name_desc,
        filter: {
          time_eq: $time
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
  const result = await graphql(query)
  expect(result.data.people.edges.length).toEqual(first)
})

test('queries connection count ignoring first', async () => {
  const query = `query TestQuery($time: Int) {
      people(
        filter: {
          time_eq: $time
        },
        first: 2
      ) {
        count
      }
    }`
  const result = await graphql(query)
  expect(result.data.people.count).toEqual(5)
})

test('queries connection pageInfo.hasNextPage', async () => {
  const query = `query TestQuery($time: Int) {
      people(
        filter: {
          time_eq: $time
        },
        first: 2
      ) {
        pageInfo {
          hasNextPage
        }
      }
    }`
  const result = await graphql(query)
  expect(result.data.people.pageInfo.hasNextPage).toEqual(true)
})

test('pageInfo.hasNextPage indicates availability of next page', async () => {
  const query = `query TestQuery($time: Int) {
      people(
        filter: {
          time_eq: $time
        },
        first: 10
      ) {
        pageInfo {
          hasNextPage
        }
      }
    }`
  const result = await graphql(query)
  expect(result.data.people.pageInfo.hasNextPage).toEqual(false)
})

test('queries connection pageInfo.hasPreviousPage', async () => {
  const query = `query TestQuery($time: Int) {
      people(
        filter: {
          time_eq: $time
        },
        first: 2
      ) {
        pageInfo {
          hasPreviousPage
        }
      }
    }`
  const result = await graphql(query)
  expect(result.data.people.pageInfo.hasPreviousPage).toEqual(false)
})

test('pageInfo.hasPreviousPage indicates availability of previous page', async () => {
  const query = `query TestQuery($time: Int) {
      people(
        filter: {
          time_eq: $time
        },
        first: 1
      ) {
        pageInfo {
          endCursor
        }
      }
    }`
  const result = await graphql(query)
  const firstId = result.data.people.pageInfo.endCursor
  const afterQuery = `query TestQuery($time: Int) {
      people(
        filter: {
          time_eq: $time
        },
        after: "${firstId}"
      ) {
        pageInfo {
          hasPreviousPage
        }
      }
    }`
  const afterQueryResult = await graphql(afterQuery)
  expect(afterQueryResult.data.people.pageInfo.hasPreviousPage).toEqual(true)
})

test('pageInfo endCursor returns last cursor in query', async () => {
  const query = `query TestQuery($time: Int) {
      people(
        filter: {
          time_eq: $time
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
  const result = await graphql(query)
  expect(result.data.people.pageInfo.endCursor).toEqual(
    result.data.people.edges[result.data.people.edges.length - 1].cursor
  )
})

test('pageInfo startCursor returns first cursor in query', async () => {
  const query = `query TestQuery($time: Int) {
      people(
        filter: {
          time_eq: $time
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
  const result = await graphql(query)
  expect(result.data.people.pageInfo.startCursor).toEqual(
    result.data.people.edges[0].cursor
  )
})

test('passes clientMutationId from input to payload ', async () => {
  const query = `mutation {
    createPerson(input: {name: "Bane", clientMutationId:"123"}) {
      person {
        name
      }
      clientMutationId
    }
  }`
  const result = await graphql(query)
  expect(result).toMatchSnapshot()
})
