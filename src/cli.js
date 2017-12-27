#! /usr/bin/env node

const fs = require('fs')
const program = require('commander')

const { DgraphClientStub, DgraphClient, Operation } = require('dgraph-js')

const stub = new DgraphClientStub()
const client = new DgraphClient(stub)

const dropAll = () => {
  const op = new Operation()
  op.setDropAll(true)
  return client.alter(op)
}

program
  .arguments('<action>')
  .option('-s, --schema <file>', 'The schema to update')
  .action((action, options) => {
    if (action === 'update') {
      const { Client } = require('./client')
      const client2 = new Client({ relay: false, debug: false })
      const schema = fs.readFileSync(options.schema).toString()
      client2.updateSchema(schema).then(() => {
        console.log('completed')
      })
    } else if (action === 'drop') {
      dropAll().then(() => {
        console.log('completed')
      })
    }
    console.log(action, options.schema)
  })
  .parse(process.argv)
