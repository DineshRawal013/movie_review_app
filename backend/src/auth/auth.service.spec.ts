import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from '../cache/cache.service';

const mockUsers = {
  upsertFromGoogle: jest.fn(),
  findById: jest.fn(),
};
const mockJwt = {
  sign: jest.fn().mockReturnValue('signed-token'),
  verify: jest.fn(),
};
const mockConfig = {
  get: jest.fn((key: string, def?: any) => {
    const map: Record<string, string> = {
      JWT_REFRESH_SECRET: 'refresh-secret',
      JWT_ACCESS_EXPIRES_IN: '900',
      NODE_ENV: 'test',
      FRONTEND_URL: 'http://localhost:3001',
    };
    return map[key] ?? def;
  }),
};
const mockPrisma = {
  refreshToken: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};
const mockCache = {
  isRevoked: jest.fn().mockResolvedValue(false),
  revokeToken: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsers },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
    mockJwt.sign.mockReturnValue('signed-token');
    mockCache.isRevoked.mockResolvedValue(false);
  });

  describe('validateJwtPayload', () => {
    it('returns user when found', async () => {
      mockUsers.findById.mockResolvedValueOnce({ id: 'u1', role: 'user' });
      const result = await service.validateJwtPayload({ sub: 'u1' });
      expect(result).toEqual({ id: 'u1', role: 'user' });
    });

    it('returns null when user not found', async () => {
      mockUsers.findById.mockResolvedValueOnce(null);
      const result = await service.validateJwtPayload({ sub: 'missing' });
      expect(result).toBeNull();
    });
  });

  describe('handleGoogleCallback', () => {
    it('upserts user and issues token pair', async () => {
      const res = { cookie: jest.fn(), clearCookie: jest.fn(), json: jest.fn() };
      mockUsers.upsertFromGoogle.mockResolvedValueOnce({ id: 'u1', isAdmin: false });
      mockPrisma.refreshToken.create.mockResolvedValueOnce({});

      await service.handleGoogleCallback(
        { id: 'google-1', displayName: 'Test', emails: [{ value: 'test@test.com' }], photos: [] },
        res as any,
      );

      expect(mockUsers.upsertFromGoogle).toHaveBeenCalled();
      expect(res.cookie).toHaveBeenCalledTimes(3);
    });
  });

  describe('refreshTokens', () => {
    it('throws UnauthorizedException when no token provided', async () => {
      await expect(service.refreshTokens('', {} as any)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when JWT verify throws', async () => {
      mockJwt.verify.mockImplementationOnce(() => { throw new Error('expired'); });
      await expect(service.refreshTokens('bad-token', {} as any)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when token is revoked in cache', async () => {
      mockJwt.verify.mockReturnValueOnce({ sub: 'u1' });
      mockCache.isRevoked.mockResolvedValueOnce(true);

      await expect(service.refreshTokens('some-token', {} as any)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when stored token not found in DB', async () => {
      mockJwt.verify.mockReturnValueOnce({ sub: 'u1' });
      mockCache.isRevoked.mockResolvedValueOnce(false);
      mockPrisma.refreshToken.findFirst.mockResolvedValueOnce(null);

      await expect(service.refreshTokens('valid-token', {} as any)).rejects.toThrow(UnauthorizedException);
    });

    it('rotates token and issues new pair when valid', async () => {
      const res = { cookie: jest.fn(), clearCookie: jest.fn(), json: jest.fn() };
      mockJwt.verify.mockReturnValueOnce({ sub: 'u1' });
      mockCache.isRevoked.mockResolvedValueOnce(false);
      mockPrisma.refreshToken.findFirst.mockResolvedValueOnce({ id: 'rt1' });
      mockPrisma.refreshToken.update.mockResolvedValueOnce({});
      mockPrisma.refreshToken.create.mockResolvedValueOnce({});
      mockUsers.findById.mockResolvedValueOnce({ id: 'u1', isAdmin: false });

      await service.refreshTokens('valid-token', res as any);
      expect(res.cookie).toHaveBeenCalledTimes(3);
    });
  });

  describe('logout', () => {
    it('revokes token and clears cookies when token provided', async () => {
      const res = { cookie: jest.fn(), clearCookie: jest.fn(), json: jest.fn() };
      mockPrisma.refreshToken.updateMany.mockResolvedValueOnce({});

      await service.logout('some-refresh-token', res as any);

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalled();
      expect(mockCache.revokeToken).toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledTimes(3);
      expect(res.json).toHaveBeenCalledWith({ message: 'Logged out' });
    });

    it('clears cookies even when no token provided', async () => {
      const res = { cookie: jest.fn(), clearCookie: jest.fn(), json: jest.fn() };

      await service.logout('', res as any);

      expect(mockPrisma.refreshToken.updateMany).not.toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledTimes(3);
    });
  });

  describe('validateJwtPayload', () => {
    it('returns user with admin role when isAdmin is true', async () => {
      mockUsers.findById.mockResolvedValueOnce({ id: 'a1', isAdmin: true });
      const result = await service.validateJwtPayload({ sub: 'a1' });
      expect(result.role).toBe('admin');
    });

    it('returns null when user not found', async () => {
      mockUsers.findById.mockResolvedValueOnce(null);
      const result = await service.validateJwtPayload({ sub: 'missing' });
      expect(result).toBeNull();
    });
  });
});
