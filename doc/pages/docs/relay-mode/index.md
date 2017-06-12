---
title: Relay Mode
---

## Generated Connections

When DgraphQL is run in Relay mode, generated type queries and one-to-many
relationships return collection types as specified by the relay specification.
This allows for consistent pagination through node edges as well as aggregation
queries.

## Pagination on Connections

```
query {
  people(filter: {age_gt: 18}) {
    edges {
      node {
        name
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

> Note: as Dgraph ids are globally unique, connection cursors are the same as
> the `id` of the node to which they refer.

## Aggregation on Connections

Get the number of edges in a connection:

```
query {
  people(filter: {age_gt: 18}) {
    count
  }
}
```
