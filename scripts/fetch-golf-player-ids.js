#!/usr/bin/env node
/**
 * Fetch golf player IDs for Best Ball headshots using ESPN's golf leaderboard API.
 *
 * Calls the ESPN leaderboard endpoint (default + optional tournament IDs) and
 * extracts athlete id + displayName from each competitor. Builds name -> ESPN ID
 * for headshot URLs. Run: node scripts/fetch-golf-player-ids.js
 *
 * Headshot URL: https://a.espncdn.com/i/headshots/golf/players/full/{id}.png
 * Output: golf/data/golf-player-ids.json
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const LEADERBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard';

// Major championships only (Masters, PGA Championship, U.S. Open, The Open).
// IDs from ESPN leaderboard URLs: espn.com/golf/leaderboard?tournamentId=...
// Note: ESPN's API often returns the current event for any tournamentId; when the
// current event is a major, we get that field. Multiple IDs still help if behavior differs.
const TOURNAMENT_IDS = [
  '401703504', // Masters Tournament (2025)
  '401580355', // U.S. Open (2024)
  '401580354', // The Open Championship (2024)
  '401580353', // PGA Championship (2024)
];

function fetch(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${url}`));
          return;
        }
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON'));
          }
        });
      })
      .on('error', reject);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractPlayersFromLeaderboard(json) {
  const lookup = {};
  const events = json.events || [];
  for (const event of events) {
    const competitions = event.competitions || [];
    for (const comp of competitions) {
      const competitors = comp.competitors || [];
      for (const c of competitors) {
        const athlete = c.athlete;
        if (athlete && athlete.id && athlete.displayName) {
          const name = athlete.displayName.trim();
          const id = String(athlete.id).trim();
          if (name && id) lookup[name] = id;
        }
      }
    }
  }
  return lookup;
}

async function main() {
  console.log('Fetching golf player IDs from ESPN leaderboard API...\n');

  const allPlayers = {};

  // 1) Default leaderboard (current event)
  try {
    process.stdout.write('  Default leaderboard... ');
    const json = await fetch(LEADERBOARD_URL);
    const batch = extractPlayersFromLeaderboard(json);
    const n = Object.keys(batch).length;
    Object.assign(allPlayers, batch);
    console.log(`${n} players`);
  } catch (err) {
    console.log(`failed: ${err.message}`);
  }

  await sleep(300);

  // 2) Additional tournaments
  for (const tid of TOURNAMENT_IDS) {
    try {
      process.stdout.write(`  Tournament ${tid}... `);
      const json = await fetch(`${LEADERBOARD_URL}?tournamentId=${tid}`);
      const batch = extractPlayersFromLeaderboard(json);
      const n = Object.keys(batch).length;
      let added = 0;
      for (const [name, id] of Object.entries(batch)) {
        if (!allPlayers[name]) {
          allPlayers[name] = id;
          added++;
        }
      }
      console.log(`${n} total, ${added} new`);
    } catch (err) {
      console.log(`failed: ${err.message}`);
    }
    await sleep(400);
  }

  // Preserve any existing manual overrides (existing file wins on name conflict)
  const outPath = path.join(__dirname, '..', 'golf', 'data', 'golf-player-ids.json');
  if (fs.existsSync(outPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
      const existingPlayers = existing.players || {};
      let overrides = 0;
      for (const [name, id] of Object.entries(existingPlayers)) {
        if (!allPlayers[name]) {
          allPlayers[name] = id;
          overrides++;
        }
      }
      if (overrides) console.log(`  Kept ${overrides} existing entries from current file.`);
    } catch (_) {}
  }

  const count = Object.keys(allPlayers).length;
  const out = {
    source: 'espn-golf-leaderboard',
    fetchedAt: new Date().toISOString(),
    count,
    players: allPlayers,
  };

  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');

  console.log(`\n✓ Wrote ${count} players to golf/data/golf-player-ids.json`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
