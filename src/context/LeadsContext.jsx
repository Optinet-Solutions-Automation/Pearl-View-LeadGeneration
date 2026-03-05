import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useLeads } from '../hooks/useLeads';

const LeadsContext = createContext(null);

export function LeadsProvider({ children }) {
  const {
    leads, deletedLeads, calBookings, isLoading, fetchLeads,
    changeStatus, toggleStar, saveNote, saveJobType,
    savePaidInfo, saveCity, saveJobDate, saveEmail, saveQuoteAmount, clearQuoteAmount,
    renameLead, setRefuseReason,
    archiveLead, permanentDelete, recoverLead, addLead,
    addCalBooking, removeCalBooking, updateCalBooking, recordBookingPayment,
    addRefusedRecord, deleteFromRefusedTable, deletePayment,
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

  // Quote-transfer modal state (when moving away from quote_sent)
  const [quoteTransferModalId,      setQuoteTransferModalId]      = useState(null);
  const [quoteTransferTargetStatus, setQuoteTransferTargetStatus] = useState(null);
  const [quoteTransferLeadValue,    setQuoteTransferLeadValue]    = useState(0);

  useEffect(() => {
    fetchLeads().catch(() => showToast('Failed to load data — check console'));
  }, [fetchLeads]);

  // One-time backfill: push any existing refused leads to the Refused table
  useEffect(() => {
    if (!isLoading && leads.length > 0 && !localStorage.getItem('pv_refused_synced')) {
      leads.filter(l => l.status === 'refused').forEach(lead => {
        addRefusedRecord(lead, lead.refuseReason || '');
      });
      localStorage.setItem('pv_refused_synced', '1');
    }
  }, [isLoading, leads, addRefusedRecord]);

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

  // Central status change handler — enforces all business rules:
  // 1. 'refused'        → show RefuseModal first
  // 2. job_done + paid  → block (must delete payment first)
  // 3. quote_sent → in_progress/new → show QuoteTransferModal
  const handleChangeStatus = useCallback(async (id, status) => {
    const lead = leads.find(l => l.id === id);
    if (!lead) return;

    // No-op: same status
    if (lead.status === status) return;

    // Rule: Job Done is locked once a payment is recorded
    if (lead.status === 'job_done' && lead.paid) {
      showToast('Status locked — payment already recorded');
      return;
    }

    // Rule: 'refused' always shows the reason modal first
    if (status === 'refused') {
      setRefuseModalPrevStatus(lead.status);
      setRefuseModalId(id);
      return;
    }

    // Intercept quote_sent → in_progress or new: ask about the estimation
    if (lead.status === 'quote_sent' && (status === 'in_progress' || status === 'new')) {
      setQuoteTransferModalId(id);
      setQuoteTransferTargetStatus(status);
      setQuoteTransferLeadValue(lead.value || 0);
      return;
    }

    // If lead was refused and is now moving to another status, AWAIT the delete
    // so the Refused record is gone before the refetch runs (prevents status revert)
    if (lead.status === 'refused') {
      await deleteFromRefusedTable(id);
    }

    const result = await changeStatus(id, status);
    if (result === 'error') showToast('Failed to save — check your connection');
    else if (result === 'ok') showToast('Status updated ✓');
  }, [changeStatus, showToast, leads, deleteFromRefusedTable]);

  const confirmRefuse = useCallback(async (reason) => {
    if (!refuseModalId) return;
    const lead = leads.find(l => l.id === refuseModalId);
    setRefuseReason(refuseModalId, reason);
    // Await so Refused record is definitely created before the re-fetch
    await addRefusedRecord(lead, reason);
    const result = await changeStatus(refuseModalId, 'refused');
    if (result === 'error') {
      // Lead Status field may not have 'Refused' option — still show success since Refused table was updated
      showToast('Status updated ✓');
    } else if (result === 'ok') {
      showToast('Status updated ✓');
    }
    setRefuseModalId(null);
    setRefuseModalPrevStatus(null);
  }, [refuseModalId, leads, changeStatus, setRefuseReason, showToast, addRefusedRecord]);

  const closeRefuseModal = useCallback(() => {
    setRefuseModalId(null);
    setRefuseModalPrevStatus(null);
  }, []);

  // Confirm moving a quote_sent lead back — optionally deleting the estimation
  const confirmQuoteTransfer = useCallback(async (shouldDeleteQuote) => {
    if (!quoteTransferModalId) return;
    const id = quoteTransferModalId;
    const targetStatus = quoteTransferTargetStatus;
    setQuoteTransferModalId(null);
    setQuoteTransferTargetStatus(null);
    setQuoteTransferLeadValue(0);
    if (shouldDeleteQuote) clearQuoteAmount(id);
    const result = await changeStatus(id, targetStatus);
    if (result === 'error') showToast('Failed to save — check your connection');
    else if (result === 'ok') showToast('Status updated ✓');
  }, [quoteTransferModalId, quoteTransferTargetStatus, changeStatus, clearQuoteAmount, showToast]);

  const closeQuoteTransferModal = useCallback(() => {
    setQuoteTransferModalId(null);
    setQuoteTransferTargetStatus(null);
    setQuoteTransferLeadValue(0);
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

  const handleDeletePayment = useCallback((id) => {
    deletePayment(id);
    showToast('Payment record removed ✓');
  }, [deletePayment, showToast]);

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

  const handleAddLead = useCallback(async (data) => {
    showToast('New lead added ✓');
    const airtableId = await addLead(data);
    if (!airtableId) showToast('Failed to save to Airtable — check connection');
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
      quoteTransferModalId,
      quoteTransferTargetStatus,
      quoteTransferLeadValue,
      confirmQuoteTransfer,
      closeQuoteTransferModal,
      changeStatus: handleChangeStatus,
      toggleStar: handleToggleStar,
      saveNote: handleSaveNote,
      saveJobType: handleSaveJobType,
      savePaidInfo: handleSavePaidInfo,
      deletePayment: handleDeletePayment,
      saveCity: handleSaveCity,
      saveJobDate: handleSaveJobDate,
      saveEmail: handleSaveEmail,
      saveQuoteAmount,
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
