import { useState, useMemo } from 'react';
import { useLeadsContext } from '../../context/LeadsContext';
import { formatDate } from '../../utils/dateUtils';
import ClientDetailModal from '../ClientDetailModal';

const PAGE_SIZE = 10;

const iLbl   = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--gray-500)', marginBottom: '5px', display: 'block' };
const iInput = { width: '100%', padding: '8px 10px', fontSize: '13px', border: '1.5px solid var(--gray-200)', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', color: 'var(--gray-800)', background: '#fff' };

// ── Add Client modal ──────────────────────────────────────────────────────────
function AddClientModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', city: '', address: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave() {
    if (!form.name.trim()) { setErr('Client name is required'); return; }
    setSaving(true);
    setErr('');
    await onSave({
      name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(),
      city: form.city.trim(), address: form.address.trim(), notes: form.notes.trim(),
    });
    setSaving(false);
    onClose();
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2100, padding: '16px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '420px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--gray-100)' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gray-900)' }}>Add Client</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--gray-400)', padding: '4px', lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: '16px 20px', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={iLbl}>Client Name <span style={{ color: '#dc2626' }}>*</span></label>
              <input value={form.name} onChange={e => setF('name', e.target.value)} style={iInput} placeholder="Full name" autoFocus />
            </div>
            <div>
              <label style={iLbl}>Phone</label>
              <input value={form.phone} onChange={e => setF('phone', e.target.value)} style={iInput} placeholder="0400 000 000" />
            </div>
            <div>
              <label style={iLbl}>Email</label>
              <input value={form.email} onChange={e => setF('email', e.target.value)} style={iInput} placeholder="email@example.com" />
            </div>
            <div>
              <label style={iLbl}>City</label>
              <input value={form.city} onChange={e => setF('city', e.target.value)} style={iInput} placeholder="e.g. Brisbane" />
            </div>
            <div>
              <label style={iLbl}>Property Type</label>
              <input value={form.address} onChange={e => setF('address', e.target.value)} style={iInput} placeholder="e.g. Residential" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={iLbl}>Notes</label>
              <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} style={{ ...iInput, minHeight: '60px', resize: 'vertical' }} placeholder="Internal notes…" />
            </div>
          </div>
          {err && <div style={{ fontSize: '12px', color: '#dc2626', marginBottom: '10px', padding: '8px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px' }}>{err}</div>}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ width: '100%', padding: '10px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
          >
            {saving ? 'Saving…' : 'Add Client'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const { leads, clients, syncClientsFromLeads, upsertClient, showToast } = useLeadsContext();
  const [selectedClient, setSelectedClient] = useState(null);
  const [page, setPage] = useState(1);
  const [lpFilter, setLpFilter] = useState('all');
  const [syncing, setSyncing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [localSearch, setLocalSearch] = useState('');

  // ── Merge Clients table with Leads ───────────────────────────────────────────
  const mergedClients = useMemo(() => {
    const result = [];
    const seenPhones = new Set();
    const seenNames  = new Set();

    clients.forEach(c => {
      const normalPhone = (c.phone || '').replace(/\s/g, '').toLowerCase();
      const normalName  = (c.name  || '').toLowerCase().trim();

      const matchingLeads = leads.filter(l => {
        if (normalPhone) {
          const lp = (l.phone || '').replace(/\s/g, '').toLowerCase();
          if (lp && lp === normalPhone) return true;
        }
        return l.name?.toLowerCase().trim() === normalName;
      }).sort((a, b) => b.dateObj - a.dateObj);

      const latestLead = matchingLeads[0];
      result.push({
        ...c,
        date:        latestLead?.date || '',
        dateObj:     latestLead?.dateObj || new Date(0),
        leadCount:   matchingLeads.length,
        latestStatus: latestLead?.status || null,
        latestValue:  latestLead?.value  || 0,
        lp:          latestLead?.lp || null,
        fromClients: true,
      });

      if (normalPhone) seenPhones.add(normalPhone);
      if (normalName)  seenNames.add(normalName);
    });

    leads
      .filter(l => !l.hasCall && l.name !== 'Unknown' && l.name !== 'Unknown Caller')
      .forEach(l => {
        const normalPhone = (l.phone || '').replace(/\s/g, '').toLowerCase();
        const normalName  = (l.name  || '').toLowerCase().trim();
        if (normalPhone && seenPhones.has(normalPhone)) return;
        if (!normalPhone && seenNames.has(normalName))  return;
        if (normalPhone) { if (seenPhones.has(normalPhone)) return; seenPhones.add(normalPhone); }
        else             { if (seenNames.has(normalName))   return; seenNames.add(normalName);  }

        result.push({
          id:          l.id,
          airtableId:  null,
          name:        l.name,
          phone:       l.phone  || '',
          email:       l.email  || '',
          address:     l.address || '',
          city:        l.city   || '',
          notes:       l.notes  || '',
          jobType:     l.jobType || '',
          date:        l.date,
          dateObj:     l.dateObj,
          leadCount:   1,
          latestStatus: l.status,
          latestValue:  l.value || 0,
          lp:          l.lp || null,
          fromClients:  false,
        });
      });

    return result.sort((a, b) => b.dateObj - a.dateObj);
  }, [clients, leads]);

  // LP counts
  const lp1Count = useMemo(() => mergedClients.filter(c => c.lp === 'LP1').length, [mergedClients]);
  const lp2Count = useMemo(() => mergedClients.filter(c => c.lp === 'LP2').length, [mergedClients]);

  // Apply search + LP filter
  const filtered = useMemo(() => {
    let result = mergedClients;
    if (lpFilter === 'LP1') result = result.filter(c => c.lp === 'LP1');
    else if (lpFilter === 'LP2') result = result.filter(c => c.lp === 'LP2');
    const term = localSearch.trim().toLowerCase();
    if (!term) return result;
    return result.filter(c =>
      c.name.toLowerCase().includes(term) ||
      (c.email  || '').toLowerCase().includes(term) ||
      (c.phone  || '').toLowerCase().includes(term) ||
      (c.city   || '').toLowerCase().includes(term)
    );
  }, [mergedClients, localSearch, lpFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paged      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const STATUS_DOT = {
    new:         '#2563eb',
    in_progress: '#d97706',
    quote_sent:  '#7c3aed',
    job_done:    '#16a34a',
    refused:     '#dc2626',
  };

  function pageNumbers() {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = new Set([1, totalPages, safePage, safePage - 1, safePage + 1]);
    return [...pages].filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const count = await syncClientsFromLeads();
      if (count === 0) showToast('All clients already synced ✓');
      else showToast(`${count} client${count !== 1 ? 's' : ''} added to Clients table ✓`);
    } catch {
      showToast('Sync failed — check connection');
    }
    setSyncing(false);
  }

  async function handleAddClient(data) {
    await upsertClient({ name: data.name, phone: data.phone, email: data.email, city: data.city, address: data.address, notes: data.notes });
    showToast('Client added ✓');
  }

  const LP_TABS = [
    { key: 'all', label: `All (${mergedClients.length})` },
    { key: 'LP1', label: `LP1 (${lp1Count})` },
    { key: 'LP2', label: `LP2 (${lp2Count})` },
  ];

  return (
    <div className="page">
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px', gap: '8px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '2px' }}>Clients</div>
          <div style={{ fontSize: '13px', color: 'var(--gray-500)' }}>
            {mergedClients.length} client{mergedClients.length !== 1 ? 's' : ''} · sourced from Clients table + leads
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              padding: '7px 13px', fontSize: '12px', fontWeight: 700, borderRadius: '8px',
              border: '1.5px solid var(--gray-200)', background: '#fff', cursor: syncing ? 'not-allowed' : 'pointer',
              color: syncing ? 'var(--gray-400)' : 'var(--gray-600)', fontFamily: 'inherit',
            }}
          >
            {syncing ? 'Syncing…' : '↑ Sync Clients'}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '7px 13px', fontSize: '12px', fontWeight: 700, borderRadius: '8px',
              border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            + Add Client
          </button>
        </div>
      </div>

      {/* LP filter tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
        {LP_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setLpFilter(tab.key); setPage(1); }}
            style={{
              padding: '5px 13px', fontSize: '12px', fontWeight: 700, borderRadius: '20px',
              border: '1.5px solid', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
              borderColor: lpFilter === tab.key ? 'var(--primary)' : 'var(--gray-200)',
              background:  lpFilter === tab.key ? 'var(--primary)' : '#fff',
              color:       lpFilter === tab.key ? '#fff' : 'var(--gray-600)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search input */}
      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'var(--gray-400)', pointerEvents: 'none' }}>
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          type="text"
          value={localSearch}
          onChange={e => { setLocalSearch(e.target.value); setPage(1); }}
          placeholder="Search by name, phone, city…"
          style={{ width: '100%', padding: '8px 12px 8px 32px', fontSize: '13px', border: '1.5px solid var(--gray-200)', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: 'var(--gray-50)' }}
        />
        {localSearch && (
          <button onClick={() => { setLocalSearch(''); setPage(1); }} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: '15px', lineHeight: 1, padding: '2px 4px' }}>✕</button>
        )}
      </div>

      {/* Results summary */}
      {localSearch && (
        <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginBottom: '10px' }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{localSearch}"
        </div>
      )}

      {/* Client list */}
      <div>
        {paged.length === 0 ? (
          <div style={{ color: 'var(--gray-400)', fontSize: '13px', textAlign: 'center', padding: '40px' }}>
            {localSearch ? `No clients match "${localSearch}"` : 'No clients found'}
          </div>
        ) : (
          paged.map(c => (
            <div
              key={c.id}
              onClick={() => setSelectedClient(c)}
              style={{
                background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '10px',
                padding: '14px 16px', marginBottom: '8px', display: 'flex', alignItems: 'center',
                gap: '14px', cursor: 'pointer', transition: 'border-color .15s',
              }}
              onMouseOver={e => e.currentTarget.style.borderColor = 'var(--blue-200)'}
              onMouseOut={e  => e.currentTarget.style.borderColor = 'var(--gray-200)'}
            >
              {/* Avatar */}
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%', background: 'var(--blue-100)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '15px', fontWeight: 700, color: 'var(--primary)', flexShrink: 0, position: 'relative',
              }}>
                {(c.name || '?').charAt(0).toUpperCase()}
                {c.latestStatus && (
                  <span style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: '10px', height: '10px', borderRadius: '50%', border: '2px solid #fff',
                    background: STATUS_DOT[c.latestStatus] || '#9ca3af',
                  }} />
                )}
              </div>

              {/* Main info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {localSearch ? highlightMatch(c.name, localSearch) : c.name}
                  </span>
                  {c.lp && (
                    <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '6px', flexShrink: 0,
                      background: c.lp === 'LP1' ? '#eff6ff' : '#fdf4ff',
                      color:      c.lp === 'LP1' ? 'var(--primary)' : '#7c3aed',
                    }}>{c.lp}</span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--gray-500)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {c.phone && <span>{c.phone}</span>}
                  {c.city  && <span>· {c.city}</span>}
                  {!c.phone && !c.city && c.email && <span>{c.email}</span>}
                </div>
              </div>

              {/* Right side */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', marginBottom: '4px' }}>
                  {c.latestValue > 0 && (
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#0d9488' }}>${c.latestValue.toLocaleString()}</span>
                  )}
                  {c.leadCount > 0 && (
                    <span style={{ fontSize: '10.5px', fontWeight: 700, background: '#eff6ff', color: 'var(--primary)', borderRadius: '20px', padding: '1px 7px' }}>
                      {c.leadCount} lead{c.leadCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--gray-400)' }}>{c.date ? formatDate(c.date) : '—'}</div>
                {!c.fromClients && (
                  <div style={{ fontSize: '10px', color: 'var(--gray-300)', marginTop: '2px' }}>from leads</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="col-modal-footer" style={{ marginTop: '8px' }}>
          <span className="pg-info">
            Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="pg-controls">
            <button className="pg-btn" disabled={safePage === 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
            {pageNumbers().reduce((acc, pg, idx, arr) => {
              if (idx > 0 && pg - arr[idx - 1] > 1)
                acc.push(<span key={`gap-${pg}`} className="pg-gap">…</span>);
              acc.push(
                <button key={pg} className={`pg-btn pg-num${safePage === pg ? ' pg-active' : ''}`} onClick={() => setPage(pg)}>
                  {pg}
                </button>
              );
              return acc;
            }, [])}
            <button className="pg-btn" disabled={safePage === totalPages} onClick={() => setPage(p => p + 1)}>Next ›</button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddClientModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddClient}
        />
      )}
      {selectedClient && (
        <ClientDetailModal
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
        />
      )}
    </div>
  );
}

function highlightMatch(text, term) {
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: '#fef08a', borderRadius: '2px', padding: '0 1px' }}>
        {text.slice(idx, idx + term.length)}
      </mark>
      {text.slice(idx + term.length)}
    </>
  );
}
