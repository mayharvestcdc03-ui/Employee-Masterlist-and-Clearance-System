/**
 * May Harvest Corporation - Employee Masterlist & Clearance Management System
 * Fullstack Cloud Server Engine with Automatic 2-Way Live Sync (v1.0)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const DB_FILE = path.join(DATA_DIR, 'ems-database.json');

// Ensure directories exist
[DATA_DIR, BACKUPS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const OFFICIAL_SYSTEM_ACCOUNTS = [
  { id: 'admin', name: 'System Administrator', role: 'admin', dept: '' },
  { id: 'hr1', name: 'HR Officer 1 - Aliyah Francine Gojo Cruz', role: 'hr', dept: '' },
  { id: 'hr2', name: 'HR Officer 2 - Aira Jheanne Rufino, RPm', role: 'hr', dept: '' },
  { id: 'hr', name: 'HR Department', role: 'hr', dept: '' },
  { id: 'prod', name: 'Production Head - Geraldine Mendoza', role: 'depthead', dept: 'Production' },
  { id: 'wh', name: 'Warehouse Head - Lilibeth Menoza', role: 'depthead', dept: 'Warehouse' },
  { id: 'qa', name: 'Quality Head - Jerwin Mendoza', role: 'depthead', dept: 'Quality' },
  { id: 'eng', name: 'Engineering Head - Adonis Palad', role: 'depthead', dept: 'E&M' },
  { id: 'depthead', name: 'Department Head', role: 'depthead', dept: 'Production' },
  { id: 'wb', name: 'Workbridge Corporation', role: 'agency', agency: 'Workbridge Corporation' },
  { id: 'multi', name: 'Multicareer Manpower Services', role: 'agency', agency: 'Multicareer Manpower Services' },
  { id: 'tj', name: 'Top Jinzai Company, Inc.', role: 'agency', agency: 'Top Jinzai Company, Inc.' },
  { id: 'agency', name: 'Manpower Agency Coordinator', role: 'agency', agency: 'Workbridge Corporation' },
  { id: 'doccontrol', name: 'Document Control Officer', role: 'dco', dept: '' },
  { id: 'dco', name: 'Document Control Officer', role: 'dco', dept: '' },
  { id: 'opsmanager', name: 'Operations Manager', role: 'om', dept: '' },
  { id: 'om', name: 'Operations Manager', role: 'om', dept: '' },
  { id: 'blgm', name: 'BLGM Manpower Services', role: 'agency', agency: 'BLGM Manpower Services' },
  { id: 'omni', name: 'Omnichron Security Agency, Inc', role: 'agency', agency: 'Omnichron Security Agency, Inc' }
];

function ensureAccounts(data) {
  if (!data.acc || !Array.isArray(data.acc)) data.acc = [];
  OFFICIAL_SYSTEM_ACCOUNTS.forEach(acc => {
    const existing = data.acc.find(x => x.id && x.id.toLowerCase() === acc.id.toLowerCase());
    if (!existing) {
      data.acc.push(Object.assign({}, acc));
    } else {
      existing.name = acc.name;
      existing.role = acc.role;
      if (acc.dept !== undefined) existing.dept = acc.dept;
      if (acc.agency !== undefined) existing.agency = acc.agency;
    }
  });
}

function getInitialState() {
  const state = {
    emp: [],
    items: [],
    pw: {},
    dc: {},
    dcl: [],
    acc: OFFICIAL_SYSTEM_ACCOUNTS.map(a => Object.assign({}, a)),
    req: {},
    reqInfo: null,
    reqO: {},
    man2: {},
    lastUpdated: new Date().toISOString()
  };
  return state;
}

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const data = JSON.parse(raw);
      return {
        emp: Array.isArray(data.emp) ? data.emp : [],
        items: Array.isArray(data.items) ? data.items : [],
        pw: (data.pw && typeof data.pw === 'object') ? data.pw : {},
        dc: (data.dc && typeof data.dc === 'object') ? data.dc : {},
        dcl: Array.isArray(data.dcl) ? data.dcl : [],
        acc: Array.isArray(data.acc) ? data.acc : [],
        req: (data.req && typeof data.req === 'object') ? data.req : {},
        reqInfo: data.reqInfo || null,
        reqO: (data.reqO && typeof data.reqO === 'object') ? data.reqO : {},
        man2: (data.man2 && typeof data.man2 === 'object') ? data.man2 : {},
        lastUpdated: data.lastUpdated || new Date().toISOString()
      };
    }
  } catch (err) {
    console.error('[DB Load Error]:', err.message);
  }
  return getInitialState();
}

function saveDatabase(data) {
  try {
    data.lastUpdated = new Date().toISOString();
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, DB_FILE);
    return true;
  } catch (err) {
    console.error('[DB Save Error]:', err.message);
    return false;
  }
}

function createBackupSnapshot(data, force = false) {
  try {
    const now = new Date();
    const hourStamp = `${now.toISOString().slice(0, 13).replace(/[-:T]/g, '')}`;
    const backupFile = path.join(BACKUPS_DIR, `snapshot-${hourStamp}.json`);

    if (force || !fs.existsSync(backupFile)) {
      fs.writeFileSync(backupFile, JSON.stringify(data, null, 2), 'utf8');
      cleanupOldBackups();
    }
  } catch (e) {
    console.error('[Backup Error]:', e.message);
  }
}

function cleanupOldBackups(maxFiles = 24) {
  try {
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.startsWith('snapshot-') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length > maxFiles) {
      files.slice(maxFiles).forEach(f => {
        try { fs.unlinkSync(path.join(BACKUPS_DIR, f)); } catch (_) {}
      });
    }
  } catch (_) {}
}

function mergeCollection(existing, incoming, idField = 'id') {
  if (!Array.isArray(incoming)) return Array.isArray(existing) ? existing : [];
  if (!Array.isArray(existing) || existing.length === 0) return incoming;

  const map = new Map();
  existing.forEach(item => {
    if (item && item[idField]) map.set(item[idField], item);
  });

  incoming.forEach(item => {
    if (!item || !item[idField]) return;
    const current = map.get(item[idField]);
    if (!current) {
      map.set(item[idField], item);
    } else {
      const curTime = new Date(current.updatedAt || current.createdAt || 0).getTime();
      const incTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
      if (incTime >= curTime) {
        map.set(item[idField], { ...current, ...item });
      }
    }
  });

  return Array.from(map.values());
}

function mergeDatabase(current, incoming) {
  if (!incoming || typeof incoming !== 'object') return current;
  return {
    emp: mergeCollection(current.emp, incoming.emp, 'id'),
    items: mergeCollection(current.items, incoming.items, 'id'),
    pw: { ...current.pw, ...(incoming.pw || {}) },
    dc: { ...current.dc, ...(incoming.dc || {}) },
    dcl: Array.isArray(incoming.dcl) && incoming.dcl.length > current.dcl.length ? incoming.dcl : current.dcl,
    acc: mergeCollection(current.acc, incoming.acc, 'id'),
    req: { ...current.req, ...(incoming.req || {}) },
    reqInfo: incoming.reqInfo || current.reqInfo,
    reqO: { ...current.reqO, ...(incoming.reqO || {}) },
    man2: { ...current.man2, ...(incoming.man2 || {}) },
    lastUpdated: new Date().toISOString()
  };
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const sendJSON = (status, obj) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(obj));
  };

  const readJSONBody = (cb) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 25 * 1024 * 1024) req.destroy();
    });
    req.on('end', () => {
      try {
        cb(null, body ? JSON.parse(body) : {});
      } catch (err) {
        cb(err);
      }
    });
  };

  // 1. Health check
  if (pathname === '/api/health') {
    return sendJSON(200, {
      status: 'ok',
      service: 'MHC Employee Masterlist & Clearance Management System',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    });
  }

  // 2. Cloud Sync (GET)
  if (pathname === '/api/sync' && req.method === 'GET') {
    const db = loadDatabase();
    return sendJSON(200, { ok: true, data: db });
  }

  // 2. Cloud Sync (POST)
  if (pathname === '/api/sync' && req.method === 'POST') {
    readJSONBody((err, incoming) => {
      if (err || !incoming) {
        return sendJSON(400, { ok: false, error: 'Malformed JSON payload' });
      }
      const currentDB = loadDatabase();
      const mergedDB = mergeDatabase(currentDB, incoming);
      saveDatabase(mergedDB);
      createBackupSnapshot(mergedDB);
      return sendJSON(200, {
        ok: true,
        message: 'Sync successful',
        lastUpdated: mergedDB.lastUpdated,
        counts: {
          employees: mergedDB.emp.length,
          items: mergedDB.items.length,
          accounts: mergedDB.acc.length
        }
      });
    });
    return;
  }

  // 3. Backup Download
  if (pathname === '/api/backup' && req.method === 'GET') {
    const db = loadDatabase();
    const dateStr = new Date().toISOString().slice(0, 10);
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="MHC-EMS-Backup-${dateStr}.json"`
    });
    res.end(JSON.stringify(db, null, 2));
    return;
  }

  // 4. Backup Restore
  if (pathname === '/api/backup/restore' && req.method === 'POST') {
    readJSONBody((err, payload) => {
      if (err || !payload) return sendJSON(400, { ok: false, error: 'Invalid backup file' });
      if (saveDatabase(payload)) {
        createBackupSnapshot(payload, true);
        return sendJSON(200, { ok: true, message: 'Database successfully restored from backup' });
      }
      return sendJSON(500, { ok: false, error: 'Failed to restore database' });
    });
    return;
  }

  // 5. Static File Serving
  let safePath = pathname;
  if (safePath === '/' || safePath === '/index.html' || safePath === '') {
    safePath = '/index.html';
  }
  const filePath = path.join(ROOT_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found - May Harvest Corporation');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': ext === '.html' ? 'no-cache, no-store, must-revalidate' : 'public, max-age=86400'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  May Harvest - Employee Masterlist & Clearance System `);
  console.log(`  Server running on http://localhost:${PORT}          `);
  console.log(`  Cloud Sync & Database Engine Online                  `);
  console.log(`=======================================================`);
});
