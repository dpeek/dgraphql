// @flow

export default function processResponse (node: {}): {} {
  Object.keys(node).forEach(key => {
    const value = node[key]
    if (key.indexOf('_count_') === 0) {
      const field = key.split('_')[2]
      node[field]['count'] = value[0].count
    }
    if (typeof value === 'object') processResponse(value)
  })
  return node
}
