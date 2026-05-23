const Database = require('better-sqlite3');

function openDb(path) {
  return new Database(path, { readonly: false });
}

module.exports = openDb;
