/**
 * GET /api/leads
 * Fetches all records from Airtable server-side using env vars.
 */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE  = process.env.AIRTABLE_BASE_ID;
  const TABLE = process.env.AIRTABLE_TABLE_ID;

  if (!TOKEN || !BASE || !TABLE) {
    return res.status(500).json({
      error: `Missing env vars: ${[!TOKEN&&'AIRTABLE_TOKEN',!BASE&&'AIRTABLE_BASE_ID',!TABLE&&'AIRTABLE_TABLE_ID'].filter(Boolean).join(', ')}`
    });
  }

  const allRecords = [];
  let offset = '';

  try {
    do {
      const url = `https://api.airtable.com/v0/${BASE}/${TABLE}?pageSize=100${offset ? '&offset=' + encodeURIComponent(offset) : ''}`;
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${TOKEN}` }
      });
      const data = await r.json();
      if (!r.ok) throw new Error(`Airtable ${r.status}: ${JSON.stringify(data.error || data)}`);
      allRecords.push(...(data.records || []));
      offset = data.offset || '';
    } while (offset);

    res.setHeader('Cache-Control', 's-maxage=30');
    res.json({ records: allRecords });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
