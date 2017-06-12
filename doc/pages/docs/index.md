---
title: Introduction
---

Dgraph is a distributed, highly available graph database that uses a language
similar to GraphQL to query and mutate data. Unlike GraphQL, Dgraph only defines
schema for predicates (properties) within the graph; there is no concept of
complex types or groups of properties. Because of this it is straight forward to
store any GraphQL schema in Dgraph provided a few restrictions are met.

Given a GraphQL schema, DgraphQL can do four things:

1. Generate a GraphQL-JS schema that maps GraphQL queries to Dgraph queries
2. Transform Dgraph responses into GraphQL responses (including support for the
   relay connection specification)
3. Generate defaults for create/update/delete/query operations (with filtering,
   ordering and nested create/update mutations)
4. Configure Dgraph's schema with types and indexes each property.
