import { Field, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class PageInfo {
  @Field()
  public readonly hasNextPage!: boolean

  @Field()
  public readonly hasPreviousPage!: boolean

  @Field()
  public readonly startCursor!: string

  @Field()
  public readonly endCursor!: string
}
