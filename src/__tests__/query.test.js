import { init } from './harness'

var sequence
var vars

const create = `mutation Test($time: Int) {
  ben: createPerson(input: {
    name: "Ben Jim",
    employed: true,
    age: 37,
    height: 1.7,
    time: $time
  }) {
    person {
      id
      name
    }
  }
  ant: createPerson(input: {
    name: "Ant Tim",
    employed: true,
    age: 36,
    height: 1.76,
    time: $time
  }) {
    person {
      id
      name
    }
  }
  cat: createPerson(input: {
    name: "Cat Jim",
    employed: false,
    age: 38,
    height: 1.63,
    time: $time
  }) {
    person {
      id
      name
    }
  }
}`

beforeAll(async () => {
  const test = await init()
  sequence = test.sequence
  const time = Math.round(Math.random() * 1000000000)
  vars = await sequence([create], { time: time })
})

test('queries node field', () => {
  const query1 = `mutation Test {
    createPerson(input: { name: "David" }) {
      person {
        id
        name
      }
    }
  }`
  const query2 = `query Test ($david: ID!) {
    person(id: $david) {
      name
    }
  }`
  return sequence([query1, query2])
})

test('queries node fields', () => {
  const query1 = `mutation Test {
    createPerson(input: { name: "David", employed: true }) {
      person {
        id
        name
      }
    }
  }`
  const query2 = `query Test ($david: ID!) {
    person(id: $david) {
      name
      employed
    }
  }`
  return sequence([query1, query2])
})

test('returns null for node', () => {
  const query = `query Test {
    person(id: "0x00") {
      name
    }
  }`
  return sequence([query])
})

test('returns null for non-existing edge', () => {
  const query1 = `mutation Test {
    createPerson(input: { name: "Olivia" }) {
      person {
        id
        name
      }
    }
  }`
  const query2 = `query Test ($olivia: ID!) {
    person(id: $olivia) {
      name
      partner {
        name
      }
    }
  }`
  return sequence([query1, query2])
})

test('returns empty array for non-existing edges', () => {
  const query1 = `mutation Test {
    createPerson(input: { name: "Olivia" }) {
      person {
        id
        name
      }
    }
  }`
  const query2 = `query Test ($olivia: ID!) {
    person(id: $olivia) {
      name
      children {
        name
      }
    }
  }`
  return sequence([query1, query2])
})

test('queries type name', () => {
  const query1 = `mutation Test {
    createPerson(input: { name: "David" }) {
      person {
        id
        name
      }
    }
  }`
  const query2 = `query Test ($david: ID!) {
    person(id: $david) {
      name
      __typename
    }
  }`
  return sequence([query1, query2])
})

test('queries aliased field', () => {
  const query1 = `mutation Test {
    createPerson(input: { name: "David" }) {
      person {
        id
        name
      }
    }
  }`
  const query2 = `query Test ($david: ID!) {
    person(id: $david) {
      alias: name
    }
  }`
  return sequence([query1, query2])
})

test('queries nested field', () => {
  const query1 = `mutation Test {
    createPerson(input: { name: "David", partner: { name: "Amy" }}) {
      person {
        id
        name
      }
    }
  }`
  const query2 = `query Test ($david: ID!) {
    person(id: $david) {
      name
      partner {
        name
      }
    }
  }`
  return sequence([query1, query2])
})

test('order edges by string ascending', () => {
  const query = `query Test ($time: Int) {
    people(
      order: name_asc,
      filter: {
        time_eq: $time
      }
    ) {
      name
    }
  }`
  return sequence([query], vars)
})

test('order edges by string descending', () => {
  const query = `query Test ($time: Int) {
    people(
      order: name_desc,
      filter: {
        time_eq: $time
      }
    ) {
      name
    }
  }`
  return sequence([query], vars)
})

test('filters by string with all terms', () => {
  const query = `query Test ($time: Int) {
    people(
      order: name_desc,
      filter: {
        time_eq: $time,
        name_allofterms: "Ben Jim"
      }
    ) {
      name
    }
  }`
  return sequence([query], vars)
})

test('filters by string with any of terms', () => {
  const query = `query Test ($time: Int) {
    people(
      order: name_desc,
      filter: {
        time_eq: $time,
        name_anyofterms: "Ben Cat"
      }
    ) {
      name
    }
  }`
  return sequence([query], vars)
})

test('filters by string equal to', () => {
  const query = `query Test ($time: Int) {
    people(
      order: name_desc,
      filter: {
        time_eq: $time,
        name_eq: "Ben Jim"
      }
    ) {
      name
    }
  }`
  return sequence([query], vars)
})

test('filters by boolean equal to', () => {
  const query = `query Test ($time: Int) {
    people(
      order: name_desc,
      filter: {
        time_eq: $time,
        employed_eq: true
      }
    ) {
      name
    }
  }`
  return sequence([query], vars)
})

test('order edges by int ascending', () => {
  const query = `query Test ($time: Int) {
    people(
      order: age_asc,
      filter: {
        time_eq: $time
      }
    ) {
      name
      age
    }
  }`
  return sequence([query], vars)
})

test('order edges by int descending', () => {
  const query = `query Test ($time: Int) {
    people(
      order: age_desc,
      filter: {
        time_eq: $time
      }
    ) {
      name
      age
    }
  }`
  return sequence([query], vars)
})

test('filters by int equal to', () => {
  const query = `query Test ($time: Int) {
    people(
      order: name_desc,
      filter: {
        time_eq: $time,
        age_eq: 37
      }
    ) {
      name
      age
    }
  }`
  return sequence([query], vars)
})

test('filters by int less than', () => {
  const query = `query Test ($time: Int) {
    people(
      order: name_desc,
      filter: {
        time_eq: $time,
        age_lt: 37
      }
    ) {
      name
      age
    }
  }`
  return sequence([query], vars)
})

test('filters by int less than or equal to', () => {
  const query = `query Test ($time: Int) {
    people(
      order: name_desc,
      filter: {
        time_eq: $time,
        age_le: 37
      }
    ) {
      name
      age
    }
  }`
  return sequence([query], vars)
})

test('filters by int greater than', () => {
  const query = `query Test ($time: Int) {
    people(
      order: name_desc,
      filter: {
        time_eq: $time,
        age_gt: 37
      }
    ) {
      name
      age
    }
  }`
  return sequence([query], vars)
})

test('filters by int greater than or equal to', () => {
  const query = `query Test ($time: Int) {
    people(
      order: name_desc,
      filter: {
        time_eq: $time,
        age_ge: 37
      }
    ) {
      name
      age
    }
  }`
  return sequence([query], vars)
})

test('filters by float equal to', () => {
  const query = `query Test ($time: Int) {
      people(
        order: height_asc,
        filter: {
          time_eq: $time,
          height_eq: 1.70
        }
      ) {
        name
        height
      }
    }`
  return sequence([query], vars)
})

test('filters by float less than', () => {
  const query = `query Test ($time: Int) {
      people(
        order: height_asc,
        filter: {
          time_eq: $time,
          height_lt: 1.70
        }
      ) {
        name
        height
      }
    }`
  return sequence([query], vars)
})

test('order edges by float ascending', () => {
  const query = `query Test ($time: Int) {
    people(
      order: height_asc,
      filter: {
        time_eq: $time
      }
    ) {
      name
      height
    }
  }`
  return sequence([query], vars)
})

test('order edges by float descending', () => {
  const query = `query Test ($time: Int) {
    people(
      order: height_desc,
      filter: {
        time_eq: $time
      }
    ) {
      name
      height
    }
  }`
  return sequence([query], vars)
})

test('filters by float less than or equal to', () => {
  const query = `query Test ($time: Int) {
      people(
        order: height_asc,
        filter: {
          time_eq: $time,
          height_le: 1.70
        }
      ) {
        name
        height
      }
    }`
  return sequence([query], vars)
})

test('filters by float greater than', () => {
  const query = `query Test ($time: Int) {
      people(
        order: height_asc,
        filter: {
          time_eq: $time,
          height_gt: 1.70
        }
      ) {
        name
        height
      }
    }`
  return sequence([query], vars)
})

test('filters by float greater than or equal to', () => {
  const query = `query Test ($time: Int) {
      people(
        order: height_asc,
        filter: {
          time_eq: $time,
          height_ge: 1.70
        }
      ) {
        name
        height
      }
    }`
  return sequence([query], vars)
})
