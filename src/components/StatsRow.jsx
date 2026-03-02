import { useLeadsContext } from '../context/LeadsContext';
import { REFUSE_LABELS } from '../utils/constants';

function StatCard({ id, label, value, sub, icon, iconBg, iconStroke, onClick, isActive }) {
  return (
    <div
      className={`stat-card stat-clickable${isActive ? ' stat-active' : ''}`}
      onClick={onClick}
    >
      <div className="stat-top">
        <span className="stat-lbl">{label}</span>
        <div className="stat-ico" style={{ background: iconBg }}>
          <svg fill="none" viewBox="0 0 24 24" stroke={iconStroke} strokeWidth="2">
            {icon}
          </svg>
        </div>
      </div>
      <div className="stat-val">{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

export default function StatsRow() {
  const { leads, statFilter, toggleStatFilter } = useLeadsContext();

  const newCount       = leads.filter(l => l.status === 'new').length;
  const callCount      = leads.filter(l => l.hasCall).length;
  const formCount      = leads.filter(l => !l.hasCall).length;
  const quotedCount    = leads.filter(l => l.status === 'quoted').length;
  const scheduledCount = leads.filter(l => l.status === 'scheduled').length;
  const completedLeads = leads.filter(l => l.status === 'completed');
  const totalRevenue   = completedLeads.reduce((s, l) => s + (parseFloat(l.invoice) || parseFloat(l.value) || 0), 0);
  const refusedLeads   = leads.filter(l => l.status === 'refused');

  // Refuse reason breakdown subtitle
  const rc = { too_expensive: 0, competition: 0, no_answer: 0, other: 0 };
  refusedLeads.forEach(l => { if (l.refuseReason && rc[l.refuseReason] !== undefined) rc[l.refuseReason]++; });
  const refuseParts = [];
  if (rc.too_expensive) refuseParts.push(`${rc.too_expensive} expensive`);
  if (rc.competition)   refuseParts.push(`${rc.competition} competition`);
  if (rc.no_answer)     refuseParts.push(`${rc.no_answer} no answer`);
  if (rc.other)         refuseParts.push(`${rc.other} other`);
  const refusedSub = refuseParts.length ? refuseParts.join(' · ') : 'Declined leads';

  return (
    <div className="stats">
      <StatCard
        label="New Leads"
        value={newCount}
        sub={`${leads.length} total leads`}
        iconBg="#eff6ff" iconStroke="#2563eb"
        isActive={statFilter === 'new'}
        onClick={() => toggleStatFilter('new')}
        icon={<><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></>}
      />
      <StatCard
        label="Calls Received"
        value={callCount}
        sub={`${formCount} form submissions`}
        iconBg="#f0fdf4" iconStroke="#16a34a"
        isActive={statFilter === 'calls'}
        onClick={() => toggleStatFilter('calls')}
        icon={<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 012 1.18 2 2 0 014 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z" transform="translate(1,1)"/>}
      />
      <StatCard
        label="Pending Quotes"
        value={quotedCount}
        sub="Awaiting client response"
        iconBg="#fffbeb" iconStroke="#d97706"
        isActive={statFilter === 'quoted'}
        onClick={() => toggleStatFilter('quoted')}
        icon={<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>}
      />
      <StatCard
        label="Scheduled Jobs"
        value={scheduledCount}
        sub={`${scheduledCount} job${scheduledCount !== 1 ? 's' : ''} booked`}
        iconBg="#f0fdfa" iconStroke="#0d9488"
        isActive={statFilter === 'scheduled'}
        onClick={() => toggleStatFilter('scheduled')}
        icon={<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>}
      />
      <StatCard
        label="Total Revenue"
        value={totalRevenue > 0 ? '$' + totalRevenue.toFixed(2) : '$0'}
        sub={`${completedLeads.length} job${completedLeads.length !== 1 ? 's' : ''} completed`}
        iconBg="#f0fdf4" iconStroke="#16a34a"
        isActive={statFilter === 'completed'}
        onClick={() => toggleStatFilter('completed')}
        icon={<><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></>}
      />
      <StatCard
        label="Refused"
        value={refusedLeads.length}
        sub={refusedSub}
        iconBg="#fee2e2" iconStroke="#dc2626"
        isActive={statFilter === 'refused'}
        onClick={() => toggleStatFilter('refused')}
        icon={<><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></>}
      />
    </div>
  );
}
