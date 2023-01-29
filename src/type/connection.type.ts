import { Type } from '@nestjs/common'
import { Field, GqlTypeReference, ObjectType } from '@nestjs/graphql'
import { ConnectionEdge, PageInfo } from '.'

export interface Connection<TEdge extends ConnectionEdge<GqlTypeReference>> {
  pageInfo: PageInfo
  edges: TEdge[]
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
  }
  return _Connection
}
