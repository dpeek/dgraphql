import { init } from './harness'

var graphql

beforeAll(async () => {
  graphql = await init()
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
  const createResult = await graphql(create)
  const id = createResult.data.createPerson.person.id

  const query = `query {
    person(id: "${id}") {
      name
    }
  }`
  const queryResult = await graphql(query)
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
  const createResult = await graphql(create)
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
  const createResult = await graphql(create)
  const id = createResult.data.createPerson.person.id

  const update = `mutation {
    updatePerson(input:{id: "${id}", name: "Jim"}) {
      person {
        name
      }
    }
  }`
  await graphql(update)

  const query = `query {
    person(id: "${id}") {
      name
    }
  }`
  const queryResult = await graphql(query)
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
  const createResult = await graphql(create)
  const id = createResult.data.createPerson.person.id

  const update = `mutation {
    updatePerson(input:{id: "${id}", name: "Jim"}) {
      person {
        name
      }
    }
  }`
  const updateResult = await graphql(update)
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

  const createResult = await graphql(create)
  const id = createResult.data.createPerson.person.id

  const deletes = `mutation {
    deletePerson(input: {id: "${id}"}) {
      person {
        id
      }
    }
  }`
  await graphql(deletes)

  const query = `query {
    person(id: "${id}") {
      name
    }
  }`
  const queryResult = await graphql(query)
  expect(queryResult).toMatchSnapshot()
})

test('deleting non-existent node returns error', async () => {
  const deletes = `mutation {
    deletePerson(input: {id: "foo"}) {
      person {
        id
      }
    }
  }`
  const result = await graphql(deletes)
  expect(result).toMatchSnapshot()
})

test('deletes reverse edge to deleted node', async () => {
  const create = `mutation {
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
        partner {
          id
        }
      }
    }
  }`
  const createResult = await graphql(create)
  const tim = createResult.data.createPerson.person.id
  const bob = createResult.data.createPerson.person.partner.id

  const deletes = `mutation {
    deletePerson(input: {id: "${tim}"}) {
      person {
        id
      }
    }
  }`
  await graphql(deletes)

  const query = `query {
    person(id: "${bob}") {
      partner {
        name
      }
    }
  }`
  const queryResult = await graphql(query)
  expect(queryResult).toMatchSnapshot()
})

test('deletes reverse edges to deleted node', async () => {
  const create = `mutation {
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
        children {
          id
        }
      }
    }
  }`
  const createResult = await graphql(create)
  const tim = createResult.data.createPerson.person.id
  const sarah = createResult.data.createPerson.person.children[0].id

  const deletes = `mutation {
    deletePerson(input: {id: "${tim}"}) {
      person {
        id
      }
    }
  }`
  await graphql(deletes)

  const query = `query {
    person(id: "${sarah}") {
      parents {
        name
      }
    }
  }`
  const queryResult = await graphql(query)
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
  const createResult = await graphql(create)
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
  const queryResult = await graphql(query)
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
  const createResult = await graphql(create)
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

  const createLinkedResult = await graphql(createLinked)
  expect(createLinkedResult).toMatchSnapshot()
})

test('creating node with edge to non-existent node returns error', async () => {
  const create = `mutation {
    createPerson(
      input: {
        name: "David",
        partner: { id:"0x00" }
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

  const result = await graphql(create)
  expect(result).toMatchSnapshot()
})

test('creating node with edge to node of incorrect type returns error', async () => {
  const email = `mutation {
    email: createEmail(input: { type: HOME, address: "test@test.com" }) {
      email {
        id
      }
    }
  }`
  const emailResult = await graphql(email)
  const emailId = emailResult.data.email.email.id

  const create = `mutation {
    createPerson(
      input: {
        name: "David",
        partner: { id:"${emailId}" }
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

  const result = await graphql(create)
  expect(result).toMatchSnapshot()
})
