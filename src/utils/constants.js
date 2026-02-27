export const COLS = [
  { id: 'new',        label: 'New Lead',        dot: '#2563eb', cnt: '#dbeafe/#1d4ed8' },
  { id: 'contacted',  label: 'Contacted',       dot: '#d97706', cnt: '#fef3c7/#92400e' },
  { id: 'quoted',     label: 'In Progress',     dot: '#7c3aed', cnt: '#ede9fe/#5b21b6' },
  { id: 'scheduled',  label: 'Invoice Pending', dot: '#0d9488', cnt: '#ccfbf1/#065f46' },
  { id: 'completed',  label: 'Payment',         dot: '#16a34a', cnt: '#dcfce7/#14532d' },
  { id: 'jobpayment', label: 'Job Payment',     dot: '#16a34a', cnt: '#dcfce7/#14532d' },
];

export const STATUS_MAP = {
  New: 'new',
  Contacted: 'contacted',
  Quoted: 'quoted',
  Scheduled: 'scheduled',
  Completed: 'completed',
  Lost: 'lost',
};

export const AT_STATUS_MAP = {
  new: 'New',
  contacted: 'Contacted',
  quoted: 'Quoted',
  scheduled: 'Scheduled',
  completed: 'Completed',
  jobpayment: 'Completed',
  lost: 'Lost',
};

export const PROG_MAP = {
  new: 10,
  contacted: 30,
  quoted: 55,
  scheduled: 75,
  completed: 100,
  jobpayment: 100,
  lost: 100,
};
