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
    addRefusedRecord,
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
    const result = await changeStatus(id, status);
    if (result === 'error') showToast('Failed to save — check your connection');
    else if (result === 'ok') {
      showToast('Status updated ✓');
      // Verify the change persisted in Airtable — re-sync after a short delay
      setTimeout(() => fetchLeads({ silent: true }).catch(() => {}), 2000);
    }
  }, [changeStatus, showToast, leads, fetchLeads]);

  const confirmRefuse = useCallback(async (reason) => {
    if (!refuseModalId) return;
    setRefuseReason(refuseModalId, reason);
    const result = await changeStatus(refuseModalId, 'refused');
    if (result === 'error') showToast('Failed to save — check your connection');
    else if (result === 'ok') {
      showToast('Status updated ✓');
      setTimeout(() => fetchLeads({ silent: true }).catch(() => {}), 2000);
      addRefusedRecord(refuseModalId, reason);
    }
    setRefuseModalId(null);
    setRefuseModalPrevStatus(null);
  }, [refuseModalId, changeStatus, setRefuseReason, showToast, fetchLeads, addRefusedRecord]);

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

  const handleSavePaidInfo = useCallback(async (id, paid, paidAmount, paymentMethod) => {
    const result = await savePaidInfo(id, paid, paidAmount, paymentMethod);
    if (!result?.success && result !== true) {
      showToast('Failed to save payment — check your connection');
      return false;
    }
    const wasJobDone = result?.wasJobDone ?? result === true;
    if (paid && paidAmount > 0 && !wasJobDone) {
      // S3: payment recorded but job not done yet — auto-advance to In Progress if still New
      const lead = leads.find(l => l.id === id);
      if (lead?.status === 'new') {
        await changeStatus(id, 'in_progress');
        showToast('Payment recorded · Status → In Progress');
      } else {
        showToast('Payment recorded ✓');
      }
    } else {
      showToast('Payment recorded ✓');
    }
    // Re-fetch after a short delay to confirm Revenue record was written
    setTimeout(() => fetchLeads({ silent: true }).catch(() => {}), 1500);
    return result;
  }, [savePaidInfo, changeStatus, showToast, fetchLeads, leads]);

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
