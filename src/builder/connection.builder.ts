import { GqlTypeReference } from '@nestjs/graphql'
import { Cursor, CursorData } from '../cursor'
import { Bounds, Pager, Pagination } from '../interface'
import { Connection, ConnectionArgs, ConnectionEdge, PageInfo } from '../type'

export abstract class ConnectionBuilder<
  TConnection extends Connection<TConnectionEdge>,
  TConnectionEdge extends ConnectionEdge<TNode>,
  TNode extends GqlTypeReference,
  TCursorData extends CursorData,
  TConnectionArgs extends ConnectionArgs = ConnectionArgs,
> {
  public readonly args: TConnectionArgs

  public readonly after?: TCursorData

  public readonly before?: TCursorData

  public readonly first: number

  public readonly last: number

  public readonly edgesPerPage?: number

  public readonly page?: number

  public constructor(args: TConnectionArgs, maxEdgesToReturn = Infinity) {
    this.args = args
    const { after, before, edgesPerPage, page, first, last } = args
    this.after = after ? this.extractCursorData('after', after) : undefined
    this.before = before ? this.extractCursorData('before', before) : undefined
    maxEdgesToReturn = 1 <= maxEdgesToReturn ? Math.trunc(maxEdgesToReturn) : Infinity
    if (this.isPagerMode()) {
      this.edgesPerPage = maxEdgesToReturn = Math.min(edgesPerPage ?? Infinity, maxEdgesToReturn)
      this.page = page ?? 1
    }
    if (!last) {
      this.first = Math.min(first ?? maxEdgesToReturn, maxEdgesToReturn)
      this.last = this.first
    } else {
      this.first = first ?? Infinity
      this.last = Math.min(last, maxEdgesToReturn, this.first)
    }
  }

  protected abstract getCursorData(node: TNode, index: number): TCursorData

  protected abstract isValidCursorData(data: unknown): boolean

  protected abstract getCursorDataError(name: 'after' | 'before', value: string): null | Error

  public getBounds(totalEdges: number): Bounds {
    return this.getPagination(totalEdges).bounds
  }

  public async build(nodes: TNode[], totalEdges: number): Promise<null | TConnection> {
    if (!nodes.length) {
      return null
    }
    const pagination = this.getPagination(totalEdges)
    const edges = await this.buildEdges(nodes, pagination)
    const pageInfo = this.buildPageInfo(edges, pagination)
    return this.createConnection({ pageInfo, edges })
  }

  protected async createConnectionEdge(edge: ConnectionEdge<TNode>): Promise<TConnectionEdge> {
    return <TConnectionEdge>edge
  }

  protected async createConnection(connection: Connection<TConnectionEdge>): Promise<TConnection> {
    return <TConnection>connection
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

  protected isPagerMode(): this is { edgesPerPage: number; page: number } {
    return !!this.args.edgesPerPage || !!this.args.page
  }

  protected getPagination(totalEdges: number): Pagination {
    totalEdges = totalEdges < 0 || Infinity === totalEdges ? 0 : Math.trunc(totalEdges)
    const pager = this.getPager(totalEdges)
    const sliceTotalEdges = Math.min(pager?.edgesPerPage ?? Infinity, totalEdges)
    const sliceEnd = Math.min(this.first, sliceTotalEdges)
    const sliceStart = Math.max(sliceEnd - this.last, 0)
    const pagerStart = pager?.start ?? 0
    const start = pagerStart + sliceStart
    const end = pagerStart + sliceEnd
    const bounds = { start, end, skip: start, take: end - start }
    return { totalEdges, pager, bounds }
  }

  protected getPager(totalEdges: number): null | Pager {
    if (!this.isPagerMode()) {
      return null
    }
    const edgesPerPage = Infinity === this.edgesPerPage ? totalEdges : this.edgesPerPage
    const totalPages = Math.ceil(totalEdges / edgesPerPage)
    const { page } = this
    const start = Math.min(edgesPerPage * (page - 1), totalEdges)
    const end = Math.min(start + edgesPerPage, totalEdges)
    return { edgesPerPage, totalPages, page, start, end }
  }

  protected async buildEdges(nodes: TNode[], pagination: Pagination): Promise<TConnectionEdge[]> {
    return Promise.all(
      nodes.map((node, index) => {
        const cursor = Cursor.toString(this.getCursorData(node, pagination.bounds.start + index))
        return this.createConnectionEdge({ cursor, node })
      }),
    )
  }

  protected buildPageInfo(edges: TConnectionEdge[], pagination: Pagination): PageInfo {
    const { totalEdges, pager, bounds } = pagination
    return {
      hasNextPage: pager ? pager.page < pager.totalPages : !!this.before || bounds.end < totalEdges,
      hasPreviousPage: pager ? 1 < pager.page : !!this.after || 0 < bounds.start,
      startCursor: edges[0].cursor,
      endCursor: edges[edges.length - 1].cursor,
      totalEdges,
      edgesPerPage: pager?.edgesPerPage,
      totalPages: pager?.totalPages,
      page: pager?.page,
    }
  }
}
