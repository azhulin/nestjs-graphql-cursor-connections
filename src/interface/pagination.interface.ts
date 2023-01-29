import { Bounds, Pager } from '.'

export interface Pagination {
  totalEdges: number
  pager: null | Pager
  bounds: Bounds
}
