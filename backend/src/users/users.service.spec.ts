import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../database/prisma.service';

const USER = {
  id: 'user-uuid',
  googleId: 'google-123',
  email: 'test@example.com',
  displayName: 'Test User',
  avatarUrl: 'https://example.com/avatar.jpg',
  isAdmin: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  refreshToken: { deleteMany: jest.fn() },
  reviewFlag: { deleteMany: jest.fn() },
  rating: { deleteMany: jest.fn() },
  review: { deleteMany: jest.fn() },
  $transaction: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(UsersService);
    jest.clearAllMocks();
  });

  describe('findByGoogleId', () => {
    it('returns user when found', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(USER);
      const result = await service.findByGoogleId('google-123');
      expect(result).toEqual(USER);
    });

    it('returns null when not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      const result = await service.findByGoogleId('unknown');
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('returns user when found', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(USER);
      const result = await service.findById('user-uuid');
      expect(result).toEqual(USER);
    });
  });

  describe('upsertFromGoogle', () => {
    it('creates or updates a user from Google profile', async () => {
      mockPrisma.user.upsert.mockResolvedValueOnce(USER);

      const result = await service.upsertFromGoogle({
        googleId: 'google-123',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
      });

      expect(result).toEqual(USER);
      expect(mockPrisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { googleId: 'google-123' },
        }),
      );
    });
  });

  describe('getProfile', () => {
    it('returns selected profile fields', async () => {
      const profile = {
        id: USER.id,
        email: USER.email,
        displayName: USER.displayName,
        avatarUrl: USER.avatarUrl,
        isAdmin: USER.isAdmin,
        createdAt: USER.createdAt,
      };
      mockPrisma.user.findUnique.mockResolvedValueOnce(profile);

      const result = await service.getProfile('user-uuid');
      expect(result).toEqual(profile);
    });
  });

  describe('updateProfile', () => {
    it('updates display name', async () => {
      const updated = { ...USER, displayName: 'New Name' };
      mockPrisma.user.update.mockResolvedValueOnce(updated);

      const result = await service.updateProfile('user-uuid', { displayName: 'New Name' });
      expect(result.displayName).toBe('New Name');
    });
  });

  describe('getPublicProfile', () => {
    it('returns public profile with reviews', async () => {
      const publicProfile = {
        id: USER.id, displayName: USER.displayName, avatarUrl: USER.avatarUrl,
        createdAt: USER.createdAt, reviews: [],
      };
      mockPrisma.user.findUnique.mockResolvedValueOnce(publicProfile);

      const result = await service.getPublicProfile('user-uuid');
      expect(result.id).toBe(USER.id);
      expect(result).not.toHaveProperty('email');
    });

    it('throws NotFoundException when user not found', async () => {
      const { NotFoundException } = await import('@nestjs/common');
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(service.getPublicProfile('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteAccount', () => {
    it('runs all deletions in a transaction', async () => {
      mockPrisma.$transaction.mockImplementationOnce(async (fn: any) => {
        await fn(mockPrisma);
      });

      await service.deleteAccount('user-uuid');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });
});
