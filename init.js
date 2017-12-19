import fs from 'fs'
import { Client } from './src/index'

const path = process.argv.pop()
const schema = fs.readFileSync(path).toString()
const client = new Client({ relay: false, debug: false })

// client.dropAll().then(() => {
//   console.log('dropped all')
// })

client.updateSchema(schema).then(() => {
  console.log('updated schema!')
})
