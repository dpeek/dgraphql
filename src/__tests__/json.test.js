import { init } from './harness'

var graphql

beforeAll(async () => {
  graphql = await init()
})

test('sets JSON as inline AST', async () => {
  const mutation = `mutation {
    createPerson(input: {
      config: { foo: "bar", baz:[1, null, 1.2]}
    }) {
      person {
        config
      }
    }
  }`
  const result = await graphql(mutation)
  expect(result).toMatchSnapshot()
})
