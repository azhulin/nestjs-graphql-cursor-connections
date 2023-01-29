import { GqlTypeReference } from '@nestjs/graphql'
import { ConnectionBuilder } from '.'
import { Pagination } from '../interface'
import { Connection, ConnectionEdge } from '../type'

export abstract class FakeCursorConnectionBuilder<
  TConnection extends Connection<TConnectionEdge>,
  TConnectionEdge extends ConnectionEdge<TNode>,
  TNode extends GqlTypeReference,
> extends ConnectionBuilder<TConnection, TConnectionEdge, TNode, number> {
  protected isValidCursorData(data: unknown): boolean {
    return 'number' === typeof data && Number.isInteger(data) && 0 < data
  }

  protected getCursorData(node: TNode, index: number): number {
    return index + 1
  }

  protected getPagination(totalEdges: number): Pagination {
    totalEdges = totalEdges < 0 || Infinity === totalEdges ? 0 : Math.trunc(totalEdges)
    const sliceStart = Math.min(this.after ?? 0, totalEdges)
    const sliceEnd = Math.min(this.before ?? totalEdges + 1, totalEdges + 1)
    const sliceTotalEdges = Math.max(sliceEnd - sliceStart - 1, 0)
    const pagination = super.getPagination(sliceTotalEdges)
    const start = sliceStart + pagination.bounds.start
    const end = sliceStart + pagination.bounds.end
    pagination.bounds = { start, end, skip: start, take: end - start }
    return pagination
  }
}
