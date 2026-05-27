import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CacheService } from '../cache/cache.service';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const RATE_LIMIT_KEY = 'tmdb:rate_limit';
const RATE_LIMIT_MAX = 40;
const RATE_LIMIT_WINDOW = 10; // seconds

@Injectable()
export class TmdbService {
  private readonly logger = new Logger(TmdbService.name);
  private readonly apiKey: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly cache: CacheService,
  ) {
    this.apiKey = this.config.get<string>('TMDB_API_KEY', '');
  }

  private async checkRateLimit(): Promise<void> {
    const count = await this.cache.get<number>(RATE_LIMIT_KEY);
    if (count !== null && count >= RATE_LIMIT_MAX) {
      throw new Error('TMDB rate limit exceeded — try again shortly');
    }
    const next = (count ?? 0) + 1;
    await this.cache.set(RATE_LIMIT_KEY, next, RATE_LIMIT_WINDOW);
  }

  private async get<T>(path: string, params: Record<string, any> = {}): Promise<T> {
    await this.checkRateLimit();
    try {
      const { data } = await firstValueFrom(
        this.http.get<T>(`${TMDB_BASE}${path}`, {
          params: { api_key: this.apiKey, ...params },
        }),
      );
      return data;
    } catch (err) {
      this.logger.error(`TMDB request failed: ${path}`, err?.message);
      throw err;
    }
  }

  async getMovieDetails(tmdbId: number): Promise<any> {
    return this.get(`/movie/${tmdbId}`, { append_to_response: 'credits,videos' });
  }

  async getTrending(page = 1): Promise<any> {
    return this.get('/trending/movie/week', { page });
  }

  async searchMovies(query: string, page = 1): Promise<any> {
    return this.get('/search/movie', { query, page });
  }

  async getGenres(): Promise<any> {
    return this.get('/genre/movie/list');
  }
}
