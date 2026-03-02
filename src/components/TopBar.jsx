import { useState, useRef, useEffect } from 'react';
import { useLeadsContext } from '../context/LeadsContext';
import { PAGE_TITLES } from './Sidebar';
import { isToday, formatCallTime } from '../utils/dateUtils';

const SEEN_KEY = 'pvl_seen_notif_ids';

function getSeenIds() {
  try { return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) || '[]')); }
  catch { return new Set(); }
}
function saveSeenIds(ids) {
  sessionStorage.setItem(SEEN_KEY, JSON.stringify([...ids]));
}

export default function TopBar() {
  const {
    currentPage, searchTerm, setSearchTerm,
    setModalOpen, toggleSidebar, refetch,
    leads, openPanel, setCurrentPage,
  } = useLeadsContext();

  const [showNotifs, setShowNotifs] = useState(false);
  const [seenIds,    setSeenIds]    = useState(getSeenIds);
  const notifsRef = useRef(null);

  const title = PAGE_TITLES[currentPage] || 'Dashboard';

  // Today's unanswered calls
  const todayCalls = leads
    .filter(l => l.hasCall && l.status === 'new' && isToday(l.dateObj))
    .sort((a, b) => b.dateObj - a.dateObj);

  // Only show calls not yet seen in the dropdown
  const unseenCalls = todayCalls.filter(l => !seenIds.has(l.id));
  const badgeCount  = Math.min(unseenCalls.length, 99);

  // Open dropdown → immediately mark all unseen as seen → they disappear on next open
  function handleBellClick() {
    const opening = !showNotifs;
    setShowNotifs(opening);
    if (opening && unseenCalls.length > 0) {
      const next = new Set(seenIds);
      unseenCalls.forEach(l => next.add(l.id));
      setSeenIds(next);
      saveSeenIds(next);
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

  // What to show in the open dropdown:
  // - if there are unseen calls right now → show them (they'll be marked seen on open)
  // - if already seen this session → show empty state
  const dropdownCalls = unseenCalls;

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
          New Lead
        </button>

        {/* Notification bell */}
        <div className="notif-wrap" ref={notifsRef}>
          <button
            className="notif-btn"
            onClick={handleBellClick}
            title={badgeCount > 0
              ? `${badgeCount} new call${badgeCount !== 1 ? 's' : ''} today`
              : 'No new calls today'}
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
                <span className="notif-hdr-title">New Calls Today</span>
                {dropdownCalls.length > 0 && (
                  <span className="notif-hdr-count">{dropdownCalls.length}</span>
                )}
              </div>

              {dropdownCalls.length === 0 ? (
                <div className="notif-empty">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" style={{ width: '28px', height: '28px', color: 'var(--gray-300)', margin: '0 auto 8px', display: 'block' }}>
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
                  </svg>
                  All caught up!
                </div>
              ) : (
                <div className="notif-list">
                  {dropdownCalls.map(l => (
                    <div
                      key={l.id}
                      className="notif-item notif-item-new"
                      onClick={() => handleNotifClick(l.id)}
                    >
                      <div className="notif-item-icon">
                        <svg fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth="2" style={{ width: '14px', height: '14px' }}>
                          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 012 1.18 2 2 0 014 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z" transform="translate(1,1)"/>
                        </svg>
                        <span className="notif-item-dot" />
                      </div>
                      <div className="notif-item-body">
                        <div className="notif-item-name">{l.name}</div>
                        <div className="notif-item-phone">{l.phone || '—'}</div>
                        <div className="notif-item-date">
                          Today · {formatCallTime(l.dateObj)}
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
