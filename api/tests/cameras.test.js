const express = require('express');
const request = require('supertest');
const { createTestDb } = require('./helpers/testDb');
const createCamerasRouter = require('../src/routes/cameras');

let app;
beforeAll(() => {
  const db = createTestDb();
  app = express();
  app.use(express.json());
  app.use('/api/cameras', createCamerasRouter(db));
});

test('GET /api/cameras returns all cameras', async () => {
  const res = await request(app).get('/api/cameras');
  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(2);
  expect(res.body[0]).toMatchObject({
    key: expect.any(Number),
    camera_name: expect.any(String),
    film_size: expect.any(Number),
    camera_manu: expect.any(String),
  });
});

test('GET /api/cameras/:id returns camera with its rolls', async () => {
  const res = await request(app).get('/api/cameras/1');
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({
    key: 1,
    camera_name: 'PentaxK1000',
    film_size: 135,
    roll_count: 2,
    total_shots: 3,
    rolls: expect.arrayContaining([
      expect.objectContaining({ film_roll_num: 'R001' }),
    ]),
  });
});

test('GET /api/cameras/:id returns 404 for unknown id', async () => {
  const res = await request(app).get('/api/cameras/999');
  expect(res.status).toBe(404);
});
