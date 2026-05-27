import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Controller('admin')
@Roles('admin')
@UseGuards(RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('reviews')
  listReviews(@Query() query: PaginationQueryDto, @Query('filter') filter?: string) {
    return this.adminService.listAllReviews(query.page, query.limit, filter);
  }

  @Get('reviews/flagged')
  listFlaggedReviews(@Query() query: PaginationQueryDto) {
    return this.adminService.listFlaggedReviews(query.page, query.limit);
  }

  @Post('reviews/:id/hide')
  hideReview(@Param('id') id: string, @CurrentUser() user: any) {
    return this.adminService.hideReview(id, user.id);
  }

  @Post('reviews/:id/restore')
  restoreReview(@Param('id') id: string, @CurrentUser() user: any) {
    return this.adminService.restoreReview(id, user.id);
  }

  @Delete('reviews/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteReview(@Param('id') id: string, @CurrentUser() user: any) {
    await this.adminService.deleteReview(id, user.id);
  }

  @Get('users')
  listUsers(@Query() query: PaginationQueryDto) {
    return this.adminService.listUsers(query.page, query.limit);
  }

  @Patch('users/:id/role')
  setUserRole(
    @Param('id') id: string,
    @Body('role') role: string,
    @CurrentUser() user: any,
  ) {
    return this.adminService.setUserRole(id, role, user.id);
  }

  // FR-080: Add movie to catalogue from TMDB
  @Post('movies')
  addMovie(
    @Body('tmdbId') tmdbId: number,
    @CurrentUser() user: any,
  ) {
    return this.adminService.addMovieFromTmdb(tmdbId, user.id);
  }

  // FR-081: Refresh movie metadata from TMDB
  @Post('movies/:tmdbId/sync')
  refreshMovie(
    @Param('tmdbId') tmdbId: string,
    @CurrentUser() user: any,
  ) {
    return this.adminService.refreshMovieMetadata(parseInt(tmdbId, 10), user.id);
  }

  // FR-082: Remove movie from catalogue
  @Delete('movies/:tmdbId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMovie(
    @Param('tmdbId') tmdbId: string,
    @CurrentUser() user: any,
  ) {
    await this.adminService.removeMovie(parseInt(tmdbId, 10), user.id);
  }
}
