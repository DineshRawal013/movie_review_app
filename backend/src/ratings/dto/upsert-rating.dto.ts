import { IsInt, Max, Min } from 'class-validator';

export class UpsertRatingDto {
  @IsInt()
  @Min(1, { message: 'Rating must be at least 1' })
  @Max(5, { message: 'Rating cannot exceed 5' })
  value: number;
}
