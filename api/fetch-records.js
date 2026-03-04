/**
 * GET /api/fetch-records?tableId=XXXXX
 * Fetches all records (handles Airtable pagination) from any table in the base.
 */
import https from 'https';

function airtableGet(url, token) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { Authorization: `Bearer ${token}` } }, (response) => {
      let body = '';
      response.on('data', chunk => body += chunk);
      response.on('end', () => {
        try { resolve({ status: response.statusCode, data: JSON.parse(body) }); }
        catch (e) { reject(new Error('Invalid JSON from Airtable: ' + body.slice(0, 200))); }
      });
    }).on('error', reject);
  });
}

export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const TOKEN   = (process.env.AIRTABLE_TOKEN || '').trim();
  const BASE    = (process.env.AIRTABLE_BASE_ID || '').trim();
  const tableId = (req.query.tableId || '').trim();

  if (!TOKEN || !BASE) return res.status(500).json({ error: 'Missing Airtable env vars' });
  if (!tableId) return res.status(400).json({ error: 'Missing tableId query param' });

  const allRecords = [];
  let offset = '';
  try {
    do {
      const url = `https://api.airtable.com/v0/${BASE}/${encodeURIComponent(tableId)}?pageSize=100${offset ? '&offset=' + encodeURIComponent(offset) : ''}`;
      const { status, data } = await airtableGet(url, TOKEN);
      if (status !== 200) throw new Error(`Airtable ${status}: ${JSON.stringify(data.error || data)}`);
      allRecords.push(...(data.records || []));
      offset = data.offset || '';
    } while (offset);
    return res.status(200).json({ records: allRecords });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
