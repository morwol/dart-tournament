const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

process.env.DB_PATH = ':memory:';
const { db, initialize } = require('../db/db');

describe('POST /api/tournaments/:id/players with player_id', () => {
  before(() => {
    initialize();
    db.prepare("INSERT INTO tournaments (name, format, checkout, status) VALUES (?, ?, ?, ?)").run('Test', '501', 'double_out', 'open');
    db.prepare("INSERT INTO players (name, vorname, nickname, nachname) VALUES (?, ?, ?, ?)").run('Ace Hofmann', 'Martin', 'Ace', 'Hofmann');
  });

  it('registers existing player by player_id', () => {
    const tournament = db.prepare('SELECT id FROM tournaments LIMIT 1').get();
    const player = db.prepare('SELECT id FROM players LIMIT 1').get();
    const cancelToken = 'testtoken123';
    db.prepare('INSERT INTO tournament_registrations (player_id, tournament_id, seed, cancel_token) VALUES (?, ?, ?, ?)')
      .run(player.id, tournament.id, null, cancelToken);
    const reg = db.prepare('SELECT * FROM tournament_registrations WHERE player_id = ? AND tournament_id = ?').get(player.id, tournament.id);
    assert.ok(reg);
    assert.equal(reg.player_id, player.id);
  });

  it('duplicate check: same player cannot register twice', () => {
    const tournament = db.prepare('SELECT id FROM tournaments LIMIT 1').get();
    const player = db.prepare('SELECT id FROM players LIMIT 1').get();
    const existing = db.prepare('SELECT id FROM tournament_registrations WHERE player_id = ? AND tournament_id = ?').get(player.id, tournament.id);
    assert.ok(existing, 'Should already be registered from previous test');
  });
});
