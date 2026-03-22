import { useState, useEffect, useRef, useCallback } from "react";
import { X, Search, User, Calendar, CreditCard } from "lucide-react";
import { COLORS } from "../../constants";
import { searchCustomers } from "../../data";
import { useClickOutside } from "../../hooks";

const CustomerModal = ({ onClose, onSave, initialData = null }) => {
  const [name, setName] = useState(initialData?.name || "");
  const [phone, setPhone] = useState(initialData?.phone || "");
  const [birthday, setBirthday] = useState(initialData?.birthday || "");
  const [anniversary, setAnniversary] = useState(initialData?.anniversary || "");
  const [memberId, setMemberId] = useState(initialData?.memberId || "");
  const [memberSearch, setMemberSearch] = useState("");
  const [showMemberSuggestions, setShowMemberSuggestions] = useState(false);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const memberInputRef = useRef(null);

  // Auto-suggest state for Name & Phone fields
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [activeField, setActiveField] = useState(null); // 'name' or 'phone'
  const nameInputRef = useRef(null);
  const phoneInputRef = useRef(null);

  // Filter customers based on Name or Phone search
  useEffect(() => {
    const query = activeField === 'name' ? name : activeField === 'phone' ? phone : '';
    if (query && query.trim().length >= 3) {
      const filtered = searchCustomers(query.trim());
      setFilteredCustomers(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredCustomers([]);
      setShowSuggestions(false);
    }
  }, [name, phone, activeField]);

  // Close Name/Phone suggestions on outside click
  const handleClickOutside = useCallback(() => {
    setShowSuggestions(false);
    setActiveField(null);
  }, []);
  useClickOutside(nameInputRef, handleClickOutside, showSuggestions && activeField === 'name');
  useClickOutside(phoneInputRef, handleClickOutside, showSuggestions && activeField === 'phone');

  // Select customer from Name/Phone suggestions
  const selectCustomer = (customer) => {
    setName(customer.name);
    setPhone(customer.phone);
    setMemberId(customer.id);
    setMemberSearch(customer.id);
    setShowSuggestions(false);
    setActiveField(null);
  };

  // Filter members based on search
  useEffect(() => {
    if (memberSearch.trim()) {
      const filtered = searchCustomers(memberSearch);
      setFilteredMembers(filtered);
      setShowMemberSuggestions(filtered.length > 0);
    } else {
      setFilteredMembers([]);
      setShowMemberSuggestions(false);
    }
  }, [memberSearch]);

  // Close suggestions on outside click using custom hook
  const handleMemberClickOutside = useCallback(() => {
    setShowMemberSuggestions(false);
  }, []);
  useClickOutside(memberInputRef, handleMemberClickOutside, showMemberSuggestions);

  // Select member from suggestions
  const selectMember = (member) => {
    setMemberId(member.id);
    setName(member.name);
    setPhone(member.phone);
    setMemberSearch(member.id);
    setShowMemberSuggestions(false);
  };

  // Validate form
  const isValid = name.trim() && phone.trim();

  // Handle save
  const handleSave = () => {
    if (!isValid) return;
    
    const customerData = {
      id: memberId || `CUST-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      birthday: birthday || null,
      anniversary: anniversary || null,
      memberId: memberId || null,
    };
    
    onSave(customerData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" data-testid="customer-modal">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b" style={{ borderColor: COLORS.borderGray }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${COLORS.primaryOrange}15` }}
              >
                <User className="w-5 h-5" style={{ color: COLORS.primaryOrange }} />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: COLORS.darkText }}>
                  Customer Details
                </h2>
                <p className="text-sm" style={{ color: COLORS.grayText }}>
                  Add or update customer information
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5" style={{ color: COLORS.grayText }} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Primary Fields - Name & Phone */}
          <div className="grid grid-cols-2 gap-4">
            {/* Name Field with Auto-suggest */}
            <div className="relative" ref={nameInputRef}>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: COLORS.grayText }}>
                Name <span style={{ color: COLORS.primaryOrange }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Customer name"
                value={name}
                onChange={(e) => { const val = e.target.value; setName(val); setActiveField('name'); if (!val.trim()) { setPhone(""); setMemberId(""); setMemberSearch(""); } }}
                onFocus={() => { setActiveField('name'); if (name.length >= 3) { const f = searchCustomers(name.trim()); setFilteredCustomers(f); setShowSuggestions(f.length > 0); } }}
                className="w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2"
                style={{ borderColor: COLORS.borderGray }}
                data-testid="customer-name-input"
              />
              {showSuggestions && activeField === 'name' && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 rounded-xl shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto"
                  style={{ backgroundColor: "white", border: `1px solid ${COLORS.borderGray}` }}
                >
                  {filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      onMouseDown={(e) => { e.preventDefault(); selectCustomer(c); }}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors border-b last:border-b-0"
                      style={{ borderColor: COLORS.borderGray }}
                      data-testid={`name-suggestion-${c.id}`}
                    >
                      <div className="font-medium" style={{ color: COLORS.darkText }}>{c.name}</div>
                      <div className="text-xs" style={{ color: COLORS.grayText }}>{c.phone}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Phone Field with Auto-suggest */}
            <div className="relative" ref={phoneInputRef}>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: COLORS.grayText }}>
                Phone Number <span style={{ color: COLORS.primaryOrange }}>*</span>
              </label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => { const val = e.target.value; setPhone(val); setActiveField('phone'); if (!val.trim()) { setName(""); setMemberId(""); setMemberSearch(""); } }}
                onFocus={() => { setActiveField('phone'); if (phone.length >= 3) { const f = searchCustomers(phone.trim()); setFilteredCustomers(f); setShowSuggestions(f.length > 0); } }}
                className="w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2"
                style={{ borderColor: COLORS.borderGray }}
                data-testid="customer-phone-input"
              />
              {showSuggestions && activeField === 'phone' && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 rounded-xl shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto"
                  style={{ backgroundColor: "white", border: `1px solid ${COLORS.borderGray}` }}
                >
                  {filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      onMouseDown={(e) => { e.preventDefault(); selectCustomer(c); }}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors border-b last:border-b-0"
                      style={{ borderColor: COLORS.borderGray }}
                      data-testid={`phone-suggestion-${c.id}`}
                    >
                      <div className="font-medium" style={{ color: COLORS.darkText }}>{c.name}</div>
                      <div className="text-xs" style={{ color: COLORS.grayText }}>{c.phone}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Secondary Fields - Birthday, Anniversary, Member ID */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: COLORS.grayText }}>
                Birthday
              </label>
              <div className="relative">
                <Calendar
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: COLORS.grayText }}
                />
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2"
                  style={{ borderColor: COLORS.borderGray }}
                  data-testid="customer-birthday-input"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: COLORS.grayText }}>
                Anniversary
              </label>
              <div className="relative">
                <Calendar
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: COLORS.grayText }}
                />
                <input
                  type="date"
                  value={anniversary}
                  onChange={(e) => setAnniversary(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2"
                  style={{ borderColor: COLORS.borderGray }}
                  data-testid="customer-anniversary-input"
                />
              </div>
            </div>
            <div ref={memberInputRef}>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: COLORS.grayText }}>
                Member ID
              </label>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: COLORS.grayText }}
                />
                <input
                  type="text"
                  placeholder="Search..."
                  value={memberSearch || memberId}
                  onChange={(e) => {
                    setMemberSearch(e.target.value);
                    setMemberId("");
                  }}
                  onFocus={() => memberSearch && setShowMemberSuggestions(filteredMembers.length > 0)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2"
                  style={{ borderColor: COLORS.borderGray }}
                  data-testid="customer-member-input"
                />

                {/* Auto-suggest dropdown */}
                {showMemberSuggestions && (
                  <div
                    className="absolute top-full left-0 right-0 mt-1 rounded-xl shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto"
                    style={{ backgroundColor: "white", border: `1px solid ${COLORS.borderGray}` }}
                  >
                    {filteredMembers.map((member) => (
                      <button
                        key={member.id}
                        onMouseDown={(e) => { e.preventDefault(); selectMember(member); }}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors border-b last:border-b-0"
                        style={{ borderColor: COLORS.borderGray }}
                      >
                        <div className="font-medium" style={{ color: COLORS.darkText }}>
                          {member.name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs" style={{ color: COLORS.primaryGreen }}>
                            {member.id}
                          </span>
                          <span className="text-xs" style={{ color: COLORS.grayText }}>
                            {member.phone}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Member badge if selected */}
          {memberId && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ backgroundColor: `${COLORS.primaryGreen}15` }}
            >
              <CreditCard className="w-4 h-4" style={{ color: COLORS.primaryGreen }} />
              <span className="text-sm font-medium" style={{ color: COLORS.primaryGreen }}>
                Member: {memberId}
              </span>
              <button
                onClick={() => {
                  setMemberId("");
                  setMemberSearch("");
                }}
                className="ml-auto hover:opacity-70"
              >
                <X className="w-4 h-4" style={{ color: COLORS.primaryGreen }} />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t" style={{ borderColor: COLORS.borderGray, backgroundColor: COLORS.sectionBg }}>
          <button
            onClick={handleSave}
            disabled={!isValid}
            className="w-full py-3.5 font-semibold text-white text-base rounded-xl transition-colors disabled:opacity-50"
            style={{ backgroundColor: COLORS.primaryGreen }}
            data-testid="customer-save-btn"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerModal;
