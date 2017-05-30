/* @flow */

import {
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLInputObjectType,
  isLeafType
} from 'graphql'

import type { GraphQLOutputType, GraphQLField } from 'graphql'

import { getFields } from './utils'

type Filter = {
  active: (type: GraphQLOutputType) => boolean,
  name: string,
  description: string,
  operation: string
}

type FilterField = {
  type: GraphQLOutputType,
  name: string,
  description: string
}

const allOf: Filter = {
  active: type => String(type) === 'String',
  name: '_allOf',
  description: 'contains all of the terms',
  operation: 'allofterms'
}

const anyOf: Filter = {
  active: type => String(type) === 'String',
  name: '_anyOf',
  description: 'contains any of the terms',
  operation: 'anyofterms'
}

const equal: Filter = {
  active: type => isLeafType(type),
  name: '_eq',
  description: 'is equal to',
  operation: 'eq'
}

const lessThan: Filter = {
  active: type => String(type) === 'Int' || String(type) === 'Float',
  name: '_lt',
  description: 'is less than',
  operation: 'lt'
}

const lessThanOrEqual: Filter = {
  active: type => String(type) === 'Int' || String(type) === 'Float',
  name: '_le',
  description: 'is less than or equal to',
  operation: 'le'
}

const greaterThan: Filter = {
  active: type => String(type) === 'Int' || String(type) === 'Float',
  name: '_gt',
  description: 'is greater than',
  operation: 'gt'
}

const greaterThanOrEqual: Filter = {
  active: type => String(type) === 'Int' || String(type) === 'Float',
  name: '_ge',
  description: 'is greater than or equal to',
  operation: 'ge'
}

export const filters = [
  allOf,
  anyOf,
  equal,
  lessThan,
  lessThanOrEqual,
  greaterThan,
  greaterThanOrEqual
]

function unwrap (type: GraphQLOutputType): GraphQLOutputType {
  if (type instanceof GraphQLNonNull) return type.ofType
  return type
}

function filtersForField (field: GraphQLField<*, *>): Array<FilterField> {
  return filters
    .filter(filter => filter.active(unwrap(field.type)))
    .map(filter =>
      Object.assign({}, filter, {
        type: unwrap(field.type),
        name: `${field.name}${filter.name}`,
        description: `${field.name} ${filter.description}`
      })
    )
}

function filtersForType (type: GraphQLObjectType): Array<FilterField> {
  return getFields(type).map(filtersForField).reduce((a, b) => a.concat(b), [])
}

const cache: Map<string, ?GraphQLInputObjectType> = new Map()

export function getFilterType (
  type: GraphQLObjectType
): ?GraphQLInputObjectType {
  const name = `${type.name}Filter`
  let filterType = cache.get(name)
  if (!filterType) {
    const filters = filtersForType(type)
    if (filters.length > 0) {
      const fields = {}
      filters.forEach(filter => {
        fields[filter.name] = {
          type: filter.type,
          description: filter.description
        }
      })
      filterType = new GraphQLInputObjectType({ name, fields })
    } else {
      filterType = null
    }
    cache.set(name, filterType)
  }
  return filterType
}
