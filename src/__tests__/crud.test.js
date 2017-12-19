import { init } from './harness'

var sequence

beforeAll(async () => {
  const test = await init()
  sequence = test.sequence
})

test('creates node', () => {
  const query1 = `mutation Test {
    createPerson(input: {
      name: "Tim"
    }) {
      person {
        id
        name
      }
    }
  }`
  const query2 = `query Test ($tim: ID!) {
    person(id: $tim) {
      name
    }
  }`
  return sequence([query1, query2])
})

test('returns fields for created node', () => {
  const query = `mutation Test {
    createPerson(input: {
      name: "Tim"
    }) {
      person {
        name
      }
    }
  }`
  return sequence([query])
})

test('updates node', () => {
  const query1 = `mutation Test {
    createPerson(input: {
      name: "Tim"
    }) {
      person {
        id
        name
      }
    }
  }`
  const query2 = `mutation Test ($tim: ID!) {
    updatePerson(input:{id: $tim, name: "Jim"}) {
      person {
        name
      }
    }
  }`
  const query3 = `query Test ($tim: ID!) {
    person(id: $tim) {
      name
    }
  }`
  return sequence([query1, query2, query3])
})

test('returns fields on updated node', () => {
  const query1 = `mutation Test {
    createPerson(input: {
      name: "Tim"
    }) {
      person {
        id
        name
      }
    }
  }`
  const query2 = `mutation Test ($tim: ID!) {
    updatePerson(input:{id: $tim, name: "Jim"}) {
      person {
        name
      }
    }
  }`
  return sequence([query1, query2])
})

test('deletes node', () => {
  const query1 = `mutation Test {
    createPerson(input: {
      name: "Tim"
    }) {
      person {
        id
        name
      }
    }
  }`
  const query2 = `mutation Test ($tim: ID!) {
    deletePerson(input: {id: $tim}) {
      person {
        id
      }
    }
  }`
  const query3 = `query Test ($tim: ID!) {
    person(id: $tim) {
      name
    }
  }`
  return sequence([query1, query2, query3])
})

test('deleting non-existent node returns error', () => {
  const query = `mutation Test {
    deletePerson(input: {id: "0x00"}) {
      person {
        id
      }
    }
  }`
  return sequence([query])
})

test('deletes reverse edge to deleted node', () => {
  const query1 = `mutation Test {
    createPerson(input: {
      name: "Tim",
      partner: {
        name: "Bob"
      },
      emergencyContact: {
        name: "Harry"
      }
    }) {
      person {
        id
        name
        partner {
          id
          name
        }
      }
    }
  }`
  const query2 = `mutation Test ($tim: ID!) {
    deletePerson(input: {id: $tim}) {
      person {
        name
      }
    }
  }`
  const query3 = `query Test ($bob: ID!) {
    person(id: $bob) {
      partner {
        name
      }
    }
  }`
  return sequence([query1, query2, query3])
})

test('deletes reverse edges to deleted node', () => {
  const query1 = `mutation Test {
    createPerson(input: {
      name: "Tim",
      children: [{
        name: "Sarah"
      }, {
        name: "James"
      }]
    }) {
      person {
        id
        name
        children(order: name_asc) {
          id
          name
        }
      }
    }
  }`
  const query2 = `mutation Test ($tim: ID!) {
    deletePerson(input: {id: $tim}) {
      person {
        name
        children(order: name_asc) {
          name
        }
      }
    }
  }`
  const query3 = `query Test ($sarah: ID!) {
    person(id: $sarah) {
      name
      parents {
        name
      }
    }
  }`
  return sequence([query1, query2, query3])
})

test('creates node with nested node', () => {
  const query1 = `mutation Test {
    createPerson(input: {
      name: "Tim",
      partner: {
        name: "Bob"
      }
    }) {
      person {
        id
        name
        partner {
          id
          name
        }
      }
    }
  }`
  const query2 = `query Test ($tim: ID!, $bob: ID!) {
    partner1: person(id: $tim) {
      name
    }
    partner2: person(id: $bob) {
      name
    }
  }`
  return sequence([query1, query2])
})

test('creates node linked to existing nodes', () => {
  const query1 = `mutation Test {
    mum: createPerson(input: { name: "Linda" }) {
      person {
        id
        name
      }
    }
    dad: createPerson(input: { name: "Matthew" }) {
      person {
        id
        name
      }
    }
  }`
  const query2 = `mutation Test ($linda: ID!, $matthew: ID!) {
    createPerson(
      input: {
        name: "David",
        parents:[
          { id: $linda },
          { id: $matthew }
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
  return sequence([query1, query2])
})

test('creating node with edge to non-existent node returns error', () => {
  const query1 = `mutation Test {
    createPerson(
      input: {
        name: "David",
        partner: { id: "0x00" }
      }
    ) {
      person {
        name
        partner {
          name
        }
      }
    }
  }`
  return sequence([query1])
})

test('creating node with edge to node of incorrect type returns error', () => {
  const query1 = `mutation Test {
    createPerson(input: { name: "Tim" }) {
      person {
        id
        name
      }
    }
  }`
  const query2 = `mutation Test ($tim: ID!) {
    createPerson(
      input: {
        name: "David",
        emails: { id: $tim }
      }
    ) {
      person {
        name
        emails {
          address
        }
      }
    }
  }`
  return sequence([query1, query2])
})
