import { useState, useRef, useEffect } from 'react';
import { useLeadsContext } from '../context/LeadsContext';
import { PAGE_TITLES } from './Sidebar';
import { isToday, formatCallTime } from '../utils/dateUtils';

function notifDate(dateObj, rawDate) {
  if (!dateObj || dateObj.getTime() === 0) return rawDate || '—';
  if (isToday(dateObj)) return `Today · ${formatCallTime(dateObj)}`;
  return dateObj.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
    + ' · ' + formatCallTime(dateObj);
}

export default function TopBar() {
  const {
    currentPage, searchTerm, setSearchTerm,
    setModalOpen, toggleSidebar, refetch,
    leads, openPanel, setCurrentPage,
  } = useLeadsContext();

  // Pure in-memory: resets every page load so notifications always reappear
  const [showNotifs,       setShowNotifs]       = useState(false);
  const [seenIds,          setSeenIds]          = useState(() => new Set());
  const [dropdownSnapshot, setDropdownSnapshot] = useState([]);
  const notifsRef = useRef(null);

  const title = PAGE_TITLES[currentPage] || 'Dashboard';

  // ALL unactioned leads (any date, calls + forms) still in 'new' status
  const newLeads = leads
    .filter(l => l.status === 'new')
    .sort((a, b) => b.dateObj - a.dateObj);

  // Unseen = not yet viewed this page session
  const unseenLeads = newLeads.filter(l => !seenIds.has(l.id));
  const badgeCount  = Math.min(unseenLeads.length, 99);

  // On open: snapshot the current unseen list (stays visible while reading),
  // then immediately mark all as seen so badge drops to 0.
  function handleBellClick() {
    const opening = !showNotifs;
    setShowNotifs(opening);
    if (opening) {
      setDropdownSnapshot([...unseenLeads]);
      if (unseenLeads.length > 0) {
        const next = new Set(seenIds);
        unseenLeads.forEach(l => next.add(l.id));
        setSeenIds(next);
      }
    }
  }

  // Close when clicking outside
  useEffect(() => {
    if (!showNotifs) return;
    function handler(e) {
      if (notifsRef.current && !notifsRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotifs]);

  function handleNotifClick(leadId) {
    setShowNotifs(false);
    setCurrentPage('leads');
    setTimeout(() => openPanel(leadId), 80);
  }

  const dropdownLeads = dropdownSnapshot;

  return (
    <header className="topbar">
      <button className="burger-btn" onClick={toggleSidebar} title="Menu">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
      <span className="topbar-title">{title}</span>
      <div className="search-wrap">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder="Search leads…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value.toLowerCase().trim())}
        />
      </div>
      <div className="topbar-right">
        <button
          className="notif-btn"
          title="Refresh from Airtable"
          onClick={() => refetch()}
          style={{ background: 'var(--blue-50)', border: '1.5px solid var(--blue-200)' }}
        >
          <svg fill="none" viewBox="0 0 24 24" stroke="var(--primary)" strokeWidth="2" style={{ width: '15px', height: '15px' }}>
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
        </button>
        <button className="btn-new" onClick={() => setModalOpen(true)}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ width: '14px', height: '14px' }}>
            <path d="M12 5v14M5 12h14"/>
          </svg>
          <span className="btn-new-label">New Lead</span>
        </button>

        {/* Notification bell */}
        <div className="notif-wrap" ref={notifsRef}>
          <button
            className="notif-btn"
            onClick={handleBellClick}
            title={badgeCount > 0
              ? `${badgeCount} unactioned lead${badgeCount !== 1 ? 's' : ''}`
              : 'No new leads'}
          >
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            {badgeCount > 0 && (
              <span className="notif-badge">{badgeCount > 9 ? '9+' : badgeCount}</span>
            )}
          </button>

          {showNotifs && (
            <div className="notif-dropdown">
              <div className="notif-hdr">
                <span className="notif-hdr-title">New Leads</span>
                {dropdownLeads.length > 0 && (
                  <span className="notif-hdr-count">{dropdownLeads.length}</span>
                )}
              </div>

              {dropdownLeads.length === 0 ? (
                <div className="notif-empty">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" style={{ width: '28px', height: '28px', color: 'var(--gray-300)', margin: '0 auto 8px', display: 'block' }}>
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
                  </svg>
                  All caught up!
                </div>
              ) : (
                <div className="notif-list">
                  {dropdownLeads.map(l => (
                    <div
                      key={l.id}
                      className="notif-item notif-item-new"
                      onClick={() => handleNotifClick(l.id)}
                    >
                      <div className="notif-item-icon">
                        {l.hasCall ? (
                          /* Phone icon for call leads */
                          <svg fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth="2" style={{ width: '14px', height: '14px' }}>
                            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 012 1.18 2 2 0 014 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z" transform="translate(1,1)"/>
                          </svg>
                        ) : (
                          /* Form icon for web form leads */
                          <svg fill="none" viewBox="0 0 24 24" stroke="#2563eb" strokeWidth="2" style={{ width: '14px', height: '14px' }}>
                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                          </svg>
                        )}
                        <span className="notif-item-dot" style={{ background: l.hasCall ? '#16a34a' : '#2563eb' }} />
                      </div>
                      <div className="notif-item-body">
                        <div className="notif-item-name">
                          {l.name}
                          <span style={{
                            marginLeft: '6px', fontSize: '9px', fontWeight: 700,
                            padding: '1px 5px', borderRadius: '20px', textTransform: 'uppercase',
                            background: l.hasCall ? '#dcfce7' : '#dbeafe',
                            color: l.hasCall ? '#15803d' : '#1d4ed8',
                          }}>
                            {l.hasCall ? 'Call' : 'Form'}
                          </span>
                        </div>
                        <div className="notif-item-phone">{l.phone || l.email || '—'}</div>
                        <div className="notif-item-date">
                          {notifDate(l.dateObj, l.date)}
                        </div>
                      </div>
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ width: '13px', height: '13px', color: 'var(--gray-300)', flexShrink: 0 }}>
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="user-chip">
          <div className="avatar">AC</div>
          <span className="user-name">Asaf C.</span>
        </div>
      </div>
    </header>
  );
}
