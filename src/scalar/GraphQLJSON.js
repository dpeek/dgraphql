// @flow

import { GraphQLScalarType } from 'graphql'
import { getValue } from '../utils'

export default new GraphQLScalarType({
  name: 'JSON',
  description: 'The `JSON` scalar type represents JSON values as specified by ' +
    '[ECMA-404](http://www.ecma-international.org/' +
    'publications/files/ECMA-ST/ECMA-404.pdf).',
  serialize: value => JSON.parse(String(value)),
  parseValue: value => value,
  parseLiteral: ast =>
    JSON.stringify(getValue(null, ast)).split('"').join('\\"')
})
