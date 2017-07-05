import { GraphQLScalarType, Kind } from 'graphql'

export default new GraphQLScalarType({
  name: 'DateTime',
  serialize: value => {
    return value
  },
  parseValue: value => {
    return new Date(value)
  },
  parseLiteral: function (ast) {
    if (ast.kind === Kind.STRING) {
      var date = new Date(ast.value)
      if (!isNaN(date.getTime())) {
        return date.toISOString()
      }
    }
    return null
  }
})
