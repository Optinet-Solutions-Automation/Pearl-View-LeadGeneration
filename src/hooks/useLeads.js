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
    refuseReason: '',
    paid: f['Paid'] || false,
    paidAmount: f['Amount Paid'] || 0,
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

// ─── Write a Revenue record when a job is done and paid ───────────────────────
function writeRevenue(lead, paidAmount, paymentMethod) {
  if (!paidAmount || paidAmount <= 0) return;
  createRecord(AT_TABLES.revenue, {
    'Revenue Name':   `${lead.name} - ${lead.jobType || 'Window Cleaning'}`,
    'Date':           new Date().toISOString().split('T')[0],
    'Client Name':    lead.name,
    'Phone':          lead.phone || '',
    'Job_Service':    lead.jobType || 'Window Cleaning',
    'City':           lead.city || '',
    'Payment_Method': paymentMethod || 'Cash',
    'Amount':         paidAmount,
  });
}

export function useLeads() {
  const [leads,        setLeads]        = useState([]);
  const [deletedLeads, setDeletedLeads] = useState([]);
  const [calBookings,  setCalBookings]  = useState([]);
  const [isLoading,    setIsLoading]    = useState(true);
  // Track in-flight Airtable writes so silent polls don't overwrite optimistic UI
  const pendingWrites = useRef(0);

  // ─── Awaitable Airtable PATCH — tracks in-flight count ───────────────────────
  const patchAirtable = useCallback((airtableId, fields) => {
    if (!airtableId) { console.warn('patchAirtable: no airtableId, skipping'); return Promise.resolve(null); }
    const logFields = Object.keys(fields).join(', ');
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
      const all = allRecords.map(r => normaliseRecord(r));
      const active  = all.filter(r => r.status !== 'archived').sort((a, b) => b.dateObj - a.dateObj);
      const archived = all.filter(r => r.status === 'archived').sort((a, b) => b.dateObj - a.dateObj)
        .map(r => ({ ...r, deletedAt: r.dateObj }));
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
    let updatedLead = null;
    setLeads(prev => prev.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, status, progress: PROG_MAP[status] || 10 };
      if (status === 'completed' && !l.invoice && l.value > 0) updated.invoice = l.value;
      updatedLead = updated;
      return updated;
    }));
    if (!updatedLead?.airtableId) return 'Status updated';
    const atFields = { 'Lead Status': AT_STATUS_MAP[status] || status };
    if (status === 'completed' && updatedLead.invoice > 0) atFields['Final Invoice Amount'] = updatedLead.invoice;
    await patchAirtable(updatedLead.airtableId, atFields);
    // Revenue recognized when job marked done and was already paid (converts liability → revenue).
    if (status === 'job_done' && updatedLead.paid && updatedLead.paidAmount > 0) {
      writeRevenue(updatedLead, updatedLead.paidAmount, updatedLead.paymentMethod);
    }
    return 'Saved to Airtable';
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
    setLeads(prev => prev.map(l => l.id === id ? { ...l, refuseReason: reason } : l));
  }, []);

  // ─── Awaits the PATCH so payment info is committed before any refresh ─────────
  const savePaidInfo = useCallback(async (id, paid, paidAmount, paymentMethod) => {
    let leadSnapshot = null;
    setLeads(prev => prev.map(l => {
      if (l.id !== id) return l;
      leadSnapshot = l;
      return { ...l, paid, paidAmount, paymentMethod };
    }));
    if (leadSnapshot?.airtableId) {
      await patchAirtable(leadSnapshot.airtableId, { 'Paid': paid, 'Amount Paid': paidAmount, 'Payment Method': paymentMethod });
    }
    const updatedLead = leadSnapshot ? { ...leadSnapshot, paid, paidAmount, paymentMethod } : null;
    // Revenue recognized only when BOTH job done AND paid.
    // If job is already done and this is a new payment (wasn't paid before), write revenue now.
    if (paid && paidAmount > 0 && !leadSnapshot?.paid && updatedLead?.status === 'job_done') {
      writeRevenue(updatedLead, paidAmount, paymentMethod);
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
  }, [patchAirtable]);

  const saveCity = useCallback((id, city) => {
    setLeads(prev => prev.map(l => {
      if (l.id !== id) return l;
      if (l.airtableId) patchAirtable(l.airtableId, { 'City': city });
      return { ...l, city };
    }));
  }, [patchAirtable]);

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
      if (lead?.airtableId) patchAirtable(lead.airtableId, { 'Lead Status': 'Archived' });
      return prev.filter(l => l.id !== id);
    });
  }, [patchAirtable]);

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

  const addLead = useCallback((leadData) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      + ' ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    setLeads(prev => [{
      id: String(Date.now()), ...leadData,
      lp: leadData.source === 'form2' || leadData.source === 'call2' ? 'LP2' : 'LP1',
      status: 'new', date: dateStr, dateObj: now,
      address: '', jobType: 'Residential', windows: 0,
      starred: false, notes: '', hasCall: leadData.source.startsWith('call'),
      progress: 10, refuseReason: '', airtableId: null,
    }, ...prev]);
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

      // Write Revenue record
      createRecord(AT_TABLES.revenue, {
        'Revenue Name':   `${booking.clientName} - ${booking.service || 'Window Cleaning'}`,
        'Date':           new Date().toISOString().split('T')[0],
        'Client Name':    booking.clientName,
        'Phone':          booking.phone || '',
        'Job_Service':    booking.service || 'Window Cleaning',
        'City':           booking.city || '',
        'Payment_Method': paymentMethod || 'Cash',
        'Amount':         paidAmount,
      });

      // Update linked lead by phone match (fire-and-forget on leads state)
      if (booking.phone) {
        setLeads(leads => leads.map(l => {
          if (l.phone === booking.phone && !l.paid) {
            if (l.airtableId) patchAirtable(l.airtableId, {
              'Paid': true, 'Amount Paid': paidAmount, 'Payment Method': paymentMethod,
            });
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
