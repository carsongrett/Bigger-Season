#!/usr/bin/env node
/**
 * Fetch NFL player IDs for headshots using nflverse data (ESPN ID).
 *
 * Tries nflverse-data releases: first players.csv (display_name -> espn_id),
 * then roster_2024.csv (full_name -> espn_id) if needed. Builds name -> ESPN ID
 * for headshot URLs. Run: node scripts/fetch-nfl-roster.js
 *
 * Headshot URL: https://a.espncdn.com/i/headshots/nfl/players/full/{espn_id}.png
 * Output: data/nfl-player-ids.json
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const PLAYERS_CSV_URL = 'https://github.com/nflverse/nflverse-data/releases/download/players/players.csv';
const ROSTER_CSV_URL = 'https://github.com/nflverse/nflverse-data/releases/download/rosters/roster_2024.csv';

// Fallback if our CSV name doesn't match; add as needed.
const NAME_OVERRIDES = {};

function fetchUrl(url, redirectCount = 0) {
  const maxRedirects = 5;
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const loc = res.headers.location;
        if (redirectCount >= maxRedirects || !loc) {
          reject(new Error(`Too many redirects or missing Location`));
          return;
        }
        const next = loc.startsWith('http') ? loc : new URL(loc, url).href;
        return fetchUrl(next, redirectCount + 1).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = [];
    let cur = '';
    let inQuotes = false;
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      if (c === '"') inQuotes = !inQuotes;
      else if ((c === ',' && !inQuotes) || c === '\r') {
        vals.push(cur.trim().replace(/^"|"$/g, ''));
        cur = '';
      } else cur += c;
    }
    vals.push(cur.trim().replace(/^"|"$/g, ''));
    const row = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] ?? ''; });
    rows.push(row);
  }
  return { headers, rows };
}

function main() {
  console.log('Fetching NFL player data (nflverse)...');

  function tryPlayers() {
    return fetchUrl(PLAYERS_CSV_URL).then((csv) => {
      const { rows } = parseCSV(csv);
      if (!rows.length) throw new Error('No rows in players.csv');
      const hasDisplay = rows[0].display_name !== undefined;
      const nameCol = hasDisplay ? 'display_name' : 'full_name';
      const lookup = {};
      for (const r of rows) {
        const name = r[nameCol];
        const id = r.espn_id;
        if (name && id && String(id).trim() !== '') lookup[name.trim()] = String(id).trim();
      }
      return lookup;
    });
  }

  function tryRoster() {
    return fetchUrl(ROSTER_CSV_URL).then((csv) => {
      const { rows } = parseCSV(csv);
      if (!rows.length) throw new Error('No rows in roster');
      const lookup = {};
      for (const r of rows) {
        const name = r.full_name;
        const id = r.espn_id;
        if (name && id && String(id).trim() !== '') lookup[name.trim()] = String(id).trim();
      }
      return lookup;
    });
  }

  tryPlayers()
    .catch(() => {
      console.log('  players.csv failed, trying roster_2024.csv...');
      return tryRoster();
    })
    .then((lookup) => {
      Object.assign(lookup, NAME_OVERRIDES);
      const out = {
        source: 'nflverse-data',
        fetchedAt: new Date().toISOString(),
        count: Object.keys(lookup).length,
        players: lookup,
      };
      const outPath = path.join(__dirname, '..', 'data', 'nfl-player-ids.json');
      fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
      console.log(`✓ Wrote ${Object.keys(lookup).length} players to data/nfl-player-ids.json`);
    })
    .catch((err) => {
      console.error('Error:', err.message);
      console.error('  If GitHub returns 500, wait a few minutes and run again.');
      process.exit(1);
    });
}

main();
