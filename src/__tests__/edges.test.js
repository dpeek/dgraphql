import { init } from './harness'

var graphql

beforeAll(async () => {
  graphql = await init()
})

test('sets node edge to existing node', async () => {
  const create = `mutation {
    tim: createPerson(input: {
      name: "Tim"
    }) {
      person {
        id
      }
    }
    alice: createPerson(input: {
      name: "Alice"
    }) {
      person {
        id
      }
    }
  }`
  const createResult = await graphql(create)

  const tim = createResult.data.tim.person.id
  const alice = createResult.data.alice.person.id

  const set = `mutation {
    setPersonPartner(input: {
      id: "${tim}",
      partner: {
        id: "${alice}"
      }
    }) {
      person {
        name
        partner {
          name
          partner {
            name
          }
        }
      }
    }
  }`
  let setResult = await graphql(set)
  expect(setResult).toMatchSnapshot()
})

test('sets one way edge to existing node', async () => {
  const create = `mutation {
    tim: createPerson(input: {
      name: "Tim"
    }) {
      person {
        id
      }
    }
    alice: createPerson(input: {
      name: "Alice"
    }) {
      person {
        id
      }
    }
  }`
  const createResult = await graphql(create)

  const tim = createResult.data.tim.person.id
  const alice = createResult.data.alice.person.id

  const set = `mutation {
    setPersonEmergencyContact(input: {
      id: "${tim}",
      emergencyContact: {
        id: "${alice}"
      }
    }) {
      person {
        name
        emergencyContact {
          name
        }
      }
    }
  }`
  let setResult = await graphql(set)
  expect(setResult).toMatchSnapshot()
})

test('sets node edge to new node', async () => {
  const create = `mutation {
    tim: createPerson(input: {
      name: "Tim"
    }) {
      person {
        id
      }
    }
  }`
  const createResult = await graphql(create)

  const tim = createResult.data.tim.person.id

  const set = `mutation {
    setPersonPartner(input: {
      id: "${tim}",
      partner: {
        name: "Wilma"
      }
    }) {
      person {
        name
        partner {
          name
          partner {
            name
          }
        }
      }
    }
  }`
  let setResult = await graphql(set)
  expect(setResult).toMatchSnapshot()
})

test('setting node edge to existing value has no effect', async () => {
  const create = `mutation {
    tim: createPerson(input: {
      name: "Tim",
      partner: {
        name: "Alice"
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

  const tim = createResult.data.tim.person.id
  const alice = createResult.data.tim.person.partner.id

  const set = `mutation {
    setPersonPartner(input: {
      id: "${tim}",
      partner: {
        id: "${alice}"
      }
    }) {
      person {
        name
        partner {
          name
          partner {
            name
          }
        }
      }
    }
  }`
  let setResult = await graphql(set)
  expect(setResult).toMatchSnapshot()
})

test('setting edge with reverse removes reverse edge from existing node', async () => {
  const create = `mutation {
    tim: createPerson(input: {
      name: "Tim",
      partner: {
        name: "Sally"
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
    alice: createPerson(input: {
      name: "Alice"
    }) {
      person {
        id
        name
      }
    }
  }`
  const createResult = await graphql(create)

  const tim = createResult.data.tim.person.id
  const sally = createResult.data.tim.person.partner.id
  const alice = createResult.data.alice.person.id

  const set = `mutation {
    setPersonPartner(input: {
      id: "${tim}",
      partner: {
        id: "${alice}"
      }
    }) {
      person {
        name
        partner {
          name
        }
      }
    }
  }`
  await graphql(set)

  const query = `query {
    person(id: "${sally}") {
      name
      partner {
        id
      }
    }
  }`
  const queryResult = await graphql(query)
  expect(queryResult).toMatchSnapshot()
})

test('setting edge with no reverse does nothing to existing node', async () => {
  const create = `mutation {
    tim: createPerson(input: {
      name: "Tim",
      emergencyContact: {
        name: "Sally",
        emergencyContact: {
          name: "Gerald"
        }
      }
    }) {
      person {
        id
        name
        emergencyContact {
          id
          name
        }
      }
    }
    alice: createPerson(input: {
      name: "Alice"
    }) {
      person {
        id
        name
      }
    }
  }`
  const createResult = await graphql(create)

  const tim = createResult.data.tim.person.id
  const sally = createResult.data.tim.person.emergencyContact.id
  const alice = createResult.data.alice.person.id

  const set = `mutation {
    setPersonEmergencyContact(input: {
      id: "${tim}",
      emergencyContact: {
        id: "${alice}"
      }
    }) {
      person {
        name
        emergencyContact {
          name
        }
      }
    }
  }`
  await graphql(set)

  const query = `query {
    person(id: "${sally}") {
      name
      emergencyContact {
        name
      }
    }
  }`
  const queryResult = await graphql(query)
  expect(queryResult).toMatchSnapshot()
})

test('setting node edge removes existing reverse edge from new value', async () => {
  const create = `mutation {
    tim: createPerson(input: {
      name: "Tim"
    }) {
      person {
        id
      }
    }
    alice: createPerson(input: {
      name: "Alice",
      partner: {
        name: "Sue"
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

  const tim = createResult.data.tim.person.id
  const alice = createResult.data.alice.person.id
  const sue = createResult.data.alice.person.partner.id

  const set = `mutation {
    setPersonPartner(input: {
      id: "${tim}",
      partner: {
        id: "${alice}"
      }
    }) {
      person {
        name
        partner {
          name
        }
      }
    }
  }`
  await graphql(set)

  const query = `query {
    person(id: "${sue}") {
      name
      partner {
        name
      }
    }
  }`
  const queryResult = await graphql(query)
  expect(queryResult).toMatchSnapshot()
})

test('unsets node edge', async () => {
  const create = `mutation {
    tim: createPerson(input: {
      name: "Tim",
      partner: {
        name: "Joan"
      }
    }) {
      person {
        id
      }
    }
  }`

  const createResult = await graphql(create)
  const tim = createResult.data.tim.person.id

  const unset = `mutation {
    unsetPersonPartner(input: {
      id: "${tim}"
    }) {
      person {
        name
        partner {
          name
        }
      }
    }
  }`
  let unsetResult = await graphql(unset)
  expect(unsetResult).toMatchSnapshot()
})

test('unsetting node edge removes reverse edge on value', async () => {
  const create = `mutation {
    tim: createPerson(input: {
      name: "Tim",
      partner: {
        name: "Joan"
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
  const tim = createResult.data.tim.person.id
  const joan = createResult.data.tim.person.partner.id

  const unset = `mutation {
    unsetPersonPartner(input: {
      id: "${tim}"
    }) {
      person {
        name
        partner {
          name
        }
      }
    }
  }`
  await graphql(unset)

  const query = `query {
    person(id: "${joan}") {
      name
      partner {
        name
      }
    }
  }`
  let queryResult = await graphql(query)
  expect(queryResult).toMatchSnapshot()
})

test('adds edges to existing nodes', async () => {
  const create = `mutation {
    tim: createPerson(input: {
      name: "Tim"
    }) {
      person {
        id
        name
      }
    }
    alice: createPerson(input: {
      name: "Alice"
    }) {
      person {
        id
        name
      }
    }
    paula: createPerson(input: {
      name: "Paula"
    }) {
      person {
        id
        name
      }
    }
  }`
  const createResult = await graphql(create)

  const tim = createResult.data.tim.person.id
  const alice = createResult.data.alice.person.id
  const paula = createResult.data.paula.person.id

  const set = `mutation {
    addPersonChildren(input: {
      id: "${tim}",
      children: [{
        id: "${alice}"
      },{
        id: "${paula}"
      }]
    }) {
      person {
        name
        children(order: name_asc) {
          name
          parents {
            name
          }
        }
      }
    }
  }`
  const setResult = await graphql(set)
  expect(setResult).toMatchSnapshot()
})

test('adds edges to new nodes', async () => {
  const create = `mutation {
    tim: createPerson(input: {
      name: "Tim"
    }) {
      person {
        id
        name
      }
    }
  }`

  const createResult = await graphql(create)
  const tim = createResult.data.tim.person.id

  const set = `mutation {
    addPersonChildren(input: {
      id: "${tim}",
      children: [{
        name: "John"
      },{
        name: "Jack"
      }]
    }) {
      person {
        name
        children(order: name_asc) {
          name
          parents {
            name
          }
        }
      }
    }
  }`
  const setResult = await graphql(set)
  expect(setResult).toMatchSnapshot()
})

test('adds edges to new and existing nodes', async () => {
  const create = `mutation {
    tim: createPerson(input: {
      name: "Tim"
    }) {
      person {
        id
      }
    }
    tom: createPerson(input: {
      name: "Tom"
    }) {
      person {
        id
      }
    }
  }`

  const createResult = await graphql(create)
  const tim = createResult.data.tim.person.id
  const tom = createResult.data.tom.person.id

  const set = `mutation {
    addPersonChildren(input: {
      id: "${tim}",
      children: [{
        id: "${tom}"
      },{
        name: "Eve"
      }]
    }) {
      person {
        name
        children(order: name_asc) {
          name
          parents {
            name
          }
        }
      }
    }
  }`
  const setResult = await graphql(set)
  expect(setResult).toMatchSnapshot()
})

test('adds edges of different type', async () => {
  const create = `mutation {
    tim: createPerson(input: {
      name: "Tim"
    }) {
      person {
        id
      }
    }
  }`

  const createResult = await graphql(create)
  const tim = createResult.data.tim.person.id

  const set = `mutation {
    addPersonEmails(input: {
      id: "${tim}",
      emails: [{
        type: HOME,
        address: "mail@tim.com"
      }]
    }) {
      person {
        emails {
          type
          address
        }
      }
    }
  }`
  const setResult = await graphql(set)
  expect(setResult).toMatchSnapshot()
})

test('adding edges does not remove existing edges', async () => {
  const create = `mutation {
    tim: createPerson(input: {
      name: "Tim",
      children: [{
        name: "Olivia"
      }]
    }) {
      person {
        id
      }
    }
  }`

  const createResult = await graphql(create)
  const tim = createResult.data.tim.person.id

  const set = `mutation {
    addPersonChildren(input: {
      id: "${tim}",
      children: [{
        name: "John"
      }]
    }) {
      person {
        name
        children(order: name_asc) {
          name
          parents {
            name
          }
        }
      }
    }
  }`
  const setResult = await graphql(set)
  expect(setResult).toMatchSnapshot()
})

test('removes edges removing reverse edges', async () => {
  const create = `mutation {
    tim: createPerson(input: {
      name: "Tim",
      children: [{
        name: "Jerry"
      }, {
        name: "Olivia"
      }, {
        name: "Paul"
      }]
    }) {
      person {
        id
        children(order: name_asc) {
          id
        }
      }
    }
  }`

  const createResult = await graphql(create)
  const tim = createResult.data.tim.person.id
  const jerry = createResult.data.tim.person.children[0].id
  const paul = createResult.data.tim.person.children[2].id

  const set = `mutation {
    removePersonChildren(input: {
      id: "${tim}",
      children: [{
        id: "${jerry}"
      }, {
        id: "${paul}"
      }]
    }) {
      person {
        name
        children(order: name_asc) {
          name
        }
      }
    }
  }`
  const setResult = await graphql(set)
  expect(setResult).toMatchSnapshot()

  const query = `query {
    person(id: "${jerry}") {
      name
      parents {
        name
      }
    }
  }`
  const queryResult = await graphql(query)
  expect(queryResult).toMatchSnapshot()
})

test('setting edge to non-existent node returns error', async () => {
  const create = `mutation {
    tom: createPerson(input: {name: "Tom"}) {
      person {
        id
      }
    }
  }`
  const result = await graphql(create)
  const tom = result.data.tom.person.id
  const set = `mutation {
    setPersonPartner(input: {id: "${tom}", partner: {id: "0x00"}}) {
      person {
        name
        partner {
          name
        }
      }
    }
  }`
  const setResult = await graphql(set)
  expect(setResult).toMatchSnapshot()
})

test('setting edge to existing node of incorrect type returns error', async () => {
  const create = `mutation {
    tom: createPerson(input: {name: "Tom"}) {
      person {
        id
      }
    }
    email: createEmail(input: {type: HOME, address: "test@test.com"}) {
      email {
        id
      }
    }
  }`
  const result = await graphql(create)
  const tom = result.data.tom.person.id
  const email = result.data.email.email.id

  const set = `mutation {
    setPersonPartner(input: {id: "${tom}", partner: {id: "${email}"}}) {
      person {
        name
        partner {
          name
        }
      }
    }
  }`
  const setResult = await graphql(set)
  expect(setResult).toMatchSnapshot()
})
