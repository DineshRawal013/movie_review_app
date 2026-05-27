import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TmdbService } from '../tmdb/tmdb.service';
import { MoviesService } from '../movies/movies.service';
import { CacheService } from '../cache/cache.service';
import { buildPaginationMeta } from '../common/utils/pagination.util';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tmdb: TmdbService,
    private readonly moviesService: MoviesService,
    private readonly cache: CacheService,
  ) {}

  async listAllReviews(page: number, limit: number, filter?: string) {
    const where: Prisma.ReviewWhereInput = { deletedAt: null };
    if (filter === 'flagged') (where as any).flagCount = { gt: 0 };
    const orderBy: any = filter === 'recent' ? { createdAt: 'desc' as const } : { flagCount: 'desc' as const };

    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: {
          user: { select: { id: true, displayName: true, email: true } },
          flags: { select: { userId: true, createdAt: true } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);
    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async listFlaggedReviews(page: number, limit: number) {
    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { flagCount: { gt: 0 }, deletedAt: null },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { flagCount: 'desc' },
        include: {
          user: { select: { id: true, displayName: true, email: true } },
          flags: { select: { userId: true, createdAt: true } },
        },
      }),
      this.prisma.review.count({ where: { flagCount: { gt: 0 }, deletedAt: null } }),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async hideReview(reviewId: string, adminId: string) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review || review.deletedAt) throw new NotFoundException('Review not found');

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: { isHidden: true },
    });

    await this.prisma.auditLog.create({
      data: {
        actionType: 'review_hidden',
        adminUserId: adminId,
        targetReviewId: reviewId,
        targetUserId: review.userId,
      },
    });

    return updated;
  }

  async restoreReview(reviewId: string, adminId: string) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review || review.deletedAt) throw new NotFoundException('Review not found');

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: { isHidden: false },
    });

    await this.prisma.auditLog.create({
      data: {
        actionType: 'review_restored',
        adminUserId: adminId,
        targetReviewId: reviewId,
        targetUserId: review.userId,
      },
    });

    return updated;
  }

  async deleteReview(reviewId: string, adminId: string) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');

    await this.prisma.review.update({ where: { id: reviewId }, data: { deletedAt: new Date() } });

    await this.prisma.auditLog.create({
      data: {
        actionType: 'review_deleted',
        adminUserId: adminId,
        targetReviewId: reviewId,
        targetUserId: review.userId,
      },
    });
  }

  async listUsers(page: number, limit: number) {
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, displayName: true, avatarUrl: true, isAdmin: true, createdAt: true },
      }),
      this.prisma.user.count(),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async setUserRole(userId: string, role: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Sole-admin guard: prevent revoking the last admin's role (FR-085)
    if (userId === adminId && user.isAdmin && role !== 'admin') {
      const adminCount = await this.prisma.user.count({ where: { isAdmin: true } });
      if (adminCount <= 1) {
        throw new BadRequestException('Cannot revoke admin status — you are the only admin in the system');
      }
    }

    const isAdmin = role === 'admin';
    const updated = await this.prisma.user.update({ where: { id: userId }, data: { isAdmin } });

    await this.prisma.auditLog.create({
      data: {
        actionType: 'role_changed',
        adminUserId: adminId,
        targetUserId: userId,
        metadata: { from: user.isAdmin ? 'admin' : 'user', to: role },
      },
    });

    return updated;
  }

  // FR-080: Add movie to local catalogue from TMDB
  async addMovieFromTmdb(tmdbId: number, adminId: string) {
    const movie = await this.moviesService.ensureMovie(tmdbId);
    if (!movie) throw new NotFoundException('Movie not found on TMDB');

    await this.prisma.auditLog.create({
      data: {
        actionType: 'movie_added',
        adminUserId: adminId,
        targetMovieId: movie.id,
        metadata: { tmdbId },
      },
    });

    return movie;
  }

  // FR-081: Refresh TMDB metadata for a catalogued movie
  async refreshMovieMetadata(tmdbId: number, adminId: string) {
    const existing = await this.prisma.movie.findUnique({ where: { tmdbId } });
    if (!existing) throw new NotFoundException('Movie not found in catalogue');

    const tmdbData = await this.tmdb.getMovieDetails(tmdbId);
    if (!tmdbData) throw new NotFoundException('Movie not found on TMDB');

    const updated = await this.moviesService.syncMovieFromTmdb(tmdbData);

    // Invalidate cache so next fetch gets fresh data
    await this.cache.del(`movie:${tmdbId}`);

    await this.prisma.auditLog.create({
      data: {
        actionType: 'movie_refreshed',
        adminUserId: adminId,
        targetMovieId: existing.id,
        metadata: { tmdbId },
      },
    });

    return updated;
  }

  // FR-082: Remove movie from catalogue (cascades reviews/ratings via DB cascade)
  async removeMovie(tmdbId: number, adminId: string) {
    const movie = await this.prisma.movie.findUnique({ where: { tmdbId } });
    if (!movie) throw new NotFoundException('Movie not found in catalogue');

    // Log before deletion since record will be gone
    await this.prisma.auditLog.create({
      data: {
        actionType: 'movie_removed',
        adminUserId: adminId,
        metadata: { tmdbId, title: movie.title },
      },
    });

    await this.prisma.movie.delete({ where: { tmdbId } });
    await this.cache.del(`movie:${tmdbId}`);
  }
}
