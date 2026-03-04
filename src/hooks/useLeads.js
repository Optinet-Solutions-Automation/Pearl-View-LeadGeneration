import { useState, useCallback, useRef } from 'react';
import { STATUS_MAP, AT_STATUS_MAP, PROG_MAP } from '../utils/constants';
import { parseDate } from '../utils/dateUtils';
import { createRecord, updateRecord, deleteRecord, fetchRecords, AT_TABLES } from '../utils/airtableSync';

const IS_LOCAL = import.meta.env.DEV;
const AT_TOKEN = import.meta.env.VITE_AIRTABLE_TOKEN || '';
const AT_BASE  = import.meta.env.VITE_AIRTABLE_BASE_ID || '';
const AT_TABLE = import.meta.env.VITE_AIRTABLE_TABLE_ID || '';

function normaliseRecord(rec) {
  const f = rec.fields;
  const isCall = !!(f['Caller ID'] || f['Call Time']);
  const rawSrc = isCall ? (f['Call - Lead Source'] || '') : (f['Lead Source'] || '');
  let source;
  if (isCall) {
    source = rawSrc.includes('pearlview') ? 'call2' : 'call1';
  } else {
    source = rawSrc.includes('pearlview') ? 'form2' : 'form1';
  }
  const rawStatus = f['Lead Status'] || 'New';
  const status = STATUS_MAP[rawStatus] || 'new';
  const name = f['Client Name'] || (isCall ? 'Unknown Caller' : 'Unknown');
  const fullSubject = isCall ? (f['Call Recording Transcript'] || '') : (f['Inquiry Subject/Reason'] || '');
  const rawDate = isCall ? f['Call Time'] : f['Inquiry Date'];
  return {
    id: rec.id, name, source,
    lp: source.includes('2') ? 'LP2' : 'LP1',
    phone: f['Phone Number'] || f['Caller ID'] || '',
    email: f['Email'] || '',
    subject: fullSubject,
    date: rawDate || '',
    dateObj: parseDate(rawDate),
    address: f['Adress'] || f['Service Address'] || '',
    jobType: f['Property Type'] || '',
    windows: f['Estimated Window Count'] || 0,
    stories: f['Stories'] || 0,
    value: f['Quote Amount'] || 0,
    invoice: f['Final Invoice Amount'] || 0,
    duration: f['Call Duration'] || '',
    followUp: f['Next Follow-up Date'] || '',
    jobDate: f['Scheduled Cleaning Date'] || '',
    details: f['Property Details'] || '',
    status, progress: PROG_MAP[status] || 10,
    starred: false, notes: f['Notes'] || '', hasCall: isCall, tag: '',
    refuseReason: f['Refuse Reason'] || '',
    paidAmount: parseFloat(f['Amount Paid'] || 0),
    paid: !!(f['Paid'] || parseFloat(f['Amount Paid'] || 0) > 0),
    paymentMethod: f['Payment Method'] || '',
    city: f['City'] || '',
    leadChannel: f['Lead Channel'] || '',
    airtableId: rec.id,
  };
}

// ─── Normalise a raw Airtable Bookings record into the calBooking shape ───────
function normaliseCalBooking(rec) {
  const f = rec.fields;
  return {
    id:            `cal-${rec.id}`,
    airtableId:    rec.id,
    clientName:    f['Client Name']    || '',
    phone:         f['Phone']          || '',
    email:         '',
    city:          f['City']           || '',
    service:       f['Job_Service']    || '',
    paymentMethod: 'Cash',
    date:          f['Date']           ? f['Date'].split('T')[0] : '',
    bookingStatus: f['Booking Status'] || 'Scheduled',
    amount:        f['Amount']         || 0,
    linkedLeadId:  null,
  };
}

// ─── Write a Revenue record when payment is recorded ─────────────────────────
// status: 'Job Done' counts as income in Reports; anything else is In Progress
function writeRevenue(lead, paidAmount, paymentMethod, status) {
  if (!paidAmount || paidAmount <= 0) return Promise.resolve(null);
  return createRecord(AT_TABLES.revenue, {
    'Revenue Name':   `${lead.name} - ${lead.jobType || 'Window Cleaning'}`,
    'Date':           new Date().toISOString().split('T')[0],
    'Client Name':    lead.name,
    'Phone':          lead.phone || '',
    'Job_Service':    lead.jobType || 'Window Cleaning',
    'City':           lead.city || '',
    'Payment_Method': paymentMethod || 'Cash',
    'Amount':         paidAmount,
    'Status':         status || 'In Progress',
  });
}

export function useLeads() {
  const [leads,        setLeads]        = useState([]);
  const [deletedLeads, setDeletedLeads] = useState([]);
  const [calBookings,  setCalBookings]  = useState([]);
  const [isLoading,    setIsLoading]    = useState(true);
  // Track in-flight Airtable writes so silent polls don't overwrite optimistic UI
  const pendingWrites = useRef(0);
  // Epoch increments on every write — lets fetchLeads detect if a write started mid-fetch
  const writeEpoch = useRef(0);

  // ─── Awaitable Airtable PATCH — tracks in-flight count ───────────────────────
  const patchAirtable = useCallback((airtableId, fields) => {
    if (!airtableId) { console.warn('patchAirtable: no airtableId, skipping'); return Promise.resolve(null); }
    const logFields = Object.keys(fields).join(', ');
    writeEpoch.current++;   // signal that a write is starting
    pendingWrites.current++;
    const req = IS_LOCAL
      ? fetch(`https://api.airtable.com/v0/${AT_BASE}/${AT_TABLE}/${airtableId}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${AT_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields }),
        })
      : fetch('/api/update-lead', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ airtableId, fields }),
        });
    return req
      .then(r => {
        if (!r.ok) return r.json().then(e => { console.error('Airtable patch failed:', logFields, e); return null; });
        console.log('Airtable synced:', logFields);
        return r.json();
      })
      .catch(err => { console.error('Airtable sync error:', err); return null; })
      .finally(() => { pendingWrites.current--; });
  }, []);

  const fetchLeads = useCallback(async ({ silent = false } = {}) => {
    // Don't overwrite optimistic UI while writes are in-flight
    if (silent && pendingWrites.current > 0) {
      console.log('Skipping silent poll — writes in-flight');
      return;
    }
    // Capture epoch before fetching — if a write starts mid-fetch, we'll skip setLeads
    const epochAtStart = writeEpoch.current;
    if (!silent) setIsLoading(true);
    try {
      // ── Fetch leads ──────────────────────────────────────────────────────────
      let allRecords = [];
      if (IS_LOCAL) {
        let offset = '';
        do {
          const url = `https://api.airtable.com/v0/${AT_BASE}/${AT_TABLE}?pageSize=100${offset ? '&offset=' + encodeURIComponent(offset) : ''}`;
          const res = await fetch(url, { headers: { Authorization: `Bearer ${AT_TOKEN}` } });
          if (!res.ok) throw new Error(`Airtable error: ${res.status}`);
          const data = await res.json();
          allRecords.push(...(data.records || []));
          offset = data.offset || '';
        } while (offset);
      } else {
        const res = await fetch('/api/leads');
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || `API error: ${res.status}`);
        allRecords = data.records;
      }
      // ── Fetch revenue to derive paid status (Leads table has no payment fields) ──
      const revenueRecs = await fetchRecords(AT_TABLES.revenue);
      // Build phone → payment lookup (highest amount wins per phone)
      const paymentByPhone = {};
      revenueRecs.forEach(r => {
        const phone = (r.fields?.['Phone'] || '').replace(/\s/g, '').toLowerCase();
        const amount = parseFloat(r.fields?.['Amount'] || 0);
        if (phone && amount > 0) {
          const existing = paymentByPhone[phone];
          if (!existing || amount > existing.paidAmount) {
            paymentByPhone[phone] = {
              paid: true,
              paidAmount: amount,
              paymentMethod: r.fields?.['Payment_Method'] || '',
            };
          }
        }
      });

      const all = allRecords.map(r => {
        const lead = normaliseRecord(r);
        const phoneKey = (lead.phone || '').replace(/\s/g, '').toLowerCase();
        const payment = phoneKey ? (paymentByPhone[phoneKey] || {}) : {};
        return { ...lead, ...payment };
      });
      const active  = all.filter(r => r.status !== 'archived').sort((a, b) => b.dateObj - a.dateObj);
      const archived = all.filter(r => r.status === 'archived').sort((a, b) => b.dateObj - a.dateObj)
        .map(r => ({ ...r, deletedAt: r.dateObj }));
      // Skip if a write started while we were fetching — our data is now stale
      if (silent && epochAtStart !== writeEpoch.current) {
        console.log('Skipping setLeads — write happened mid-fetch');
        return;
      }
      setLeads(active);
      setDeletedLeads(archived);

      // ── Fetch cal bookings (in parallel, non-blocking) ───────────────────────
      fetchRecords(AT_TABLES.calendar).then(recs => {
        setCalBookings(recs.map(r => normaliseCalBooking(r)));
      });
    } catch (err) {
      console.error('Failed to load from Airtable:', err);
      throw err;
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [patchAirtable]);

  // ─── Awaits the PATCH so refreshing after a status change shows the new value ─
  const changeStatus = useCallback(async (id, status) => {
    let prevLead = null;
    let updatedLead = null;
    setLeads(prev => prev.map(l => {
      if (l.id !== id) return l;
      prevLead = l;
      const updated = { ...l, status, progress: PROG_MAP[status] || 10 };
      if (status === 'completed' && !l.invoice && l.value > 0) updated.invoice = l.value;
      updatedLead = updated;
      return updated;
    }));
    if (!updatedLead?.airtableId) return 'Status updated';
    const atFields = { 'Lead Status': AT_STATUS_MAP[status] || status };
    if (status === 'completed' && updatedLead.invoice > 0) atFields['Final Invoice Amount'] = updatedLead.invoice;
    const result = await patchAirtable(updatedLead.airtableId, atFields);
    if (!result) {
      // PATCH failed — revert optimistic update
      setLeads(prev => prev.map(l => l.id === id ? prevLead : l));
      return 'error';
    }
    // Re-confirm status in case a background fetch ran mid-PATCH and overwrote it
    setLeads(prev => prev.map(l => l.id !== id ? l : { ...l, status, progress: PROG_MAP[status] || 10 }));
    // Scenario 3 → Scenario 1: lead already had payment but wasn't job_done yet — now it is
    // Update the Revenue record Status to 'Job Done' so it counts as income in Reports
    if (status === 'job_done' && updatedLead?.paid && updatedLead?.paidAmount > 0) {
      fetchRecords(AT_TABLES.revenue).then(revRecs => {
        const phone = (updatedLead.phone || '').replace(/\s/g, '').toLowerCase();
        const match = revRecs.find(r => {
          const rPhone = (r.fields?.['Phone'] || '').replace(/\s/g, '').toLowerCase();
          return rPhone === phone && parseFloat(r.fields?.['Amount'] || 0) > 0;
        });
        if (match) updateRecord(AT_TABLES.revenue, match.id, { 'Status': 'Job Done' });
      });
    }
    return 'ok';
  }, [patchAirtable]);

  const toggleStar = useCallback((id) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, starred: !l.starred } : l));
  }, []);

  const saveNote = useCallback((id, note) => {
    setLeads(prev => prev.map(l => {
      if (l.id !== id) return l;
      if (l.airtableId) patchAirtable(l.airtableId, { 'Notes': note });
      return { ...l, notes: note };
    }));
  }, [patchAirtable]);

  const renameLead = useCallback((id, newName) => {
    setLeads(prev => prev.map(l => {
      if (l.id !== id) return l;
      if (l.airtableId) patchAirtable(l.airtableId, { 'Client Name': newName });
      return { ...l, name: newName };
    }));
  }, [patchAirtable]);

  const setRefuseReason = useCallback((id, reason) => {
    // Refuse Reason field doesn't exist in Leads table — in-memory only
    setLeads(prev => prev.map(l => l.id === id ? { ...l, refuseReason: reason } : l));
  }, []);

  // ─── Save payment info ─────────────────────────────────────────────────────────
  // Revenue logic:
  //   S1 job_done + paid now  → Revenue Status='Job Done'  (counts as income)
  //   S3 paid + not job_done  → Revenue Status='In Progress' (persists payment, not income yet)
  //      When job later marked done → changeStatus updates Revenue Status to 'Job Done'
  // Returns { success, wasJobDone } so context can auto-advance status for S3.
  const savePaidInfo = useCallback(async (id, paid, paidAmount, paymentMethod) => {
    let leadSnapshot = null;
    setLeads(prev => prev.map(l => {
      if (l.id !== id) return l;
      leadSnapshot = l;
      return { ...l, paid, paidAmount, paymentMethod };
    }));
    const updatedLead = leadSnapshot ? { ...leadSnapshot, paid, paidAmount, paymentMethod } : null;
    const wasJobDone = leadSnapshot?.status === 'job_done';
    // Write Revenue with appropriate status — 'Job Done' only when job is already done
    if (paid && paidAmount > 0 && !leadSnapshot?.paid) {
      const revStatus = wasJobDone ? 'Job Done' : 'In Progress';
      await writeRevenue(updatedLead, paidAmount, paymentMethod, revStatus);
    }
    // Update linked calendar booking if one exists (match by phone)
    if (paid && paidAmount > 0 && updatedLead?.phone) {
      setCalBookings(prev => {
        const linked = prev.find(b => b.linkedLeadId === id || (b.phone && updatedLead.phone && b.phone === updatedLead.phone));
        if (linked?.airtableId) {
          updateRecord(AT_TABLES.calendar, linked.airtableId, {
            'Booking Status': 'Completed',
            'Amount': paidAmount,
          });
          return prev.map(b => b.id === linked.id ? { ...b, bookingStatus: 'Completed', amount: paidAmount } : b);
        }
        return prev;
      });
    }
    return { success: true, wasJobDone };
  }, []);

  const saveCity = useCallback((id, city) => {
    // City field doesn't exist in Leads table — in-memory only
    setLeads(prev => prev.map(l => l.id === id ? { ...l, city } : l));
  }, []);

  const saveJobType = useCallback((id, jobType) => {
    setLeads(prev => prev.map(l => {
      if (l.id !== id) return l;
      if (l.airtableId) patchAirtable(l.airtableId, { 'Property Type': jobType });
      return { ...l, jobType };
    }));
  }, [patchAirtable]);

  const saveJobDate = useCallback((id, jobDate) => {
    setLeads(prev => prev.map(l => {
      if (l.id !== id) return l;
      // Airtable requires null (not '') to clear a date field
      if (l.airtableId) patchAirtable(l.airtableId, { 'Scheduled Cleaning Date': jobDate || null });
      return { ...l, jobDate };
    }));
  }, [patchAirtable]);

  const saveEmail = useCallback((id, email) => {
    setLeads(prev => prev.map(l => {
      if (l.id !== id) return l;
      if (l.airtableId) patchAirtable(l.airtableId, { 'Email': email });
      return { ...l, email };
    }));
  }, [patchAirtable]);

  // Move lead to deleted history (soft delete) + sync to Airtable
  const archiveLead = useCallback((id) => {
    setLeads(prev => {
      const lead = prev.find(l => l.id === id);
      if (lead) {
        if (lead.airtableId) patchAirtable(lead.airtableId, { 'Lead Status': 'Archived' });
        setDeletedLeads(d => [{ ...lead, deletedAt: new Date() }, ...d]);
      }
      return prev.filter(l => l.id !== id);
    });
  }, [patchAirtable]);

  // Permanently remove from deleted history + delete from Airtable
  const permanentDelete = useCallback((id) => {
    setDeletedLeads(prev => {
      const lead = prev.find(l => l.id === id);
      if (lead?.airtableId) deleteRecord(AT_TABLE, lead.airtableId);
      return prev.filter(l => l.id !== id);
    });
  }, []);

  // Move back from deleted history to active leads + restore Airtable status
  const recoverLead = useCallback((id) => {
    setDeletedLeads(prev => {
      const lead = prev.find(l => l.id === id);
      if (lead) {
        if (lead.airtableId) patchAirtable(lead.airtableId, { 'Lead Status': 'New Lead' });
        const { deletedAt: _d, ...restored } = lead;
        const recoveredLead = { ...restored, status: 'new', progress: 10 };
        setLeads(ls => [recoveredLead, ...ls].sort((a, b) => b.dateObj - a.dateObj));
      }
      return prev.filter(l => l.id !== id);
    });
  }, [patchAirtable]);

  const addLead = useCallback(async (leadData) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      + ' ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const tempId = String(Date.now());
    setLeads(prev => [{
      id: tempId, ...leadData,
      lp: leadData.source === 'form2' || leadData.source === 'call2' ? 'LP2' : 'LP1',
      status: 'new', date: dateStr, dateObj: now,
      address: '', jobType: 'Residential', windows: 0,
      starred: false, notes: '', hasCall: leadData.source?.startsWith('call') || false,
      progress: 10, refuseReason: '', airtableId: null,
    }, ...prev]);
    // Create record in Airtable — use dedicated endpoint (mirrors patchAirtable pattern)
    const fields = {
      'Client Name':             leadData.name,
      'Phone Number':            leadData.phone   || '',
      'Email':                   leadData.email   || '',
      'Inquiry Subject/Reason':  leadData.subject || '',
      'Lead Status':             'New Lead',
      'Quote Amount':            leadData.value   || 0,
      'Inquiry Date':            now.toISOString(),
    };
    const req = IS_LOCAL
      ? fetch(`https://api.airtable.com/v0/${AT_BASE}/${AT_TABLE}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${AT_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields }),
        })
      : fetch('/api/create-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields }),
        });
    try {
      const r = await req;
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        console.error('addLead: Airtable rejected the record:', err);
        return null;
      }
      const data = await r.json();
      if (data.id) {
        setLeads(prev => prev.map(l => l.id === tempId ? { ...l, airtableId: data.id } : l));
        return data.id;
      }
      return null;
    } catch (err) {
      console.error('addLead: failed to create in Airtable', err);
      return null;
    }
  }, []);

  // ─── Calendar booking operations ─────────────────────────────────────────────

  const addCalBooking = useCallback(async (data) => {
    const localId = `cal-${Date.now()}`;
    const record = {
      id: localId, airtableId: null,
      clientName: data.clientName || '', phone: data.phone || '',
      email: data.email || '', city: data.city || '',
      service: data.service || '', paymentMethod: data.paymentMethod || 'Cash',
      date: data.date || '', bookingStatus: 'Scheduled', amount: data.amount || 0,
      linkedLeadId: data.linkedLeadId || null,
    };
    setCalBookings(prev => [record, ...prev]);
    // Write to Airtable Bookings table
    const airtableId = await createRecord(AT_TABLES.calendar, {
      'Booking Name':   `${record.clientName} - ${record.date}`,
      'Client Name':    record.clientName,
      'Date':           record.date,
      'Job_Service':    record.service,
      'City':           record.city,
      'Phone':          record.phone,
      'Booking Status': 'Scheduled',
      'Amount':         record.amount || 0,
    });
    if (airtableId) {
      setCalBookings(prev => prev.map(b => b.id === localId ? { ...b, airtableId } : b));
    }
    return localId;
  }, []);

  const removeCalBooking = useCallback((id) => {
    setCalBookings(prev => {
      const booking = prev.find(b => b.id === id);
      if (booking?.airtableId) deleteRecord(AT_TABLES.calendar, booking.airtableId);
      return prev.filter(b => b.id !== id);
    });
  }, []);

  const updateCalBooking = useCallback((id, data) => {
    setCalBookings(prev => {
      const booking = prev.find(b => b.id === id);
      if (booking?.airtableId) {
        const patch = {};
        if (data.clientName !== undefined) patch['Client Name']    = data.clientName;
        if (data.phone      !== undefined) patch['Phone']          = data.phone;
        if (data.city       !== undefined) patch['City']           = data.city;
        if (data.service    !== undefined) patch['Job_Service']    = data.service;
        if (data.bookingStatus !== undefined) patch['Booking Status'] = data.bookingStatus;
        if (data.amount     !== undefined) patch['Amount']         = data.amount;
        if (Object.keys(patch).length) updateRecord(AT_TABLES.calendar, booking.airtableId, patch);
      }
      return prev.map(b => b.id === id ? { ...b, ...data } : b);
    });
  }, []);

  // Record payment for a calendar booking:
  // - Updates the booking status + amount
  // - Creates a Revenue record
  // - Updates the linked lead's paid status (match by phone)
  const recordBookingPayment = useCallback((bookingId, paidAmount, paymentMethod) => {
    setCalBookings(prev => {
      const booking = prev.find(b => b.id === bookingId);
      if (!booking) return prev;

      // Update booking in Airtable
      if (booking.airtableId) {
        updateRecord(AT_TABLES.calendar, booking.airtableId, {
          'Booking Status': 'Completed',
          'Amount': paidAmount,
        });
      }

      // Write Revenue record — calendar booking payments are always completed jobs
      createRecord(AT_TABLES.revenue, {
        'Revenue Name':   `${booking.clientName} - ${booking.service || 'Window Cleaning'}`,
        'Date':           new Date().toISOString().split('T')[0],
        'Client Name':    booking.clientName,
        'Phone':          booking.phone || '',
        'Job_Service':    booking.service || 'Window Cleaning',
        'City':           booking.city || '',
        'Payment_Method': paymentMethod || 'Cash',
        'Amount':         paidAmount,
        'Status':         'Job Done',
      });

      // Update linked lead's paid state in memory (by phone match)
      // Note: Leads table has no payment fields — Revenue table is the persistence layer
      if (booking.phone) {
        setLeads(leads => leads.map(l => {
          if (l.phone === booking.phone && !l.paid) {
            return { ...l, paid: true, paidAmount, paymentMethod };
          }
          return l;
        }));
      }

      return prev.map(b => b.id === bookingId
        ? { ...b, bookingStatus: 'Completed', amount: paidAmount, paymentMethod }
        : b
      );
    });
  }, [patchAirtable]);

  return {
    leads, deletedLeads, calBookings, isLoading, fetchLeads,
    changeStatus, toggleStar, saveNote, saveJobType,
    savePaidInfo, saveCity, saveJobDate, saveEmail,
    renameLead, setRefuseReason,
    archiveLead, permanentDelete, recoverLead, addLead,
    addCalBooking, removeCalBooking, updateCalBooking, recordBookingPayment,
  };
}
