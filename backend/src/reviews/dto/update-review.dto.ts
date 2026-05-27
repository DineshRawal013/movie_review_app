import { IsOptional, IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class UpdateReviewDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Review text cannot be blank' })
  @MaxLength(500, { message: 'Review cannot exceed 500 characters' })
  body?: string;
}
