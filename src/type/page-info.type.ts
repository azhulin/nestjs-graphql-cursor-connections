import { Field, Int, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class PageInfo {
  @Field()
  public readonly hasPreviousPage!: boolean

  @Field()
  public readonly hasNextPage!: boolean

  @Field()
  public readonly startCursor!: string

  @Field()
  public readonly endCursor!: string

  @Field(() => Int)
  public readonly totalEdges!: number

  @Field(() => Int, { nullable: true })
  public readonly edgesPerPage?: number

  @Field(() => Int, { nullable: true })
  public readonly totalPages?: number

  @Field(() => Int, { nullable: true })
  public readonly page?: number
}
