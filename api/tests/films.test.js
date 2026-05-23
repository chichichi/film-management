const express = require('express');
const request = require('supertest');
const { createTestDb } = require('./helpers/testDb');
const createFilmsRouter = require('../src/routes/films');

let app;
beforeAll(() => {
  const db = createTestDb();
  app = express();
  app.use(express.json());
  app.use('/api/films', createFilmsRouter(db));
});

test('GET /api/films returns all film stocks', async () => {
  const res = await request(app).get('/api/films');
  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(3);
  expect(res.body[0]).toMatchObject({
    key: expect.any(Number),
    film_name: expect.any(String),
    film_type: expect.any(String),
    film_size: expect.any(Number),
    iso: expect.any(Number),
    film_manu: expect.any(String),
  });
});

test('GET /api/films/:id returns film stock with its rolls', async () => {
  const res = await request(app).get('/api/films/1');
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({
    key: 1,
    film_name: 'Kodak400',
    film_type: 'Color',
    roll_count: 1,
    total_shots: 2,
    rolls: expect.arrayContaining([
      expect.objectContaining({ film_roll_num: 'R001', camera_name: 'PentaxK1000' }),
    ]),
  });
});

test('GET /api/films/:id returns 404 for unknown id', async () => {
  const res = await request(app).get('/api/films/999');
  expect(res.status).toBe(404);
});
