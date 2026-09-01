// Loads the list of universities from public/data/config.json. Used by
// auth and verification controllers to validate that a user-selected
// university is real and currently active. Caches the parsed list
// in-memory so we don't re-read the file on every request.

const fs = require('fs');
const path = require('path');

let cache = null;

function configPath () {
  // The file lives in public/data/ for the frontend; the same file is
  // served as a static asset, so the backend reads from public/data too.
  return path.join(__dirname, '..', '..', 'public', 'data', 'config.json');
}

function readConfig () {
  const p = configPath();
  const raw = fs.readFileSync(p, 'utf8');
  return JSON.parse(raw);
}

function loadAll () {
  if (cache) {return cache;}
  try {
    const cfg = readConfig();
    const list = Array.isArray(cfg.universities) ? cfg.universities : [];
    cache = list.map(u => ({
      id: u.id,
      name: u.name,
      campus: u.campus,
      region: u.region,
      active: u.active !== false,
    }));
  } catch (err) {
    console.error('universities: failed to load config.json', err.message);
    cache = [];
  }
  return cache;
}

function loadActive () {
  return loadAll().filter(u => u.active);
}

function getById (id) {
  return loadAll().find(u => u.id === id) || null;
}

function isActiveId (id) {
  const u = getById(id);
  return !!(u && u.active);
}

function clearCache () {
  cache = null;
}

module.exports = { loadAll, loadActive, getById, isActiveId, clearCache };
