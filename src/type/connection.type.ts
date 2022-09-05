import { Type } from '@nestjs/common'
import { Field, GqlTypeReference, Int, ObjectType } from '@nestjs/graphql'
import { ConnectionEdge, PageInfo } from '.'

export interface Connection<TEdge extends ConnectionEdge<GqlTypeReference>> {
  pageInfo: PageInfo
  edges: TEdge[]
  totalEdges: number
}

export function Connection<TEdge extends ConnectionEdge<GqlTypeReference>>(
  edgeType: Type<TEdge>,
): Type<Connection<TEdge>> {
  @ObjectType({ isAbstract: true })
  class _Connection {
    @Field()
    public readonly pageInfo!: PageInfo

    @Field(() => [edgeType])
    public readonly edges!: TEdge[]

    @Field(() => Int)
    public readonly totalEdges!: number
  }
  return _Connection
}
