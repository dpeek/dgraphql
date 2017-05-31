/* @flow */

import invariant from 'invariant'

import { GraphQLObjectType, GraphQLInputObjectType, isLeafType } from 'graphql'

import type {
  GraphQLOutputType,
  GraphQLField,
  GraphQLResolveInfo,
  ArgumentNode
} from 'graphql'

import type { Client } from './client'
import { unwrapNonNull, getFields, getValue, quoteValue } from './utils'

type Filter = {
  active: (type: GraphQLOutputType) => boolean,
  name: string,
  description: string
}

type FilterField = {
  type: GraphQLOutputType,
  name: string,
  description: string
}

const allOf: Filter = {
  active: type => String(type) === 'String',
  name: '_allofterms',
  description: 'contains all of the terms'
}

const anyOf: Filter = {
  active: type => String(type) === 'String',
  name: '_anyofterms',
  description: 'contains any of the terms'
}

const equal: Filter = {
  active: type => isLeafType(type),
  name: '_eq',
  description: 'is equal to'
}

const lessThan: Filter = {
  active: type => String(type) === 'Int' || String(type) === 'Float',
  name: '_lt',
  description: 'is less than'
}

const lessThanOrEqual: Filter = {
  active: type => String(type) === 'Int' || String(type) === 'Float',
  name: '_le',
  description: 'is less than or equal to'
}

const greaterThan: Filter = {
  active: type => String(type) === 'Int' || String(type) === 'Float',
  name: '_gt',
  description: 'is greater than'
}

const greaterThanOrEqual: Filter = {
  active: type => String(type) === 'Int' || String(type) === 'Float',
  name: '_ge',
  description: 'is greater than or equal to'
}

const filters = [
  allOf,
  anyOf,
  equal,
  lessThan,
  lessThanOrEqual,
  greaterThan,
  greaterThanOrEqual
]

function filtersForField (field: GraphQLField<*, *>): Array<FilterField> {
  return filters
    .filter(filter => filter.active(unwrapNonNull(field.type)))
    .map(filter =>
      Object.assign({}, filter, {
        type: unwrapNonNull(field.type),
        name: `${field.name}${filter.name}`,
        description: `${field.name} ${filter.description}`
      })
    )
}

function filtersForType (type: GraphQLObjectType): Array<FilterField> {
  return getFields(type).map(filtersForField).reduce((a, b) => a.concat(b), [])
}

const filterTypes: Map<string, ?GraphQLInputObjectType> = new Map()

export function getFilterType (
  type: GraphQLObjectType
): ?GraphQLInputObjectType {
  const name = `${type.name}Filter`
  let filterType = filterTypes.get(name)
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
    filterTypes.set(name, filterType)
  }
  return filterType
}
