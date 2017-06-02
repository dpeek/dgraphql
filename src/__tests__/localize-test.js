import fs from 'fs'
import path from 'path'

import { graphql as graphql2 } from 'graphql'
import testSchema from '../testSchema'

let schema

function graphql (schema, source, language) {
  return graphql2({
    schema,
    source,
    contextValue: { language: language }
  })
}

beforeAll(async () => {
  schema = await testSchema('test.graphql', { debug: true })
})

test('queries node field', async () => {
  const create = `mutation {
    createPerson(input: {
      name: "Tim",
      title: "Mister"
    }) {
      person {
        id
      }
    }
  }`
  const createResult = await graphql(schema, create, 'en')
  const id = createResult.data.createPerson.person.id

  const update = `mutation {
    updatePerson(input: {
      id: "${id}",
      name: "Tim",
      title: "Señor"
    }) {
      person {
        id
      }
    }
  }`
  await graphql(schema, update, 'es')

  let query = `query {
    person(id: "${id}") {
      name
      title
    }
  }`
  let queryResult = await graphql(schema, query, 'en')
  expect(queryResult).toMatchSnapshot()

  queryResult = await graphql(schema, query, 'es')
  expect(queryResult).toMatchSnapshot()
})
