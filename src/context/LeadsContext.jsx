import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLeads } from '../hooks/useLeads';

const LeadsContext = createContext(null);

export function LeadsProvider({ children }) {
  const { leads, isLoading, fetchLeads, changeStatus, toggleStar, saveNote, archiveLead, addLead } = useLeads();

  const [activeId, setActiveId]     = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState('leads');
  const [toast, setToast]           = useState(null);
  const [isModalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchLeads().catch(() => showToast('Failed to load data — check console'));
  }, [fetchLeads]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2700);
  }, []);

  const openPanel = useCallback((id) => setActiveId(id), []);
  const closePanel = useCallback(() => setActiveId(null), []);

  const handleChangeStatus = useCallback(async (id, status) => {
    const msg = await changeStatus(id, status);
    if (msg) showToast(msg);
  }, [changeStatus, showToast]);

  const handleToggleStar = useCallback((id) => {
    toggleStar(id);
  }, [toggleStar]);

  const handleSaveNote = useCallback((id, note) => {
    saveNote(id, note);
    showToast('Note saved ✓');
  }, [saveNote, showToast]);

  const handleArchive = useCallback((id) => {
    archiveLead(id);
    closePanel();
  }, [archiveLead, closePanel]);

  const handleAddLead = useCallback((data) => {
    addLead(data);
    showToast('New lead added ✓');
  }, [addLead, showToast]);

  const activeLead = leads.find(l => l.id === activeId) || null;

  const filteredLeads = searchTerm
    ? leads.filter(l =>
        l.name.toLowerCase().includes(searchTerm) ||
        l.subject.toLowerCase().includes(searchTerm) ||
        (l.phone || '').toLowerCase().includes(searchTerm)
      )
    : leads;

  return (
    <LeadsContext.Provider value={{
      leads,
      filteredLeads,
      isLoading,
      activeId,
      activeLead,
      searchTerm,
      setSearchTerm,
      currentPage,
      setCurrentPage,
      toast,
      showToast,
      isModalOpen,
      setModalOpen,
      openPanel,
      closePanel,
      changeStatus: handleChangeStatus,
      toggleStar: handleToggleStar,
      saveNote: handleSaveNote,
      archiveLead: handleArchive,
      addLead: handleAddLead,
      refetch: fetchLeads,
    }}>
      {children}
    </LeadsContext.Provider>
  );
}

export function useLeadsContext() {
  return useContext(LeadsContext);
}
