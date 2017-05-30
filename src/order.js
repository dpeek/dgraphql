/* @flow */

import { GraphQLObjectType, GraphQLEnumType, GraphQLScalarType } from 'graphql'

import { getFields, unwrap } from './utils'

const orderTypes: Map<string, ?GraphQLEnumType> = new Map()

export const orders = [
  { name: '_asc', operation: 'orderasc' },
  { name: '_desc', operation: 'orderdesc' }
]

export function getOrderType (type: GraphQLObjectType): ?GraphQLEnumType {
  const name = `${type.name}Order`
  let orderType = orderTypes.get(name)
  if (!orderType) {
    const fields = getFields(type).filter(
      field =>
        unwrap(field.type) instanceof GraphQLScalarType && field.name !== 'id'
    )
    if (fields.length > 0) {
      const values = {}
      fields.forEach(field => {
        orders.forEach(order => {
          const value = `${field.name}${order.name}`
          values[value] = { value: value }
        })
      })
      orderType = new GraphQLEnumType({ name, values })
    } else {
      orderType = null
    }
    orderTypes.set(name, orderType)
  }
  return orderType
}
