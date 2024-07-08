const pgp = require('pg-promise')();
require('../../env-setup');
const cn = {
  host: 'localhost',
  port: 5432,
  database: 'v5',
  user: 'pooltogether',
  password: process.env.PASSWORD,
};
const db = pgp(cn);

const cnFinal = {
  host: 'localhost',
  port: 5432,
  database: 'v5final',
  user: 'pooltogether',
  password: process.env.PASSWORD,
};
const dbFinal = pgp(cnFinal);

module.exports = { db, dbFinal };
