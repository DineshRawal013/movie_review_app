import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { MoviesService } from '../movies/movies.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { FlagReviewDto } from './dto/flag-review.dto';
import { buildPaginationMeta } from '../common/utils/pagination.util';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moviesService: MoviesService,
  ) {}

  async listForMovie(tmdbId: number, page: number, limit: number) {
    const movie = await this.moviesService.ensureMovie(tmdbId);

    if (!movie) throw new NotFoundException('Movie not found');

    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { movieId: movie.id, isHidden: false, deletedAt: null },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
      }),
      this.prisma.review.count({ where: { movieId: movie.id, isHidden: false, deletedAt: null } }),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async getReview(id: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
    });
    if (!review || review.deletedAt) throw new NotFoundException('Review not found');
    return review;
  }

  async createReview(tmdbId: number, userId: string, dto: CreateReviewDto) {
    const movie = await this.moviesService.ensureMovie(tmdbId);

    if (!movie) throw new NotFoundException('Movie not found');

    const existing = await this.prisma.review.findFirst({
      where: { movieId: movie.id, userId, deletedAt: null },
    });
    if (existing) throw new ConflictException('You have already reviewed this movie');

    return this.prisma.review.create({
      data: { movieId: movie.id, userId, body: dto.body },
      include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
    });
  }

  async updateReview(id: string, userId: string, dto: UpdateReviewDto) {
    const review = await this.getReview(id);
    if (review.userId !== userId) throw new ForbiddenException();

    return this.prisma.review.update({
      where: { id },
      data: { body: dto.body },
      include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
    });
  }

  async deleteReview(id: string, userId: string, role: string) {
    const review = await this.getReview(id);
    if (review.userId !== userId && role !== 'admin') throw new ForbiddenException();

    await this.prisma.review.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async flagReview(id: string, userId: string, dto: FlagReviewDto) {
    await this.getReview(id);

    const existing = await this.prisma.reviewFlag.findUnique({
      where: { uq_review_flags_user_review: { reviewId: id, userId } },
    });
    if (existing) throw new ConflictException('You have already flagged this review');

    const [flag] = await this.prisma.$transaction([
      this.prisma.reviewFlag.create({ data: { reviewId: id, userId, reason: dto.reason } }),
      this.prisma.review.update({
        where: { id },
        data: { flagCount: { increment: 1 } },
      }),
    ]);

    return flag;
  }

  async unflagReview(id: string, userId: string) {
    const flag = await this.prisma.reviewFlag.findUnique({
      where: { uq_review_flags_user_review: { reviewId: id, userId } },
    });
    if (!flag) throw new NotFoundException('Flag not found');

    await this.prisma.$transaction([
      this.prisma.reviewFlag.delete({
        where: { uq_review_flags_user_review: { reviewId: id, userId } },
      }),
      this.prisma.review.update({
        where: { id },
        data: { flagCount: { decrement: 1 } },
      }),
    ]);
  }
}
