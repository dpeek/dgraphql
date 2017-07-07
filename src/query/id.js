// @flow

import type { GraphNode } from '../client'

export default function resolve (source: GraphNode) {
  return source._uid_
}
