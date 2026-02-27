import { useLeadsContext } from '../context/LeadsContext';

export default function StatsRow() {
  const { leads } = useLeadsContext();

  const newCount       = leads.filter(l => l.status === 'new').length;
  const callCount      = leads.filter(l => l.hasCall).length;
  const formCount      = leads.filter(l => !l.hasCall).length;
  const quotedCount    = leads.filter(l => l.status === 'quoted').length;
  const scheduledCount = leads.filter(l => l.status === 'scheduled').length;
  const completedLeads = leads.filter(l => l.status === 'completed');
  const totalRevenue   = completedLeads.reduce((sum, l) => sum + (parseFloat(l.invoice) || parseFloat(l.value) || 0), 0);

  return (
    <div className="stats">
      <div className="stat-card">
        <div className="stat-top">
          <span className="stat-lbl">New Leads</span>
          <div className="stat-ico" style={{ background: '#eff6ff' }}>
            <svg fill="none" viewBox="0 0 24 24" stroke="#2563eb" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </div>
        </div>
        <div className="stat-val">{newCount}</div>
        <div className="stat-sub">{leads.length} total leads</div>
      </div>

      <div className="stat-card">
        <div className="stat-top">
          <span className="stat-lbl">Calls Received</span>
          <div className="stat-ico" style={{ background: '#f0fdf4' }}>
            <svg fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 012 1.18 2 2 0 014 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z" transform="translate(1,1)"/>
            </svg>
          </div>
        </div>
        <div className="stat-val">{callCount}</div>
        <div className="stat-sub">{formCount} form submissions</div>
      </div>

      <div className="stat-card">
        <div className="stat-top">
          <span className="stat-lbl">Pending Quotes</span>
          <div className="stat-ico" style={{ background: '#fffbeb' }}>
            <svg fill="none" viewBox="0 0 24 24" stroke="#d97706" strokeWidth="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
            </svg>
          </div>
        </div>
        <div className="stat-val">{quotedCount}</div>
        <div className="stat-sub">Awaiting client response</div>
      </div>

      <div className="stat-card">
        <div className="stat-top">
          <span className="stat-lbl">Scheduled Jobs</span>
          <div className="stat-ico" style={{ background: '#f0fdfa' }}>
            <svg fill="none" viewBox="0 0 24 24" stroke="#0d9488" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
          </div>
        </div>
        <div className="stat-val">{scheduledCount}</div>
        <div className="stat-sub">{scheduledCount === 1 ? '1 job booked' : `${scheduledCount} jobs booked`}</div>
      </div>

      <div className="stat-card">
        <div className="stat-top">
          <span className="stat-lbl">Total Revenue</span>
          <div className="stat-ico" style={{ background: '#f0fdf4' }}>
            <svg fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
          </div>
        </div>
        <div className="stat-val">{totalRevenue > 0 ? '$' + totalRevenue.toFixed(2) : '$0'}</div>
        <div className="stat-sub">{completedLeads.length} job{completedLeads.length !== 1 ? 's' : ''} completed</div>
      </div>
    </div>
  );
}
