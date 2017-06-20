// @flow

import { GraphQLObjectType, GraphQLEnumType } from 'graphql'

import { getFields } from '../utils'

import type { Client } from '../client'

const orderTypes: Map<string, ?GraphQLEnumType> = new Map()

export const orders = [
  { name: '_asc', operation: 'orderasc' },
  { name: '_desc', operation: 'orderdesc' }
]

export default function getOrderType (
  client: Client,
  type: GraphQLObjectType
): ?GraphQLEnumType {
  const name = `${type.name}Order`
  let orderType = orderTypes.get(name)
  if (!orderType) {
    const fields = getFields(type).filter(field => {
      return client.getOrder(type.name, field.name)
    })
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
