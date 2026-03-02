import { useState, useCallback } from 'react';
import { STATUS_MAP, AT_STATUS_MAP, PROG_MAP } from '../utils/constants';
import { parseDate } from '../utils/dateUtils';

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
  const fullSubject = isCall
    ? (f['Call Recording Transcript'] || '')
    : (f['Inquiry Subject/Reason'] || '');
  const rawDate = isCall ? f['Call Time'] : f['Inquiry Date'];

  return {
    id:         rec.id,
    name,
    source,
    lp:         source.includes('2') ? 'LP2' : 'LP1',
    phone:      f['Phone Number'] || f['Caller ID'] || '',
    email:      f['Email'] || '',
    subject:    fullSubject,
    date:       rawDate || '',
    dateObj:    parseDate(rawDate),
    address:    f['Adress'] || f['Service Address'] || '',
    jobType:    f['Property Type'] || '',
    windows:    f['Estimated Window Count'] || 0,
    stories:    f['Stories'] || 0,
    value:      f['Quote Amount'] || 0,
    invoice:    f['Final Invoice Amount'] || 0,
    duration:   f['Call Duration'] || '',
    followUp:   f['Next Follow-up Date'] || '',
    jobDate:    f['Scheduled Cleaning Date'] || '',
    details:    f['Property Details'] || '',
    status,
    progress:   PROG_MAP[status] || 10,
    starred:    false,
    notes:      '',
    hasCall:    isCall,
    tag:        '',
    airtableId: rec.id,
  };
}

export function useLeads() {
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
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

      const normalised = allRecords
        .map(r => normaliseRecord(r))
        .sort((a, b) => b.dateObj - a.dateObj);

      setLeads(normalised);
    } catch (err) {
      console.error('Failed to load from Airtable:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const changeStatus = useCallback(async (id, status) => {
    setLeads(prev =>
      prev.map(l =>
        l.id === id
          ? { ...l, status, progress: PROG_MAP[status] || 10 }
          : l
      )
    );

    const lead = leads.find(l => l.id === id);
    if (!lead?.airtableId) return;

    const atFields = { 'Lead Status': AT_STATUS_MAP[status] };

    try {
      if (IS_LOCAL) {
        await fetch(`https://api.airtable.com/v0/${AT_BASE}/${AT_TABLE}/${lead.airtableId}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${AT_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: atFields }),
        });
      } else {
        await fetch('/api/update-lead', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ airtableId: lead.airtableId, fields: atFields }),
        });
      }
      return 'Status saved to Airtable ✓';
    } catch {
      return 'Status updated locally (Airtable sync failed)';
    }
  }, [leads]);

  const toggleStar = useCallback((id) => {
    setLeads(prev =>
      prev.map(l => l.id === id ? { ...l, starred: !l.starred } : l)
    );
  }, []);

  const saveNote = useCallback((id, note) => {
    setLeads(prev =>
      prev.map(l => l.id === id ? { ...l, notes: note } : l)
    );
  }, []);

  const archiveLead = useCallback((id) => {
    setLeads(prev => prev.filter(l => l.id !== id));
  }, []);

  const addLead = useCallback((leadData) => {
    const now = new Date();
    const dateStr =
      now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' +
      now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    const newLead = {
      id: String(Date.now()),
      ...leadData,
      lp: leadData.source === 'form2' || leadData.source === 'call2' ? 'LP2' : 'LP1',
      status: 'new',
      date: dateStr,
      dateObj: now,
      address: '',
      jobType: 'Residential',
      windows: 0,
      starred: false,
      notes: '',
      hasCall: leadData.source.startsWith('call'),
      progress: 10,
      airtableId: null,
    };

    setLeads(prev => [newLead, ...prev]);
  }, []);

  return { leads, isLoading, fetchLeads, changeStatus, toggleStar, saveNote, archiveLead, addLead };
}
