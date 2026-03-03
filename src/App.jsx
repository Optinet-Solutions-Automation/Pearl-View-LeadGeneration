import { LeadsProvider, useLeadsContext } from './context/LeadsContext';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import DetailPanel from './components/DetailPanel';
import NewLeadModal from './components/NewLeadModal';
import RefuseModal from './components/RefuseModal';
import Toast from './components/Toast';
import LoadingOverlay from './components/LoadingOverlay';
import LeadsPage from './components/pages/LeadsPage';
import OverviewPage from './components/pages/OverviewPage';
import ClientsPage from './components/pages/ClientsPage';
import DeletedHistoryPage from './components/pages/DeletedHistoryPage';
import CalendarPage from './components/pages/CalendarPage';
import ExpensesPage from './components/pages/ExpensesPage';
import ReportsPage from './components/pages/ReportsPage';

function PageBody() {
  const { currentPage } = useLeadsContext();

  switch (currentPage) {
    case 'overview':        return <OverviewPage />;
    case 'clients':         return <ClientsPage />;
    case 'deleted-history': return <DeletedHistoryPage />;
    case 'calendar':        return <CalendarPage />;
    case 'expenses':        return <ExpensesPage />;
    case 'reports':         return <ReportsPage />;
    case 'leads':
    default:                return <LeadsPage />;
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
      <RefuseModal />
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
