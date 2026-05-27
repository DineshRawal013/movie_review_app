import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { FlagReviewDto } from './dto/flag-review.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get('movies/:movieId/reviews')
  listReviews(
    @Param('movieId', ParseIntPipe) movieId: number,
    @Query() query: PaginationQueryDto,
  ) {
    return this.reviewsService.listForMovie(movieId, query.page, query.limit);
  }

  @Post('movies/:movieId/reviews')
  createReview(
    @Param('movieId', ParseIntPipe) movieId: number,
    @CurrentUser() user: any,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(movieId, user.id, dto);
  }

  @Public()
  @Get('reviews/:id')
  getReview(@Param('id') id: string) {
    return this.reviewsService.getReview(id);
  }

  @Put('reviews/:id')
  updateReview(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.updateReview(id, user.id, dto);
  }

  @Delete('reviews/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteReview(@Param('id') id: string, @CurrentUser() user: any) {
    await this.reviewsService.deleteReview(id, user.id, user.role);
  }

  @Post('reviews/:id/flag')
  flagReview(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: FlagReviewDto,
  ) {
    return this.reviewsService.flagReview(id, user.id, dto);
  }

  @Delete('reviews/:id/flag')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unflagReview(@Param('id') id: string, @CurrentUser() user: any) {
    await this.reviewsService.unflagReview(id, user.id);
  }
}
