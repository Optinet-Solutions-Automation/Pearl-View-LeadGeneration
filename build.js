/**
 * build.js — runs at Vercel deploy time
 * Injects Airtable credentials from environment variables into dashboard/config.js
 */
const fs = require('fs');

const token = process.env.AIRTABLE_TOKEN    || '';
const base  = process.env.AIRTABLE_BASE_ID  || '';
const table = process.env.AIRTABLE_TABLE_ID || '';

if (!token || !base || !table) {
  console.warn('Warning: One or more Airtable env vars are missing.');
}

fs.writeFileSync('dashboard/config.js',
`// Auto-generated at build time from Vercel environment variables
window.AIRTABLE_TOKEN = '${token}';
window.AIRTABLE_BASE  = '${base}';
window.AIRTABLE_TABLE = '${table}';
`);

console.log('config.js generated successfully.');
