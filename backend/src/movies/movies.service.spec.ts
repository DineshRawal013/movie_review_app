import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MoviesService } from './movies.service';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from '../cache/cache.service';
import { TmdbService } from '../tmdb/tmdb.service';

const mockPrisma = {
  movie: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
  genre: { upsert: jest.fn() },
  movieGenre: { upsert: jest.fn() },
};

const mockCache = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn(),
};

const mockTmdb = {
  getMovieDetails: jest.fn(),
  getTrending: jest.fn(),
  searchMovies: jest.fn(),
};

describe('MoviesService', () => {
  let service: MoviesService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MoviesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CacheService, useValue: mockCache },
        { provide: TmdbService, useValue: mockTmdb },
      ],
    }).compile();

    service = module.get(MoviesService);
    jest.clearAllMocks();
    mockCache.get.mockResolvedValue(null);
  });

  describe('listMovies', () => {
    it('returns paginated movie list', async () => {
      mockPrisma.movie.findMany.mockResolvedValueOnce([{ id: 'm1', title: 'Fight Club' }]);
      mockPrisma.movie.count.mockResolvedValueOnce(1);

      const result = await service.listMovies(1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('applies genre filter', async () => {
      mockPrisma.movie.findMany.mockResolvedValueOnce([]);
      mockPrisma.movie.count.mockResolvedValueOnce(0);

      await service.listMovies(1, 10, 28);

      expect(mockPrisma.movie.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ genres: { some: { genreId: 28 } } }) }),
      );
    });
  });

  describe('getMovie', () => {
    it('returns cached movie when cache hit', async () => {
      const cached = { id: 'm1', tmdbId: 550, title: 'Fight Club' };
      mockCache.get.mockResolvedValueOnce(cached);

      const result = await service.getMovie(550);

      expect(result).toEqual(cached);
      expect(mockPrisma.movie.findUnique).not.toHaveBeenCalled();
    });

    it('fetches from db when cache miss and movie exists', async () => {
      const dbMovie = { id: 'm1', tmdbId: 550, title: 'Fight Club', genres: [] };
      mockCache.get.mockResolvedValueOnce(null);
      mockPrisma.movie.findUnique.mockResolvedValueOnce(dbMovie);

      const result = await service.getMovie(550);

      expect(result).toEqual(dbMovie);
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('fetches from TMDB when not in db or cache', async () => {
      mockCache.get.mockResolvedValueOnce(null);
      mockPrisma.movie.findUnique
        .mockResolvedValueOnce(null)   // first call in getMovie
        .mockResolvedValueOnce({ id: 'm2', tmdbId: 550, title: 'Fight Club', genres: [] }); // after sync

      mockTmdb.getMovieDetails.mockResolvedValueOnce({
        id: 550,
        title: 'Fight Club',
        overview: 'A movie',
        release_date: '1999-10-15',
        poster_path: '/poster.jpg',
        backdrop_path: '/backdrop.jpg',
        genres: [],
      });

      mockPrisma.movie.upsert.mockResolvedValueOnce({ id: 'm2', tmdbId: 550 });

      const result = await service.getMovie(550);
      expect(result).toBeDefined();
    });

    it('throws NotFoundException when not in db or TMDB', async () => {
      mockCache.get.mockResolvedValueOnce(null);
      mockPrisma.movie.findUnique.mockResolvedValueOnce(null);
      mockTmdb.getMovieDetails.mockResolvedValueOnce(null);

      await expect(service.getMovie(99999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('ensureMovie', () => {
    it('returns existing movie from db', async () => {
      const existing = { id: 'm1', tmdbId: 550 };
      mockPrisma.movie.findUnique.mockResolvedValueOnce(existing);

      const result = await service.ensureMovie(550);
      expect(result).toEqual(existing);
      expect(mockTmdb.getMovieDetails).not.toHaveBeenCalled();
    });

    it('fetches from TMDB and syncs when not in db', async () => {
      mockPrisma.movie.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'm2', tmdbId: 550, genres: [] });
      mockTmdb.getMovieDetails.mockResolvedValueOnce({
        id: 550, title: 'Fight Club', overview: 'A movie',
        release_date: '1999-10-15', poster_path: '/p.jpg', backdrop_path: '/b.jpg', genres: [],
      });
      mockPrisma.movie.upsert.mockResolvedValueOnce({ id: 'm2', tmdbId: 550 });

      const result = await service.ensureMovie(550);
      expect(result).toBeDefined();
    });

    it('throws NotFoundException when not on TMDB', async () => {
      mockPrisma.movie.findUnique.mockResolvedValueOnce(null);
      mockTmdb.getMovieDetails.mockResolvedValueOnce(null);

      await expect(service.ensureMovie(99999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('syncMovieFromTmdb', () => {
    it('upserts movie with genres', async () => {
      const tmdbData = {
        id: 550, title: 'Fight Club', overview: 'A movie',
        release_date: '1999-10-15', poster_path: '/p.jpg', backdrop_path: '/b.jpg',
        genres: [{ id: 28, name: 'Action' }],
      };
      mockPrisma.movie.upsert.mockResolvedValueOnce({ id: 'm1', tmdbId: 550 });
      mockPrisma.genre.upsert.mockResolvedValueOnce({ id: 28 });
      mockPrisma.movieGenre.upsert.mockResolvedValueOnce({});
      mockPrisma.movie.findUnique.mockResolvedValueOnce({ id: 'm1', genres: [] });

      const result = await service.syncMovieFromTmdb(tmdbData);
      expect(mockPrisma.genre.upsert).toHaveBeenCalled();
      expect(mockPrisma.movieGenre.upsert).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('getTrending', () => {
    it('returns cached trending when cache hit', async () => {
      const cached = [{ id: 1 }];
      mockCache.get.mockResolvedValueOnce(cached);

      const result = await service.getTrending(1, 10);
      expect(result).toEqual(cached);
      expect(mockTmdb.getTrending).not.toHaveBeenCalled();
    });

    it('fetches from TMDB and caches when cache miss', async () => {
      mockCache.get.mockResolvedValueOnce(null);
      mockTmdb.getTrending.mockResolvedValueOnce([{ id: 1 }]);

      await service.getTrending(1, 10);
      expect(mockTmdb.getTrending).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalled();
    });
  });

  describe('searchMovies', () => {
    it('delegates to TMDB service', async () => {
      mockTmdb.searchMovies.mockResolvedValueOnce({ results: [] });
      await service.searchMovies('fight club', 1);
      expect(mockTmdb.searchMovies).toHaveBeenCalledWith('fight club', 1);
    });
  });
});
