/**
 * Generic Airtable CRUD utilities for non-leads tables.
 * Used by ExpensesPage, CalendarPage, etc.
 *
 * Required .env vars:
 *   VITE_AIRTABLE_TOKEN       — Personal Access Token
 *   VITE_AIRTABLE_BASE_ID     — Base ID (same base as leads)
 *   VITE_AIRTABLE_EXPENSES_TABLE_ID  — Airtable table ID for Expenses
 *   VITE_AIRTABLE_CALENDAR_TABLE_ID  — Airtable table ID for Calendar Bookings
 */

const IS_LOCAL = import.meta.env.DEV;
const AT_TOKEN = import.meta.env.VITE_AIRTABLE_TOKEN || '';
const AT_BASE  = import.meta.env.VITE_AIRTABLE_BASE_ID || '';

export const AT_TABLES = {
  expenses: import.meta.env.VITE_AIRTABLE_EXPENSES_TABLE_ID || '',
  calendar: import.meta.env.VITE_AIRTABLE_CALENDAR_TABLE_ID || '',
};

/**
 * Create a new record in an Airtable table.
 * Returns the new Airtable record ID, or null on failure.
 */
export async function createRecord(tableId, fields) {
  if (!tableId) return null;
  try {
    if (IS_LOCAL) {
      const res = await fetch(`https://api.airtable.com/v0/${AT_BASE}/${tableId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${AT_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      });
      if (!res.ok) { console.error('Airtable createRecord failed', await res.json()); return null; }
      const data = await res.json();
      return data.id || null;
    } else {
      const res = await fetch('/api/create-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId, fields }),
      });
      if (!res.ok) { console.error('createRecord API failed', await res.json()); return null; }
      const data = await res.json();
      return data.id || null;
    }
  } catch (err) {
    console.error('createRecord error:', err);
    return null;
  }
}

/**
 * Update fields on an existing Airtable record (fire-and-forget).
 */
export function updateRecord(tableId, recordId, fields) {
  if (!tableId || !recordId) return;
  if (IS_LOCAL) {
    fetch(`https://api.airtable.com/v0/${AT_BASE}/${tableId}/${recordId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${AT_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    })
      .then(r => { if (!r.ok) r.json().then(e => console.error('updateRecord failed:', e)); })
      .catch(err => console.error('updateRecord error:', err));
  } else {
    fetch('/api/update-record', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId, recordId, fields }),
    }).catch(err => console.error('updateRecord error:', err));
  }
}

/**
 * Delete a record from an Airtable table (fire-and-forget).
 */
export function deleteRecord(tableId, recordId) {
  if (!tableId || !recordId) return;
  if (IS_LOCAL) {
    fetch(`https://api.airtable.com/v0/${AT_BASE}/${tableId}/${recordId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${AT_TOKEN}` },
    })
      .then(r => { if (!r.ok) r.json().then(e => console.error('deleteRecord failed:', e)); })
      .catch(err => console.error('deleteRecord error:', err));
  } else {
    fetch('/api/delete-record', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId, recordId }),
    }).catch(err => console.error('deleteRecord error:', err));
  }
}
