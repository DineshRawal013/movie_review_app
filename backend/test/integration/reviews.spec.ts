import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Reviews (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/movies/:movieId/reviews', () => {
    it('returns 200 with empty array for movie with no reviews', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/movies/550/reviews')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /api/movies/:movieId/reviews', () => {
    it('returns 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .post('/api/movies/550/reviews')
        .send({ content: 'This is a great movie.', rating: 9 })
        .expect(401);
    });
  });
});
