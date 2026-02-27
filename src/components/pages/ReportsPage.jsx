export default function ReportsPage() {
  return (
    <div className="page">
      <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '4px' }}>Reports</div>
      <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginBottom: '20px' }}>Analytics coming in Phase 4</div>
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--gray-200)', padding: '32px', textAlign: 'center' }}>
        <svg fill="none" viewBox="0 0 24 24" stroke="var(--gray-300)" strokeWidth="1.5" style={{ width: '48px', height: '48px', margin: '0 auto 12px', display: 'block' }}>
          <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-500)' }}>Reports — Coming in Phase 4</div>
        <div style={{ fontSize: '12.5px', color: 'var(--gray-400)', marginTop: '6px' }}>Conversion rates, lead volume, revenue tracking</div>
      </div>
    </div>
  );
}
