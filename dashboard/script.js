
/* ═══════════════════════════════════════════
   DATA
═══════════════════════════════════════════ */
const COLS = [
  { id:'new',       label:'New Lead', dot:'#2563eb', cnt:'#dbeafe/#1d4ed8' },
  { id:'contacted', label:'Contacted',     dot:'#d97706', cnt:'#fef3c7/#92400e' },
  { id:'quoted',    label:'In Progress', dot:'#7c3aed', cnt:'#ede9fe/#5b21b6' },
  { id:'scheduled', label:'Invoice Pending',     dot:'#0d9488', cnt:'#ccfbf1/#065f46' },
  { id:'completed', label:'Payment',     dot:'#16a34a', cnt:'#dcfce7/#14532d' },
  { id:'completed', label:'Job Done', dot:'#ca8a04', cnt:'#fef9c3/#713f12'},
];

/* ═══════════════════════════════════════════
   AIRTABLE CONFIG
═══════════════════════════════════════════ */
const AT_TOKEN    = window.AIRTABLE_TOKEN || '';
const AT_BASE     = window.AIRTABLE_BASE  || '';
const AT_TABLE    = window.AIRTABLE_TABLE || '';

let nextId = 100;
let leads = [];

let activeId  = null;
let searchTerm = '';
let isLoading  = true;

/* ═══════════════════════════════════════════
   AIRTABLE FETCH + NORMALISE
═══════════════════════════════════════════ */
function parseDate(raw) {
  if (!raw) return new Date(0);
  // Format A: "Mon, 27 Oct 2025, 10:17 am"  → parse directly
  // Format B: "2025-08-28 09:50:08"          → ISO-ish
  const s = raw.replace(',', ''); // remove first comma to help Date parsing
  const d = new Date(s);
  return isNaN(d) ? new Date(0) : d;
}

function formatDate(raw) {
  const d = parseDate(raw);
  if (d.getTime() === 0) return raw || '—';
  return d.toLocaleDateString('en-AU', { day:'numeric', month:'short', year:'numeric' }) +
    ' ' + d.toLocaleTimeString('en-AU', { hour:'numeric', minute:'2-digit' });
}

function normaliseRecord(rec, idx) {
  const f = rec.fields;
  const isCall = !!(f['Caller ID'] || f['Call Time']);

  // Source → which LP site
  const rawSrc = isCall ? (f['Call - Lead Source'] || '') : (f['Lead Source'] || '');
  let source;
  if (isCall) {
    source = rawSrc.includes('pearlview') ? 'call2' : 'call1';
  } else {
    source = rawSrc.includes('pearlview') ? 'form2' : 'form1';
  }

  // Status
  const statusMap = { 'New':'new', 'Contacted':'contacted', 'Quoted':'quoted',
                      'Scheduled':'scheduled', 'Completed':'completed', 'Lost':'lost' };
  const rawStatus = f['Lead Status'] || 'New';
  const status = statusMap[rawStatus] || 'new';
  const progMap = { new:10, contacted:30, quoted:55, scheduled:75, completed:100, lost:100 };

  // Name — show proper name, not phone number for unknown callers
  const name = f['Client Name'] || (isCall ? 'Unknown Caller' : 'Unknown');

  // Subject — truncate very long transcripts for display
  const fullSubject = (isCall
    ? (f['Call Recording Transcript'] || '')
    : (f['Inquiry Subject/Reason'] || ''));

  const rawDate = isCall ? f['Call Time'] : f['Inquiry Date'];

  return {
    id:         rec.id,
    name,
    source,
    lp:         source.includes('2') ? 'LP2' : 'LP1',
    phone:      f['Phone Number'] || f['Caller ID'] || '',
    email:      f['Email'] || '',
    subject:    fullSubject,
    date:       rawDate || '',
    dateObj:    parseDate(rawDate),
    address:    f['Adress'] || f['Service Address'] || '',
    jobType:    f['Property Type'] || '',
    windows:    f['Estimated Window Count'] || 0,
    stories:    f['Stories'] || 0,
    value:      f['Quote Amount'] || 0,
    invoice:    f['Final Invoice Amount'] || 0,
    duration:   f['Call Duration'] || '',
    followUp:   f['Next Follow-up Date'] || '',
    jobDate:    f['Scheduled Cleaning Date'] || '',
    details:    f['Property Details'] || '',
    status,
    progress:   progMap[status] || 10,
    starred:    false,
    notes:      '',
    hasCall:    isCall,
    tag:        '',
    airtableId: rec.id,
  };
}

const IS_LOCAL = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

async function fetchAllFromAirtable() {
  showLoading(true);
  try {
    let allRecords = [];

    if (IS_LOCAL) {
      // Local: fetch directly from Airtable using config.js token
      let offset = '';
      do {
        const url = `https://api.airtable.com/v0/${AT_BASE}/${AT_TABLE}?pageSize=100${offset ? '&offset=' + encodeURIComponent(offset) : ''}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${AT_TOKEN}` } });
        if (!res.ok) throw new Error(`Airtable error: ${res.status}`);
        const data = await res.json();
        allRecords.push(...(data.records || []));
        offset = data.offset || '';
      } while (offset);
    } else {
      // Vercel: use server-side API route (token stays secure)
      const res = await fetch('/api/leads');
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `API error: ${res.status}`);
      allRecords = data.records;
    }

    leads = allRecords
      .map((r, i) => normaliseRecord(r, i))
      .sort((a, b) => b.dateObj - a.dateObj);

  } catch (err) {
    console.error('Failed to load from Airtable:', err);
    showToast('Failed to load data — check console');
  } finally {
    showLoading(false);
    renderBoard();
  }
}

function showLoading(on) {
  isLoading = on;
  document.getElementById('loading-overlay').style.display = on ? 'flex' : 'none';
}

/* ═══════════════════════════════════════════
   RENDER BOARD
═══════════════════════════════════════════ */
function renderBoard() {
  const board = document.getElementById('board');
  const filtered = searchTerm
    ? leads.filter(l =>
        l.name.toLowerCase().includes(searchTerm) ||
        l.subject.toLowerCase().includes(searchTerm) ||
        (l.phone || '').toLowerCase().includes(searchTerm)
      )
    : leads;

  board.innerHTML = COLS.map(col => {
    const colLeads = filtered.filter(l => l.status === col.id);
    const [bgC, textC] = col.cnt.split('/');
    return `
      <div class="col">
        <div class="col-hdr">
          <div class="col-dot" style="background:${col.dot}"></div>
          <span class="col-lbl">${col.label}</span>
          <span class="col-cnt" style="background:${bgC};color:${textC}">${colLeads.length}</span>
          <svg class="col-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
          </svg>
        </div>
        <div class="col-cards">
          ${colLeads.map(l => cardHTML(l)).join('')}
        </div>
      </div>`;
  }).join('');

  // update stats from real data
  const newCount       = leads.filter(l => l.status === 'new').length;
  const callCount      = leads.filter(l => l.hasCall).length;
  const quotedCount    = leads.filter(l => l.status === 'quoted').length;
  const scheduledCount = leads.filter(l => l.status === 'scheduled').length;
  const completedLeads = leads.filter(l => l.status === 'completed');
  const totalRevenue   = completedLeads.reduce((sum, l) => sum + (parseFloat(l.invoice) || parseFloat(l.value) || 0), 0);

  document.getElementById('stat-new').textContent       = newCount;
  document.getElementById('stat-new-sub').textContent   = `${leads.length} total leads`;
  document.getElementById('stat-calls').textContent     = callCount;
  document.getElementById('stat-calls-sub').textContent = `${leads.filter(l=>!l.hasCall).length} form submissions`;
  document.getElementById('stat-quotes').textContent    = quotedCount;
  document.getElementById('stat-quotes-sub').textContent= quotedCount === 1 ? 'Awaiting client response' : 'Awaiting client response';
  document.getElementById('stat-scheduled').textContent = scheduledCount;
  document.getElementById('stat-scheduled-sub').textContent = scheduledCount === 1 ? '1 job booked' : `${scheduledCount} jobs booked`;
  document.getElementById('stat-revenue').textContent   = totalRevenue > 0 ? '$' + totalRevenue.toFixed(2) : '$0';
  document.getElementById('stat-revenue-sub').textContent = `${completedLeads.length} job${completedLeads.length !== 1 ? 's' : ''} completed`;
  document.getElementById('nav-count').textContent = leads.length;
}

function cardHTML(l) {
  const srcTag = (l.source === 'call1' || l.source === 'call2')
    ? `<span class="tag tag-call">Call · ${l.lp}</span>`
    : l.source === 'form1'
    ? `<span class="tag tag-form1">Form · LP1</span>`
    : `<span class="tag tag-form2">Form · LP2</span>`;

  // Truncate long transcripts/subjects for card display
  const shortSubject = (l.subject || '').length > 90
    ? l.subject.substring(0, 90) + '…'
    : (l.subject || '—');

  const tagChip = l.tag
    ? `<span class="tag ${l.tag.toLowerCase().includes('sent') ? 'tag-sent' : l.tag.toLowerCase().includes('tomorrow') ? 'tag-tomorrow' : 'tag-gray'}">${l.tag}</span>`
    : '';

  const valText = l.value > 0 ? `Est. $${l.value.toLocaleString()}` : 'Est. $—';
  const durText = l.duration
    ? `<span class="card-dur"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${l.duration}</span>`
    : '';

  const showView = l.status === 'new' || l.status === 'contacted';

  return `
    <div class="card${activeId===l.id?' active':''}" id="card-${l.id}" onclick="openPanel('${l.id}')">
      <div class="card-top">
        <span class="card-name">${l.name}</span>
        <span class="star${l.starred?' on':''}" onclick="toggleStar(event,'${l.id}')">${l.starred?'★':'☆'}</span>
      </div>
      <div class="tags">${srcTag}${tagChip}</div>
      <div class="card-sub">${shortSubject}</div>
      <div class="card-footer">
        <span class="card-val">${valText}</span>
        ${durText}
      </div>
      <div class="prog"><div class="prog-fill" style="width:${l.progress}%"></div></div>
      ${showView ? `<button class="view-btn" onclick="openPanel('${l.id}')">View Details</button>` : ''}
    </div>`;
}

/* ═══════════════════════════════════════════
   PANEL
═══════════════════════════════════════════ */
function openPanel(id) {
  activeId = id;
  const l = leads.find(x => x.id === id);
  if (!l) return;

  document.getElementById('panel').classList.add('open');
  document.getElementById('p-name').textContent = l.name;
  const isCallLead = l.source === 'call1' || l.source === 'call2';
  document.getElementById('p-meta').textContent = `${isCallLead ? 'Direct Call · ' + l.lp : 'Form · ' + l.lp} · ${formatDate(l.date)}`;

  const srcTag = isCallLead
    ? `<span class="tag tag-call" style="font-size:11px">Call · ${l.lp}</span>`
    : l.source === 'form1'
    ? `<span class="tag tag-form1" style="font-size:11px">Form · LP1</span>`
    : `<span class="tag tag-form2" style="font-size:11px">Form · LP2</span>`;

  // call section
  const transcript = l.subject || '';
  const waveHTML = l.hasCall ? `
    <div class="audio-box">
      <div class="audio-row">
        <button class="play-btn" id="play-btn-${l.id}" onclick="togglePlay(${JSON.stringify(l.id)})">
          <svg fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </button>
        <div class="wave" id="wave-${l.id}">
          ${generateWave()}
        </div>
      </div>
      <div class="audio-footer">
        <span class="audio-time">Duration: ${l.duration || '—'}</span>
      </div>
    </div>
    ${transcript ? `
    <div style="margin-top:10px">
      <div class="psec-title" style="margin-bottom:5px">Transcript</div>
      <div style="font-size:11.5px;color:var(--gray-600);line-height:1.6;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;padding:10px;max-height:140px;overflow-y:auto;">
        ${transcript.replace(/</g,'&lt;').replace(/>/g,'&gt;')}
      </div>
    </div>` : ''}
    ` : `<p style="font-size:12px;color:var(--gray-400)">No call recording for this lead.</p>`;

  document.getElementById('panel-body').innerHTML = `
    <div class="psec">
      <div class="psec-title">Status</div>
      <select class="status-sel" onchange="changeStatus('${l.id}', this.value)">
        <option value="new"       ${l.status==='new'       ?'selected':''}>🔵 New Inquiry</option>
        <option value="contacted" ${l.status==='contacted' ?'selected':''}>🟡 Contacted</option>
        <option value="quoted"    ${l.status==='quoted'    ?'selected':''}>🟣 Quote Issued</option>
        <option value="scheduled" ${l.status==='scheduled' ?'selected':''}>🟢 Scheduled</option>
        <option value="completed" ${l.status==='completed' ?'selected':''}>✅ Completed</option>
        <option value="lost"      ${l.status==='lost'      ?'selected':''}>❌ Lost</option>
      </select>
    </div>

    <div class="psec">
      <div class="psec-title">Client Contact</div>
      <div class="prow">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 012 1.18 2 2 0 014 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z" transform="translate(1,1)"/></svg>
        <span class="prow-text">${l.phone}</span>
      </div>
      <div class="prow">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        <span class="prow-text"><a href="mailto:${l.email}">${l.email}</a></span>
      </div>
      <div class="prow">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <span class="prow-text">${l.address || '—'}</span>
      </div>
    </div>

    <div class="psec">
      <div class="psec-title">Job Details</div>
      <div class="jrow"><span class="jlbl">Job Type</span><span class="jval">${l.jobType || '—'}</span></div>
      <div class="jrow"><span class="jlbl">Windows</span><span class="jval">${l.windows || '—'}</span></div>
      <div style="padding:4px 0">
        <div class="jlbl" style="margin-bottom:4px">Subject</div>
        <div style="font-size:12px;color:var(--gray-800);line-height:1.55;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:6px;padding:8px 10px;max-height:120px;overflow-y:auto;text-align:left;white-space:pre-wrap;word-break:break-word">${l.subject || '—'}</div>
      </div>
      ${l.jobDate ? `<div class="jrow"><span class="jlbl">Job Date</span><span class="jval">${l.jobDate}</span></div>` : ''}
      <div class="jrow"><span class="jlbl">Est. Value</span><span class="jval" style="color:var(--primary)">${l.value > 0 ? '$' + l.value.toLocaleString() : '—'}</span></div>
      <div class="jrow"><span class="jlbl">Lead Source</span>${srcTag}</div>
    </div>

    <div class="psec">
      <div class="psec-title">Call History</div>
      ${waveHTML}
    </div>

    <div class="psec">
      <div class="psec-title">Notes</div>
      <textarea class="notes-ta" id="notes-${l.id}" placeholder="Add notes about this lead…">${l.notes}</textarea>
      <button class="save-note-btn" onclick="saveNote('${l.id}')">Save Note</button>
    </div>

    <div class="psec" style="border-bottom:none">
      <div class="psec-title">Actions</div>
      <div style="display:flex;flex-direction:column;gap:7px">
        <div class="action-grid">
          <button class="action-btn btn-blue">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M17 20h5v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2h5"/><circle cx="12" cy="7" r="4"/></svg>
            Assign Crew
          </button>
          <button class="action-btn btn-dark" onclick="sendQuote('${l.id}')">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            Send Quote
          </button>
        </div>
        <button class="action-btn btn-green" onclick="changeStatus('${l.id}','completed');closePanel()">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          Complete Job
        </button>
        <button class="action-btn btn-red" onclick="archiveLead('${l.id}')">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
          Archive Lead
        </button>
      </div>
    </div>
  `;

  renderBoard();
}

function closePanel() {
  activeId = null;
  document.getElementById('panel').classList.remove('open');
  renderBoard();
}

/* ═══════════════════════════════════════════
   WAVE GENERATOR
═══════════════════════════════════════════ */
function generateWave() {
  const bars = 42;
  let html = '';
  for (let i = 0; i < bars; i++) {
    const h = 4 + Math.floor(Math.random() * 20);
    html += `<div class="wbar" style="height:${h}px"></div>`;
  }
  return html;
}

let playStates = {};
function togglePlay(id) {
  const btn = document.getElementById(`play-btn-${id}`);
  if (!btn) return;
  playStates[id] = !playStates[id];
  const playing = playStates[id];
  btn.innerHTML = playing
    ? `<svg fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`
    : `<svg fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;

  if (playing) {
    const wave = document.getElementById(`wave-${id}`);
    if (wave) {
      const bars = wave.querySelectorAll('.wbar');
      let idx = 0;
      const iv = setInterval(() => {
        if (!playStates[id]) { clearInterval(iv); return; }
        if (idx < bars.length) { bars[idx].classList.add('played'); idx++; }
        else { clearInterval(iv); playStates[id] = false;
          btn.innerHTML = `<svg fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`; }
      }, 80);
    }
  }
}

/* ═══════════════════════════════════════════
   ACTIONS
═══════════════════════════════════════════ */
function toggleStar(e, id) {
  e.stopPropagation();
  const l = leads.find(x => x.id === id);
  if (l) { l.starred = !l.starred; renderBoard(); if (activeId === id) openPanel(id); }
}

function changeStatus(id, status) {
  const l = leads.find(x => x.id === id);
  if (!l) return;
  l.status = status;
  const progMap = { new:10, contacted:30, quoted:55, scheduled:75, completed:100, lost:100 };
  l.progress = progMap[status] || 10;
  renderBoard();
  if (activeId === id) openPanel(id);

  // Write back to Airtable if record has an airtable ID
  if (l.airtableId) {
    const atStatusMap = { new:'New', contacted:'Contacted', quoted:'Quoted',
                          scheduled:'Scheduled', completed:'Completed', lost:'Lost' };
    const atFields = { 'Lead Status': atStatusMap[status] };
    if (IS_LOCAL) {
      fetch(`https://api.airtable.com/v0/${AT_BASE}/${AT_TABLE}/${l.airtableId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${AT_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: atFields })
      }).then(() => showToast('Status saved to Airtable ✓'))
        .catch(() => showToast('Status updated locally (Airtable sync failed)'));
    } else {
      fetch('/api/update-lead', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ airtableId: l.airtableId, fields: atFields })
      }).then(() => showToast('Status saved to Airtable ✓'))
        .catch(() => showToast('Status updated locally (Airtable sync failed)'));
    }
  }
}

function saveNote(id) {
  const l = leads.find(x => x.id === id);
  const ta = document.getElementById(`notes-${id}`);
  if (l && ta) {
    l.notes = ta.value;
    showToast('Note saved ✓');
  }
}

function sendQuote(id) {
  changeStatus(id, 'quoted');
  showToast('Status updated to Quoted');
}

function archiveLead(id) {
  if (confirm('Archive this lead? It will be removed from the board.')) {
    leads = leads.filter(l => l.id !== id);
    closePanel();
  }
}

function searchLeads(val) {
  searchTerm = val.toLowerCase().trim();
  renderBoard();
}

function showPage(page, el) {
  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');

  // Hide all pages
  ['leads','overview','clients','calendar','reports','crew','settings'].forEach(p => {
    const el = document.getElementById('page-' + p);
    if (el) el.style.display = 'none';
  });

  // Show target page
  const target = document.getElementById('page-' + page);
  if (target) target.style.display = 'flex';

  // Update topbar title
  const titles = { leads:'Leads Dashboard', overview:'Overview', clients:'Clients',
                   calendar:'Calendar', reports:'Reports', crew:'Crew & Jobs', settings:'Settings' };
  document.querySelector('.topbar-title').textContent = titles[page] || page;

  // Close detail panel when switching pages
  closePanel();

  // Populate dynamic pages
  if (page === 'overview') renderOverview();
  if (page === 'clients')  renderClients();
  if (page === 'calendar') renderCalendar();
}

function renderOverview() {
  // Stats
  const calls = leads.filter(l => l.hasCall).length;
  const forms = leads.filter(l => !l.hasCall).length;
  const lp1   = leads.filter(l => l.lp === 'LP1').length;
  const lp2   = leads.filter(l => l.lp === 'LP2').length;
  document.getElementById('ov-lp1-count').textContent = lp1 + ' total leads';
  document.getElementById('ov-lp2-count').textContent = lp2 + ' total leads';

  const statEl = document.getElementById('overview-stats');
  statEl.innerHTML = `
    <div class="stat-card">
      <div class="stat-top"><span class="stat-lbl">Total Leads</span>
        <div class="stat-ico" style="background:var(--blue-50)"><svg fill="none" viewBox="0 0 24 24" stroke="var(--primary)" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></div>
      </div>
      <div class="stat-val">${leads.length}</div><div class="stat-sub">All time</div>
    </div>
    <div class="stat-card">
      <div class="stat-top"><span class="stat-lbl">Form Leads</span>
        <div class="stat-ico" style="background:#ede9fe"><svg fill="none" viewBox="0 0 24 24" stroke="var(--purple)" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2"/></svg></div>
      </div>
      <div class="stat-val">${forms}</div><div class="stat-sub">Web form submissions</div>
    </div>
    <div class="stat-card">
      <div class="stat-top"><span class="stat-lbl">Call Leads</span>
        <div class="stat-ico" style="background:#f0fdf4"><svg fill="none" viewBox="0 0 24 24" stroke="var(--green)" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 012 1.18 2 2 0 014 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z" transform="translate(1,1)"/></svg></div>
      </div>
      <div class="stat-val">${calls}</div><div class="stat-sub">Direct calls received</div>
    </div>
    <div class="stat-card">
      <div class="stat-top"><span class="stat-lbl">Quoted</span>
        <div class="stat-ico" style="background:#fffbeb"><svg fill="none" viewBox="0 0 24 24" stroke="#d97706" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
      </div>
      <div class="stat-val">${leads.filter(l=>l.status==='quoted').length}</div><div class="stat-sub">Quotes issued</div>
    </div>
    <div class="stat-card">
      <div class="stat-top"><span class="stat-lbl">Completed</span>
        <div class="stat-ico" style="background:#f0fdf4"><svg fill="none" viewBox="0 0 24 24" stroke="var(--green)" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div>
      </div>
      <div class="stat-val">${leads.filter(l=>l.status==='completed').length}</div><div class="stat-sub">Jobs done</div>
    </div>`;

  // Recent leads
  const recent = leads.slice(0, 10);
  document.getElementById('overview-recent').innerHTML = recent.map(l => `
    <div onclick="showPage('leads',document.querySelector('[data-page=leads]'));setTimeout(()=>openPanel('${l.id}'),300)"
      style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--gray-100);cursor:pointer">
      <div style="width:34px;height:34px;border-radius:8px;background:${l.hasCall?'#d1fae5':'var(--blue-100)'};
        display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:13px;font-weight:700;
        color:${l.hasCall?'#065f46':'var(--primary)'}">
        ${l.hasCall?'📞':'📋'}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;color:var(--gray-900)">${l.name}</div>
        <div style="font-size:11.5px;color:var(--gray-500);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${(l.subject||'').substring(0,60)}</div>
      </div>
      <div style="font-size:11px;color:var(--gray-400);flex-shrink:0">${formatDate(l.date)}</div>
    </div>`).join('');
}

function renderClients() {
  // Only show form leads with a real name (not unknown)
  const formLeads = leads.filter(l => !l.hasCall && l.name !== 'Unknown');
  document.getElementById('clients-list').innerHTML = formLeads.map(l => `
    <div onclick="showPage('leads',document.querySelector('[data-page=leads]'));setTimeout(()=>openPanel('${l.id}'),300)"
      style="background:#fff;border:1px solid var(--gray-200);border-radius:10px;padding:14px 16px;
        margin-bottom:8px;display:flex;align-items:center;gap:14px;cursor:pointer;
        transition:border-color .15s" onmouseover="this.style.borderColor='var(--blue-200)'" onmouseout="this.style.borderColor='var(--gray-200)'">
      <div style="width:38px;height:38px;border-radius:50%;background:var(--blue-100);
        display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;
        color:var(--primary);flex-shrink:0">${l.name.charAt(0).toUpperCase()}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13.5px;font-weight:600;color:var(--gray-900)">${l.name}</div>
        <div style="font-size:12px;color:var(--gray-500)">${l.email || l.phone || '—'}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:11px;color:var(--gray-400)">${formatDate(l.date)}</div>
        <span class="tag tag-form${l.lp==='LP2'?'2':'1'}" style="margin-top:4px;display:inline-block">Form · ${l.lp}</span>
      </div>
    </div>`).join('') || '<div style="color:var(--gray-400);font-size:13px;text-align:center;padding:32px">No form clients found</div>';
}

function renderCalendar() {
  const scheduled = leads.filter(l => l.jobDate || l.followUp).sort((a,b) => {
    const da = new Date(a.jobDate || a.followUp || 0);
    const db = new Date(b.jobDate || b.followUp || 0);
    return da - db;
  });
  const el = document.getElementById('calendar-list');
  if (!scheduled.length) {
    el.innerHTML = '<div style="background:#fff;border-radius:12px;border:1px solid var(--gray-200);padding:32px;text-align:center;color:var(--gray-400);font-size:13px">No scheduled jobs or follow-ups yet.<br>Set dates in lead details to see them here.</div>';
    return;
  }
  el.innerHTML = scheduled.map(l => `
    <div style="background:#fff;border-radius:10px;border:1px solid var(--gray-200);padding:14px 16px;margin-bottom:8px;display:flex;gap:14px;align-items:center">
      <div style="background:var(--blue-50);border-radius:8px;padding:8px 12px;text-align:center;flex-shrink:0">
        <div style="font-size:10px;font-weight:700;color:var(--primary);text-transform:uppercase">${new Date(l.jobDate||l.followUp).toLocaleDateString('en-AU',{month:'short'})}</div>
        <div style="font-size:20px;font-weight:700;color:var(--gray-900)">${new Date(l.jobDate||l.followUp).getDate()}</div>
      </div>
      <div style="flex:1">
        <div style="font-size:13.5px;font-weight:600;color:var(--gray-900)">${l.name}</div>
        <div style="font-size:12px;color:var(--gray-500)">${l.jobDate?'Job scheduled':'Follow-up'} · ${l.address||'—'}</div>
      </div>
    </div>`).join('');
}

/* ═══════════════════════════════════════════
   NEW LEAD MODAL
═══════════════════════════════════════════ */
function openModal() { document.getElementById('modal-overlay').classList.add('open'); }
function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }
function overlayClick(e) { if (e.target === e.currentTarget) closeModal(); }

function saveLead() {
  const name    = document.getElementById('m-name').value.trim();
  const phone   = document.getElementById('m-phone').value.trim();
  const email   = document.getElementById('m-email').value.trim();
  const subject = document.getElementById('m-subject').value.trim();
  const value   = parseInt(document.getElementById('m-value').value) || 0;
  const source  = document.getElementById('m-source').value;

  if (!name) { alert('Name is required.'); return; }

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) + ' ' +
    now.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});

  leads.unshift({
    id: nextId++,
    name, phone, email, subject, value, source,
    lp: source === 'form2' || source === 'call2' ? 'LP2' : 'LP1',
    status: 'new', date: dateStr, dateObj: new Date(),
    address: '', jobType: 'Residential', windows: 0,
    starred: false, notes: '', hasCall: source.startsWith('call'), progress: 10,
  });

  closeModal();
  ['m-name','m-phone','m-email','m-subject','m-value'].forEach(id => document.getElementById(id).value = '');
  renderBoard();
  showToast('New lead added ✓');
}

/* ═══════════════════════════════════════════
   TOAST
═══════════════════════════════════════════ */
let toastTimer;
function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.style.cssText = `
      position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
      background:#1e293b;color:#fff;padding:10px 20px;border-radius:10px;
      font-size:13px;font-weight:500;z-index:999;
      box-shadow:0 4px 16px rgba(0,0,0,.25);
      transition:opacity .3s;
    `;
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.style.opacity = '0'; }, 2500);
}

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
fetchAllFromAirtable();
