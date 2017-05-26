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

const schema = getSchema({ relay: false })

beforeAll(async () => {
  let dgraphSchemaPath = path.resolve(__dirname, 'test.dgraph')
  await client.query(fs.readFileSync(dgraphSchemaPath).toString())
})

test('creates node', async () => {
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

test('returns fields for created node', async () => {
  const create = `mutation {
    createPerson(input: {
      name: "Tim"
    }) {
      person {
        name
      }
    }
  }`
  const createResult = await graphql(schema, create)
  expect(createResult).toMatchSnapshot()
})

test('updates node', async () => {
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

  const update = `mutation {
    updatePerson(input:{id: "${id}", name: "Jim"}) {
      person {
        name
      }
    }
  }`
  await graphql(schema, update)

  const query = `query {
    person(id: "${id}") {
      name
    }
  }`
  const queryResult = await graphql(schema, query)
  expect(queryResult).toMatchSnapshot()
})

test('returns fields on updated node', async () => {
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

  const update = `mutation {
    updatePerson(input:{id: "${id}", name: "Jim"}) {
      person {
        name
      }
    }
  }`
  const updateResult = await graphql(schema, update)
  expect(updateResult).toMatchSnapshot()
})

test('deletes node', async () => {
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

  const deletes = `mutation {
    deletePerson(input: {id: "${id}"}) {
      person {
        id
      }
    }
  }`
  await graphql(schema, deletes)

  const query = `query {
    person(id: "${id}") {
      name
    }
  }`
  const queryResult = await graphql(schema, query)
  expect(queryResult).toMatchSnapshot()
})

test('creates node with nested node', async () => {
  const create = `mutation {
    createPerson(input: {
      name: "Tim",
      partner: {
        name: "Bob"
      }
    }) {
      person {
        id
        partner {
          id
        }
      }
    }
  }`
  const createResult = await graphql(schema, create)
  const personId = createResult.data.createPerson.person.id
  const partnerId = createResult.data.createPerson.person.partner.id

  const query = `query {
    person(id: "${personId}") {
      name
    }
    partner:person(id: "${partnerId}") {
      name
    }
  }`
  const queryResult = await graphql(schema, query)
  expect(queryResult).toMatchSnapshot()
})

test('creates node linked to existing nodes', async () => {
  const create = `mutation {
    mum: createPerson(input: { name: "Linda" }) {
      person {
        id
      }
    }
    dad: createPerson(input: { name: "Matthew" }) {
      person {
        id
      }
    }
  }`
  const createResult = await graphql(schema, create)
  const mumId = createResult.data.mum.person.id
  const dadId = createResult.data.dad.person.id

  const createLinked = `mutation {
    createPerson(
      input: {
        name: "David",
        parents:[
          { id: "${mumId}" },
          { id: "${dadId}" }
        ]
      }
    ) {
      person {
        name
        parents(order: name_asc) {
          name
        }
      }
    }
  }`

  const createLinkedResult = await graphql(schema, createLinked)
  expect(createLinkedResult).toMatchSnapshot()
})
