#! /usr/bin/env node

const fs = require('fs')
const program = require('commander')

const { Client } = require('./client')
const client = new Client({ relay: false, debug: false })

program
  .arguments('<action>')
  .option('-s, --schema <file>', 'The schema to update')
  .action((action, options) => {
    if (action === 'update') {
      const schema = fs.readFileSync(options.schema).toString()
      client.updateSchema(schema).then(() => {
        console.log('completed')
      })
    } else if (action === 'drop') {
      client.dropAll().then(() => {
        console.log('completed')
      })
    }
    console.log(action, options.schema)
  })
  .parse(process.argv)
