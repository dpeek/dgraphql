/* @flow */

import {
  GraphQLObjectType,
  GraphQLBoolean,
  GraphQLString,
  GraphQLList,
  GraphQLInt
} from 'graphql'

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

export function getConnectionType (type: GraphQLObjectType): GraphQLObjectType {
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
