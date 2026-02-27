/**
 * fetch_airtable.js
 * Fetches all leads from the Airtable "Leads" table and saves to .tmp/leads.json
 * Run: node execution/fetch_airtable.js
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

// Load .env from project root if present
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const eq = line.indexOf('=');
    if (eq > 0) process.env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  });
}

const TOKEN    = process.env.AIRTABLE_TOKEN    || 'YOUR_TOKEN_HERE';
const BASE_ID  = process.env.AIRTABLE_BASE_ID  || 'YOUR_BASE_ID_HERE';
const TABLE_ID = process.env.AIRTABLE_TABLE_ID || 'YOUR_TABLE_ID_HERE';
const OUT_FILE = path.join(__dirname, '../.tmp/leads.json');

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { Authorization: `Bearer ${TOKEN}` } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
  });
}

async function fetchAll() {
  const allRecords = [];
  let offset = '';
  let page = 1;

  do {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?pageSize=100${offset ? '&offset=' + offset : ''}`;
    console.log(`  Fetching page ${page}…`);
    const data = await get(url);

    if (data.error) { console.error('API error:', data.error); process.exit(1); }

    allRecords.push(...data.records);
    offset = data.offset || '';
    page++;
  } while (offset);

  console.log(`  Total records fetched: ${allRecords.length}`);

  // Normalise each record into a clean lead object
  const leads = allRecords.map((rec, i) => {
    const f = rec.fields;

    // Determine type: call or form
    const isCall = !!(f['Caller ID'] || f['Call Recording Transcript'] || f['Call Time']);

    // Determine lead source (which LP site)
    const rawSrc = isCall ? (f['Call - Lead Source'] || '') : (f['Lead Source'] || '');
    let source = 'form1';
    if (isCall) {
      source = rawSrc.includes('pearlview') ? 'call2' : 'call1';
    } else {
      source = rawSrc.includes('pearlview') ? 'form2' : 'form1';
    }

    // Parse date
    const rawDate = isCall ? f['Call Time'] : f['Inquiry Date'];
    let dateStr = rawDate || '';

    // Status mapping — Airtable singleSelect value → internal key
    const statusMap = {
      'New':        'new',
      'Contacted':  'contacted',
      'Quoted':     'quoted',
      'Scheduled':  'scheduled',
      'Completed':  'completed',
      'Lost':       'lost',
    };
    const rawStatus = f['Lead Status'] || 'New';
    const status = statusMap[rawStatus] || 'new';

    const progMap = { new:10, contacted:30, quoted:55, scheduled:75, completed:100, lost:100 };

    return {
      id:        rec.id,
      name:      f['Client Name'] || f['Caller ID'] || 'Unknown',
      source,
      phone:     f['Phone Number'] || f['Caller ID'] || '',
      email:     f['Email'] || '',
      subject:   f['Inquiry Subject/Reason'] || f['Call Recording Transcript'] || '',
      date:      dateStr,
      address:   f['Adress'] || f['Service Address'] || '',
      jobType:   f['Property Type'] || '',
      windows:   f['Estimated Window Count'] || 0,
      stories:   f['Stories'] || 0,
      value:     f['Quote Amount'] || 0,
      invoice:   f['Final Invoice Amount'] || 0,
      duration:  f['Call Duration'] || '',
      transcript:f['Call Recording Transcript'] || '',
      followUp:  f['Next Follow-up Date'] || '',
      jobDate:   f['Scheduled Cleaning Date'] || '',
      details:   f['Property Details'] || '',
      status,
      progress:  progMap[status] || 10,
      starred:   false,
      notes:     '',
      hasCall:   isCall,
      lp:        source.includes('2') ? 'LP2' : 'LP1',
    };
  });

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(leads, null, 2));
  console.log(`  Saved to ${OUT_FILE}`);

  // Print summary
  const byStatus = {};
  leads.forEach(l => { byStatus[l.status] = (byStatus[l.status] || 0) + 1; });
  console.log('\n  Status breakdown:');
  Object.entries(byStatus).forEach(([k,v]) => console.log(`    ${k}: ${v}`));

  const calls = leads.filter(l => l.hasCall).length;
  const forms = leads.length - calls;
  console.log(`\n  Calls: ${calls}  |  Forms: ${forms}  |  Total: ${leads.length}`);
}

fetchAll().catch(err => { console.error(err); process.exit(1); });
