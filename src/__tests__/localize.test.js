import { init } from './harness'

var graphql

beforeAll(async () => {
  const test = await init()
  graphql = test.graphql
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
  const createResult = await graphql(create, {}, 'en')
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
  await graphql(update, {}, 'es')

  let query = `query {
    person(id: "${id}") {
      name
      title
    }
  }`
  let queryResult = await graphql(query, {}, 'en')
  expect(queryResult).toMatchSnapshot()

  queryResult = await graphql(query, {}, 'es')
  expect(queryResult).toMatchSnapshot()
})
