import { ArgsType, Field, Int } from '@nestjs/graphql'
import { IsBase64, IsNotEmpty, IsOptional, Min } from 'class-validator'

@ArgsType()
export class ConnectionArgs {
  @Field({ nullable: true })
  @IsOptional()
  @IsNotEmpty()
  @IsBase64()
  public readonly after?: string

  @Field({ nullable: true })
  @IsOptional()
  @IsNotEmpty()
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

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @Min(1)
  public readonly edgesPerPage?: number

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @Min(1)
  public readonly page?: number
}
