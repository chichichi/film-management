const express = require('express');
const request = require('supertest');
const { createTestDb } = require('./helpers/testDb');
const createFilmRollsRouter = require('../src/routes/filmRolls');

let app;
beforeAll(() => {
  const db = createTestDb();
  app = express();
  app.use(express.json());
  app.use('/api/film-rolls', createFilmRollsRouter(db));
});

test('GET /api/film-rolls returns all rolls with joined camera and film info', async () => {
  const res = await request(app).get('/api/film-rolls');
  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(3);
  expect(res.body[0]).toMatchObject({
    key: expect.any(Number),
    camera_name: expect.any(String),
    film_name: expect.any(String),
    film_type: expect.any(String),
    film_size: expect.any(Number),
    film_roll_num: expect.any(String),
    count: expect.any(Number),
  });
});

test('GET /api/film-rolls/:id returns single roll', async () => {
  const res = await request(app).get('/api/film-rolls/1');
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({
    key: 1,
    camera_name: 'PentaxK1000',
    film_name: 'Kodak400',
    film_type: 'Color',
    film_size: 135,
    film_roll_num: 'R001',
    count: 2,
    photos: expect.arrayContaining([{ ctl_num: 1 }, { ctl_num: 2 }]),
  });
});

test('GET /api/film-rolls/:id returns 404 for unknown id', async () => {
  const res = await request(app).get('/api/film-rolls/999');
  expect(res.status).toBe(404);
});
