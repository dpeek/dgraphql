---
title: Getting Started
---

Install DgraphQL from npm

```sh
yarn add dgraphql
```

The entry point to the library is `buildSchema`

```javascript
import { graphql } from 'graphql'
import { buildSchema } from 'dgraphql'

const config = {
  server: 'http://localhost:8080/query'
}

const source = `
type Person {
  id: ID!
  name: String @filter(types: [EQUALITY])
  children: [Person!]! @reverse(name: "parents")
  parents: [Person!]! @reverse(name: "children")
}`

const schema = buildSchema(source, config)

const mutation = `
mutation {
  createPerson(input: { name: "David" }) {
    person {
      id
    }
  }
}`

graphql(schema, mutation).then(result => {
  console.log(result);
})
```
