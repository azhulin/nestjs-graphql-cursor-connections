import { GqlTypeReference } from '@nestjs/graphql'
import { Cursor, CursorData } from '../cursor'
import { Bounds } from '../interface'
import { Connection, ConnectionArgs, ConnectionEdge, PageInfo } from '../type'

export abstract class ConnectionBuilder<
  TConnection extends Connection<TConnectionEdge>,
  TConnectionEdge extends ConnectionEdge<TNode>,
  TNode extends GqlTypeReference,
  TCursorData extends CursorData,
  TConnectionArgs extends ConnectionArgs = ConnectionArgs,
> {
  public args: TConnectionArgs

  public after?: TCursorData

  public before?: TCursorData

  public first?: number

  public last?: number

  public constructor(args: TConnectionArgs, maxEdgesToReturn = 0) {
    this.args = args
    const { after, before, first, last } = args
    after && (this.after = this.extractCursorData('after', after))
    before && (this.before = this.extractCursorData('before', before))
    this.first = first
    this.last = last
    this.adjustArguments(maxEdgesToReturn)
  }

  protected abstract getCursorData(node: TNode, index: number): TCursorData

  protected abstract isValidCursorData(data: unknown): boolean

  protected abstract getCursorDataError(name: 'after' | 'before', value: string): null | Error

  protected async createConnectionEdge(edge: ConnectionEdge<TNode>): Promise<TConnectionEdge> {
    return <TConnectionEdge>edge
  }

  protected async createConnection(connection: Connection<TConnectionEdge>): Promise<TConnection> {
    return <TConnection>connection
  }

  protected adjustArguments(maxEdgesToReturn: number): void {
    if (maxEdgesToReturn < 1) {
      return
    }
    maxEdgesToReturn = Math.trunc(maxEdgesToReturn)
    if (!this.last) {
      this.first = Math.min(this.first ?? maxEdgesToReturn, maxEdgesToReturn)
    } else {
      this.last = Math.min(this.last, maxEdgesToReturn)
    }
  }

  public getBounds(totalEdges: number): Bounds {
    const end = Math.min(this.first ?? totalEdges, totalEdges)
    const start = Math.max(end - (this.last ?? end), 0)
    return { totalEdges, start, end, skip: start, take: end - start }
  }

  public async build(nodes: TNode[], totalEdges: number): Promise<null | TConnection> {
    if (!nodes.length) {
      return null
    }
    const bounds = this.getBounds(totalEdges)
    const edges = await this.buildEdges(nodes, bounds)
    const pageInfo = this.buildPageInfo(edges, bounds)
    return this.createConnection({ pageInfo, edges, totalEdges })
  }

  protected async buildEdges(nodes: TNode[], { start }: Bounds): Promise<TConnectionEdge[]> {
    return Promise.all(
      nodes.map((node, index) => {
        const cursor = Cursor.toString(this.getCursorData(node, start + index))
        return this.createConnectionEdge({ node, cursor })
      }),
    )
  }

  protected buildPageInfo(edges: TConnectionEdge[], bounds: Bounds): PageInfo {
    return {
      hasNextPage: !!this.before || bounds.end < bounds.totalEdges,
      hasPreviousPage: !!this.after || 0 < bounds.start,
      startCursor: edges[0].cursor,
      endCursor: edges[edges.length - 1].cursor,
    }
  }

  protected extractCursorData(name: 'after' | 'before', cursor: string): undefined | TCursorData {
    const data = Cursor.toData(cursor)
    if (null !== data && this.isValidCursorData(data)) {
      return <TCursorData>data
    }
    const error = this.getCursorDataError(name, cursor)
    if (error) {
      throw error
    }
  }
}
