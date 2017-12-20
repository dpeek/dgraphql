---
title: Getting Started
---

Install DgraphQL from npm

With yarn:

```sh
yarn add dgraphql
```

The entry point to the library is `Client`

```javascript
import { graphql } from 'graphql'
import { Client } from 'dgraphql'

const schema = `
type Person {
  id: ID!
  name: String @filter(types: [EQUALITY])
  children: [Person!]! @reverse(name: "parents")
  parents: [Person!]! @reverse(name: "children")
}`

const mutation = `
mutation {
  createPerson(input: { name: "David" }) {
    person {
      id
      name
    }
  }
}`

const client = new Client({ debug: false })

client.updateSchema(schema).then(() => {
  graphql({
    schema: client.schema,
    source: mutation,
    contextValue: client.getContext()
  }).then(result => {
    console.log(JSON.stringify(result, null, '  '))
  })
})
```
