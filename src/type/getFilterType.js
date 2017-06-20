// @flow

import { GraphQLObjectType, GraphQLInputObjectType, isLeafType } from 'graphql'
import { unwrapNonNull, getFields } from '../utils'

import type { GraphQLOutputType, GraphQLField } from 'graphql'
import type { Client } from '../client'

type Filter = {
  active: (type: GraphQLOutputType) => boolean,
  filterType: string,
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
  filterType: 'TERM',
  name: '_allofterms',
  description: 'contains all of the terms'
}

const anyOf: Filter = {
  active: type => String(type) === 'String',
  filterType: 'TERM',
  name: '_anyofterms',
  description: 'contains any of the terms'
}

const equal: Filter = {
  active: type => isLeafType(type),
  filterType: 'EQUALITY',
  name: '_eq',
  description: 'is equal to'
}

const lessThan: Filter = {
  active: type => String(type) === 'Int' || String(type) === 'Float',
  filterType: 'EQUALITY',
  name: '_lt',
  description: 'is less than'
}

const lessThanOrEqual: Filter = {
  active: type => String(type) === 'Int' || String(type) === 'Float',
  filterType: 'EQUALITY',
  name: '_le',
  description: 'is less than or equal to'
}

const greaterThan: Filter = {
  active: type => String(type) === 'Int' || String(type) === 'Float',
  filterType: 'EQUALITY',
  name: '_gt',
  description: 'is greater than'
}

const greaterThanOrEqual: Filter = {
  active: type => String(type) === 'Int' || String(type) === 'Float',
  filterType: 'EQUALITY',
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

function filtersForField (
  client: Client,
  type: GraphQLObjectType,
  field: GraphQLField<*, *>
): Array<FilterField> {
  return filters
    .filter(filter => filter.active(unwrapNonNull(field.type)))
    .filter(filter => {
      const filters = client.getFilters(type.name, field.name)
      return filters.has(filter.filterType)
    })
    .map(filter =>
      Object.assign({}, filter, {
        type: unwrapNonNull(field.type),
        name: `${field.name}${filter.name}`,
        description: `${field.name} ${filter.description}`
      })
    )
}

function filtersForType (
  client: Client,
  type: GraphQLObjectType
): Array<FilterField> {
  return getFields(type)
    .filter(field => field.name !== 'id')
    .map(field => filtersForField(client, type, field))
    .reduce((a, b) => a.concat(b), [])
}

const filterTypes: Map<string, ?GraphQLInputObjectType> = new Map()

export default function getFilterType (
  client: Client,
  type: GraphQLObjectType
): ?GraphQLInputObjectType {
  const name = `${type.name}Filter`
  let filterType = filterTypes.get(name)
  if (!filterType) {
    const filters = filtersForType(client, type)
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
