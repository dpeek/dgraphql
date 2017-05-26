import path from 'path'
import fs from 'fs'
import express from 'express'
import graphqlHTTP from 'express-graphql'
import { buildSchema } from '../src/index'
import { connect } from '../src/dgraph'

const client = connect('http://localhost:8080')
const dgraphPath = path.resolve(__dirname, 'schema.dgraph')
client.query(fs.readFileSync(dgraphPath).toString())

const graphqlPath = path.resolve(__dirname, 'schema.graphql')
const graphqlSchema = fs.readFileSync(graphqlPath).toString()
const schema = buildSchema(graphqlSchema, { relay: false })

var app = express()
app.use('/', graphqlHTTP({ schema: schema, graphiql: true }))
app.listen(4000)

console.log('Running a GraphQL API server at http://localhost:4000')
