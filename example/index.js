import path from 'path'
import fs from 'fs'
import express from 'express'
import graphqlHTTP from 'express-graphql'
import { buildSchema } from '../src/index'

const config = {
  server: 'http://localhost:8080/query',
  relay: false,
  debug: true
}

const graphqlPath = path.resolve(__dirname, 'schema.graphql')
const graphqlSchema = fs.readFileSync(graphqlPath).toString()

console.log('Running a GraphQL API server at http://localhost:4000')
const schema = buildSchema(graphqlSchema, config)

var app = express()
app.use(
  '/',
  graphqlHTTP((req, res) => ({
    schema: schema,
    graphiql: true,
    context: { language: req.headers['accept-language'].split('-')[0] }
  }))
)
app.listen(4000)
