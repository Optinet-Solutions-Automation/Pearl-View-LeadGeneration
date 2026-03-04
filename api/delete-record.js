/**
 * DELETE /api/delete-record
 * Body: { tableId, recordId }
 * Deletes a record from the specified Airtable table.
 */
import https from 'https';

function airtableDelete(url, token) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  const TOKEN = (process.env.AIRTABLE_TOKEN || '').trim();
  const BASE  = (process.env.AIRTABLE_BASE_ID || '').trim();

  if (!TOKEN || !BASE) return res.status(500).json({ error: 'Missing Airtable env vars' });

  let body = '';
  req.on('data', c => body += c);
  await new Promise(r => req.on('end', r));

  try {
    const { tableId, recordId } = JSON.parse(body);
    if (!tableId || !recordId) return res.status(400).json({ error: 'Missing tableId or recordId' });

    const url = `https://api.airtable.com/v0/${BASE}/${tableId}/${recordId}`;
    const { status, data } = await airtableDelete(url, TOKEN);

    if (status !== 200) return res.status(status).json(data);
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
