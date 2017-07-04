// @flow

import type { GraphNode } from '../client'

export default function resolveId (source: GraphNode) {
  return source._uid_
}
