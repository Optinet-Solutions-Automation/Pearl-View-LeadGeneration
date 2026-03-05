import { useState, useMemo } from 'react';
import { useLeadsContext } from '../../context/LeadsContext';
import { formatDate } from '../../utils/dateUtils';
import ClientDetailModal from '../ClientDetailModal';

const PAGE_SIZE = 10;

export default function ClientsPage() {
  const { leads, clients, searchTerm } = useLeadsContext();
  const [selectedClient, setSelectedClient] = useState(null);
  const [page, setPage] = useState(1);

  // ── Merge Clients table with Leads ───────────────────────────────────────────
  // Primary source: Clients table records
  // Supplement: leads that don't match any client (by phone) — show them too
  const mergedClients = useMemo(() => {
    const result = [];
    const seenPhones = new Set();
    const seenNames  = new Set();

    // 1. Start with Clients table records (authoritative)
    clients.forEach(c => {
      const normalPhone = (c.phone || '').replace(/\s/g, '').toLowerCase();
      const normalName  = (c.name  || '').toLowerCase().trim();

      // Enrich with latest lead data (status, date, value)
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
        // Prefer latest lead date if available
        date:       latestLead?.date || '',
        dateObj:    latestLead?.dateObj || new Date(0),
        leadCount:  matchingLeads.length,
        latestStatus: latestLead?.status || null,
        latestValue:  latestLead?.value  || 0,
        fromClients: true,
      });

      if (normalPhone) seenPhones.add(normalPhone);
      if (normalName)  seenNames.add(normalName);
    });

    // 2. Add leads not matched to any Clients record (so nothing is hidden)
    leads
      .filter(l => !l.hasCall && l.name !== 'Unknown' && l.name !== 'Unknown Caller')
      .forEach(l => {
        const normalPhone = (l.phone || '').replace(/\s/g, '').toLowerCase();
        const normalName  = (l.name  || '').toLowerCase().trim();
        if (normalPhone && seenPhones.has(normalPhone)) return;
        if (!normalPhone && seenNames.has(normalName))  return;
        // Dedup among supplemental leads themselves
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
          fromClients:  false,
        });
      });

    // Sort by most recent
    return result.sort((a, b) => b.dateObj - a.dateObj);
  }, [clients, leads]);

  // Apply search filter
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return mergedClients;
    const term = searchTerm.trim().toLowerCase();
    return mergedClients.filter(c =>
      c.name.toLowerCase().includes(term) ||
      (c.email  || '').toLowerCase().includes(term) ||
      (c.phone  || '').toLowerCase().includes(term) ||
      (c.city   || '').toLowerCase().includes(term)
    );
  }, [mergedClients, searchTerm]);

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

  return (
    <div className="page">
      <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '2px' }}>Clients</div>
      <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginBottom: '14px' }}>
        {mergedClients.length} client{mergedClients.length !== 1 ? 's' : ''} · sourced from Clients table + leads
      </div>

      {/* Results summary */}
      {searchTerm && (
        <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginBottom: '10px' }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{searchTerm}"
        </div>
      )}

      {/* Client list */}
      <div>
        {paged.length === 0 ? (
          <div style={{ color: 'var(--gray-400)', fontSize: '13px', textAlign: 'center', padding: '40px' }}>
            {searchTerm ? `No clients match "${searchTerm}"` : 'No clients found'}
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
                {/* Status dot */}
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
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {searchTerm ? highlightMatch(c.name, searchTerm) : c.name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '1px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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

      {/* Client detail modal */}
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
