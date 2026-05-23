const express = require('express');
const request = require('supertest');
const { createTestDb } = require('./helpers/testDb');
const createStatsRouter = require('../src/routes/stats');

let app;
beforeAll(() => {
  const db = createTestDb();
  app = express();
  app.use(express.json());
  app.use('/api/stats', createStatsRouter(db));
});

test('GET /api/stats returns aggregate totals and breakdowns', async () => {
  const res = await request(app).get('/api/stats');
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({
    totals: {
      rolls: 3,
      shots: 4,
      cameras: 2,
      films: 3,
    },
    byCamera: expect.arrayContaining([
      expect.objectContaining({ camera_name: 'PentaxK1000', roll_count: 2, shot_count: 3 }),
    ]),
    byFilmType: expect.arrayContaining([
      expect.objectContaining({ film_type: 'Color', roll_count: 2 }),
      expect.objectContaining({ film_type: 'B&W', roll_count: 1 }),
    ]),
    byFilmSize: expect.arrayContaining([
      expect.objectContaining({ film_size: 135, roll_count: 2 }),
      expect.objectContaining({ film_size: 120, roll_count: 1 }),
    ]),
  });
});
