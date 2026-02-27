export default function CrewPage() {
  return (
    <div className="page">
      <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '4px' }}>Crew & Jobs</div>
      <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginBottom: '20px' }}>Crew assignment coming in Phase 3</div>
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--gray-200)', padding: '32px', textAlign: 'center' }}>
        <svg fill="none" viewBox="0 0 24 24" stroke="var(--gray-300)" strokeWidth="1.5" style={{ width: '48px', height: '48px', margin: '0 auto 12px', display: 'block' }}>
          <path d="M17 20h5v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2h5"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-500)' }}>Crew & Jobs — Coming in Phase 3</div>
        <div style={{ fontSize: '12.5px', color: 'var(--gray-400)', marginTop: '6px' }}>Assign crews, track job status, schedule appointments</div>
      </div>
    </div>
  );
}
