/**
 * PATCH /api/update-lead
 * Body: { airtableId, fields }
 * Proxies a field update to Airtable server-side.
 */
import https from 'https';

function patch(url, token, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const opts = {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = https.request(url, opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  const TOKEN = (process.env.AIRTABLE_TOKEN || '').trim();
  const BASE  = (process.env.AIRTABLE_BASE_ID || '').trim();
  const TABLE = (process.env.AIRTABLE_TABLE_ID || '').trim();

  if (!TOKEN || !BASE || !TABLE) {
    return res.status(500).json({ error: 'Missing Airtable env vars' });
  }

  let body = '';
  req.on('data', c => body += c);
  await new Promise(r => req.on('end', r));

  try {
    const { airtableId, fields } = JSON.parse(body);
    if (!airtableId || !fields) return res.status(400).json({ error: 'Missing airtableId or fields' });

    const url = `https://api.airtable.com/v0/${BASE}/${TABLE}/${airtableId}`;
    const result = await patch(url, TOKEN, { fields });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
