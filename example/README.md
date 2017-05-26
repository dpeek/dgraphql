Create a family:

```graphql
mutation CreatePeople {
  createPerson(input: {
    name: "Alexander",
    age: 45,
    children: [
      { name: "Hannah", age: 18 },
      { name: "Marcus", age: 16 },
      { name: "Mathilda", age: 12 },
    ]
  }) {
    person {
      id
      name
      children {
        name
        age
      }
    }
  }
}
```

Query for a person (replace `id` with result from previous mutation):

```graphql
query QueryPerson {
  person(id: "0x99a085cc939d8ddb") {
    name
    children {
      name
      parents {
        name
      }
    }
  }
}
```

Query for people:

```graphql
query QueryPeople {
  people(first:3, filter: { age_le: 18 }, order: age_asc) {
    name
    age
  }
}
```

Link `Person` to existing `Person` at creation:

> Note: this does not currently validate that the linked node is of the
> correct type

```graphql
mutation CreateParents {
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
}
```

Then, using the resulting ids:

```graphql
mutation LinkToExisting {
  createPerson(input: {
    name: "David", parents: [
      { id: "0xcef949753dedffb3" },
      { id: "0xe1090499b486ca90"}
    ]
  }) {
    person {
      name
      parents {
        name
      }
    }
  }
}
```
