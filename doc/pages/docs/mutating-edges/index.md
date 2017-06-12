---
title: Mutating Edges
---

## Generated Mutations

For each type in your schema, DgraphQL will generate two mutation fields for
each relationship, based on the type of relationship.

This schema:

```
type Person {
  partner: Person
}
```

Will generate this mutation type:

```
type Mutation {
  setPersonPartner(input: SetPersonPartnerMutationInput): SetPersonPartnerMutationPayload
  unsetPersonPartner(input: UnsetPersonPartnerMutationInput): UnsetPersonPartnerMutationPayload
}
```

While this schema:

```
type Person {
  children: [Person!]!
}
```

Will generate this mutation type:

```
type Mutation {
  addPersonChildren(input: AddPersonChildrenMutationInput): AddPersonChildrenMutationPayload
  removePersonChildren(input: RemovePersonChildrenMutationInput): RemovePersonChildrenMutationPayload
}
```

## One-to-One Relationships

The generated `SetTypeFieldMutationInput` contains an `id` field to specify the
node to mutate, and a input type for the node to be set. Similar to nested
create and update mutations, providing an `id` on this input will create an edge
to an existing node, while not providing an `id` will create an edge to a new
node.

The generated `SetTypeFieldMutationPayload` contains a single field with the
mutated type.

To set the edge to an existing node:

```
mutation {
  setPersonPartner(input: {id: "0x1c8390e7724c32ab", partner: {id: "0xbc5767eaf7142f01"}}) {
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

To set the edge to a new node:

```
mutation {
  setPersonPartner(input: {id: "0x1c8390e7724c32ab", partner: {name: "John"}}) {
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

The generated `UnsetTypeFieldMutationInput` contains an `id` field to specify the
node to unset the field on.

The generated `UnsetTypeFieldMutationPayload` contains a single field with the
mutated type.

To unset the edge of a node:

```
mutation {
  unsetPersonPartner(input: {id: "0x1c8390e7724c32ab"}) {
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

## One-to-Many Relationships

The generated `AddTypeFieldMutationInput` contains an `id` field to specify the
node to mutate, and a input type for the list of nodes to be added. Similar to
nested create and update mutations, providing an `id` on node in this list
will create an edge to an existing node, while not providing an `id` will create
an edge to a new node.

The generated `AddTypeFieldMutationPayload` contains a single field with the
mutated type.

To add edges to existing nodes:

```
mutation {
  addPersonChildren(input: {id: "0x1c8390e7724c32ab", children: [{id: "0xbc5767eaf7142f01"}]}) {
    person {
      id
      name
      children {
        id
        name
      }
    }
  }
}
```

To add edges to existing nodes:

```
mutation {
  setPersonPartner(input: {id: "0x1c8390e7724c32ab", children: {name: "John"}}) {
    person {
      id
      name
      children {
        id
        name
      }
    }
  }
}
```

The generated `RemoveTypeFieldMutationInput` contains an `id` field to specify the
node to mutate, and a input type for the list of nodes to be removed.

The generated `RemoveTypeFieldMutationPayload` contains a single field with the
mutated type.

To remove existing edges from a node:

```
mutation {
  removePersonChildren(input: {id: "0x1c8390e7724c32ab", children: {id: "0x661675149ab1b21"}}) {
    person {
      id
      name
      children {
        id
        name
      }
    }
  }
}
```
