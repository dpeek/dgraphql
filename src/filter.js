/* @flow */

import invariant from 'invariant'

import {
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLInputObjectType,
  isLeafType
} from 'graphql'

import type {
  GraphQLOutputType,
  GraphQLField,
  GraphQLResolveInfo,
  ArgumentNode
} from 'graphql'

import type { Client } from './client'
import { getFields, getValue, quoteValue } from './utils'

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

const filters = [
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

export function getFilterQuery (
  client: Client,
  info: GraphQLResolveInfo,
  argument: ArgumentNode
) {
  invariant(
    argument.value.kind === 'ObjectValue',
    'Provided filter value is not an object'
  )
  const args = argument.value.fields.map(field => {
    let name = field.name.value
    let filter = filters.find(filter => name.endsWith(filter.name))
    invariant(
      typeof filter !== 'undefined',
      `There was no filter matching the field name ${name}`
    )
    name = name.substr(0, name.length - filter.name.length)
    name = client.localizePredicate(name)
    let value = quoteValue(getValue(info, field.value))
    return `${filter.operation}(${name}, ${value})`
  })
  return `@filter(${args.join(' AND ')})`
}
