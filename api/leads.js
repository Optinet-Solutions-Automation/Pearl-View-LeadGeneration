/**
 * GET /api/leads
 * Fetches all records from Airtable server-side using env vars.
 * Token never reaches the browser.
 */
const https = require('https');

function get(url, token) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE  = process.env.AIRTABLE_BASE_ID;
  const TABLE = process.env.AIRTABLE_TABLE_ID;

  if (!TOKEN || !BASE || !TABLE) {
    return res.status(500).json({ error: 'Missing Airtable env vars' });
  }

  const allRecords = [];
  let offset = '';

  try {
    do {
      const url = `https://api.airtable.com/v0/${BASE}/${TABLE}?pageSize=100${offset ? '&offset=' + encodeURIComponent(offset) : ''}`;
      const data = await get(url, TOKEN);
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      allRecords.push(...(data.records || []));
      offset = data.offset || '';
    } while (offset);

    res.setHeader('Cache-Control', 's-maxage=30');
    res.json({ records: allRecords });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
