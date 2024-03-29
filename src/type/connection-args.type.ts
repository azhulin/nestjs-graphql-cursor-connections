import { ArgsType, Field, Int } from '@nestjs/graphql'
import { IsInt, IsNotEmpty, IsOptional, Length, Min } from 'class-validator'
import { IsBase64 } from '../validation'

@ArgsType()
export class ConnectionArgs {
  @Field({ nullable: true })
  @IsBase64({ urlSafe: true })
  @Length(1)
  @IsOptional()
  public readonly after?: null | string

  @Field({ nullable: true })
  @IsBase64({ urlSafe: true })
  @Length(1)
  @IsOptional()
  public readonly before?: null | string

  @Field(() => Int, { nullable: true })
  @Min(1)
  @IsInt()
  @IsOptional()
  public readonly first?: null | number

  @Field(() => Int, { nullable: true })
  @Min(1)
  @IsInt()
  @IsOptional()
  public readonly last?: null | number

  @Field(() => Int, { nullable: true })
  @Min(1)
  @IsInt()
  @IsOptional()
  public readonly edgesPerPage?: null | number

  @Field(() => Int, { nullable: true })
  @Min(1)
  @IsInt()
  @IsOptional()
  public readonly page?: null | number
}
