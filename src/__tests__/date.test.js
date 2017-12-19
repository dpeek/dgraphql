import { init } from './harness'

var sequence

beforeAll(async () => {
  const test = await init()
  sequence = test.sequence
})

test('sets Date and DateTime as String', () => {
  const query = `mutation {
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
  return sequence([query])
})
