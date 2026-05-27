import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from '../cache/cache.service';
import { sha256 } from '../common/utils/hash.util';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';
const CSRF_COOKIE = 'csrf_token';
const REFRESH_TTL_DAYS = 7;

@Injectable()
export class AuthService {
  private readonly jwtRefreshSecret: string;
  private readonly refreshExpiresIn: string;
  private readonly frontendUrl: string;

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {
    this.jwtRefreshSecret = this.config.get<string>('JWT_REFRESH_SECRET', '');
    this.refreshExpiresIn = `${REFRESH_TTL_DAYS * 24 * 3600}s`;
    this.frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3001');
  }

  async handleGoogleCallback(profile: any, res: Response): Promise<void> {
    const email: string = profile?.emails?.[0]?.value ?? '';
    const user = await this.users.upsertFromGoogle({
      googleId: profile.id,
      email,
      displayName: profile.displayName ?? email,
      avatarUrl: profile?.photos?.[0]?.value,
    });

    await this.issueTokenPair(user, res);
  }

  async refreshTokens(rawRefreshToken: string, res: Response): Promise<void> {
    if (!rawRefreshToken) throw new UnauthorizedException();

    let payload: any;
    try {
      payload = this.jwt.verify(rawRefreshToken, { secret: this.jwtRefreshSecret });
    } catch {
      throw new UnauthorizedException('Refresh token invalid or expired');
    }

    const tokenHash = sha256(rawRefreshToken);
    const isRevoked = await this.cache.isRevoked(tokenHash);
    if (isRevoked) throw new UnauthorizedException('Refresh token revoked');

    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, userId: payload.sub, revokedAt: null },
    });
    if (!stored) throw new UnauthorizedException('Refresh token not found');

    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    await this.cache.revokeToken(tokenHash, REFRESH_TTL_DAYS * 24 * 3600);

    const user = await this.users.findById(payload.sub);
    if (!user) throw new UnauthorizedException();

    await this.issueTokenPair(user, res);
  }

  async logout(rawRefreshToken: string, res: Response): Promise<void> {
    if (rawRefreshToken) {
      const tokenHash = sha256(rawRefreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.cache.revokeToken(tokenHash, REFRESH_TTL_DAYS * 24 * 3600);
    }

    this.clearCookies(res);
    res.json({ message: 'Logged out' });
  }

  async validateJwtPayload(payload: any): Promise<any> {
    const user = await this.users.findById(payload.sub);
    if (!user) return null;
    return { ...user, role: user.isAdmin ? 'admin' : 'user' };
  }

  private async issueTokenPair(user: any, res: Response): Promise<void> {
    const accessToken = this.jwt.sign({ sub: user.id, role: user.isAdmin ? 'admin' : 'user' });

    const rawRefreshToken = this.jwt.sign(
      { sub: user.id },
      { secret: this.jwtRefreshSecret, expiresIn: this.refreshExpiresIn },
    );
    const tokenHash = sha256(rawRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TTL_DAYS);

    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const csrfToken = crypto.randomBytes(32).toString('hex');

    const cookieOpts = {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'strict' as const,
      path: '/',
    };

    res.cookie(ACCESS_COOKIE, accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });
    res.cookie(REFRESH_COOKIE, rawRefreshToken, {
      ...cookieOpts,
      maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
    });
    res.cookie(CSRF_COOKIE, csrfToken, {
      httpOnly: false,
      secure: cookieOpts.secure,
      sameSite: 'strict',
      path: '/',
      maxAge: 15 * 60 * 1000,
    });
  }

  private clearCookies(res: Response): void {
    res.clearCookie(ACCESS_COOKIE);
    res.clearCookie(REFRESH_COOKIE);
    res.clearCookie(CSRF_COOKIE);
  }
}
