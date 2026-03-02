export const COLS = [
  { id: 'new',       label: 'New Lead',        dot: '#2563eb', cnt: '#dbeafe/#1d4ed8' },
  { id: 'contacted', label: 'Contacted',        dot: '#d97706', cnt: '#fef3c7/#92400e' },
  { id: 'quoted',    label: 'In Progress',      dot: '#7c3aed', cnt: '#ede9fe/#5b21b6' },
  { id: 'scheduled', label: 'Invoice Pending',  dot: '#0d9488', cnt: '#ccfbf1/#065f46' },
  { id: 'completed', label: 'Job Payment',      dot: '#16a34a', cnt: '#dcfce7/#14532d' },
  { id: 'refused',   label: 'Refused',          dot: '#dc2626', cnt: '#fee2e2/#991b1b' },
];

export const STATUS_MAP = {
  New:       'new',
  Contacted: 'contacted',
  Quoted:    'quoted',
  Scheduled: 'scheduled',
  Completed: 'completed',
  Refused:   'refused',
  Lost:      'refused',
};

export const AT_STATUS_MAP = {
  new:       'New',
  contacted: 'Contacted',
  quoted:    'Quoted',
  scheduled: 'Scheduled',
  completed: 'Completed',
  refused:   'Refused',
};

export const PROG_MAP = {
  new:       10,
  contacted: 30,
  quoted:    55,
  scheduled: 75,
  completed: 100,
  refused:   100,
};

export const REFUSE_LABELS = {
  too_expensive: 'Too Expensive',
  competition:   'Competition',
  no_answer:     'No Answer',
  other:         'Other',
};
