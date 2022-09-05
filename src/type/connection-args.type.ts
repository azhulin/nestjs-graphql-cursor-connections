import { ArgsType, Field, Int } from '@nestjs/graphql'
import { IsBase64, IsOptional, Min, MinLength } from 'class-validator'

@ArgsType()
export class ConnectionArgs {
  @Field({ nullable: true })
  @IsOptional()
  @MinLength(4)
  @IsBase64()
  public readonly after?: string

  @Field({ nullable: true })
  @IsOptional()
  @MinLength(4)
  @IsBase64()
  public readonly before?: string

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @Min(1)
  public readonly first?: number

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @Min(1)
  public readonly last?: number
}
