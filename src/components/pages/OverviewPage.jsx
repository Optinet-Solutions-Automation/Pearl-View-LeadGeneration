import { useLeadsContext } from '../../context/LeadsContext';
import { formatDate } from '../../utils/dateUtils';

export default function OverviewPage() {
  const { leads, openPanel, setCurrentPage } = useLeadsContext();

  const calls = leads.filter(l => l.hasCall).length;
  const forms = leads.filter(l => !l.hasCall).length;
  const lp1   = leads.filter(l => l.lp === 'LP1').length;
  const lp2   = leads.filter(l => l.lp === 'LP2').length;
  const recent = leads.slice(0, 10);

  function goToLead(id) {
    setCurrentPage('leads');
    setTimeout(() => openPanel(id), 100);
  }

  return (
    <div className="page">
      <div style={{ marginBottom: '4px' }}>
        <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--gray-900)' }}>Overview</div>
        <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '2px' }}>Summary of your Pearl View lead activity</div>
      </div>

      <div className="stats">
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-lbl">Total Leads</span>
            <div className="stat-ico" style={{ background: 'var(--blue-50)' }}>
              <svg fill="none" viewBox="0 0 24 24" stroke="var(--primary)" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
          </div>
          <div className="stat-val">{leads.length}</div>
          <div className="stat-sub">All time</div>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-lbl">Form Leads</span>
            <div className="stat-ico" style={{ background: '#ede9fe' }}>
              <svg fill="none" viewBox="0 0 24 24" stroke="var(--purple)" strokeWidth="2">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2"/>
              </svg>
            </div>
          </div>
          <div className="stat-val">{forms}</div>
          <div className="stat-sub">Web form submissions</div>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-lbl">Call Leads</span>
            <div className="stat-ico" style={{ background: '#f0fdf4' }}>
              <svg fill="none" viewBox="0 0 24 24" stroke="var(--green)" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 012 1.18 2 2 0 014 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z" transform="translate(1,1)"/>
              </svg>
            </div>
          </div>
          <div className="stat-val">{calls}</div>
          <div className="stat-sub">Direct calls received</div>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-lbl">Quoted</span>
            <div className="stat-ico" style={{ background: '#fffbeb' }}>
              <svg fill="none" viewBox="0 0 24 24" stroke="#d97706" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
            </div>
          </div>
          <div className="stat-val">{leads.filter(l => l.status === 'quoted').length}</div>
          <div className="stat-sub">Quotes issued</div>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-lbl">Completed</span>
            <div className="stat-ico" style={{ background: '#f0fdf4' }}>
              <svg fill="none" viewBox="0 0 24 24" stroke="var(--green)" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          </div>
          <div className="stat-val">{leads.filter(l => l.status === 'completed').length}</div>
          <div className="stat-sub">Jobs done</div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--gray-200)', padding: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '14px' }}>Lead Sources</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ background: 'var(--blue-50)', border: '1.5px solid var(--blue-200)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--primary)', marginBottom: '6px' }}>LP Site 1 · CrystalPro</div>
            <a href="https://crystalpro.com.au/" target="_blank" rel="noreferrer" style={{ fontSize: '12.5px', color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ width: '13px', height: '13px' }}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
              crystalpro.com.au
            </a>
            <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--gray-600)' }}>Form leads + Call leads via this LP</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--gray-900)', marginTop: '6px' }}>{lp1} total leads</div>
          </div>
          <div style={{ background: '#f5f3ff', border: '1.5px solid #ddd6fe', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--purple)', marginBottom: '6px' }}>LP Site 2 · Pearl View</div>
            <a href="https://pearlview.com.au/" target="_blank" rel="noreferrer" style={{ fontSize: '12.5px', color: 'var(--purple)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ width: '13px', height: '13px' }}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
              pearlview.com.au
            </a>
            <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--gray-600)' }}>Form leads + Call leads via this LP</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--gray-900)', marginTop: '6px' }}>{lp2} total leads</div>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--gray-200)', padding: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '14px' }}>Recent Leads (Last 10)</div>
        {recent.map(l => (
          <div
            key={l.id}
            onClick={() => goToLead(l.id)}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--gray-100)', cursor: 'pointer' }}
          >
            <div style={{
              width: '34px', height: '34px', borderRadius: '8px',
              background: l.hasCall ? '#d1fae5' : 'var(--blue-100)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, fontSize: '13px', fontWeight: 700,
              color: l.hasCall ? '#065f46' : 'var(--primary)',
            }}>
              {l.hasCall ? '📞' : '📋'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-900)' }}>{l.name}</div>
              <div style={{ fontSize: '11.5px', color: 'var(--gray-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {(l.subject || '').substring(0, 60)}
              </div>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--gray-400)', flexShrink: 0 }}>{formatDate(l.date)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
