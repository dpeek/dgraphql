import { init } from './harness'

var graphql
var sequence
var vars

beforeAll(async () => {
  const test = await init(true)
  graphql = test.graphql
  sequence = test.sequence
  const time = Math.round(Math.random() * 1000000000)
  vars = await sequence([create], { time: time })
})

const create = `mutation Test($time: Int) {
  tim: createPerson(input: {
    name: "Tim",
    time: $time
  }) {
    person {
      id
      name
    }
  },
  kim: createPerson(input: {
    name: "Kim",
    time: $time
  }) {
    person {
      id
      name
    }
  }
}`

test('queries node with fragment', async () => {
  const query = `query Test ($tim: ID!) {
    node(id: $tim) {
      ... on Person {
        name
      }
    }
  }`
  return sequence([query], vars)
})

test('queries node with inline fragment', async () => {
  const query = `query Test ($tim: ID!) {
    node(id: $tim) {
      ... personFields
    }
  }
  fragment personFields on Person {
    name
  }`
  return sequence([query], vars)
})

test('edge node fields', async () => {
  const query = `query Test ($time: Int) {
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
  return sequence([query], vars)
})

test('edge cursor', async () => {
  const query = `query Test ($time: Int) {
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
  const result = await graphql(query, vars)
  expect(result.data.people.edges[0].cursor).toEqual(
    result.data.people.edges[0].node.id
  )
})

test('first n edges', async () => {
  const query = `query Test ($time: Int) {
    people(
      order: name_desc,
      filter: {
        time_eq: $time
      },
      first: 2
    ) {
      edges {
        node {
          name
        }
      }
    }
  }`
  return sequence([query], vars)
})

test('queries connection count ignoring first', async () => {
  const query = `query Test ($time: Int) {
      people(
        filter: {
          time_eq: $time
        },
        first: 1
      ) {
        count
      }
    }`
  return sequence([query], vars)
})

test('queries connection pageInfo.hasNextPage', async () => {
  const query = `query Test ($time: Int) {
      people(
        filter: {
          time_eq: $time
        },
        first: 1
      ) {
        pageInfo {
          hasNextPage
        }
      }
    }`
  return sequence([query], vars)
})

test('pageInfo.hasNextPage indicates availability of next page', async () => {
  const query = `query Test ($time: Int) {
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
  return sequence([query], vars)
})

test('queries connection pageInfo.hasPreviousPage', async () => {
  const query = `query Test ($time: Int) {
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
  return sequence([query], vars)
})

test('pageInfo.hasPreviousPage indicates availability of previous page', async () => {
  const query = `query Test ($time: Int) {
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
  const result = await graphql(query, vars)
  const firstId = result.data.people.pageInfo.endCursor
  const afterQuery = `query Test ($time: Int) {
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
  const afterQueryResult = await graphql(afterQuery, vars)
  expect(afterQueryResult.data.people.pageInfo.hasPreviousPage).toEqual(true)
})

test('pageInfo endCursor returns last cursor in query', async () => {
  const query = `query Test ($time: Int) {
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
  const result = await graphql(query, vars)
  expect(result.data.people.pageInfo.endCursor).toEqual(
    result.data.people.edges[result.data.people.edges.length - 1].cursor
  )
})

test('pageInfo startCursor returns first cursor in query', async () => {
  const query = `query Test ($time: Int) {
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
  const result = await graphql(query, vars)
  expect(result.data.people.pageInfo.startCursor).toEqual(
    result.data.people.edges[0].cursor
  )
})

test('passes clientMutationId from input to payload ', async () => {
  const query = `mutation {
    createPerson(input: {name: "Bane", clientMutationId: "123"}) {
      person {
        name
      }
      clientMutationId
    }
  }`
  return sequence([query])
})
