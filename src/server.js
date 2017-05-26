import chokidar from 'chokidar'
import express from 'express'
import graphQLHTTP from 'express-graphql'
import require from 'require-clean'
import fs from 'fs'
import path from 'path'
import { graphql } from 'graphql'
import { introspectionQuery, printSchema } from 'graphql/utilities'
import mkdirp from 'mkdirp'

const GRAPHQL_PORT = 3001
let server = null

function updateSchema (schema) {
  const dir = './bin/graphql'
  mkdirp.sync(dir)
  // Save JSON of full schema introspection for Babel Relay Plugin to use
  ;(async () => {
    var result = await graphql(schema, introspectionQuery)
    if (result.errors) {
      console.error(
        'ERROR introspecting schema: ',
        JSON.stringify(result.errors, null, 2)
      )
    } else {
      fs.writeFileSync(
        path.join(dir, 'schema.json'),
        JSON.stringify(result, null, 2)
      )
    }
  })()

  // Save user readable type system shorthand of schema
  fs.writeFileSync(path.join(dir, 'schema.graphql'), printSchema(schema))
}

function startServer (callback) {
  if (server) {
    server.close()
  }
  let { transformSchema } = require('./schema')
  // const schema = transformSchema({ relay: false }, './res/data/schema.graphql')
  const schema = transformSchema(
    { relay: false },
    './src/graphql/__tests__/test.graphql'
  )
  updateSchema(schema)

  const app = express()
  app.use(
    '/',
    graphQLHTTP({
      graphiql: true,
      pretty: true,
      schema: schema
    })
  )
  server = app.listen(GRAPHQL_PORT, () => {
    console.log(
      `GraphQL server is now running on http://localhost:${GRAPHQL_PORT}`
    )
    if (callback) {
      callback()
    }
  })
}

const watcher = chokidar.watch('./src/graphql/*')
watcher.on('change', path => {
  console.log(`\`${path}\` changed. Restarting.`)
  startServer(() =>
    console.log('Restart your browser to use the updated schema.')
  )
})

startServer()
