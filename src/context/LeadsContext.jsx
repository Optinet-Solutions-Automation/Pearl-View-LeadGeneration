import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useLeads } from '../hooks/useLeads';

const LeadsContext = createContext(null);

export function LeadsProvider({ children }) {
  const {
    leads, deletedLeads, calBookings, isLoading, fetchLeads,
    changeStatus, toggleStar, saveNote, saveJobType,
    savePaidInfo, saveCity, saveJobDate, saveEmail,
    renameLead, setRefuseReason,
    archiveLead, permanentDelete, recoverLead, addLead,
    addCalBooking, removeCalBooking, updateCalBooking, recordBookingPayment,
  } = useLeads();

  const [activeId, setActiveId]       = useState(null);
  const [searchTerm, setSearchTerm]   = useState('');
  const [currentPage, setCurrentPage] = useState('leads');
  const [toast, setToast]             = useState(null);
  const [isModalOpen, setModalOpen]   = useState(false);
  const [statFilter, setStatFilter]   = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Refuse modal state
  const [refuseModalId, setRefuseModalId]             = useState(null);
  const [refuseModalPrevStatus, setRefuseModalPrevStatus] = useState(null);

  useEffect(() => {
    fetchLeads().catch(() => showToast('Failed to load data — check console'));
  }, [fetchLeads]);

  // Poll Airtable every 30s to pick up status changes made directly in Airtable
  useEffect(() => {
    const id = setInterval(() => {
      fetchLeads({ silent: true }).catch(() => {});
    }, 30_000);
    return () => clearInterval(id);
  }, [fetchLeads]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2700);
  }, []);

  const openPanel  = useCallback((id) => setActiveId(id), []);
  const closePanel = useCallback(() => setActiveId(null), []);

  const toggleSidebar = useCallback(() => setSidebarOpen(v => !v), []);
  const closeSidebar  = useCallback(() => setSidebarOpen(false), []);

  // Intercepts 'refused' to show reason modal first
  const handleChangeStatus = useCallback(async (id, status) => {
    if (status === 'refused') {
      const lead = leads.find(l => l.id === id);
      setRefuseModalPrevStatus(lead?.status || 'new');
      setRefuseModalId(id);
      return;
    }
    const msg = await changeStatus(id, status);
    if (msg) showToast(msg);
  }, [changeStatus, showToast, leads]);

  const confirmRefuse = useCallback(async (reason) => {
    if (!refuseModalId) return;
    setRefuseReason(refuseModalId, reason);
    const msg = await changeStatus(refuseModalId, 'refused');
    if (msg) showToast(msg);
    setRefuseModalId(null);
    setRefuseModalPrevStatus(null);
  }, [refuseModalId, changeStatus, setRefuseReason, showToast]);

  const closeRefuseModal = useCallback(() => {
    setRefuseModalId(null);
    setRefuseModalPrevStatus(null);
  }, []);

  const handleToggleStar = useCallback((id) => toggleStar(id), [toggleStar]);

  const handleSaveNote = useCallback((id, note) => {
    saveNote(id, note);
  }, [saveNote]);

  const handleSaveJobType = useCallback((id, jobType) => {
    saveJobType(id, jobType);
  }, [saveJobType]);

  const handleSavePaidInfo = useCallback((id, paid, paidAmount, paymentMethod) => {
    savePaidInfo(id, paid, paidAmount, paymentMethod);
  }, [savePaidInfo]);

  const handleSaveCity = useCallback((id, city) => {
    saveCity(id, city);
  }, [saveCity]);

  const handleSaveJobDate = useCallback((id, jobDate) => {
    saveJobDate(id, jobDate);
  }, [saveJobDate]);

  const handleSaveEmail = useCallback((id, email) => {
    saveEmail(id, email);
  }, [saveEmail]);

  const handleRename = useCallback((id, newName) => {
    renameLead(id, newName);
    showToast('Name updated ✓');
  }, [renameLead, showToast]);

  const handleSetRefuseReason = useCallback((id, reason) => {
    setRefuseReason(id, reason);
    showToast('Reason updated ✓');
  }, [setRefuseReason, showToast]);

  const handleArchive = useCallback((id) => {
    archiveLead(id);
    closePanel();
    showToast('Lead moved to Deleted History');
  }, [archiveLead, closePanel, showToast]);

  const handlePermanentDelete = useCallback((id) => {
    permanentDelete(id);
    showToast('Lead permanently deleted');
  }, [permanentDelete, showToast]);

  const handleRecoverLead = useCallback((id) => {
    recoverLead(id);
    showToast('Lead recovered ✓');
  }, [recoverLead, showToast]);

  const handleAddLead = useCallback((data) => {
    addLead(data);
    showToast('New lead added ✓');
  }, [addLead, showToast]);

  const toggleStatFilter = useCallback((type) => {
    setStatFilter(prev => (prev === type ? null : type));
  }, []);

  // Schedule an appointment from Lead Details:
  // Creates a calBooking (linked to the lead) + sets the lead's jobDate
  const scheduleBooking = useCallback(async (leadId, bookingData) => {
    const localId = await addCalBooking({ ...bookingData, linkedLeadId: leadId });
    if (bookingData.date) {
      saveJobDate(leadId, bookingData.date);
    }
    showToast('Appointment scheduled ✓');
    return localId;
  }, [addCalBooking, saveJobDate, showToast]);

  const activeLead = leads.find(l => l.id === activeId) || null;

  const filteredLeads = useMemo(() => {
    let result = searchTerm
      ? leads.filter(l =>
          l.name.toLowerCase().includes(searchTerm) ||
          l.subject.toLowerCase().includes(searchTerm) ||
          (l.phone || '').toLowerCase().includes(searchTerm)
        )
      : leads;
    if (statFilter === 'calls') {
      result = result.filter(l => l.hasCall);
    } else if (statFilter) {
      result = result.filter(l => l.status === statFilter);
    }
    return result;
  }, [leads, searchTerm, statFilter]);

  return (
    <LeadsContext.Provider value={{
      leads,
      deletedLeads,
      calBookings,
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
      statFilter,
      toggleStatFilter,
      sidebarOpen,
      toggleSidebar,
      closeSidebar,
      refuseModalId,
      refuseModalPrevStatus,
      confirmRefuse,
      closeRefuseModal,
      changeStatus: handleChangeStatus,
      toggleStar: handleToggleStar,
      saveNote: handleSaveNote,
      saveJobType: handleSaveJobType,
      savePaidInfo: handleSavePaidInfo,
      saveCity: handleSaveCity,
      saveJobDate: handleSaveJobDate,
      saveEmail: handleSaveEmail,
      renameLead: handleRename,
      setRefuseReason: handleSetRefuseReason,
      archiveLead: handleArchive,
      permanentDelete: handlePermanentDelete,
      recoverLead: handleRecoverLead,
      addLead: handleAddLead,
      addCalBooking,
      removeCalBooking,
      updateCalBooking,
      recordBookingPayment,
      scheduleBooking,
      refetch: fetchLeads,
    }}>
      {children}
    </LeadsContext.Provider>
  );
}

export function useLeadsContext() {
  return useContext(LeadsContext);
}
