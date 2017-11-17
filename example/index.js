import path from 'path'
import fs from 'fs'
import express from 'express'
import graphqlHTTP from 'express-graphql'
import { Client } from '../src/client'

console.log('Running a GraphQL API server at http://localhost:4000')

const schema = path.resolve(__dirname, 'schema.graphql')
const client = new Client({
  server: 'http://localhost:8080',
  schema: fs.readFileSync(schema).toString(),
  relay: false,
  debug: true
})

var app = express()
app.use(
  '/',
  graphqlHTTP((req, res) => {
    const language = req.headers['accept-language'].split('-')[0]
    return {
      schema: client.schema,
      context: client.getContext(language),
      graphiql: true
    }
  })
)
app.listen(4000)
