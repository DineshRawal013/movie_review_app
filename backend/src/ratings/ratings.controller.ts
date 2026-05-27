import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Put,
} from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpsertRatingDto } from './dto/upsert-rating.dto';

@Controller('movies/:movieId/rating')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Get()
  getUserRating(
    @Param('movieId', ParseIntPipe) movieId: number,
    @CurrentUser() user: any,
  ) {
    return this.ratingsService.getUserRating(movieId, user.id);
  }

  @Put()
  upsertRating(
    @Param('movieId', ParseIntPipe) movieId: number,
    @CurrentUser() user: any,
    @Body() dto: UpsertRatingDto,
  ) {
    return this.ratingsService.upsertRating(movieId, user.id, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRating(
    @Param('movieId', ParseIntPipe) movieId: number,
    @CurrentUser() user: any,
  ) {
    await this.ratingsService.deleteRating(movieId, user.id);
  }
}
