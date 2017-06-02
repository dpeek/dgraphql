/* @flow */

import invariant from 'invariant'

import {
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLID,
  isLeafType
} from 'graphql'

import type { GraphQLResolveInfo } from 'graphql'
import { mutationWithClientMutationId } from 'graphql-relay'

import { getSelections } from './request'
import { processSelections } from './response'
import { unwrap, unwrapNonNull, lowerCamelCase } from './utils'

import type { Client } from './client'
import type { Context } from './schema'

const inputTypes = new Map()
function getInputType (
  client: Client,
  type: GraphQLObjectType
): GraphQLInputObjectType {
  const name = type.name + 'Input'

  let inputType = inputTypes.get(name)
  if (inputType) return inputType

  inputType = new GraphQLInputObjectType({
    name: name,
    fields: () => getInputFields(client, type, false)
  })
  inputTypes.set(name, inputType)
  return inputType
}

function getInputFields (
  client: Client,
  type: GraphQLObjectType,
  excludeId: boolean
) {
  const inputFields = {}
  const fields = type.getFields()
  Object.keys(fields).forEach(fieldName => {
    const field = fields[fieldName]
    const fieldType = unwrapNonNull(field.type)
    if (fieldType instanceof GraphQLList) {
      if (fieldType.ofType instanceof GraphQLObjectType) {
        inputFields[fieldName] = {
          type: new GraphQLList(getInputType(client, fieldType.ofType))
        }
      } else {
        inputFields[fieldName] = {
          type: new GraphQLList(fieldType.ofType)
        }
      }
    } else if (fieldType instanceof GraphQLObjectType) {
      inputFields[fieldName] = { type: getInputType(client, fieldType) }
    } else if (isLeafType(fieldType)) {
      if (excludeId && fieldName === 'id') return
      inputFields[fieldName] = { type: fieldType }
    }
  })
  return inputFields
}

export function getDeleteMutation (client: Client, type: GraphQLObjectType) {
  return mutationWithClientMutationId({
    name: `Delete${type.name}Mutation`,
    inputFields: {
      id: { type: new GraphQLNonNull(GraphQLID) }
    },
    outputFields: {
      [lowerCamelCase(type.name)]: {
        type: type
      }
    },
    mutateAndGetPayload: (input, context, info) => {
      return deleteAndGetPayload(client, info, context, type, input)
    }
  })
}

export function getUpdateMutation (client: Client, type: GraphQLObjectType) {
  const name = type.name
  const fields = type.getFields()
  const inputFields = {}
  Object.keys(fields).forEach(fieldName => {
    const field = fields[fieldName]
    const fieldType = unwrap(field.type)
    if (isLeafType(fieldType)) {
      if (fieldName === 'id') {
        inputFields[fieldName] = { type: new GraphQLNonNull(GraphQLID) }
      } else {
        inputFields[fieldName] = { type: fieldType }
      }
    }
  })
  return mutationWithClientMutationId({
    name: `Update${name}Mutation`,
    inputFields,
    outputFields: {
      [lowerCamelCase(name)]: {
        type: type
      }
    },
    mutateAndGetPayload: (input, context, info) => {
      return updateAndGetPayload(client, info, context, type, input)
    }
  })
}

function getMutation (
  client: Client,
  info: GraphQLResolveInfo,
  context: Context
) {
  const mutationType = info.schema.getMutationType()
  invariant(mutationType, 'No mutation type defined in schema')
  const fields = mutationType.getFields()
  const selection = info.operation.selectionSet.selections[0]
  invariant(
    selection.kind === 'Field',
    'Mutation selection must be of kind field'
  )
  const type = fields[selection.name.value].type
  invariant(
    type instanceof GraphQLObjectType,
    'Mutation field type must be GraphQLObjectType'
  )
  invariant(
    selection.selectionSet,
    'Mutation field type must have selectionSet'
  )
  let query = 'query {\n'
  query += getSelections(
    client,
    info,
    context,
    selection.selectionSet.selections,
    type,
    '  ',
    true
  )
  return query + '}'
}

export function getCreateMutation (client: Client, type: GraphQLObjectType) {
  const name = type.name
  const inputFields = getInputFields(client, type, true)
  return mutationWithClientMutationId({
    name: `Create${name}Mutation`,
    inputFields,
    outputFields: {
      [lowerCamelCase(name)]: {
        type: type
      }
    },
    mutateAndGetPayload: (input, context, info) => {
      return createAndGetPayload(client, info, context, type, input)
    }
  })
}

async function deleteAndGetPayload (
  client: Client,
  info: GraphQLResolveInfo,
  context: Context,
  type: GraphQLObjectType,
  input: { id: string }
) {
  const typeName = type.name
  const typeField = lowerCamelCase(typeName)
  let query = 'mutation { delete {'
  query += `  <${input.id}> * * .`
  query += '}}'
  await client.fetchQuery(query)
  return {
    [typeField]: {
      id: input.id
    }
  }
}

async function updateAndGetPayload (
  client: Client,
  info: GraphQLResolveInfo,
  context: Context,
  type: GraphQLObjectType,
  input: { id: string }
) {
  return createOrUpdate(client, info, context, type, input, input.id)
}

function createAndGetPayload (
  client: Client,
  info: GraphQLResolveInfo,
  context: Context,
  type: GraphQLObjectType,
  input: {}
) {
  return createOrUpdate(client, info, context, type, input)
}

function getMutationFields (
  client: Client,
  info: GraphQLResolveInfo,
  context: Context,
  type: GraphQLObjectType,
  input: {},
  ident: string,
  count: number
) {
  let query = ''
  if (ident.indexOf('node') !== -1) {
    query += `  ${ident} <__typename> "${type.name}" .\n`
  }
  const fields = type.getFields()
  Object.keys(input).forEach(key => {
    if (key === 'id') return
    let fieldType = fields[key].type
    if (
      fieldType instanceof GraphQLObjectType ||
      fieldType instanceof GraphQLList
    ) {
      let nodes = []
      if (fieldType instanceof GraphQLList) {
        nodes = input[key]
        fieldType = fieldType.ofType
      } else {
        nodes = [input[key]]
      }
      nodes.forEach(node => {
        count++
        let nodeIdent = node.id ? `<${node.id}>` : `_:node${count}`
        let child = getMutationFields(
          client,
          info,
          context,
          fieldType,
          node,
          nodeIdent,
          count
        )
        query = child + query
        query += `  ${ident} <${key}> ${nodeIdent} .\n`
        let reverse = client.getReversePredicate(key)
        if (reverse) {
          query += `  ${nodeIdent} <${reverse}> ${ident} .\n`
        }
      })
    } else {
      const value = client.localizeValue(input[key], key, context.language)
      query += `  ${ident} <${key}> ${value} .\n`
    }
  })
  return query
}

async function createOrUpdate (
  client: Client,
  info: GraphQLResolveInfo,
  context: Context,
  type: GraphQLObjectType,
  input: {},
  id?: string
) {
  const isCreate = typeof id === 'undefined'
  let ident = isCreate ? '_:node' : '<' + String(id) + '>'
  let query = 'mutation { set {\n'
  query += getMutationFields(client, info, context, type, input, ident, 0)
  query += '}}'
  const res = await client.fetchQuery(query)
  query = getMutation(client, info, context)
  // TODO: good god lemmon
  query = query.replace(
    /func:eq\(__typename,[^)]+\)/m,
    'id:' + (id || res.uids.node)
  )
  return client.fetchQuery(query).then(res => {
    const selection = info.operation.selectionSet.selections[0]
    invariant(
      !!selection && selection.kind === 'Field' && selection.selectionSet,
      'Selection not found'
    )
    processSelections(
      client,
      info,
      selection.selectionSet.selections,
      info.schema.getQueryType(),
      res
    )
    return res
  })
}
