---
title: Mutating Types
---

## Generated Mutations

For each type in your schema, DgraphQL will generate three corresponding
mutation fields for creating, updating and deleting nodes of that type.

This schema:

```
type Person {
  # ...
}
```

Will generate this mutation type:

```
type Mutation {
  createPerson(input: CreatePersonMutationInput): CreatePersonMutationPayload
  updatePerson(input: UpdatePersonMutationInput): UpdatePersonMutationPayload
  deletePerson(input: DeletePersonMutationInput): DeletePersonMutationPayload
}
```

## Create Type

The generated `CreateTypeMutationInput` contains all the fields of the type to
be created except the `id` field. Any required fields will also be required on
the input type.

The generated `CreateTypeMutationPayload` contains a single field with the
mutated type.

To create a type, pass in an object with the fields of the object to be created.

```
mutation {
  createPerson(input: {name: "David"}) {
    person {
      id
      name
    }
  }
}
```

## Update Type

The generated `UpdateTypeMutationInput` contains all the fields of the type to
be updated including a required `id` field. All other fields are optional.

The generated `UpdateTypeMutationPayload` contains a single field with the
mutated type.

To update a node, pass in an object with the id of the node and the fields to
be updated.

```
mutation {
  updatePerson(input: {id: "0x661675149ab1b21", name: "Harry"}) {
    person {
      id
      name
    }
  }
}
```

> Note: updating a one-to-many relationship has the effect of removing existing
> edges. To selectively add or remove edges, see [mutating edges](/docs/mutating-edges/).

## Delete Type

The generated `DeleteTypeMutationInput` contains a single required `id` field.

The generated `DeleteTypeMutationPayload` contains a single field with the
mutated type.

To update a node, pass in an object with the id of the node and the fields to
be updated.

```
mutation {
  deletePerson(input: {id: "0x661675149ab1b21"}) {
    person {
      id
      name
    }
  }
}
```

Delete mutations automatically delete edges to the deleted node.

## Creating or Updating Edges

One-to-one and one-to-many edges to new and existing nodes can be created during
`create` and `update` mutations. To create a new node, provide any fields except
the `id` field. To create edges to existing nodes provide an object with an `id`
field.

> Note: it is currently allowed to create an edge to an existing node and update
> fields in the same mutation. This may become an error in a future release as
> it might be unexpected behavior.

Creating a one-to-one edge to an existing node:

```
mutation {
  createPerson(input: {name: "David", partner: {id: "0x661675149ab1b21"}}) {
    person {
      id
      name
      partner {
        id
        name
      }
    }
  }
}
```

Creating a one-to-one edge to an new node:

```
mutation {
  createPerson(input: {name: "David", partner: {name: "Amy"}}) {
    person {
      id
      name
      partner {
        id
        name
      }
    }
  }
}
```

Creating a one-to-one edge to new and existing nodes:

```
mutation {
  createPerson(input: {name: "David", parents: [{id: "0x661675149ab1b21"}, {name: "Matthew"}]}) {
    person {
      id
      name
      parents {
        id
        name
      }
    }
  }
}
```
