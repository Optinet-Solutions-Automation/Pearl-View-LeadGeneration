import { useState } from 'react';
import { useLeadsContext } from '../../context/LeadsContext';

const DAYS     = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS   = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SERVICES = ['Window Cleaning', 'Pressure Washing', 'Solar Panel', 'Other'];
const ROWS_PER_PAGE = 50;

function mkDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ── Payment modal for calendar bookings ──────────────────────────────────────
function CalPaymentModal({ booking, onClose, onConfirm }) {
  const [method, setMethod] = useState('Cash');
  const [amount, setAmount] = useState('');
  const [err,    setErr]    = useState('');

  function handleSubmit() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setErr('Please enter a valid amount'); return; }
    setErr('');
    onConfirm(amt, method);
    onClose();
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2100, padding: '16px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '360px', boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px', borderBottom: '1px solid var(--gray-100)' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gray-900)' }}>Confirm Payment</div>
            <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '2px' }}>{booking.clientName}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--gray-400)', padding: '4px' }}>✕</button>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <label style={fLbl}>Payment Method</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            {['Cash', 'Bank'].map(m => (
              <button key={m} onClick={() => setMethod(m)} style={{
                flex: 1, padding: '9px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                border: `1.5px solid ${method === m ? (m === 'Cash' ? '#16a34a' : '#2563eb') : 'var(--gray-200)'}`,
                background: method === m ? (m === 'Cash' ? '#f0fdf4' : '#eff6ff') : '#fff',
                color: method === m ? (m === 'Cash' ? '#16a34a' : '#2563eb') : 'var(--gray-500)',
              }}>
                {m.toUpperCase()}
              </button>
            ))}
          </div>
          <label style={fLbl}>Amount</label>
          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)', fontWeight: 700, fontSize: '14px' }}>$</span>
            <input
              type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0.00" autoFocus
              style={{ width: '100%', padding: '9px 12px 9px 26px', fontSize: '16px', fontWeight: 700, border: '1.5px solid var(--gray-200)', borderRadius: '8px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          {err && <div style={{ fontSize: '12px', color: '#dc2626', marginBottom: '10px', padding: '8px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px' }}>{err}</div>}
          <button onClick={handleSubmit} style={{ width: '100%', padding: '10px', background: '#0d9488', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Confirm Payment
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Shared appointment form fields ───────────────────────────────────────────
function AppointmentFormFields({ form, setField }) {
  return (
    <>
      <label style={fLbl}>Service</label>
      <select value={form.service} onChange={e => setField('service', e.target.value)} style={{ ...fInput, appearance: 'none' }}>
        {SERVICES.map(s => <option key={s}>{s}</option>)}
      </select>
      <label style={fLbl}>Client Name <span style={{ color: '#dc2626' }}>*</span></label>
      <input value={form.clientName} onChange={e => setField('clientName', e.target.value)} placeholder="Full name…" style={fInput} />
      <label style={fLbl}>Phone</label>
      <input value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="e.g. 0400 000 000" style={fInput} />
      <label style={fLbl}>City / Location</label>
      <input value={form.city} onChange={e => setField('city', e.target.value)} placeholder="e.g. Brisbane" style={{ ...fInput, marginBottom: 0 }} />
    </>
  );
}

// ── Edit booking modal ────────────────────────────────────────────────────────
function EditBookingModal({ booking, onSave, onClose }) {
  const [form, setForm] = useState({
    clientName: booking.clientName || '',
    phone:      booking.phone      || '',
    city:       booking.city       || '',
    service:    booking.service    || 'Window Cleaning',
  });
  const [err, setErr] = useState('');
  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); }
  function handleSave() {
    if (!form.clientName.trim()) { setErr('Client name is required'); return; }
    setErr('');
    onSave(form);
  }
  return (
    <div style={modalOverlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '440px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--gray-100)', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gray-900)' }}>Edit Appointment</div>
            <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '2px' }}>{booking.date}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--gray-400)', padding: '4px' }}>✕</button>
        </div>
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          <AppointmentFormFields form={form} setField={setField} />
          {err && <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '10px', padding: '8px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px' }}>{err}</div>}
          <button onClick={handleSave} style={{ width: '100%', padding: '10px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: '14px' }}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Booking modal (click a day on the calendar) ───────────────────────────────
function BookingModal({ year, month, day, leads, saveJobDate, calBookings, addCalBooking, removeCalBooking, onClose, onPayCal }) {
  const [tab,     setTab]     = useState('book');
  const [search,  setSearch]  = useState('');
  const [form,    setForm]    = useState({ clientName: '', phone: '', city: '', service: 'Window Cleaning' });
  const [formErr, setFormErr] = useState('');
  const [payFor,  setPayFor]  = useState(null);

  const targetDate  = mkDate(year, month, day);
  const displayDate = `${MONTHS[month]} ${day}, ${year}`;

  const bookedLeads = leads.filter(l => l.jobDate === targetDate);
  const bookedCal   = (calBookings || []).filter(b => b.date === targetDate);
  const totalBooked = bookedLeads.length + bookedCal.length;

  const unbookedAll = leads.filter(l => l.jobDate !== targetDate);
  const filtered = unbookedAll.filter(l =>
    !search ||
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    (l.phone || '').includes(search)
  );

  function book(id)   { saveJobDate(id, targetDate); }
  function unbook(id) { saveJobDate(id, ''); }
  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function handleSubmitNew() {
    if (!form.clientName.trim()) { setFormErr('Client name is required'); return; }
    setFormErr('');
    addCalBooking({ ...form, date: targetDate });
    setForm({ clientName: '', phone: '', city: '', service: 'Window Cleaning' });
  }

  const tabStyle = (active) => ({
    flex: 1, padding: '10px 0', fontSize: '12.5px', fontWeight: 700,
    background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
    color: active ? 'var(--primary)' : 'var(--gray-500)',
    borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent',
  });

  return (
    <>
      <div style={modalOverlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '440px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 0', flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gray-900)' }}>Book Appointment</div>
              <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '2px' }}>{displayDate}</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--gray-400)', padding: '4px' }}>✕</button>
          </div>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-100)', marginTop: '10px', flexShrink: 0 }}>
            <button style={tabStyle(tab === 'book')} onClick={() => setTab('book')}>Book Lead</button>
            <button style={tabStyle(tab === 'new')}  onClick={() => setTab('new')}>+ New Appointment</button>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {tab === 'book' && (
              <>
                {totalBooked > 0 && (
                  <div style={{ padding: '14px 20px 0' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: '#15803d', marginBottom: '8px' }}>Booked on this day</div>
                    {bookedLeads.map(l => (
                      <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', marginBottom: '6px' }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name}</div>
                          <div style={{ fontSize: '11.5px', color: 'var(--gray-500)', marginTop: '1px' }}>{l.phone || '—'}{l.jobType ? ` · ${l.jobType}` : ''}</div>
                        </div>
                        <button onClick={() => unbook(l.id)} style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, marginLeft: '10px' }}>Remove</button>
                      </div>
                    ))}
                    {bookedCal.map(b => (
                      <div key={b.id} style={{ padding: '10px 12px', background: '#fefce8', border: '1px solid #fde68a', borderRadius: '10px', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-900)' }}>{b.clientName}</div>
                            <div style={{ fontSize: '11.5px', color: 'var(--gray-500)', marginTop: '2px' }}>
                              {b.phone || '—'}{b.service ? ` · ${b.service}` : ''}{b.city ? ` · ${b.city}` : ''}
                            </div>
                            {b.bookingStatus === 'Completed' && (
                              <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#15803d', marginTop: '3px' }}>
                                ✓ Paid ${(b.amount || 0).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => removeCalBooking(b.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: '14px', padding: '2px 4px', lineHeight: 1, flexShrink: 0, marginLeft: '6px' }}
                          >✕</button>
                        </div>
                        {b.bookingStatus !== 'Completed' && (
                          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                            <button
                              onClick={() => setPayFor({ booking: b, method: 'Cash' })}
                              style={{ flex: 1, padding: '5px 0', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: '1.5px solid #16a34a', background: '#f0fdf4', color: '#15803d' }}
                            >$ CASH</button>
                            <button
                              onClick={() => setPayFor({ booking: b, method: 'Bank' })}
                              style={{ flex: 1, padding: '5px 0', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: '1.5px solid #2563eb', background: '#eff6ff', color: '#2563eb' }}
                            >🏦 BANK</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ padding: '14px 20px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--gray-500)', marginBottom: '8px' }}>Book a lead</div>
                  <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name or phone…"
                    style={{ width: '100%', padding: '9px 12px', fontSize: '13px', border: '1.5px solid var(--gray-200)', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', marginBottom: '10px', boxSizing: 'border-box' }}
                  />
                  {filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--gray-400)', fontSize: '13px' }}>
                      {unbookedAll.length === 0 ? 'All leads are already booked on this day' : 'No leads match your search'}
                    </div>
                  ) : filtered.map(l => (
                    <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: '1px solid var(--gray-200)', borderRadius: '10px', marginBottom: '6px' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--gray-500)', marginTop: '1px' }}>
                          {l.phone || '—'}{l.jobType ? ` · ${l.jobType}` : ''}
                          {l.jobDate ? <span style={{ color: '#d97706', marginLeft: '6px' }}>· booked {l.jobDate}</span> : ''}
                        </div>
                      </div>
                      <button onClick={() => book(l.id)} style={{ fontSize: '11px', fontWeight: 700, color: '#fff', background: 'var(--primary)', border: 'none', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, marginLeft: '10px' }}>
                        Book
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
            {tab === 'new' && (
              <div style={{ padding: '16px 20px' }}>
                <AppointmentFormFields form={form} setField={setField} />
                {formErr && <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '10px', padding: '8px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px' }}>{formErr}</div>}
                <button
                  onClick={handleSubmitNew}
                  style={{ width: '100%', padding: '10px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: '14px' }}
                >
                  Add Appointment
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {payFor && (
        <CalPaymentModal
          booking={payFor.booking}
          onClose={() => setPayFor(null)}
          onConfirm={(amt, method) => {
            onPayCal(payFor.booking.id, amt, method);
            setPayFor(null);
          }}
        />
      )}
    </>
  );
}

// ── Main CalendarPage ─────────────────────────────────────────────────────────
export default function CalendarPage() {
  const {
    leads, calBookings,
    saveJobDate, openPanel, setCurrentPage,
    addCalBooking, removeCalBooking, updateCalBooking, recordBookingPayment,
  } = useLeadsContext();

  const today = new Date();
  const [year,        setYear]        = useState(today.getFullYear());
  const [month,       setMonth]       = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const [modalDay,    setModalDay]    = useState(null);
  const [editBooking, setEditBooking] = useState(null);
  const [tableSearch, setTableSearch] = useState('');
  const [tablePage,   setTablePage]   = useState(0);

  const monthLeadBookings = leads
    .filter(l => l.jobDate)
    .map(l => ({ ...l, parsedDate: new Date(l.jobDate), isCalBooking: false }))
    .filter(b => b.parsedDate.getFullYear() === year && b.parsedDate.getMonth() === month);

  const monthCalBookings = calBookings
    .filter(b => { const d = new Date(b.date); return d.getFullYear() === year && d.getMonth() === month; })
    .map(b => ({ ...b, parsedDate: new Date(b.date), name: b.clientName, isCalBooking: true, jobType: b.service }));

  const allMonthBookings = [...monthLeadBookings, ...monthCalBookings];

  const byDay = {};
  allMonthBookings.forEach(b => {
    const d = b.parsedDate.getDate();
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(b);
  });

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth    = new Date(year, month + 1, 0).getDate();
  const bookedDayCount     = Object.keys(byDay).length;
  const availableDayCount  = daysInMonth - bookedDayCount;
  const totalBookingsCount = allMonthBookings.length;

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1);
    setSelectedDay(null);
  }
  function isToday(d) { return d === today.getDate() && month === today.getMonth() && year === today.getFullYear(); }
  function goToLead(id) { setCurrentPage('leads'); setTimeout(() => openPanel(id), 100); }

  const selectedHasBookings = selectedDay && (byDay[selectedDay] || []).length > 0;
  const tableRows = selectedHasBookings
    ? byDay[selectedDay]
    : allMonthBookings.sort((a, b) => a.parsedDate - b.parsedDate);
  const tableTitle = selectedHasBookings
    ? `${MONTHS[month]} ${selectedDay}, ${year}`
    : `All Bookings — ${MONTHS[month]} ${year}`;

  const searchedRows = tableRows.filter(b => {
    if (!tableSearch) return true;
    const q = tableSearch.toLowerCase();
    return (b.name || '').toLowerCase().includes(q) || (b.phone || '').includes(q);
  });
  const totalPages = Math.max(1, Math.ceil(searchedRows.length / ROWS_PER_PAGE));
  const safePage   = Math.min(tablePage, totalPages - 1);
  const pagedRows  = searchedRows.slice(safePage * ROWS_PER_PAGE, (safePage + 1) * ROWS_PER_PAGE);

  return (
    <div className="page">
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--gray-900)' }}>Calendar</div>
        <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '2px' }}>Advance bookings and scheduled jobs</div>
      </div>

      {/* ── Calendar card ── */}
      <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid var(--gray-200)', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--gray-100)' }}>
          <button onClick={prevMonth} className="cal-nav-btn">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ width: '13px', height: '13px' }}><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gray-900)' }}>{MONTHS[month]} {year}</div>
          <button onClick={nextMonth} className="cal-nav-btn">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ width: '13px', height: '13px' }}><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
        <div className="cal-grid-hdr">
          {DAYS.map(d => <div key={d} className="cal-day-hdr">{d}</div>)}
        </div>
        <div className="cal-grid-cells">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`blank-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const bookingsOnDay = byDay[day] || [];
            const hasBooked  = bookingsOnDay.length > 0;
            const count      = bookingsOnDay.length;
            const isSelected = selectedDay === day;
            const todayMark  = isToday(day);

            let circleBg = 'transparent', circleColor = 'var(--gray-700)', circleBorder = 'none', fontWeight = 400;
            if (isSelected) { circleBg = 'var(--primary)'; circleColor = '#fff'; fontWeight = 700; }
            else if (hasBooked && count >= 2) { circleBg = '#7f1d1d'; circleColor = '#fff'; fontWeight = 700; }
            else if (hasBooked) { circleBg = '#4d7c0f'; circleColor = '#fff'; fontWeight = 700; }
            if (todayMark && !isSelected) {
              circleBorder = '2.5px solid var(--primary)';
              if (!hasBooked) { circleColor = 'var(--primary)'; fontWeight = 700; }
            }
            return (
              <div key={day} onClick={() => { if (hasBooked) setSelectedDay(isSelected ? null : day); setModalDay(day); }} className="cal-day-cell">
                <div className="cal-circle" style={{ background: circleBg, border: circleBorder }} title={`${MONTHS[month]} ${day}`}>
                  <span style={{ fontWeight, color: circleColor, lineHeight: 1 }}>{day}</span>
                  {hasBooked && !isSelected && <span className="cal-count-badge">{count}</span>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="cal-legend-wrap">
          <div className="cal-legend-item">
            <span className="cal-legend-circle" style={{ border: '1.5px solid var(--gray-300)', color: 'var(--gray-600)', background: '#fff' }}>{availableDayCount}</span>
            <span>Available</span>
          </div>
          <div className="cal-legend-item">
            <span className="cal-legend-circle" style={{ background: '#4d7c0f', color: '#fff' }}>{bookedDayCount}</span>
            <span>Booked days</span>
          </div>
          <div className="cal-legend-item">
            <span className="cal-legend-circle" style={{ border: '2.5px solid var(--primary)', color: 'var(--primary)', background: '#fff' }}>{totalBookingsCount}</span>
            <span>Total bookings</span>
          </div>
        </div>
      </div>

      {/* ── Bookings table ── */}
      <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid var(--gray-200)' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--gray-100)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gray-900)' }}>{tableTitle}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, background: '#eff6ff', color: 'var(--primary)', borderRadius: '20px', padding: '2px 10px' }}>
                {searchedRows.length} job{searchedRows.length !== 1 ? 's' : ''}
              </span>
              {selectedHasBookings && (
                <button onClick={() => setSelectedDay(null)} style={{ fontSize: '11px', color: 'var(--gray-400)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>Show all ✕</button>
              )}
            </div>
          </div>
          <div style={{ marginTop: '10px', position: 'relative' }}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px', position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={tableSearch} onChange={e => { setTableSearch(e.target.value); setTablePage(0); }}
              placeholder="Search by name or phone…"
              style={{ width: '100%', padding: '8px 12px 8px 30px', fontSize: '13px', border: '1.5px solid var(--gray-200)', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
        </div>
        {pagedRows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray-400)' }}>
            {tableSearch ? (
              <>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-500)' }}>No results for "{tableSearch}"</div>
                <button onClick={() => setTableSearch('')} style={{ marginTop: '8px', fontSize: '12px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Clear search</button>
              </>
            ) : (
              <>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" style={{ width: '36px', height: '36px', margin: '0 auto 10px', display: 'block', color: 'var(--gray-300)' }}>
                  <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-500)' }}>No bookings this month</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>Click any day on the calendar to add a booking</div>
              </>
            )}
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                    <th style={th}>Date</th>
                    <th style={th}>Client</th>
                    <th style={th}>Phone</th>
                    <th style={th}>Service</th>
                    <th style={th}>City</th>
                    <th style={th}>Status</th>
                    <th style={{ ...th, textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map(b => (
                    <tr
                      key={b.id}
                      onClick={() => b.isCalBooking ? setEditBooking(b) : goToLead(b.id)}
                      style={{ borderBottom: '1px solid var(--gray-100)', cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.background = b.isCalBooking ? '#fefce8' : 'var(--gray-50)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                    >
                      <td style={td}>
                        <div style={{ background: b.isCalBooking ? '#fefce8' : '#eff6ff', borderRadius: '8px', padding: '5px 10px', textAlign: 'center', display: 'inline-block', minWidth: '44px' }}>
                          <div style={{ fontSize: '9.5px', fontWeight: 700, color: b.isCalBooking ? '#92400e' : 'var(--primary)', textTransform: 'uppercase' }}>
                            {b.parsedDate.toLocaleDateString('en-AU', { month: 'short' })}
                          </div>
                          <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--gray-900)', lineHeight: 1.1 }}>{b.parsedDate.getDate()}</div>
                        </div>
                      </td>
                      <td style={{ ...td, fontWeight: 600, color: 'var(--gray-900)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {b.name}
                          {b.isCalBooking && <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '8px', background: '#fef3c7', color: '#92400e', flexShrink: 0 }}>MANUAL</span>}
                        </div>
                      </td>
                      <td style={{ ...td, color: 'var(--gray-600)' }}>{b.phone || '—'}</td>
                      <td style={td}>
                        {(b.jobType || b.service)
                          ? <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', background: '#eff6ff', color: 'var(--primary)', whiteSpace: 'nowrap' }}>{b.jobType || b.service}</span>
                          : <span style={{ color: 'var(--gray-400)' }}>—</span>
                        }
                      </td>
                      <td style={{ ...td, color: 'var(--gray-500)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.city || b.address || '—'}
                      </td>
                      <td style={td}>
                        {b.isCalBooking ? (
                          <span style={{
                            fontSize: '10.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
                            background: b.bookingStatus === 'Completed' ? '#f0fdf4' : b.bookingStatus === 'Cancelled' ? '#fef2f2' : '#fefce8',
                            color: b.bookingStatus === 'Completed' ? '#15803d' : b.bookingStatus === 'Cancelled' ? '#dc2626' : '#92400e',
                          }}>
                            {b.bookingStatus || 'Scheduled'}
                          </span>
                        ) : (
                          <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: '#eff6ff', color: 'var(--primary)' }}>Lead</span>
                        )}
                      </td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: b.bookingStatus === 'Completed' ? '#15803d' : 'var(--primary)' }}>
                        {(b.amount > 0 || b.value > 0) ? `$${(b.amount || b.value || 0).toLocaleString()}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--gray-100)' }}>
                <button onClick={() => setTablePage(p => Math.max(0, p - 1))} disabled={safePage === 0} style={{ fontSize: '12px', fontWeight: 600, color: safePage === 0 ? 'var(--gray-300)' : 'var(--primary)', background: 'none', border: `1px solid ${safePage === 0 ? 'var(--gray-200)' : 'var(--primary)'}`, borderRadius: '6px', padding: '5px 12px', cursor: safePage === 0 ? 'default' : 'pointer', fontFamily: 'inherit' }}>← Prev</button>
                <span style={{ fontSize: '12px', color: 'var(--gray-500)', fontWeight: 600 }}>Page {safePage + 1} of {totalPages}</span>
                <button onClick={() => setTablePage(p => Math.min(totalPages - 1, p + 1))} disabled={safePage === totalPages - 1} style={{ fontSize: '12px', fontWeight: 600, color: safePage === totalPages - 1 ? 'var(--gray-300)' : 'var(--primary)', background: 'none', border: `1px solid ${safePage === totalPages - 1 ? 'var(--gray-200)' : 'var(--primary)'}`, borderRadius: '6px', padding: '5px 12px', cursor: safePage === totalPages - 1 ? 'default' : 'pointer', fontFamily: 'inherit' }}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>

      {modalDay !== null && (
        <BookingModal
          year={year} month={month} day={modalDay}
          leads={leads} saveJobDate={saveJobDate}
          calBookings={calBookings}
          addCalBooking={addCalBooking}
          removeCalBooking={removeCalBooking}
          onPayCal={recordBookingPayment}
          onClose={() => setModalDay(null)}
        />
      )}
      {editBooking && (
        <EditBookingModal
          booking={editBooking}
          onSave={data => { updateCalBooking(editBooking.id, data); setEditBooking(null); }}
          onClose={() => setEditBooking(null)}
        />
      )}
    </div>
  );
}

const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '16px' };
const fInput = { width: '100%', padding: '8px 11px', fontSize: '13px', border: '1.5px solid var(--gray-200)', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '10px' };
const fLbl   = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--gray-500)', marginBottom: '5px', display: 'block' };
const th = { padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' };
const td = { padding: '11px 14px', color: 'var(--gray-700)', verticalAlign: 'middle' };
