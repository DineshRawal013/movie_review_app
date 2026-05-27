import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

afterEach(async () => {
  const tables = [
    'AuditLog', 'ReviewFlag', 'Rating', 'Review',
    'RefreshToken', 'MovieGenre', 'Movie', 'Genre', 'User',
  ];
  for (const t of tables) {
    await (prisma as any)[t[0].toLowerCase() + t.slice(1)].deleteMany();
  }
});
