import { GqlTypeReference } from '@nestjs/graphql'
import { ConnectionBuilder } from '.'
import { Bounds } from '../interface'
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

  protected abstract getCursorDataError(name: 'after' | 'before', value: string): null | Error

  public getBounds(totalEdges: number): Bounds {
    const after = Math.min(this.after ?? 0, totalEdges)
    const before = Math.min(this.before ?? totalEdges + 1, totalEdges + 1)
    const total = Math.max(before - after - 1, 0)
    const bounds = super.getBounds(total)
    const start = bounds.start + after
    const end = bounds.end + after
    return { totalEdges, start, end, skip: start, take: end - start }
  }
}
