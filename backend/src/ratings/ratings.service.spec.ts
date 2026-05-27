import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { PrismaService } from '../database/prisma.service';
import { MoviesService } from '../movies/movies.service';

const MOVIE = { id: 'movie-uuid', tmdbId: 550 };

const mockPrisma = {
  rating: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    aggregate: jest.fn(),
  },
  movie: {
    update: jest.fn(),
  },
};

const mockMovies = {
  ensureMovie: jest.fn().mockResolvedValue(MOVIE),
};

describe('RatingsService', () => {
  let service: RatingsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RatingsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MoviesService, useValue: mockMovies },
      ],
    }).compile();

    service = module.get(RatingsService);
    jest.clearAllMocks();
    mockMovies.ensureMovie.mockResolvedValue(MOVIE);
    mockPrisma.rating.aggregate.mockResolvedValue({ _avg: { value: 4.0 }, _count: { value: 2 } });
    mockPrisma.movie.update.mockResolvedValue({});
  });

  describe('upsertRating', () => {
    it('creates a rating and recalculates movie avg', async () => {
      const created = { id: 'r1', value: 4, userId: 'u1', movieId: MOVIE.id };
      mockPrisma.rating.upsert.mockResolvedValueOnce(created);

      const result = await service.upsertRating(550, 'u1', { value: 4 });

      expect(result).toEqual(created);
      expect(mockPrisma.rating.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { movieId: MOVIE.id } }),
      );
      expect(mockPrisma.movie.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: MOVIE.id },
          data: { avgRating: 4.0, ratingCount: 2 },
        }),
      );
    });

    it('throws NotFoundException when movie not found', async () => {
      mockMovies.ensureMovie.mockResolvedValueOnce(null);
      await expect(service.upsertRating(99999, 'u1', { value: 3 })).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteRating', () => {
    it('deletes rating and recalculates avg', async () => {
      const existing = { id: 'r1', value: 4, userId: 'u1', movieId: MOVIE.id };
      mockPrisma.rating.findUnique.mockResolvedValueOnce(existing);

      await service.deleteRating(550, 'u1');

      expect(mockPrisma.rating.delete).toHaveBeenCalled();
      expect(mockPrisma.rating.aggregate).toHaveBeenCalled();
      expect(mockPrisma.movie.update).toHaveBeenCalled();
    });

    it('throws NotFoundException when rating does not exist', async () => {
      mockPrisma.rating.findUnique.mockResolvedValueOnce(null);
      await expect(service.deleteRating(550, 'u1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserRating', () => {
    it('returns the user rating for a movie', async () => {
      const rating = { id: 'r1', value: 5 };
      mockPrisma.rating.findUnique.mockResolvedValueOnce(rating);

      const result = await service.getUserRating(550, 'u1');
      expect(result).toEqual(rating);
    });
  });
});
