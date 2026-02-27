/**
 * GET /api/leads
 * Fetches all records from Airtable server-side using env vars.
 */
import https from 'https';

function airtableGet(url, token) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { Authorization: `Bearer ${token}` } }, (response) => {
      let body = '';
      response.on('data', chunk => body += chunk);
      response.on('end', () => {
        try {
          resolve({ status: response.statusCode, data: JSON.parse(body) });
        } catch (e) {
          reject(new Error('Invalid JSON from Airtable: ' + body.slice(0, 200)));
        }
      });
    }).on('error', reject);
  });
}

export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE  = process.env.AIRTABLE_BASE_ID;
  const TABLE = process.env.AIRTABLE_TABLE_ID;

  if (!TOKEN || !BASE || !TABLE) {
    const missing = ['AIRTABLE_TOKEN','AIRTABLE_BASE_ID','AIRTABLE_TABLE_ID'].filter(k => !process.env[k]);
    return res.status(500).json({ error: `Missing env vars: ${missing.join(', ')}` });
  }

  const allRecords = [];
  let offset = '';

  try {
    do {
      const url = `https://api.airtable.com/v0/${BASE}/${TABLE}?pageSize=100${offset ? '&offset=' + encodeURIComponent(offset) : ''}`;
      const { status, data } = await airtableGet(url, TOKEN);
      if (status !== 200) throw new Error(`Airtable ${status}: ${JSON.stringify(data.error || data)}`);
      allRecords.push(...(data.records || []));
      offset = data.offset || '';
    } while (offset);

    res.setHeader('Cache-Control', 's-maxage=30');
    return res.status(200).json({ records: allRecords });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
