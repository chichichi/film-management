const express = require('express');
const request = require('supertest');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { createTestDb } = require('./helpers/testDb');
const createPhotosRouter = require('../src/routes/photos');

let app;
let convertedDir;
let scannedDir;

beforeAll(() => {
  convertedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'converted-'));
  scannedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scanned-'));

  const jpegBytes = Buffer.from(
    'ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffc0000b08000100010101110003ffc4001f0000010501010101010100000000000000000102030405060708090a0bffda00080101000005021268ffd9',
    'hex'
  );
  fs.writeFileSync(path.join(convertedDir, '135_PentaxK1000_Kodak400_Color_R001_1.jpg'), jpegBytes);
  fs.writeFileSync(path.join(convertedDir, '135_PentaxK1000_Kodak400_Color_R001_2.jpg'), jpegBytes);
  fs.writeFileSync(path.join(scannedDir, '135_PentaxK1000_Kodak400_Color_R001_1.dng'), Buffer.from('RAW'));

  const db = createTestDb();
  app = express();
  app.use(express.json());
  app.use('/api/photos', createPhotosRouter(db, convertedDir, scannedDir));
});

afterAll(() => {
  fs.rmSync(convertedDir, { recursive: true });
  fs.rmSync(scannedDir, { recursive: true });
});

test('GET /api/photos/roll/:rollId returns photo list for a roll', async () => {
  const res = await request(app).get('/api/photos/roll/1');
  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(2);
  expect(res.body[0]).toMatchObject({
    ctlNum: 1,
    baseName: '135_PentaxK1000_Kodak400_Color_R001_1',
  });
});

test('GET /api/photos/roll/:rollId returns 404 for unknown roll', async () => {
  const res = await request(app).get('/api/photos/roll/999');
  expect(res.status).toBe(404);
});

test('GET /api/photos/thumb/:file serves JPEG from converted dir', async () => {
  const res = await request(app).get('/api/photos/thumb/135_PentaxK1000_Kodak400_Color_R001_1');
  expect(res.status).toBe(200);
  expect(res.headers['content-type']).toMatch(/image/);
});

test('GET /api/photos/thumb/:file returns 404 for unknown file', async () => {
  const res = await request(app).get('/api/photos/thumb/does_not_exist');
  expect(res.status).toBe(404);
});
