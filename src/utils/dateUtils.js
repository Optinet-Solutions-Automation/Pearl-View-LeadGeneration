export function parseDate(raw) {
  if (!raw) return new Date(0);
  const s = raw.replace(',', '');
  const d = new Date(s);
  return isNaN(d) ? new Date(0) : d;
}

export function formatDate(raw) {
  const d = parseDate(raw);
  if (d.getTime() === 0) return raw || '—';
  return (
    d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
  );
}
