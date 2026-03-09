export function parseDate(raw) {
  if (!raw) return new Date(0);
  const s = raw.replace(',', '');
  const d = new Date(s);
  return isNaN(d) ? new Date(0) : d;
}

export function formatDate(raw) {
  const d = parseDate(raw);
  if (d.getTime() === 0) return raw || '—';
  const datePart = d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  const timePart = d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(/\s*(am|pm)$/i, m => ' ' + m.trim().toUpperCase());
  return `${datePart} · ${timePart}`;
}

const SOURCE_LABELS = {
  'website-pearlview':  'Pearl View',
  'website-crystalpro': 'Crystal Pro',
  'Phone Call':         'Phone Call',
  'Facebook':           'Facebook',
  'Google':             'Google',
  'Other':              'Other',
};

export function formatLeadSource(raw) {
  if (!raw) return null;
  return SOURCE_LABELS[raw] || raw;
}

export function isToday(dateObj) {
  if (!dateObj || dateObj.getTime() === 0) return false;
  const t = new Date();
  return (
    dateObj.getDate()     === t.getDate()  &&
    dateObj.getMonth()    === t.getMonth() &&
    dateObj.getFullYear() === t.getFullYear()
  );
}

export function formatCallTime(dateObj) {
  if (!dateObj || dateObj.getTime() === 0) return '—';
  return dateObj.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
}
