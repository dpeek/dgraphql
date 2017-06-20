// @flow

import {
  GraphQLObjectType,
  GraphQLBoolean,
  GraphQLString,
  GraphQLList,
  GraphQLInt,
  GraphQLID
} from 'graphql'

import getFilterType from '../type/getFilterType'
import getOrderType from '../type/getOrderType'
import resolve from '../resolve'

import type { GraphQLFieldConfig } from 'graphql'
import type { Context } from '../context'
import type { Client } from '../client'

const pageInfoType = new GraphQLObjectType({
  name: 'PageInfo',
  description: 'Information about pagination in a connection.',
  fields: {
    hasNextPage: {
      type: GraphQLBoolean,
      description: 'When paginating forwards, are there more items?'
    },
    hasPreviousPage: {
      type: GraphQLBoolean,
      description: 'When paginating backwards, are there more items?'
    },
    startCursor: {
      type: GraphQLString,
      description: 'When paginating backwards, the cursor to continue.'
    },
    endCursor: {
      type: GraphQLString,
      description: 'When paginating forwards, the cursor to continue.'
    }
  }
})

function getEdgeType (type: GraphQLObjectType): GraphQLObjectType {
  return new GraphQLObjectType({
    name: `${type.name}Edge`,
    description: 'An edge in a connection.',
    fields: {
      node: {
        type,
        description: 'The item at the end of the edge.'
      },
      cursor: {
        type: GraphQLString,
        description: 'A cursor for use in pagination.'
      }
    }
  })
}

const connectionTypes: Map<string, GraphQLObjectType> = new Map()

function getConnectionType (
  client: Client,
  type: GraphQLObjectType
): GraphQLObjectType {
  const name = `${type.name}Connection`
  let connectionType = connectionTypes.get(name)
  if (!connectionType) {
    const edgeType = getEdgeType(type)
    connectionType = new GraphQLObjectType({
      name,
      description: 'A connection to a list of items.',
      fields: {
        count: {
          type: GraphQLInt,
          description: 'The total number of edges in the connection.'
        },
        pageInfo: {
          type: pageInfoType,
          description: 'Information to aid in pagination.'
        },
        edges: {
          type: new GraphQLList(edgeType),
          description: 'A list of edges.'
        }
      }
    })
    connectionTypes.set(name, connectionType)
  }
  return connectionType
}

function getConnectionField (
  client: Client,
  type: GraphQLObjectType
): GraphQLFieldConfig<{}, Context> {
  const filterType = getFilterType(client, type)
  const orderType = getOrderType(client, type)
  return {
    type: getConnectionType(client, type),
    description: `Query ${type.name} nodes`,
    args: {
      first: {
        type: GraphQLInt
      },
      after: {
        type: GraphQLID
      },
      ...(filterType && { filter: { type: filterType } }),
      ...(orderType && { order: { type: orderType } })
    },
    resolve: (source, args, context, info) => {
      return resolve(source, context, info).then(nodes => {
        let count = nodes.count || 0
        let first = args.first || 0
        let hasPreviousPage = !!args.after
        let hasNextPage = false
        if (first && nodes.length > first) {
          nodes = nodes.slice(0, nodes.length - 1)
          hasNextPage = true
        }
        const edges = nodes.map(node => ({
          node,
          cursor: node._uid_
        }))
        const firstEdge = edges[0]
        const lastEdge = edges[edges.length - 1]
        return {
          edges,
          count: count,
          pageInfo: {
            startCursor: firstEdge ? firstEdge.cursor : null,
            endCursor: lastEdge ? lastEdge.cursor : null,
            hasPreviousPage,
            hasNextPage
          }
        }
      })
    }
  }
}

function getListQueryField (
  client: Client,
  type: GraphQLObjectType
): GraphQLFieldConfig<{}, Context> {
  const filterType = getFilterType(client, type)
  const orderType = getOrderType(client, type)
  return {
    type: new GraphQLList(type),
    description: `Query ${type.name} nodes`,
    args: {
      first: {
        type: GraphQLInt
      },
      after: {
        type: GraphQLID
      },
      ...(filterType && { filter: { type: filterType } }),
      ...(orderType && { order: { type: orderType } })
    },
    resolve: (source, args, context, info) => {
      return resolve(source, context, info)
    }
  }
}

export default function getListField (client: Client, type: GraphQLObjectType) {
  return client.relay
    ? getConnectionField(client, type)
    : getListQueryField(client, type)
}
