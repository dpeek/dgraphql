// @flow

import invariant from "invariant";

import { GraphQLObjectType, GraphQLList } from "graphql";
import { unwrapNonNull } from "../utils";

import type { Context } from "../client";

export type NodeInput = {
  id?: string,
  updatedAt: string,
  createdAt: string,
  [string]: NodeInput | Array<NodeInput>
};

export type MutationInput = {
  id: string,
  clientMutationId: ?string,
  [string]: NodeInput | Array<NodeInput>
};

export default function getMutation(
  context: Context,
  type: GraphQLObjectType,
  input: MutationInput,
  subject: string,
  types: { [string]: string }
) {
  const ident = getIdent();
  const stamp = new Date().toISOString();
  const node = Object.assign({}, input, {
    createdAt: stamp,
    updatedAt: stamp
  });
  return getMutationFields(context, type, node, subject, ident, types);
}

function getMutationFields(
  context: Context,
  type: GraphQLObjectType,
  input: NodeInput,
  subject: string,
  ident: (id?: string) => string,
  types: { [string]: string }
) {
  const isCreate = !input.id;
  let query = "";
  if (isCreate) {
    query += `  ${subject} <type${type.name}> "" .\n`;
    query += `  ${subject} <__typename> "${type.name}" .\n`;
  }
  const fields = type.getFields();
  Object.keys(input).forEach(key => {
    if (key === "id") return;
    if (key === "createdAt" && !isCreate) return;
    if (typeof fields[key] === "undefined") return;

    const value = input[key];
    let fieldType = unwrapNonNull(fields[key].type);

    if (
      fieldType instanceof GraphQLList ||
      fieldType instanceof GraphQLObjectType
    ) {
      if (fieldType instanceof GraphQLList) {
        fieldType = unwrapNonNull(fieldType.ofType);
      }
      const values = Array.isArray(value)
        ? value
        : typeof value === "object" ? [value] : [];
      values
        .map(value => {
          invariant(typeof value === "object", "Input value is not object");
          return Object.assign({}, value, {
            createdAt: input.createdAt,
            updatedAt: input.updatedAt
          });
        })
        .forEach(node => {
          invariant(fieldType instanceof GraphQLObjectType, "Type not object");
          if (node.id) {
            const existing = types[node.id];
            if (typeof existing === "undefined") {
              throw new Error(
                `There is no "${fieldType.name}" with id "${node.id}"`
              );
            } else if (existing !== fieldType.name) {
              throw new Error(
                `Cannot create edge "${key}" from "${
                  type.name
                }" to "${existing}", should be "${fieldType.name}"`
              );
            }
          }
          query += getNodeQuery(
            context,
            node,
            fieldType,
            ident,
            subject,
            key,
            types
          );
        });
    } else {
      const locale = context.client.localizeValue(value, key, context.language);
      query += `  ${subject} <${key}> ${locale} .\n`;
    }
  });
  return query;
}

function getNodeQuery(
  context: Context,
  input: NodeInput,
  type: GraphQLObjectType,
  ident: (id?: string) => string,
  subject: string,
  predicate: string,
  types: { [string]: string }
) {
  let value = ident(input.id);
  let query = `  ${subject} <${predicate}> ${value} .\n`;
  let reverse = context.client.getReversePredicate(predicate);
  if (reverse) {
    query += `  ${value} <${reverse}> ${subject} .\n`;
  }
  query += getMutationFields(context, type, input, value, ident, types);
  return query;
}

function getIdent() {
  let count = 0;
  return (id?: string) => (id ? `<${id}>` : `_:node${count++}`);
}
