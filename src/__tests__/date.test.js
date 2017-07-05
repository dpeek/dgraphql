import { init } from './harness'

var graphql

beforeAll(async () => {
  graphql = await init()
})

test('sets Date and DateTime as String', async () => {
  const mutation = `mutation {
    createPerson(input: {
      dob: "2000-12-01",
      lastActiveAt: "2000-12-01"
    }) {
      person {
        dob
        lastActiveAt
      }
    }
  }`
  const result = await graphql(mutation)
  expect(result).toMatchSnapshot()
})
