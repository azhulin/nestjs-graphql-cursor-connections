import { Type } from '@nestjs/common'
import { Field, GqlTypeReference, ObjectType } from '@nestjs/graphql'

export interface ConnectionEdge<TNode extends GqlTypeReference> {
  cursor: string
  node: TNode
}

export function ConnectionEdge<TNode extends GqlTypeReference>(nodeType: Type<TNode>): Type<ConnectionEdge<TNode>> {
  @ObjectType({ isAbstract: true })
  class _ConnectionEdge {
    @Field()
    public readonly cursor!: string

    @Field(() => nodeType)
    public readonly node!: TNode
  }
  return _ConnectionEdge
}
