import { useState } from 'react';
import { useLeadsContext } from '../context/LeadsContext';

export default function NewLeadModal() {
  const { isModalOpen, setModalOpen, addLead } = useLeadsContext();

  const [form, setForm] = useState({
    source: 'form1',
    name: '',
    phone: '',
    email: '',
    subject: '',
    value: '',
  });

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSave() {
    if (!form.name.trim()) {
      alert('Name is required.');
      return;
    }
    addLead({
      source: form.source,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      subject: form.subject.trim(),
      value: parseInt(form.value) || 0,
    });
    setForm({ source: 'form1', name: '', phone: '', email: '', subject: '', value: '' });
    setModalOpen(false);
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) setModalOpen(false);
  }

  if (!isModalOpen) return null;

  return (
    <div className="overlay open" onClick={handleOverlayClick}>
      <div className="modal">
        <div className="modal-title">+ Add New Lead</div>

        <div className="fgroup">
          <label className="flabel">Source</label>
          <select className="fselect" name="source" value={form.source} onChange={handleChange}>
            <option value="form1">Form — LP Site 1</option>
            <option value="form2">Form — LP Site 2</option>
            <option value="call1">Direct Call — LP1</option>
            <option value="call2">Direct Call — LP2</option>
          </select>
        </div>
        <div className="fgroup">
          <label className="flabel">Full Name</label>
          <input className="finput" name="name" placeholder="e.g. John Smith" value={form.name} onChange={handleChange} />
        </div>
        <div className="fgroup">
          <label className="flabel">Phone</label>
          <input className="finput" name="phone" placeholder="(555) 000-0000" value={form.phone} onChange={handleChange} />
        </div>
        <div className="fgroup">
          <label className="flabel">Email</label>
          <input className="finput" name="email" placeholder="email@example.com" value={form.email} onChange={handleChange} />
        </div>
        <div className="fgroup">
          <label className="flabel">Subject / Reason</label>
          <textarea className="ftextarea" name="subject" placeholder="e.g. Quotation for 3-story commercial building…" value={form.subject} onChange={handleChange} />
        </div>
        <div className="fgroup">
          <label className="flabel">Estimated Value ($)</label>
          <input className="finput" name="value" type="number" placeholder="0" value={form.value} onChange={handleChange} />
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn-save-modal" onClick={handleSave}>Save Lead</button>
        </div>
      </div>
    </div>
  );
}
