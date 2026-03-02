/**
 * backfill_lead_status.js
 * One-time script: sets Lead Status = 'New' for every Airtable record
 * that currently has a blank Lead Status field.
 *
 * Run: node execution/backfill_lead_status.js
 */

import https from 'https';
import fs    from 'fs';
import path  from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from project root
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const eq = line.indexOf('=');
    if (eq > 0) process.env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  });
}

const TOKEN    = process.env.AIRTABLE_TOKEN    || '';
const BASE_ID  = process.env.AIRTABLE_BASE_ID  || '';
const TABLE_ID = process.env.AIRTABLE_TABLE_ID || '';

if (!TOKEN || !BASE_ID || !TABLE_ID) {
  console.error('Missing AIRTABLE_TOKEN, AIRTABLE_BASE_ID, or AIRTABLE_TABLE_ID in .env');
  process.exit(1);
}

function request(method, url, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      method,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = https.request(url, opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { reject(new Error('Invalid JSON: ' + data.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function fetchAllRecords() {
  const all = [];
  let offset = '';
  let page = 1;
  do {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?pageSize=100${offset ? '&offset=' + encodeURIComponent(offset) : ''}`;
    console.log(`  Fetching page ${page}…`);
    const { status, body } = await request('GET', url);
    if (status !== 200) { console.error('Fetch error:', body); process.exit(1); }
    all.push(...body.records);
    offset = body.offset || '';
    page++;
  } while (offset);
  return all;
}

// Patch a single record (same approach the app uses)
async function patchRecord(recordId, fields) {
  const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${recordId}`;
  const { status, body } = await request('PATCH', url, { fields });
  if (status !== 200) throw new Error(`Patch failed (${status}): ${JSON.stringify(body)}`);
  return body;
}

async function main() {
  console.log('\nFetching all records from Airtable…');
  const all = await fetchAllRecords();
  console.log(`  Total records: ${all.length}`);

  // Find records with blank Lead Status
  const blank = all.filter(r => !r.fields['Lead Status']);
  console.log(`  Records with blank Lead Status: ${blank.length}`);

  if (blank.length === 0) {
    console.log('\nNothing to backfill. All records already have a Lead Status.');
    return;
  }

  // Patch each record individually (same as app), with delay to respect rate limit
  let updated = 0;
  for (const rec of blank) {
    await patchRecord(rec.id, { 'Lead Status': 'New' });
    updated++;
    process.stdout.write(`  Updated ${updated}/${blank.length}\r`);
    // ~5 requests/sec max (Airtable free tier limit)
    await new Promise(r => setTimeout(r, 220));
  }

  console.log(`\n\nDone. Set Lead Status = 'New' on ${updated} records.`);
}

main().catch(err => { console.error(err); process.exit(1); });
