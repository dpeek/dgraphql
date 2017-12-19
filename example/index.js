// @flow

import express from 'express'
import graphqlHTTP from 'express-graphql'
import { Client } from '../src/client'

async function start () {
  const client = new Client({
    relay: false,
    debug: true
  })
  await client.init

  console.log('Running a GraphQL API server at http://localhost:4000')
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
}

start()
