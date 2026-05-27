import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../database/prisma.service';
import { MoviesService } from '../movies/movies.service';

const mockPrisma = {
  review: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  reviewFlag: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockMovies = {
  ensureMovie: jest.fn().mockResolvedValue({ id: 'db-movie-uuid', tmdbId: 550 }),
};

describe('ReviewsService', () => {
  let service: ReviewsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MoviesService, useValue: mockMovies },
      ],
    }).compile();

    service = module.get(ReviewsService);
    jest.clearAllMocks();
  });

  describe('createReview', () => {
    it('throws ConflictException when user already reviewed the movie', async () => {
      mockMovies.ensureMovie.mockResolvedValueOnce({ id: 'movie-id', tmdbId: 550 });
      mockPrisma.review.findFirst.mockResolvedValueOnce({ id: 'existing' });

      await expect(service.createReview(550, 'user-1', { body: 'Great!  Love it so much.' }))
        .rejects.toThrow(ConflictException);
    });

    it('creates a review when none exists', async () => {
      mockMovies.ensureMovie.mockResolvedValueOnce({ id: 'movie-id', tmdbId: 550 });
      mockPrisma.review.findFirst.mockResolvedValueOnce(null);
      mockPrisma.review.create.mockResolvedValueOnce({ id: 'new-review', body: 'Great!  Love it so much.' });

      const result = await service.createReview(550, 'user-1', { body: 'Great!  Love it so much.' });
      expect(result).toHaveProperty('id', 'new-review');
    });
  });

  describe('listForMovie', () => {
    it('returns paginated reviews for a movie', async () => {
      mockMovies.ensureMovie.mockResolvedValueOnce({ id: 'movie-id', tmdbId: 550 });
      mockPrisma.review.findMany.mockResolvedValueOnce([{ id: 'r1', body: 'Great film' }]);
      mockPrisma.review.count.mockResolvedValueOnce(1);

      const result = await service.listForMovie(550, 1, 10);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('throws NotFoundException when movie not found', async () => {
      mockMovies.ensureMovie.mockResolvedValueOnce(null);
      await expect(service.listForMovie(99999, 1, 10)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateReview', () => {
    it('updates review body when user is owner', async () => {
      const review = { id: 'r1', userId: 'user-1', deletedAt: null };
      mockPrisma.review.findUnique.mockResolvedValueOnce(review);
      mockPrisma.review.update.mockResolvedValueOnce({ ...review, body: 'Updated' });

      const result = await service.updateReview('r1', 'user-1', { body: 'Updated' });
      expect(mockPrisma.review.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('throws ForbiddenException when user is not owner', async () => {
      const { ForbiddenException } = await import('@nestjs/common');
      const review = { id: 'r1', userId: 'other-user', deletedAt: null };
      mockPrisma.review.findUnique.mockResolvedValueOnce(review);

      await expect(service.updateReview('r1', 'user-1', { body: 'Bad' })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteReview', () => {
    it('soft-deletes when user is owner', async () => {
      const review = { id: 'r1', userId: 'user-1', deletedAt: null };
      mockPrisma.review.findUnique.mockResolvedValueOnce(review);
      mockPrisma.review.update.mockResolvedValueOnce({});

      await service.deleteReview('r1', 'user-1', 'user');
      expect(mockPrisma.review.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
      );
    });

    it('allows admin to delete any review', async () => {
      const review = { id: 'r1', userId: 'other-user', deletedAt: null };
      mockPrisma.review.findUnique.mockResolvedValueOnce(review);
      mockPrisma.review.update.mockResolvedValueOnce({});

      await service.deleteReview('r1', 'admin-user', 'admin');
      expect(mockPrisma.review.update).toHaveBeenCalled();
    });
  });

  describe('flagReview', () => {
    it('throws ConflictException when user already flagged', async () => {
      mockPrisma.review.findUnique.mockResolvedValueOnce({ id: 'r1', status: 'active' });
      mockPrisma.reviewFlag.findUnique.mockResolvedValueOnce({ id: 'flag-1' });

      await expect(service.flagReview('r1', 'user-1', { reason: 'Spam content here.' }))
        .rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when review not found', async () => {
      mockPrisma.review.findUnique.mockResolvedValueOnce(null);

      await expect(service.flagReview('missing', 'user-1', { reason: 'Spam content here.' }))
        .rejects.toThrow(NotFoundException);
    });

    it('creates flag and increments flagCount in transaction', async () => {
      const flag = { id: 'flag-new', reviewId: 'r1', userId: 'user-1' };
      mockPrisma.review.findUnique.mockResolvedValueOnce({ id: 'r1', deletedAt: null });
      mockPrisma.reviewFlag.findUnique.mockResolvedValueOnce(null);
      mockPrisma.$transaction.mockResolvedValueOnce([flag, {}]);

      const result = await service.flagReview('r1', 'user-1', { reason: 'Spam content here.' });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual(flag);
    });
  });

  describe('unflagReview', () => {
    it('removes flag and decrements flagCount in transaction', async () => {
      mockPrisma.reviewFlag.findUnique.mockResolvedValueOnce({ id: 'flag-1' });
      mockPrisma.$transaction.mockResolvedValueOnce([{}, {}]);

      await service.unflagReview('r1', 'user-1');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('throws NotFoundException when flag not found', async () => {
      mockPrisma.reviewFlag.findUnique.mockResolvedValueOnce(null);
      await expect(service.unflagReview('r1', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });
});
