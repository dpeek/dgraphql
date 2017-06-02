import fs from 'fs'
import path from 'path'

import { graphql as graphql2 } from 'graphql'
import testSchema from '../testSchema'

let schema
let time = String(new Date().getTime() - 1495660000000)

function graphql (schema, source, variableValues) {
  return graphql2({
    schema,
    source,
    variableValues: { time, ...variableValues },
    contextValue: { language: 'en' }
  })
}

beforeAll(async () => {
  schema = await testSchema('test.graphql', { debug: true })
  let source = fs
    .readFileSync(path.resolve(__dirname, 'data.graphql'))
    .toString()
  await graphql(schema, source, { time })
})

test('queries node field', async () => {
  const create = `mutation {
    createPerson(input: {
      name: "Tim"
    }) {
      person {
        id
      }
    }
  }`
  const createResult = await graphql(schema, create)
  const id = createResult.data.createPerson.person.id

  const query = `query {
    person(id: "${id}") {
      name
    }
  }`
  const queryResult = await graphql(schema, query)
  expect(queryResult).toMatchSnapshot()
})

test('queries node fields', async () => {
  const create = `mutation {
    createPerson(input: {
      name: "Tim",
      employed: true
    }) {
      person {
        id
      }
    }
  }`
  const createResult = await graphql(schema, create)
  const id = createResult.data.createPerson.person.id

  const query = `query {
    person(id: "${id}") {
      name
      employed
    }
  }`
  const queryResult = await graphql(schema, query)
  expect(queryResult).toMatchSnapshot()
})

test('queries type name', async () => {
  const create = `mutation {
    createPerson(input: {
      name: "Tim"
    }) {
      person {
        id
      }
    }
  }`
  const createResult = await graphql(schema, create)
  const id = createResult.data.createPerson.person.id

  const query = `query {
    person(id: "${id}") {
      __typename
    }
  }`
  const queryResult = await graphql(schema, query)
  expect(queryResult.data.person.__typename).toEqual('Person')
})

test('queries aliased field', async () => {
  const create = `mutation {
    createPerson(input: {
      name: "Tim"
    }) {
      person {
        id
      }
    }
  }`
  const createResult = await graphql(schema, create)
  const id = createResult.data.createPerson.person.id

  const query = `query {
    person(id: "${id}") {
      test: name
    }
  }`
  const queryResult = await graphql(schema, query)
  expect(queryResult).toMatchSnapshot()
})

test('queries nested field', async () => {
  const create = `mutation {
    createPerson(input: {
      name: "Tim",
      partner: {
        name: "Bob"
      }
    }) {
      person {
        id
      }
    }
  }`
  const createResult = await graphql(schema, create)
  const id = createResult.data.createPerson.person.id

  const query = `query {
    person(id: "${id}") {
      name
      partner {
        name
      }
    }
  }`
  const queryResult = await graphql(schema, query)
  expect(queryResult).toMatchSnapshot()
})

test('order edges by string ascending', async () => {
  const query = `query TestQuery($time: Int) {
      people(
        order: name_asc,
        filter: {
          time_eq: $time
        }
      ) {
        name
      }
    }`
  const queryResult = await graphql(schema, query)
  expect(queryResult).toMatchSnapshot()
})

test('order edges by string descending', async () => {
  const query = `query TestQuery($time: Int) {
      people(
        order: name_desc,
        filter: {
          time_eq: $time
        }
      ) {
        name
      }
    }`
  const queryResult = await graphql(schema, query)
  expect(queryResult).toMatchSnapshot()
})

test('filters by string with all terms', async () => {
  const query = `query TestQuery($time: Int) {
      people(
        order: name_asc,
        filter: {
          time_eq: $time,
          name_allofterms: "David Peek"
        }
      ) {
        name
      }
    }`
  const queryResult = await graphql(schema, query)
  expect(queryResult).toMatchSnapshot()
})

test('filters by string with any of terms', async () => {
  const query = `query TestQuery($time: Int) {
      people(
        order: name_asc,
        filter: {
          time_eq: $time,
          name_anyofterms: "David Olivia"
        }
      ) {
        name
      }
    }`
  const queryResult = await graphql(schema, query)
  expect(queryResult).toMatchSnapshot()
})

test('filters by string equal to', async () => {
  const query = `query TestQuery($time: Int) {
      people(
        order: name_asc,
        filter: {
          time_eq: $time,
          name_eq: "Olivia Peek"
        }
      ) {
        name
      }
    }`
  const queryResult = await graphql(schema, query)
  expect(queryResult).toMatchSnapshot()
})

test('filters by boolean equal to', async () => {
  const query = `query TestQuery($time: Int) {
      people(
        order: name_asc,
        filter: {
          time_eq: $time,
          employed_eq: true
        }
      ) {
        name
        employed
      }
    }`
  const queryResult = await graphql(schema, query)
  expect(queryResult).toMatchSnapshot()
})

test('filters by int equal to', async () => {
  const query = `query TestQuery($time: Int) {
      people(
        order: age_asc,
        filter: {
          time_eq: $time,
          age_eq: 37
        }
      ) {
        name
        age
      }
    }`
  const queryResult = await graphql(schema, query)
  expect(queryResult).toMatchSnapshot()
})
test('filters by int less than', async () => {
  const query = `query TestQuery($time: Int) {
      people(
        order: age_asc,
        filter: {
          time_eq: $time,
          age_lt: 37
        }
      ) {
        name
        age
      }
    }`
  const queryResult = await graphql(schema, query)
  expect(queryResult).toMatchSnapshot()
})

test('filters by int less than or equal to', async () => {
  const query = `query TestQuery($time: Int) {
      people(
        order: age_asc,
        filter: {
          time_eq: $time,
          age_le: 37
        }
      ) {
        name
        age
      }
    }`
  const queryResult = await graphql(schema, query)
  expect(queryResult).toMatchSnapshot()
})

test('filters by int greater than', async () => {
  const query = `query TestQuery($time: Int) {
      people(
        order: age_asc,
        filter: {
          time_eq: $time,
          age_gt: 37
        }
      ) {
        name
        age
      }
    }`
  const queryResult = await graphql(schema, query)
  expect(queryResult).toMatchSnapshot()
})

test('filters by int greater than or equal to', async () => {
  const query = `query TestQuery($time: Int) {
      people(
        order: age_asc,
        filter: {
          time_eq: $time,
          age_ge: 37
        }
      ) {
        name
        age
      }
    }`
  const queryResult = await graphql(schema, query)
  expect(queryResult).toMatchSnapshot()
})

test('filters by float equal to', async () => {
  const query = `query TestQuery($time: Int) {
      people(
        order: height_asc,
        filter: {
          time_eq: $time,
          height_eq: 1.70
        }
      ) {
        name
        height
      }
    }`
  const queryResult = await graphql(schema, query)
  expect(queryResult).toMatchSnapshot()
})

test('filters by float less than', async () => {
  const query = `query TestQuery($time: Int) {
      people(
        order: height_asc,
        filter: {
          time_eq: $time,
          height_lt: 1.70
        }
      ) {
        name
        height
      }
    }`
  const queryResult = await graphql(schema, query)
  expect(queryResult).toMatchSnapshot()
})

test('filters by float less than or equal to', async () => {
  const query = `query TestQuery($time: Int) {
      people(
        order: height_asc,
        filter: {
          time_eq: $time,
          height_le: 1.70
        }
      ) {
        name
        height
      }
    }`
  const queryResult = await graphql(schema, query)
  expect(queryResult).toMatchSnapshot()
})

test('filters by float greater than', async () => {
  const query = `query TestQuery($time: Int) {
      people(
        order: height_asc,
        filter: {
          time_eq: $time,
          height_gt: 1.70
        }
      ) {
        name
        height
      }
    }`
  const queryResult = await graphql(schema, query)
  expect(queryResult).toMatchSnapshot()
})

test('filters by float greater than or equal to', async () => {
  const query = `query TestQuery($time: Int) {
      people(
        order: height_asc,
        filter: {
          time_eq: $time,
          height_ge: 1.70
        }
      ) {
        name
        height
      }
    }`
  const queryResult = await graphql(schema, query)
  expect(queryResult).toMatchSnapshot()
})
