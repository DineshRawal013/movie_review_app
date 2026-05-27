import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async get<T>(key: string): Promise<T | null> {
    return (await this.cache.get<T>(key)) ?? null;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    await this.cache.set(key, value, ttlSeconds ? ttlSeconds * 1000 : undefined);
  }

  async del(key: string): Promise<void> {
    await this.cache.del(key);
  }

  async isRevoked(tokenHash: string): Promise<boolean> {
    const val = await this.cache.get(`rt_revoked:${tokenHash}`);
    return val === 1;
  }

  async revokeToken(tokenHash: string, ttlSeconds: number): Promise<void> {
    await this.cache.set(`rt_revoked:${tokenHash}`, 1, ttlSeconds * 1000);
  }
}
