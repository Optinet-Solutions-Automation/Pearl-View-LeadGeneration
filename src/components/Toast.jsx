import { useLeadsContext } from '../context/LeadsContext';

export default function Toast() {
  const { toast } = useLeadsContext();

  if (!toast) return null;

  return (
    <div className="toast" style={{ opacity: 1 }}>
      {toast}
    </div>
  );
}
