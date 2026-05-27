import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { ReviewsModule } from '../reviews/reviews.module';
import { MoviesModule } from '../movies/movies.module';
import { TmdbModule } from '../tmdb/tmdb.module';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [ReviewsModule, MoviesModule, TmdbModule, CacheModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
