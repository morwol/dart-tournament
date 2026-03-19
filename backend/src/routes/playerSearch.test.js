const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('http');

// Use in-memory DB for tests
process.env.DB_PATH = ':memory:';
const { db, initialize } = require('../db/db');

describe('GET /api/players/search', () => {
  let server;
  let port;

  before(() => {
    initialize();
    // Seed test data
    db.prepare("INSERT INTO players (name, vorname, nickname, nachname) VALUES (?, ?, ?, ?)")
      .run('Martin "Ace" Hofmann', 'Martin', 'Ace', 'Hofmann');
    db.prepare("INSERT INTO players (name, vorname, nickname, nachname) VALUES (?, ?, ?, ?)")
      .run('Julia "Blitz" Braun', 'Julia', 'Blitz', 'Braun');

    const app = express();
    const router = require('./playerSearch');
    app.use('/', router);
    server = http.createServer(app);
    server.listen(0);
    port = server.address().port;
  });

  after(() => server.close());

  it('returns 400 for query shorter than 2 chars', async () => {
    const res = await fetch(`http://localhost:${port}/?q=a`);
    assert.equal(res.status, 400);
  });

  it('finds player by nickname', async () => {
    const res = await fetch(`http://localhost:${port}/?q=ace`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.length, 1);
    assert.equal(data[0].nickname, 'Ace');
  });

  it('finds player by vorname', async () => {
    const res = await fetch(`http://localhost:${port}/?q=julia`);
    const data = await res.json();
    assert.equal(data[0].nickname, 'Blitz');
  });

  it('returns has_walkon false when no walkon_file', async () => {
    const res = await fetch(`http://localhost:${port}/?q=ace`);
    const data = await res.json();
    assert.equal(data[0].has_walkon, 0);
  });

  it('limits to 10 results', async () => {
    // Insert 11 more players named "Test"
    for (let i = 0; i < 11; i++) {
      db.prepare("INSERT INTO players (name, vorname, nickname, nachname) VALUES (?, ?, ?, ?)")
        .run(`Test${i} "T${i}" X`, `Test${i}`, `T${i}`, 'X');
    }
    const res = await fetch(`http://localhost:${port}/?q=test`);
    const data = await res.json();
    assert.ok(data.length <= 10);
  });
});
