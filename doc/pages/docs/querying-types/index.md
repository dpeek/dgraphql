---
title: Querying Types
---

## Generated Type Queries

For each type in your schema, DgraphQL will generate two corresponding query
fields: one for getting a type by id, another for querying all nodes of that
type. The fields are named based on the type's name:

This schema:

```
type Person {
  # ...
}
```

Will generate this query type:

```
type Query {
  person(id: ID!): Person
  people(first: Int, after: ID, filter: PersonFilter, order: PersonOrder): [Person]
}
```

## Paginated Queries

The generated type queries support forward pagination of results using the
`first` and `after` parameters. The `first` parameters limits the number of
results returned in the query. The `after` parameter returns results after the
provided cursor.

As ids are globally unique in Dgraph, they are used as both identifiers and
pagination cursors. So, to fetch the next page in a collection, pass the id of
the last result from the previous query as the `after` parameter.

Note: the `first` and `after` parameters apply to the filtered and ordered
results of the query.

## Filtering by Properties

Generated type queries support filtering results by the properties of the type.
Each type has a corresponding filter type defining the available filters.

For the type:

```
type Person {
  name: String @index(type: "exact")
}
```

The filter type would be:

```
type PersonFilter {
  name_eq: String
}
```

Thus, the all `Person` nodes could be queried like this:

```
query {
  typeNames(filter:{name_eq: "foo"}) {
    name
  }
}
```

Note: filtering by a property requires it to be [indexed by Dgraph](/docs/schema-directives/).

Supported filter operations and their required indexes:

| Type    | Indexes       | Operations              |
|---------|---------------|-------------------------|
| String  | exact, hash   | eq                      |
| String  | term          | anyofterms, allofterms  |
| Float   | float         | eq, lt, le, gt, ge      |
| Int     | int           | eq, lt, le, gt, ge      |
| enum    | exact         | eq                      |

Support for boolean filter logic will be added soon. Currently multiple filters
are applied as `filter1 and filter2`:

```
query {
  # Persons where name is "foo" and type is "bar"
  typeNames(filter:{name_eq: "foo", type_eq: "bar"}) {
    name
  }
}
```

## Ordering by Properties

Generated type queries support ordering results by the properties of the type.
Each type has a corresponding order type defining the available orders.


For the type:

```
type Person {
  name: String @index(type: "exact")
}
```

The filter type would be:

```
enum PersonOrder {
  # Order by name in ascending order
  name_asc
  # Order by name in descending order
  name_desc
}
```

Note: ordering by a property requires it to be [indexed by Dgraph](/docs/schema-directives/).
