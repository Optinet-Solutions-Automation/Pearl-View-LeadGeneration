/**
 * POST /api/create-record
 * Body: { tableId, fields }
 * Creates a new record in the specified Airtable table.
 */
import https from 'https';

function airtablePost(url, token, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const TOKEN = (process.env.AIRTABLE_TOKEN || '').trim();
  const BASE  = (process.env.AIRTABLE_BASE_ID || '').trim();

  if (!TOKEN || !BASE) return res.status(500).json({ error: 'Missing Airtable env vars' });

  let body = '';
  req.on('data', c => body += c);
  await new Promise(r => req.on('end', r));

  try {
    const { tableId, fields } = JSON.parse(body);
    if (!tableId || !fields) return res.status(400).json({ error: 'Missing tableId or fields' });

    const url = `https://api.airtable.com/v0/${BASE}/${tableId}`;
    const { status, data } = await airtablePost(url, TOKEN, { fields });

    if (status !== 200 && status !== 201) return res.status(status).json(data);
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
