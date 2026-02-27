export default function LoadingOverlay() {
  return (
    <div className="loading-overlay">
      <div className="loading-spinner"></div>
      <span style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--gray-500)' }}>
        Loading leads from Airtable…
      </span>
    </div>
  );
}
