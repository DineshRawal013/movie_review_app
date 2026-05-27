import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from '../cache/cache.service';
import { TmdbService } from '../tmdb/tmdb.service';
import { buildPaginationMeta } from '../common/utils/pagination.util';

const MOVIE_TTL = 3600;

@Injectable()
export class MoviesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly tmdb: TmdbService,
  ) {}

  async listMovies(page: number, limit: number, genreId?: number, search?: string) {
    const where: any = {};
    if (genreId) where.genres = { some: { genreId } };
    if (search) where.title = { contains: search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.movie.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { avgRating: 'desc' },
        include: { genres: { include: { genre: true } } },
      }),
      this.prisma.movie.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async getMovie(id: number) {
    const cacheKey = `movie:${id}`;
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    let movie = await this.prisma.movie.findUnique({
      where: { tmdbId: id },
      include: { genres: { include: { genre: true } } },
    });

    if (!movie) {
      const tmdbData = await this.tmdb.getMovieDetails(id);
      if (!tmdbData) throw new NotFoundException('Movie not found');
      movie = await this.syncMovieFromTmdb(tmdbData);
    }

    await this.cache.set(cacheKey, movie, MOVIE_TTL);
    return movie;
  }

  async syncMovieFromTmdb(tmdbData: any) {
    const { id, title, overview, release_date, poster_path, backdrop_path, genres } = tmdbData;

    const runtime = tmdbData.runtime ?? null;
    const director = tmdbData.credits?.crew?.find((c: any) => c.job === 'Director')?.name ?? null;
    const castJson = tmdbData.credits?.cast?.slice(0, 10).map((c: any) => c.name) ?? [];
    const trailerVideo = tmdbData.videos?.results?.find(
      (v: any) => v.type === 'Trailer' && v.site === 'YouTube',
    );
    const trailerUrl = trailerVideo ? `https://www.youtube.com/watch?v=${trailerVideo.key}` : null;

    const movie = await this.prisma.movie.upsert({
      where: { tmdbId: id },
      update: { title, overview, releaseDate: new Date(release_date), posterUrl: poster_path, backdropUrl: backdrop_path, runtime, director, castJson, trailerUrl },
      create: { tmdbId: id, title, overview, releaseDate: new Date(release_date), posterUrl: poster_path, backdropUrl: backdrop_path, runtime, director, castJson, trailerUrl, cachedAt: new Date() },
    });

    if (genres?.length) {
      for (const g of genres) {
        await this.prisma.genre.upsert({
          where: { tmdbGenreId: g.id },
          update: { name: g.name },
          create: { id: g.id, tmdbGenreId: g.id, name: g.name },
        });
        await this.prisma.movieGenre.upsert({
          where: { movieId_genreId: { movieId: movie.id, genreId: g.id } },
          update: {},
          create: { movieId: movie.id, genreId: g.id },
        });
      }
    }

    return this.prisma.movie.findUnique({
      where: { id: movie.id },
      include: { genres: { include: { genre: true } } },
    });
  }

  async getTrending(page: number, limit: number) {
    const cacheKey = `trending:${page}:${limit}`;
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const result = await this.tmdb.getTrending(page);
    await this.cache.set(cacheKey, result, 900);
    return result;
  }

  async searchMovies(query: string, page: number) {
    return this.tmdb.searchMovies(query, page);
  }

  async ensureMovie(tmdbId: number) {
    const existing = await this.prisma.movie.findUnique({ where: { tmdbId } });
    if (existing) return existing;
    const tmdbData = await this.tmdb.getMovieDetails(tmdbId);
    if (!tmdbData) throw new NotFoundException('Movie not found on TMDB');
    return this.syncMovieFromTmdb(tmdbData);
  }
}
