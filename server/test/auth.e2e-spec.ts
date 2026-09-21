import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module.js';

const validUser = {
  email: 'test@example.com',
  password: 'password123',
  displayName: 'Tester',
};

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await dataSource.query('TRUNCATE TABLE users');
  });

  afterAll(async () => {
    await app.close();
  });

  const register = (body: object) =>
    request(app.getHttpServer()).post('/auth/register').send(body);
  const login = (body: object) =>
    request(app.getHttpServer()).post('/auth/login').send(body);

  describe('POST /auth/register', () => {
    it('creates a user and returns an access token', async () => {
      const res = await register(validUser).expect(201);
      expect(typeof res.body.accessToken).toBe('string');
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('stores a bcrypt hash, not the plain password', async () => {
      await register(validUser).expect(201);
      const rows = await dataSource.query('SELECT "passwordHash" FROM users');
      expect(rows[0].passwordHash).not.toBe(validUser.password);
      expect(rows[0].passwordHash).toMatch(/^\$2[aby]\$10\$/);
    });

    it('rejects a duplicate displayName with 409', async () => {
      await register(validUser).expect(201);
      await register({ ...validUser, email: 'other@example.com' }).expect(409);
    });

    it('treats displayName as case-insensitive', async () => {
      await register(validUser).expect(201);
      await register({
        ...validUser,
        email: 'other@example.com',
        displayName: validUser.displayName.toLowerCase(),
      }).expect(409);
    });

    it('rejects a duplicate email with 409', async () => {
      await register(validUser).expect(201);
      await register({ ...validUser, displayName: 'Another' }).expect(409);
    });

    it.each([
      ['invalid email', { email: 'not-an-email' }],
      ['short password', { password: 'short' }],
      ['too long password', { password: 'a'.repeat(73) }],
      ['short displayName', { displayName: 'ab' }],
      ['displayName with bad characters', { displayName: 'bad name!' }],
      ['unknown extra field', { isAdmin: true }],
    ])('rejects %s with 400', async (_label, override) => {
      await register({ ...validUser, ...override }).expect(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await register(validUser).expect(201);
    });

    it('returns a token for correct credentials', async () => {
      const res = await login({
        displayName: validUser.displayName,
        password: validUser.password,
      }).expect(201);
      expect(typeof res.body.accessToken).toBe('string');
    });

    it('is case-insensitive on displayName', async () => {
      await login({
        displayName: validUser.displayName.toUpperCase(),
        password: validUser.password,
      }).expect(201);
    });

    it('rejects a wrong password with 401', async () => {
      await login({
        displayName: validUser.displayName,
        password: 'wrong-password',
      }).expect(401);
    });

    it('rejects an unknown user with the same 401', async () => {
      const wrongPassword = await login({
        displayName: validUser.displayName,
        password: 'wrong-password',
      });
      const unknownUser = await login({
        displayName: 'NoSuchUser',
        password: 'password123',
      }).expect(401);
      expect(unknownUser.body.message).toBe(wrongPassword.body.message);
    });

    it('rejects an empty body with 400', async () => {
      await login({}).expect(400);
    });
  });

  describe('GET /auth/me', () => {
    it('rejects a request without a token with 401', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('rejects a garbage token with 401', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer not.a.token')
        .expect(401);
    });

    it('returns the current user for a valid token', async () => {
      const { body } = await register(validUser).expect(201);
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${body.accessToken}`)
        .expect(200);
      expect(res.body.displayName).toBe(validUser.displayName);
      expect(res.body.id).toEqual(expect.any(String));
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('rejects a valid token whose user was deleted', async () => {
      const { body } = await register(validUser).expect(201);
      await dataSource.query('TRUNCATE TABLE users');
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${body.accessToken}`)
        .expect(401);
    });
  });
});
