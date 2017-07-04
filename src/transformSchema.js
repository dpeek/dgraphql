// @flow

import invariant from 'invariant'
import pluralize from 'pluralize'

import { upperCamelCase, lowerCamelCase } from './utils'

import type {
  DocumentNode,
  TypeNode,
  NamedTypeNode,
  ListTypeNode,
  NonNullTypeNode,
  DefinitionNode,
  TypeDefinitionNode,
  ObjectTypeDefinitionNode,
  InputObjectTypeDefinitionNode,
  EnumTypeDefinitionNode,
  FieldDefinitionNode
} from 'graphql'

type TypeMap = Map<string, TypeDefinitionNode>

const booleanOps = ['AND', 'OR']
const orderableTypes = ['String', 'Int', 'Float', 'DateTime']

const fieldDef = ({
  name,
  type,
  args
}: {
  name: string,
  type: TypeNode,
  args?: Array<*>
}) => ({
  kind: 'FieldDefinition',
  name: { kind: 'Name', value: name },
  arguments: args || [],
  type
})

const inputValueDef = ({
  name,
  type,
  args
}: {
  name: string,
  type: TypeNode,
  args?: Array<*>
}) => ({
  kind: 'InputValueDefinition',
  name: { kind: 'Name', value: name },
  type
})

const nonNullType = (type: ListTypeNode | NamedTypeNode): NonNullTypeNode => ({
  kind: 'NonNullType',
  type
})

const listType = (type: TypeNode): ListTypeNode => ({
  kind: 'ListType',
  type
})

const namedType = (name: string): NamedTypeNode => ({
  kind: 'NamedType',
  name: { kind: 'Name', value: name }
})

const nonNullNamedType = (name: string) => nonNullType(namedType(name))

const nonNullListOfNamedType = (name: string) =>
  nonNullType(listType(nonNullNamedType(name)))

const clientMutationIdField = fieldDef({
  name: 'clientMutationId',
  type: nonNullNamedType('String')
})

const clientMutationIdInput = inputValueDef({
  name: 'clientMutationId',
  type: nonNullNamedType('String')
})

const nodeInterface = {
  kind: 'InterfaceTypeDefinition',
  name: { kind: 'Name', value: 'Node' },
  fields: [fieldDef({ name: 'id', type: nonNullNamedType('ID') })]
}

const pageInfo = {
  kind: 'ObjectTypeDefinition',
  name: { kind: 'Name', value: 'PageInfo' },
  // description: 'Information about pagination in a connection.',
  fields: [
    fieldDef({
      name: 'hasNextPage',
      // description: 'When paginating forwards, are there more items?',
      type: namedType('Boolean')
    }),
    fieldDef({
      name: 'hasPreviousPage',
      // description: 'When paginating backwards, are there more items?',
      type: namedType('Boolean')
    }),
    fieldDef({
      name: 'startCursor',
      // description: 'When paginating backwards, the cursor to continue.',
      type: namedType('String')
    }),
    fieldDef({
      name: 'endCursor',
      // description: 'When paginating forwards, the cursor to continue.',
      type: namedType('String')
    })
  ]
}

export default function transformSchema (ast: DocumentNode, relay: boolean) {
  let types = new Map()
  let queries = []
  let mutations = []
  let defs: Array<ObjectTypeDefinitionNode> = []
  ast.definitions.forEach(type => {
    if (type.kind === 'ObjectTypeDefinition') {
      defs.push(type)
    }
  })
  defs.forEach(type => types.set(type.name.value, type))
  defs.forEach(type => {
    const typeName = type.name.value
    const fields = type.fields.map(field => {
      if (relay && field.name.value === 'id' && type.interfaces) {
        type.interfaces.push(namedType('Node'))
      }
      if (isList(field.type)) {
        mutations.push(getFieldMutation(types, type, field, 'add', relay))
        mutations.push(getFieldMutation(types, type, field, 'remove', relay))
        if (relay) {
          const fieldType = types.get(getTypeName(field.type))
          invariant(
            fieldType && fieldType.kind === 'ObjectTypeDefinition',
            'Invalid connection type'
          )
          const edge = getEdge(fieldType)
          types.set(edge.name.value, edge)
          const connection = getConnection(fieldType, edge)
          types.set(connection.name.value, connection)
          return fieldDef({
            name: field.name.value,
            type: namedType(connection.name.value),
            args: getQueryArguments(types, type)
          })
        } else {
          return { ...field, arguments: getQueryArguments(types, type) }
        }
      } else if (types.has(getTypeName(field.type))) {
        mutations.push(getFieldMutation(types, type, field, 'set', relay))
        mutations.push(getFieldMutation(types, type, field, 'unset', relay))
      }
      return field
    })

    queries.push(
      fieldDef({
        name: lowerCamelCase(typeName),
        // description: `Find a \`${typeName}\` by \`id\``,
        type: namedType(typeName),
        args: [
          {
            kind: 'InputValueDefinition',
            name: { kind: 'Name', value: 'id' },
            // description: `The \`id\` of a \`${typeName}\``,
            type: nonNullType(namedType('ID'))
          }
        ]
      })
    )
    queries.push(
      fieldDef({
        name: lowerCamelCase(pluralize(typeName)),
        type: relay
          ? namedType(`${typeName}Connection`)
          : nonNullListOfNamedType(typeName),
        args: getQueryArguments(types, type)
      })
    )

    mutations.push(getTypeMutationField(types, type, 'create', relay))
    mutations.push(getTypeMutationField(types, type, 'update', relay))
    mutations.push(getTypeMutationField(types, type, 'delete', relay))

    const newType: ObjectTypeDefinitionNode = { ...type, fields }
    types.set(typeName, newType)
  })

  const definitions: Array<DefinitionNode> = [...types.values()]

  if (relay) {
    definitions.push(nodeInterface)
    definitions.push(pageInfo)
    queries.push(
      fieldDef({
        name: 'node',
        // description: 'Fetches an object given its `id`',
        type: namedType('Node'),
        args: [
          {
            kind: 'InputValueDefinition',
            name: { kind: 'Name', value: 'id' },
            // description: 'The `id` of an object',
            type: nonNullType(namedType('ID'))
          }
        ]
      })
    )
  }

  definitions.push({
    kind: 'ObjectTypeDefinition',
    name: { kind: 'Name', value: 'Query' },
    fields: queries
  })

  definitions.push({
    kind: 'ObjectTypeDefinition',
    name: { kind: 'Name', value: 'Mutation' },
    fields: mutations
  })

  definitions.push({
    kind: 'SchemaDefinition',
    directives: [],
    operationTypes: [
      {
        kind: 'OperationTypeDefinition',
        operation: 'query',
        type: namedType('Query')
      },
      {
        kind: 'OperationTypeDefinition',
        operation: 'mutation',
        type: namedType('Mutation')
      }
    ]
  })

  return { ...ast, definitions }
}

function getQueryArguments (types: TypeMap, type: ObjectTypeDefinitionNode) {
  const args = [
    {
      kind: 'InputValueDefinition',
      name: { kind: 'Name', value: 'first' },
      type: namedType('Int')
    },
    {
      kind: 'InputValueDefinition',
      name: { kind: 'Name', value: 'after' },
      type: namedType('ID')
    }
  ]
  let filter = getFilter(type)
  if (filter.fields.length > 0) {
    types.set(filter.name.value, filter)
    args.push({
      kind: 'InputValueDefinition',
      name: { kind: 'Name', value: 'filter' },
      type: namedType(filter.name.value)
    })
  }
  let order = getOrder(type)
  if (order.values.length > 0) {
    types.set(order.name.value, order)
    args.push({
      kind: 'InputValueDefinition',
      name: { kind: 'Name', value: 'order' },
      type: namedType(order.name.value)
    })
  }
  return args
}

function getTypeMutationField (
  types: TypeMap,
  type: ObjectTypeDefinitionNode,
  operation: string,
  relay: boolean
) {
  const name = `${operation}${type.name.value}`
  let input = getTypeMutationInput(types, type, operation, relay)
  let payload = getMutationPayload(types, type, relay)
  return {
    kind: 'FieldDefinition',
    name: {
      kind: 'Name',
      value: name
    },
    type: namedType(payload.name.value),
    arguments: [
      {
        kind: 'InputValueDefinition',
        name: { kind: 'Name', value: 'input' },
        type: nonNullNamedType(input.name.value)
      }
    ]
  }
}

function getTypeMutationInput (
  types: TypeMap,
  type: ObjectTypeDefinitionNode,
  operation: string,
  relay: boolean
) {
  const inputName = `${upperCamelCase(operation)}${type.name.value}MutationInput`
  let input = types.get(inputName)
  if (input) return input

  let fields = []
  if (operation === 'create') {
    fields = getInputFields(types, type, true)
  } else if (operation === 'update') {
    fields = getInputFields(types, type, false)
  } else if (operation === 'delete') {
    fields = [
      {
        kind: 'InputValueDefinition',
        name: { kind: 'Name', value: 'id' },
        type: nonNullNamedType('ID')
      }
    ]
  }
  input = {
    kind: 'InputObjectTypeDefinition',
    name: { kind: 'Name', value: inputName },
    fields: [...fields, ...(relay ? [clientMutationIdInput] : [])]
  }

  types.set(inputName, input)
  return input
}

function getFieldMutation (
  types: TypeMap,
  type: ObjectTypeDefinitionNode,
  field: FieldDefinitionNode,
  operation: string,
  relay: boolean
) {
  const name = `${operation}${type.name.value}${upperCamelCase(field.name.value)}`
  let input = getFieldMutationInput(types, type, field, operation, relay)
  let payload = getMutationPayload(types, type, relay)
  return {
    kind: 'FieldDefinition',
    name: {
      kind: 'Name',
      value: name
    },
    type: namedType(payload.name.value),
    arguments: [
      {
        kind: 'InputValueDefinition',
        name: { kind: 'Name', value: 'input' },
        type: nonNullNamedType(input.name.value)
      }
    ]
  }
}

function getFieldMutationInput (
  typeMap: TypeMap,
  type: ObjectTypeDefinitionNode,
  field: FieldDefinitionNode,
  operation: string,
  relay: boolean
) {
  const inputName = `${upperCamelCase(operation)}${type.name.value}${upperCamelCase(field.name.value)}MutationInput`
  let input = typeMap.get(inputName)
  if (input) return input

  if (operation === 'unset') {
    input = {
      kind: 'InputObjectTypeDefinition',
      name: { kind: 'Name', value: inputName },
      fields: [
        inputValueDef({
          name: 'id',
          type: nonNullType(namedType('ID'))
        })
      ]
    }
  } else {
    const typeInput = getInputType(typeMap, `${type.name.value}Input`, type)
    const relation = operation === 'add' || operation === 'remove'
      ? nonNullListOfNamedType(typeInput.name.value)
      : nonNullNamedType(typeInput.name.value)

    input = {
      kind: 'InputObjectTypeDefinition',
      name: { kind: 'Name', value: inputName },
      fields: [
        inputValueDef({
          name: 'id',
          type: nonNullType(namedType('ID'))
        }),
        inputValueDef({
          name: field.name.value,
          type: relation
        }),
        ...(relay ? [clientMutationIdInput] : [])
      ]
    }
  }
  typeMap.set(inputName, input)
  return input
}

function getMutationPayload (
  typeMap: TypeMap,
  type: ObjectTypeDefinitionNode,
  relay: boolean
) {
  const payloadName = `${type.name.value}MutationPayload`
  let payload = typeMap.get(payloadName)
  if (payload) return payload

  const typeName = type.name.value
  payload = {
    kind: 'ObjectTypeDefinition',
    name: { kind: 'Name', value: payloadName },
    fields: [
      {
        kind: 'FieldDefinition',
        name: { kind: 'Name', value: lowerCamelCase(typeName) },
        type: { kind: 'NamedType', name: { kind: 'Name', value: typeName } },
        arguments: []
      },
      ...(relay ? [clientMutationIdField] : [])
    ]
  }
  typeMap.set(payloadName, payload)
  return payload
}

function getInputFields (
  types: TypeMap,
  type: ObjectTypeDefinitionNode,
  excludeId: boolean
) {
  return type.fields
    .filter(field => {
      return !(excludeId && field.name.value === 'id')
    })
    .map(field => {
      const typeName = getTypeName(field.type)
      if (types.has(typeName)) {
        const fieldType = types.get(typeName)
        invariant(
          fieldType && fieldType.kind === 'ObjectTypeDefinition',
          'Invalid input type'
        )
        const input = getInputType(types, `${typeName}Input`, fieldType)
        if (isList(field.type)) {
          return {
            kind: 'InputValueDefinition',
            name: { kind: 'Name', value: field.name.value },
            type: listType(namedType(input.name.value)),
            arguments: []
          }
        } else {
          return {
            kind: 'InputValueDefinition',
            name: { kind: 'Name', value: field.name.value },
            type: namedType(input.name.value),
            arguments: []
          }
        }
      } else {
        return {
          kind: 'InputValueDefinition',
          name: { kind: 'Name', value: field.name.value },
          type: namedType(getTypeName(field.type)),
          arguments: []
        }
      }
    })
}

function getInputType (
  types: TypeMap,
  name: string,
  type: ObjectTypeDefinitionNode
) {
  let inputType = types.get(name)
  if (inputType) return inputType

  const fields = []
  inputType = {
    kind: 'InputObjectTypeDefinition',
    name: { kind: 'Name', value: name },
    fields
  }
  types.set(name, inputType)
  getInputFields(types, type, false).forEach(field => fields.push(field))
  return inputType
}

function isList (type: TypeNode) {
  if (type.kind === 'NonNullType') {
    return isList(type.type)
  }
  return type.kind === 'ListType'
}

function getOrder (type: ObjectTypeDefinitionNode): EnumTypeDefinitionNode {
  const fields = type.fields.filter(field => getConfig(field).order)
  const values = fields.reduce((values, field) => {
    const name = field.name.value
    return values.concat([
      {
        kind: 'EnumValueDefinition',
        name: { kind: 'Name', value: `${name}_asc` }
      },
      {
        kind: 'EnumValueDefinition',
        name: { kind: 'Name', value: `${name}_desc` }
      }
    ])
  }, [])
  return {
    kind: 'EnumTypeDefinition',
    name: { kind: 'Name', value: `${type.name.value}Order` },
    values
  }
}

function getEdge (type: ObjectTypeDefinitionNode): ObjectTypeDefinitionNode {
  return {
    kind: 'ObjectTypeDefinition',
    name: { kind: 'Name', value: `${type.name.value}Edge` },
    // description: 'An edge in a connection.',
    fields: [
      fieldDef({
        name: 'node',
        // description: 'The item at the end of the edge.',
        type: namedType(type.name.value)
      }),
      fieldDef({
        name: 'cursor',
        // description: 'A cursor for use in pagination.',
        type: namedType('String')
      })
    ]
  }
}

function getConnection (
  type: ObjectTypeDefinitionNode,
  edge: ObjectTypeDefinitionNode
): ObjectTypeDefinitionNode {
  return {
    kind: 'ObjectTypeDefinition',
    name: { kind: 'Name', value: `${type.name.value}Connection` },
    // description: 'A connection to a list of items.',
    fields: [
      fieldDef({
        name: 'count',
        // description: 'The total number of edges in the connection.',
        type: namedType('Int')
      }),
      fieldDef({
        name: 'pageInfo',
        // description: 'Information to aid in pagination.',
        type: namedType('PageInfo')
      }),
      fieldDef({
        name: 'edges',
        // description: 'A list of edges.',
        type: listType(namedType(edge.name.value))
      })
    ]
  }
}

function getFilter (
  type: ObjectTypeDefinitionNode
): InputObjectTypeDefinitionNode {
  const filterName = `${type.name.value}Filter`
  const filters = []
  type.fields.forEach(field => {
    const config = getConfig(field)
    const name = field.name.value
    const typeName = getTypeName(field.type)
    config.filters.forEach(filter => {
      if (filter === 'EQUALITY') {
        filters.push({
          name: `${name}_eq`,
          description: `${name} is equal to`,
          type: typeName
        })
        if (typeName === 'Int' || typeName === 'Float') {
          filters.push({
            name: `${name}_gt`,
            description: `${name} is greather than`,
            type: typeName
          })
          filters.push({
            name: `${name}_lt`,
            description: `${name} is less than`,
            type: typeName
          })
          filters.push({
            name: `${name}_ge`,
            description: `${name} is greater than or equal to`,
            type: typeName
          })
          filters.push({
            name: `${name}_le`,
            description: `${name} is less than or equal to`,
            type: typeName
          })
        }
      } else if (filter === 'TERM') {
        if (typeName === 'String') {
          filters.push({
            name: `${name}_allofterms`,
            description: `${name} contains all of the terms`,
            type: typeName
          })
          filters.push({
            name: `${name}_anyofterms`,
            description: `${name} contains any of the terms`,
            type: typeName
          })
        }
      }
    })
  })
  const fields = []
  booleanOps.forEach(op => {
    fields.push({
      kind: 'InputValueDefinition',
      name: { kind: 'Name', value: op },
      type: listType(nonNullNamedType(filterName))
    })
  })
  filters.forEach(({ name, type, description }) => {
    fields.push({
      kind: 'InputValueDefinition',
      name: { kind: 'Name', value: name },
      // description: description,
      type: namedType(type)
    })
  })
  return {
    kind: 'InputObjectTypeDefinition',
    name: { kind: 'Name', value: filterName },
    fields
  }
}

function getConfig (field: FieldDefinitionNode) {
  let order = false
  let localize = false
  let reverse = null
  let filters = []
  if (field.directives) {
    field.directives.forEach(directive => {
      const directiveName = directive.name.value
      const typeName = getTypeName(field.type)
      const arg = directive.arguments && directive.arguments[0]
      switch (directiveName) {
        case 'order':
          if (orderableTypes.indexOf(typeName) === -1) {
            throw new Error(`Cannot order on field of type "${typeName}"`)
          }
          order = true
          break
        case 'localize':
          localize = true
          break
        case 'filter':
          if (arg && arg.value.kind === 'ListValue') {
            filters = arg.value.values.map(value => {
              if (value.kind === 'EnumValue') {
                return value.value
              }
              return ''
            })
          }
          break
        case 'reverse':
          if (arg && arg.value.kind === 'StringValue') {
            reverse = arg.value.value
          }
          break
        default:
          throw new Error(`Unknown directive @${directiveName}`)
      }
    })
  }
  return {
    order,
    localize,
    filters,
    reverse
  }
}

function getTypeName (type: TypeNode) {
  if (type.kind === 'NonNullType' || type.kind === 'ListType') {
    return getTypeName(type.type)
  }
  return type.name.value
}