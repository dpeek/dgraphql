import { init } from './harness'

var sequence

beforeAll(async () => {
  const test = await init()
  sequence = test.sequence
})

test('sets JSON as inline AST', () => {
  const query = `mutation {
    createPerson(input: {
      config: { foo: "bar", baz:[1, null, 1.2]}
    }) {
      person {
        config
      }
    }
  }`
  return sequence([query])
})
