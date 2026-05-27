import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { MoviesService } from '../movies/movies.service';
import { UpsertRatingDto } from './dto/upsert-rating.dto';

@Injectable()
export class RatingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moviesService: MoviesService,
  ) {}

  async upsertRating(tmdbId: number, userId: string, dto: UpsertRatingDto) {
    const movie = await this.moviesService.ensureMovie(tmdbId);

    if (!movie) throw new NotFoundException('Movie not found');

    const rating = await this.prisma.rating.upsert({
      where: { uq_ratings_user_movie: { movieId: movie.id, userId } },
      update: { value: dto.value },
      create: { movieId: movie.id, userId, value: dto.value },
    });

    await this.recalculateMovieRating(movie.id);
    return rating;
  }

  async deleteRating(tmdbId: number, userId: string) {
    const movie = await this.moviesService.ensureMovie(tmdbId);
    if (!movie) throw new NotFoundException('Movie not found');

    const rating = await this.prisma.rating.findUnique({
      where: { uq_ratings_user_movie: { movieId: movie.id, userId } },
    });
    if (!rating) throw new NotFoundException('Rating not found');

    await this.prisma.rating.delete({
      where: { uq_ratings_user_movie: { movieId: movie.id, userId } },
    });

    await this.recalculateMovieRating(movie.id);
  }

  async getUserRating(tmdbId: number, userId: string) {
    const movie = await this.moviesService.ensureMovie(tmdbId);
    if (!movie) throw new NotFoundException('Movie not found');
    return this.prisma.rating.findUnique({
      where: { uq_ratings_user_movie: { movieId: movie.id, userId } },
    });
  }

  private async recalculateMovieRating(movieId: string): Promise<void> {
    const agg = await this.prisma.rating.aggregate({
      where: { movieId },
      _avg: { value: true },
      _count: { value: true },
    });

    await this.prisma.movie.update({
      where: { id: movieId },
      data: {
        avgRating: agg._avg.value ?? 0,
        ratingCount: agg._count.value,
      },
    });
  }
}
