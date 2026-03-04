import { useState, useCallback } from 'react';
import { STATUS_MAP, AT_STATUS_MAP, PROG_MAP } from '../utils/constants';
import { parseDate } from '../utils/dateUtils';

const IS_LOCAL = import.meta.env.DEV;
const AT_TOKEN = import.meta.env.VITE_AIRTABLE_TOKEN || '';
const AT_BASE  = import.meta.env.VITE_AIRTABLE_BASE_ID || '';
const AT_TABLE = import.meta.env.VITE_AIRTABLE_TABLE_ID || '';

function patchAirtable(airtableId, fields) {
  if (!airtableId) { console.warn('patchAirtable: no airtableId, skipping'); return; }
  const logFields = Object.keys(fields).join(', ');
  if (IS_LOCAL) {
    fetch(`https://api.airtable.com/v0/${AT_BASE}/${AT_TABLE}/${airtableId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${AT_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    })
      .then(r => {
        if (!r.ok) r.json().then(e => console.error('Airtable patch failed:', logFields, e));
        else console.log('Airtable synced:', logFields);
      })
      .catch(err => console.error('Airtable sync error:', err));
  } else {
    fetch('/api/update-lead', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ airtableId, fields }),
    })
      .then(r => {
        if (!r.ok) r.json().then(e => console.error('Airtable patch failed:', logFields, e));
        else console.log('Airtable synced:', logFields);
      })
      .catch(err => console.error('Airtable sync error:', err));
  }
}

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

export function useLeads() {
  const [leads,        setLeads]        = useState([]);
  const [deletedLeads, setDeletedLeads] = useState([]);
  const [isLoading,    setIsLoading]    = useState(true);

  const fetchLeads = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setIsLoading(true);
    try {
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
    } catch (err) {
      console.error('Failed to load from Airtable:', err);
      throw err;
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

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
    patchAirtable(updatedLead.airtableId, atFields);
    return 'Saved to Airtable';
  }, []);

  const toggleStar = useCallback((id) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, starred: !l.starred } : l));
  }, []);

  const saveNote = useCallback((id, note) => {
    setLeads(prev => prev.map(l => {
      if (l.id !== id) return l;
      if (l.airtableId) patchAirtable(l.airtableId, { 'Notes': note });
      return { ...l, notes: note };
    }));
  }, []);

  const renameLead = useCallback((id, newName) => {
    setLeads(prev => prev.map(l => {
      if (l.id !== id) return l;
      if (l.airtableId) patchAirtable(l.airtableId, { 'Client Name': newName });
      return { ...l, name: newName };
    }));
  }, []);

  const setRefuseReason = useCallback((id, reason) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, refuseReason: reason } : l));
  }, []);

  const savePaidInfo = useCallback((id, paid, paidAmount, paymentMethod) => {
    setLeads(prev => prev.map(l => {
      if (l.id !== id) return l;
      if (l.airtableId) patchAirtable(l.airtableId, { 'Paid': paid, 'Amount Paid': paidAmount, 'Payment Method': paymentMethod });
      return { ...l, paid, paidAmount, paymentMethod };
    }));
  }, []);

  const saveCity = useCallback((id, city) => {
    setLeads(prev => prev.map(l => {
      if (l.id !== id) return l;
      if (l.airtableId) patchAirtable(l.airtableId, { 'City': city });
      return { ...l, city };
    }));
  }, []);

  const saveJobType = useCallback((id, jobType) => {
    setLeads(prev => prev.map(l => {
      if (l.id !== id) return l;
      if (l.airtableId) patchAirtable(l.airtableId, { 'Property Type': jobType });
      return { ...l, jobType };
    }));
  }, []);

  const saveJobDate = useCallback((id, jobDate) => {
    setLeads(prev => prev.map(l => {
      if (l.id !== id) return l;
      // Airtable requires null (not '') to clear a date field
      if (l.airtableId) patchAirtable(l.airtableId, { 'Scheduled Cleaning Date': jobDate || null });
      return { ...l, jobDate };
    }));
  }, []);

  const saveEmail = useCallback((id, email) => {
    setLeads(prev => prev.map(l => {
      if (l.id !== id) return l;
      if (l.airtableId) patchAirtable(l.airtableId, { 'Email': email });
      return { ...l, email };
    }));
  }, []);

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
  }, []);

  // Permanently remove from deleted history + delete from Airtable
  const permanentDelete = useCallback((id) => {
    setDeletedLeads(prev => {
      const lead = prev.find(l => l.id === id);
      if (lead?.airtableId) patchAirtable(lead.airtableId, { 'Lead Status': 'Archived' });
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
  }, []);

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

  return {
    leads, deletedLeads, isLoading, fetchLeads,
    changeStatus, toggleStar, saveNote, saveJobType,
    savePaidInfo, saveCity, saveJobDate, saveEmail,
    renameLead, setRefuseReason,
    archiveLead, permanentDelete, recoverLead, addLead,
  };
}
