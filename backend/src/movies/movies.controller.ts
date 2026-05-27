import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { MoviesService } from './movies.service';
import { Public } from '../auth/decorators/public.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Public()
@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get()
  listMovies(
    @Query() query: PaginationQueryDto,
    @Query('genreId') genreId?: string,
    @Query('search') search?: string,
  ) {
    return this.moviesService.listMovies(
      query.page,
      query.limit,
      genreId ? parseInt(genreId, 10) : undefined,
      search,
    );
  }

  @Get('trending')
  getTrending(@Query() query: PaginationQueryDto) {
    return this.moviesService.getTrending(query.page, query.limit);
  }

  @Get('search')
  searchMovies(@Query('q') q: string, @Query() query: PaginationQueryDto) {
    return this.moviesService.searchMovies(q, query.page);
  }

  @Get(':id')
  getMovie(@Param('id', ParseIntPipe) id: number) {
    return this.moviesService.getMovie(id);
  }
}
