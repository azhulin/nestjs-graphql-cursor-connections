import { Type } from '@nestjs/common'
import { Field, GqlTypeReference, ObjectType } from '@nestjs/graphql'

export interface ConnectionEdge<TNode extends GqlTypeReference> {
  node: TNode
  cursor: string
}

export function ConnectionEdge<TNode extends GqlTypeReference>(nodeType: Type<TNode>): Type<ConnectionEdge<TNode>> {
  @ObjectType({ isAbstract: true })
  class _ConnectionEdge {
    @Field(() => nodeType)
    public readonly node!: TNode

    @Field()
    public readonly cursor!: string
  }
  return _ConnectionEdge
}
