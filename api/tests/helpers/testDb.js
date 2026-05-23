const Database = require('better-sqlite3');

function createTestDb() {
  const db = new Database(':memory:');

  db.exec(`
    CREATE TABLE file (key INTEGER PRIMARY KEY, filename TEXT);
    CREATE TABLE film (key INTEGER PRIMARY KEY, film_name TEXT, film_type TEXT, film_size INT, iso INT, film_manu TEXT);
    CREATE TABLE camera (key INTEGER PRIMARY KEY, camera_name TEXT, film_size INT, camera_manu TEXT);
    CREATE TABLE photos (key INTEGER PRIMARY KEY, camera_key INT, film_key INT, film_size INT, film_roll_key INT, ctl_num INT,
      FOREIGN KEY(camera_key) REFERENCES camera(key),
      FOREIGN KEY(film_key) REFERENCES film(key),
      FOREIGN KEY(film_roll_key) REFERENCES film_roll(key));
    CREATE TABLE film_roll (key INTEGER PRIMARY KEY, camera_key INT, film_key INT, film_size INT, film_roll_num TEXT NOT NULL, count INT,
      FOREIGN KEY(camera_key) REFERENCES camera(key),
      FOREIGN KEY(film_key) REFERENCES film(key));
  `);

  db.exec(`
    INSERT INTO camera VALUES (1, 'PentaxK1000', 135, 'Pentax');
    INSERT INTO camera VALUES (2, 'RolleiflexT', 120, 'Rollei');
    INSERT INTO film VALUES (1, 'Kodak400', 'Color', 135, 400, 'Kodak');
    INSERT INTO film VALUES (2, 'IlfordHP5', 'B&W', 135, 400, 'Ilford');
    INSERT INTO film VALUES (3, 'FujiPro400H', 'Color', 120, 400, 'Fuji');
    INSERT INTO film_roll VALUES (1, 1, 1, 135, 'R001', 2);
    INSERT INTO film_roll VALUES (2, 1, 2, 135, 'R002', 1);
    INSERT INTO film_roll VALUES (3, 2, 3, 120, 'R003', 1);
    INSERT INTO photos VALUES (1, 1, 1, 135, 1, 1);
    INSERT INTO photos VALUES (2, 1, 1, 135, 1, 2);
    INSERT INTO photos VALUES (3, 1, 2, 135, 2, 1);
    INSERT INTO photos VALUES (4, 2, 3, 120, 3, 1);
    INSERT INTO file VALUES (1, '135_PentaxK1000_Kodak400_Color_R001_1');
    INSERT INTO file VALUES (2, '135_PentaxK1000_Kodak400_Color_R001_2');
    INSERT INTO file VALUES (3, '135_PentaxK1000_IlfordHP5_B&W_R002_1');
    INSERT INTO file VALUES (4, '120_RolleiflexT_FujiPro400H_Color_R003_1');
  `);

  return db;
}

module.exports = { createTestDb };
