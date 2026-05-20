import { GraphQLScalarType, Kind } from 'graphql';

export const jsonScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON value',
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral(ast) {
    switch (ast.kind) {
      case Kind.STRING:
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.INT:
      case Kind.FLOAT:
        return Number(ast.value);
      case Kind.OBJECT: {
        const value = {};
        for (const field of ast.fields) value[field.name.value] = jsonScalar.parseLiteral(field.value);
        return value;
      }
      case Kind.LIST:
        return ast.values.map((item) => jsonScalar.parseLiteral(item));
      case Kind.NULL:
        return null;
      default:
        return null;
    }
  }
});
