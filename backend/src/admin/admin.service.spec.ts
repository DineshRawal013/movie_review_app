import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../database/prisma.service';
import { TmdbService } from '../tmdb/tmdb.service';
import { MoviesService } from '../movies/movies.service';
import { CacheService } from '../cache/cache.service';

const mockPrisma = {
  review: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  movie: {
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
};

const mockMoviesService = {
  ensureMovie: jest.fn(),
  syncMovieFromTmdb: jest.fn(),
};

const mockTmdbService = {
  getMovieDetails: jest.fn(),
};

const mockCacheService = {
  del: jest.fn(),
};

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TmdbService, useValue: mockTmdbService },
        { provide: MoviesService, useValue: mockMoviesService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get(AdminService);
    jest.clearAllMocks();
    mockPrisma.auditLog.create.mockResolvedValue({});
    mockMoviesService.ensureMovie.mockReset();
    mockMoviesService.syncMovieFromTmdb.mockReset();
    mockTmdbService.getMovieDetails.mockReset();
    mockCacheService.del.mockReset();
  });

  describe('listAllReviews', () => {
    it('returns all non-deleted reviews with default ordering', async () => {
      mockPrisma.review.findMany.mockResolvedValueOnce([{ id: 'r1', flagCount: 2 }]);
      mockPrisma.review.count.mockResolvedValueOnce(1);

      const result = await service.listAllReviews(1, 10);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('filters by flagged when filter=flagged', async () => {
      mockPrisma.review.findMany.mockResolvedValueOnce([{ id: 'r1', flagCount: 3 }]);
      mockPrisma.review.count.mockResolvedValueOnce(1);

      await service.listAllReviews(1, 10, 'flagged');
      expect(mockPrisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ flagCount: { gt: 0 } }) }),
      );
    });

    it('orders by createdAt when filter=recent', async () => {
      mockPrisma.review.findMany.mockResolvedValueOnce([]);
      mockPrisma.review.count.mockResolvedValueOnce(0);

      await service.listAllReviews(1, 10, 'recent');
      expect(mockPrisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });
  });

  describe('listFlaggedReviews', () => {
    it('returns paginated flagged reviews', async () => {
      mockPrisma.review.findMany.mockResolvedValueOnce([{ id: 'r1', flagCount: 3 }]);
      mockPrisma.review.count.mockResolvedValueOnce(1);

      const result = await service.listFlaggedReviews(1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('hideReview', () => {
    it('hides a review and creates audit log', async () => {
      const review = { id: 'r1', userId: 'u1', deletedAt: null };
      mockPrisma.review.findUnique.mockResolvedValueOnce(review);
      mockPrisma.review.update.mockResolvedValueOnce({ ...review, isHidden: true });

      await service.hideReview('r1', 'admin-1');

      expect(mockPrisma.review.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isHidden: true } }),
      );
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ actionType: 'review_hidden', adminUserId: 'admin-1' }),
        }),
      );
    });

    it('throws NotFoundException when review not found', async () => {
      mockPrisma.review.findUnique.mockResolvedValueOnce(null);
      await expect(service.hideReview('missing', 'admin-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when review is soft-deleted', async () => {
      mockPrisma.review.findUnique.mockResolvedValueOnce({ id: 'r1', deletedAt: new Date() });
      await expect(service.hideReview('r1', 'admin-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('restoreReview', () => {
    it('restores a hidden review and logs the action', async () => {
      const review = { id: 'r1', userId: 'u1', deletedAt: null };
      mockPrisma.review.findUnique.mockResolvedValueOnce(review);
      mockPrisma.review.update.mockResolvedValueOnce({ ...review, isHidden: false });

      await service.restoreReview('r1', 'admin-1');

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ actionType: 'review_restored' }),
        }),
      );
    });
  });

  describe('deleteReview', () => {
    it('soft-deletes a review and logs the action', async () => {
      const review = { id: 'r1', userId: 'u1' };
      mockPrisma.review.findUnique.mockResolvedValueOnce(review);
      mockPrisma.review.update.mockResolvedValueOnce({ ...review, deletedAt: new Date() });

      await service.deleteReview('r1', 'admin-1');

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ actionType: 'review_deleted' }),
        }),
      );
    });

    it('throws NotFoundException when review not found', async () => {
      mockPrisma.review.findUnique.mockResolvedValueOnce(null);
      await expect(service.deleteReview('missing', 'admin-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('setUserRole', () => {
    it('promotes user to admin and logs the action', async () => {
      const user = { id: 'u1', isAdmin: false };
      mockPrisma.user.findUnique.mockResolvedValueOnce(user);
      mockPrisma.user.update.mockResolvedValueOnce({ ...user, isAdmin: true });

      await service.setUserRole('u1', 'admin', 'admin-1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isAdmin: true } }),
      );
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ actionType: 'role_changed' }),
        }),
      );
    });

    it('throws NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(service.setUserRole('missing', 'admin', 'admin-1')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when sole admin tries to demote themselves', async () => {
      const { BadRequestException } = await import('@nestjs/common');
      const user = { id: 'admin-1', isAdmin: true };
      mockPrisma.user.findUnique.mockResolvedValueOnce(user);
      mockPrisma.user.count.mockResolvedValueOnce(1);

      await expect(service.setUserRole('admin-1', 'user', 'admin-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('listUsers', () => {
    it('returns paginated users', async () => {
      mockPrisma.user.findMany.mockResolvedValueOnce([{ id: 'u1', email: 'test@test.com' }]);
      mockPrisma.user.count.mockResolvedValueOnce(1);

      const result = await service.listUsers(1, 10);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('addMovieFromTmdb', () => {
    it('adds a movie and creates audit log', async () => {
      mockMoviesService.ensureMovie.mockResolvedValueOnce({ id: 'm1', tmdbId: 550, title: 'Fight Club' });

      const result = await service.addMovieFromTmdb(550, 'admin-1');

      expect(mockMoviesService.ensureMovie).toHaveBeenCalledWith(550);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ actionType: 'movie_added' }) }),
      );
      expect(result.tmdbId).toBe(550);
    });

    it('throws NotFoundException when movie not found on TMDB', async () => {
      mockMoviesService.ensureMovie.mockResolvedValueOnce(null);
      await expect(service.addMovieFromTmdb(99999, 'admin-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('refreshMovieMetadata', () => {
    it('refreshes metadata and invalidates cache', async () => {
      mockPrisma.movie.findUnique.mockResolvedValueOnce({ id: 'm1', tmdbId: 550 });
      mockTmdbService.getMovieDetails.mockResolvedValueOnce({ id: 550, title: 'Updated' });
      mockMoviesService.syncMovieFromTmdb.mockResolvedValueOnce({ id: 'm1', tmdbId: 550, title: 'Updated' });

      await service.refreshMovieMetadata(550, 'admin-1');

      expect(mockCacheService.del).toHaveBeenCalledWith('movie:550');
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ actionType: 'movie_refreshed' }) }),
      );
    });

    it('throws NotFoundException when movie not in catalogue', async () => {
      mockPrisma.movie.findUnique.mockResolvedValueOnce(null);
      await expect(service.refreshMovieMetadata(99999, 'admin-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when movie not found on TMDB', async () => {
      mockPrisma.movie.findUnique.mockResolvedValueOnce({ id: 'm1', tmdbId: 99999 });
      mockTmdbService.getMovieDetails.mockResolvedValueOnce(null);
      await expect(service.refreshMovieMetadata(99999, 'admin-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeMovie', () => {
    it('deletes movie and invalidates cache', async () => {
      mockPrisma.movie.findUnique.mockResolvedValueOnce({ id: 'm1', tmdbId: 550, title: 'Fight Club' });
      mockPrisma.movie.delete.mockResolvedValueOnce({});

      await service.removeMovie(550, 'admin-1');

      expect(mockPrisma.movie.delete).toHaveBeenCalledWith({ where: { tmdbId: 550 } });
      expect(mockCacheService.del).toHaveBeenCalledWith('movie:550');
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ actionType: 'movie_removed' }) }),
      );
    });

    it('throws NotFoundException when movie not in catalogue', async () => {
      mockPrisma.movie.findUnique.mockResolvedValueOnce(null);
      await expect(service.removeMovie(99999, 'admin-1')).rejects.toThrow(NotFoundException);
    });
  });
});
