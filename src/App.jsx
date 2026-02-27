import { LeadsProvider, useLeadsContext } from './context/LeadsContext';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import DetailPanel from './components/DetailPanel';
import NewLeadModal from './components/NewLeadModal';
import Toast from './components/Toast';
import LoadingOverlay from './components/LoadingOverlay';
import LeadsPage from './components/pages/LeadsPage';
import OverviewPage from './components/pages/OverviewPage';
import ClientsPage from './components/pages/ClientsPage';
import CalendarPage from './components/pages/CalendarPage';
import ReportsPage from './components/pages/ReportsPage';
import CrewPage from './components/pages/CrewPage';

function PageBody() {
  const { currentPage } = useLeadsContext();

  switch (currentPage) {
    case 'leads':    return <LeadsPage />;
    case 'overview': return <OverviewPage />;
    case 'clients':  return <ClientsPage />;
    case 'calendar': return <CalendarPage />;
    case 'reports':  return <ReportsPage />;
    case 'crew':     return <CrewPage />;
    default:         return <LeadsPage />;
  }
}

function Dashboard() {
  const { isLoading } = useLeadsContext();

  return (
    <div className="shell">
      {isLoading && <LoadingOverlay />}
      <Sidebar />
      <div className="main">
        <TopBar />
        <PageBody />
      </div>
      <DetailPanel />
      <NewLeadModal />
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <LeadsProvider>
      <Dashboard />
    </LeadsProvider>
  );
}
