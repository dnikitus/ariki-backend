// Debug startup file: logs Strapi's startup to ~/strapi-startup.log
// and shows the error on the page if Strapi fails to start.
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');

const LOG = path.join(os.homedir(), 'strapi-startup.log');
const log = (msg) => {
  const mem = Math.round(process.memoryUsage().rss / 1024 / 1024);
  fs.appendFileSync(LOG, `${new Date().toISOString()} [${mem} MB] ${msg}\n`);
};

// Keep Strapi's own console output, since it logs startup errors itself before exiting
let output = '';
for (const stream of [process.stdout, process.stderr]) {
  const write = stream.write.bind(stream);
  stream.write = (chunk, ...args) => {
    const text = String(chunk).replace(/\x1b\[[0-9;]*m/g, '');
    output = (output + text).slice(-20000);
    fs.appendFileSync(LOG, text);
    return write(chunk, ...args);
  };
}

let started = false;
let serving = false;
const showError = (label, err) => {
  if (serving) return;
  serving = true;
  const text = `${label}\n\n${err ? (err.stack || err) + '\n\n' : ''}---- Strapi output ----\n${output}`;
  log(label + (err ? `: ${err.stack || err}` : ''));
  http
    .createServer((req, res) => {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(text);
    })
    .listen(process.env.PORT || 3000);
};

// Strapi calls process.exit(1) when startup fails; serve the error instead of dying silently
const exit = process.exit.bind(process);
process.exit = (code) => {
  if (!started && code) return showError(`Strapi exited during startup (code ${code})`);
  log(`process exit, code ${code}`);
  exit(code);
};

process.on('uncaughtException', (err) => showError('uncaughtException', err));
process.on('unhandledRejection', (err) => showError('unhandledRejection', err));
['SIGTERM', 'SIGINT', 'SIGHUP'].forEach((sig) => process.on(sig, () => { log(`received ${sig}`); exit(1); }));

log(`---- start, node ${process.version}, pid ${process.pid}`);

process.chdir(__dirname);
process.env.ENV_PATH = process.env.ENV_PATH || path.join(__dirname, '.env');

// Memory heartbeat: if the log stops while memory climbs, the host's memory limit killed the process
const heartbeat = setInterval(() => log('heartbeat'), 1000);

const checkDatabase = async () => {
  const { Client } = require('pg');
  const ssl = process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false;
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl, connectionTimeoutMillis: 10000 });
  log('database: connecting');
  await client.connect();
  const { rows } = await client.query('select current_user, current_database()');
  log(`database: ok, connected as ${rows[0].current_user} to ${rows[0].current_database}`);
  await client.end();
};

(async () => {
  try {
    await checkDatabase();
  } catch (err) {
    return showError('database check failed', err);
  }

  let createStrapi;
  try {
    ({ createStrapi } = require('@strapi/strapi'));
    log('loaded @strapi/strapi');
  } catch (err) {
    return showError('require(@strapi/strapi) failed', err);
  }

  const app = createStrapi({ appDir: __dirname, distDir: path.join(__dirname, 'dist') });
  log('createStrapi done, starting');
  await app.start();
  started = true;
  clearInterval(heartbeat);
  log('Strapi started');
})().catch((err) => showError('strapi.start() failed', err));
