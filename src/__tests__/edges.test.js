import { init } from './harness'

var sequence

beforeAll(async () => {
  const test = await init()
  sequence = test.sequence
})

test('sets node edge to existing node', () => {
  const query1 = `mutation Test {
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
  }`
  const query2 = `mutation Test ($tim: ID!, $alice: ID!) {
    setPersonPartner(input: {
      id: $tim,
      partner: {
        id: $alice
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
  return sequence([query1, query2])
})

test('sets one way edge to existing node', () => {
  const query1 = `mutation Test {
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
  }`
  const query2 = `mutation Test ($tim: ID!, $alice: ID!) {
    setPersonEmergencyContact(input: {
      id: $tim,
      emergencyContact: {
        id: $alice
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
  return sequence([query1, query2])
})

test('sets node edge to new node', () => {
  const query1 = `mutation Test {
    tim: createPerson(input: {
      name: "Tim"
    }) {
      person {
        id
        name
      }
    }
  }`
  const query2 = `mutation Test ($tim: ID!) {
    setPersonPartner(input: {
      id: $tim,
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
  return sequence([query1, query2])
})

test('setting node edge to existing value has no effect', () => {
  const query1 = `mutation Test {
    tim: createPerson(input: {
      name: "Tim",
      partner: {
        name: "Alice"
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
  const query2 = `mutation Test ($tim: ID!, $alice: ID!) {
    setPersonPartner(input: {
      id: $tim,
      partner: {
        id: $alice
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
  return sequence([query1, query2])
})

test('setting edge with reverse removes reverse edge from existing node', () => {
  const query1 = `mutation Test {
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
  const query2 = `mutation Test ($tim: ID!, $alice: ID!) {
    setPersonPartner(input: {
      id: $tim,
      partner: {
        id: $alice
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
  const query3 = `query Test ($sally: ID!) {
    person(id: $sally) {
      name
      partner {
        id
      }
    }
  }`
  return sequence([query1, query2, query3])
})

test('setting edge with no reverse does nothing to existing node', () => {
  const query1 = `mutation Test {
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
  const query2 = `mutation Test ($tim: ID!, $alice: ID!) {
    setPersonEmergencyContact(input: {
      id: $tim,
      emergencyContact: {
        id: $alice
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
  const query3 = `query Test ($sally: ID!) {
    person(id: $sally) {
      name
      emergencyContact {
        name
      }
    }
  }`
  return sequence([query1, query2, query3])
})

test('setting node edge removes existing reverse edge from new value', () => {
  const query1 = `mutation Test {
    tim: createPerson(input: {
      name: "Tim"
    }) {
      person {
        id
        name
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
        name
        partner {
          id
          name
        }
      }
    }
  }`
  const query2 = `mutation Test ($tim: ID!, $alice: ID!) {
    setPersonPartner(input: {
      id: $tim,
      partner: {
        id: $alice
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
  const query3 = `query Test ($sue: ID!) {
    person(id: $sue) {
      name
      partner {
        name
      }
    }
  }`
  return sequence([query1, query2, query3])
})

test('unsets node edge', () => {
  const query1 = `mutation Test {
    tim: createPerson(input: {
      name: "Tim",
      partner: {
        name: "Joan"
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
    unsetPersonPartner(input: {
      id: $tim
    }) {
      person {
        name
        partner {
          name
        }
      }
    }
  }`
  return sequence([query1, query2])
})

test('unsetting node edge removes reverse edge on value', () => {
  const query1 = `mutation Test {
    tim: createPerson(input: {
      name: "Tim",
      partner: {
        name: "Joan"
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
    unsetPersonPartner(input: { id: $tim }) {
      person {
        name
        partner {
          name
        }
      }
    }
  }`
  const query3 = `query Test ($joan: ID!) {
    person(id: $joan) {
      name
      partner {
        name
      }
    }
  }`
  return sequence([query1, query2, query3])
})

test('adds edges to existing nodes', () => {
  const query1 = `mutation Test {
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
  const query2 = `mutation Test ($tim: ID!, $alice: ID!, $paula: ID!) {
    addPersonChildren(input: {
      id: $tim,
      children: [{
        id: $alice
      },{
        id: $paula
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
  return sequence([query1, query2])
})

test('adds edges to new nodes', () => {
  const query1 = `mutation Test {
    tim: createPerson(input: {
      name: "Tim"
    }) {
      person {
        id
        name
      }
    }
  }`
  const query2 = `mutation Test ($tim: ID!) {
    addPersonChildren(input: {
      id: $tim,
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
  return sequence([query1, query2])
})

test('adds edges to new and existing nodes', () => {
  const query1 = `mutation Test {
    tim: createPerson(input: {
      name: "Tim"
    }) {
      person {
        id
        name
      }
    }
    tom: createPerson(input: {
      name: "Tom"
    }) {
      person {
        id
        name
      }
    }
  }`
  const query2 = `mutation Test ($tim: ID!, $tom: ID!) {
    addPersonChildren(input: {
      id: $tim,
      children: [{
        id: $tom
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
  return sequence([query1, query2])
})

test('adds edges of different type', () => {
  const query1 = `mutation Test {
    tim: createPerson(input: {
      name: "Tim"
    }) {
      person {
        id
        name
      }
    }
  }`
  const query2 = `mutation Test ($tim: ID!) {
    addPersonEmails(input: {
      id: $tim,
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
  return sequence([query1, query2])
})

test('adding edges does not remove existing edges', async () => {
  const query1 = `mutation Test {
    tim: createPerson(input: {
      name: "Tim",
      children: [{
        name: "Olivia"
      }]
    }) {
      person {
        id
        name
      }
    }
  }`
  const query2 = `mutation Test($tim: ID!) {
    addPersonChildren(input: {
      id: $tim,
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
  return sequence([query1, query2])
})

test('removes edges removing reverse edges', async () => {
  const query1 = `mutation Test {
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
        name
        children(order: name_asc) {
          id
          name
        }
      }
    }
  }`
  const query2 = `mutation Test($tim: ID!, $jerry: ID!, $paul: ID!) {
    removePersonChildren(input: {
      id: $tim,
      children: [{
        id: $jerry
      }, {
        id: $paul
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
  const query3 = `query Test($jerry: ID!) {
    person(id: $jerry) {
      name
      parents {
        name
      }
    }
  }`
  return sequence([query1, query2, query3])
})

test('setting edge to non-existent node returns error', async () => {
  const query1 = `mutation Test {
    tom: createPerson(input: {name: "Tom"}) {
      person {
        id
        name
      }
    }
  }`
  const query2 = `mutation Test ($tom: ID!) {
    setPersonPartner(input: {id: $tom, partner: {id: "0x00"}}) {
      person {
        name
        partner {
          name
        }
      }
    }
  }`
  return sequence([query1, query2])
})

test('setting edge to existing node of incorrect type returns error', async () => {
  const query1 = `mutation Test {
    tom: createPerson(input: {name: "Tom"}) {
      person {
        id
        name
      }
    }
    tim: createPerson(input: {name: "Tim"}) {
      person {
        id
        name
      }
    }
  }`
  const query2 = `mutation Test($tim: ID!, $tom: ID!) {
    addPersonEmails(input: {id: $tom, emails: [{id: $tim}]}) {
      person {
        name
        partner {
          name
        }
      }
    }
  }`
  return sequence([query1, query2])
})
