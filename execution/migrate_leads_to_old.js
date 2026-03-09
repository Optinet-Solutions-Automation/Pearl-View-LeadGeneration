/**
 * migrate_leads_to_old.js
 * Copies all records from the Leads table into the Old Leads table,
 * then deletes them from Leads.
 *
 * Usage: node execution/migrate_leads_to_old.js
 * Add --dry-run to preview without making changes.
 */

const TOKEN   = 'patGmUQ2LIidJx0GX.fa868773f40510c7cb05c0fb52dfa50ac382fe487cda9b03a8f95d977970c1b8';
const BASE_ID = 'appNc7dQkFIq0dFFM';
const LEADS_TABLE    = 'tblS1keAU26CH08KJ';
const OLD_LEADS_TABLE = 'tblgyzR61vgQnhOls';

const DRY_RUN = process.argv.includes('--dry-run');

// Fields that exist in Old Leads (safe to write)
const ALLOWED_FIELDS = new Set([
  'Client Name', 'Phone Number', 'Email', 'Inquiry Subject/Reason',
  'Inquiry Date', 'Adress', 'Lead Source', 'Call Recording Transcript',
  'Caller ID', 'Call Time', 'Call Duration', 'Call - Lead Source',
  'Lead Status', 'Notes', 'Refusal Reason', 'Quote Amount',
  'Service Address', 'Property Type', 'Final Invoice Amount',
  'Property Details', 'Estimated Window Count', 'Stories',
  'Next Follow-up Date', 'Scheduled Cleaning Date',
]);

const HEADERS = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type':  'application/json',
};

async function airtableFetch(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { ...HEADERS, ...(opts.headers || {}) } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable ${res.status}: ${body}`);
  }
  return res.json();
}

// Fetch all records from Leads (handles pagination)
async function fetchAllLeads() {
  const records = [];
  let offset;
  do {
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${LEADS_TABLE}`);
    url.searchParams.set('pageSize', '100');
    if (offset) url.searchParams.set('offset', offset);
    const data = await airtableFetch(url.toString());
    records.push(...data.records);
    offset = data.offset;
    console.log(`  Fetched ${records.length} records so far...`);
    if (offset) await sleep(250); // respect rate limit
  } while (offset);
  return records;
}

// Create records in Old Leads in batches of 10
async function createInOldLeads(records) {
  let created = 0;
  for (let i = 0; i < records.length; i += 10) {
    const batch = records.slice(i, i + 10);
    const payload = {
      records: batch.map(r => ({
        fields: Object.fromEntries(
          Object.entries(r.fields).filter(([k]) => ALLOWED_FIELDS.has(k))
        ),
      })),
    };
    if (DRY_RUN) {
      console.log(`  [DRY RUN] Would create ${batch.length} records in Old Leads`);
    } else {
      await airtableFetch(`https://api.airtable.com/v0/${BASE_ID}/${OLD_LEADS_TABLE}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }
    created += batch.length;
    process.stdout.write(`\r  Created ${created}/${records.length} in Old Leads...`);
    await sleep(250);
  }
  console.log();
}

// Delete records from Leads in batches of 10
async function deleteFromLeads(records) {
  let deleted = 0;
  for (let i = 0; i < records.length; i += 10) {
    const batch = records.slice(i, i + 10);
    const ids = batch.map(r => r.id);
    if (DRY_RUN) {
      console.log(`  [DRY RUN] Would delete ${ids.length} records from Leads`);
    } else {
      const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${LEADS_TABLE}`);
      ids.forEach(id => url.searchParams.append('records[]', id));
      await airtableFetch(url.toString(), { method: 'DELETE' });
    }
    deleted += batch.length;
    process.stdout.write(`\r  Deleted ${deleted}/${records.length} from Leads...`);
    await sleep(250);
  }
  console.log();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN — no changes will be made ===' : '=== MIGRATING LEADS → OLD LEADS ===');
  console.log('\n1. Fetching all leads...');
  const records = await fetchAllLeads();
  console.log(`   Total: ${records.length} leads found\n`);

  if (records.length === 0) {
    console.log('Nothing to migrate. Exiting.');
    return;
  }

  console.log('2. Copying to Old Leads table...');
  await createInOldLeads(records);
  console.log('   Done.\n');

  console.log('3. Deleting from Leads table...');
  await deleteFromLeads(records);
  console.log('   Done.\n');

  console.log(`✅ Migration complete. ${records.length} leads moved to Old Leads.`);
}

main().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
