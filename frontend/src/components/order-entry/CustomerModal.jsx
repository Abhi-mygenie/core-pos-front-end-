import { useState, useEffect, useRef } from "react";
import { X, Search, User, Calendar, CreditCard, Loader2 } from "lucide-react";
import { COLORS } from "../../constants";
import { searchCustomers, createCustomer, updateCustomer, lookupCustomer } from "../../api/services/customerService";
import { useToast } from "../../hooks/use-toast";

const CustomerModal = ({ onClose, onSave, initialData = null, restaurantId = '' }) => {
  const { toast } = useToast();
  const [name, setName] = useState(initialData?.name || "");
  const [phone, setPhone] = useState(initialData?.phone || "");
  const [birthday, setBirthday] = useState(initialData?.birthday || initialData?.dob || "");
  const [anniversary, setAnniversary] = useState(initialData?.anniversary || "");
  const [memberId, setMemberId] = useState(initialData?.id || "");
  const [memberSearch, setMemberSearch] = useState("");
  const [showMemberSuggestions, setShowMemberSuggestions] = useState(false);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const memberInputRef = useRef(null);
  // BUG-108 CustomerModal Search Parity (2026-05-23): mirror CartPanel
  // typeahead on Name and Phone fields. Member ID flow left intact per
  // owner correction (Q1=A). `selectedCRMCustomer` captures the full
  // search-result record so `handleSave` can forward CRM loyalty fields
  // (tier / totalPoints / pointsValue / walletBalance / loyalty blob) to
  // CollectPaymentPanel without a follow-up lookup round-trip.
  const [filteredByName, setFilteredByName] = useState([]);
  const [filteredByPhone, setFilteredByPhone] = useState([]);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false);
  const [isCustomerSelected, setIsCustomerSelected] = useState(!!initialData?.id);
  const [selectedCRMCustomer, setSelectedCRMCustomer] = useState(
    initialData && (initialData.tier || initialData.totalPoints || initialData.loyalty)
      ? initialData
      : null
  );
  const nameInputRef = useRef(null);
  const phoneInputRef = useRef(null);

  // Filter members based on search — CRM API call (Member ID field)
  useEffect(() => {
    if (memberSearch.trim()) {
      searchCustomers(memberSearch).then(filtered => {
        setFilteredMembers(filtered);
        setShowMemberSuggestions(filtered.length > 0);
      });
    } else {
      setFilteredMembers([]);
      setShowMemberSuggestions(false);
    }
  }, [memberSearch]);

  // BUG-108 CustomerModal Search Parity (2026-05-23): Name typeahead — mirrors
  // CartPanel.jsx behavior (threshold ≥2 chars, gated by !isCustomerSelected
  // so the dropdown does not re-open after a successful pick).
  useEffect(() => {
    if (isCustomerSelected) return;
    const q = name.trim();
    if (q.length < 2) {
      setFilteredByName([]);
      setShowNameSuggestions(false);
      return;
    }
    searchCustomers(q).then(filtered => {
      setFilteredByName(filtered);
      setShowNameSuggestions(filtered.length > 0);
    });
  }, [name, isCustomerSelected]);

  // BUG-108 CustomerModal Search Parity (2026-05-23): Phone typeahead — mirrors
  // CartPanel.jsx behavior (threshold ≥3 digits, gated by !isCustomerSelected).
  useEffect(() => {
    if (isCustomerSelected) return;
    const q = phone.trim();
    if (q.length < 3) {
      setFilteredByPhone([]);
      setShowPhoneSuggestions(false);
      return;
    }
    searchCustomers(q).then(filtered => {
      setFilteredByPhone(filtered);
      setShowPhoneSuggestions(filtered.length > 0);
    });
  }, [phone, isCustomerSelected]);

  // Close suggestions on outside click — covers Name, Phone, and Member ID
  // dropdowns. Suggestion buttons opt out via data-suggestion-modal="true".
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (e.target.closest?.('[data-suggestion-modal="true"]')) return;
      if (memberInputRef.current && !memberInputRef.current.contains(e.target)) {
        setShowMemberSuggestions(false);
      }
      if (nameInputRef.current && !nameInputRef.current.contains(e.target)) {
        setShowNameSuggestions(false);
      }
      if (phoneInputRef.current && !phoneInputRef.current.contains(e.target)) {
        setShowPhoneSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // BUG-108 CustomerModal Search Parity (2026-05-23): unified picker for the
  // Name and Phone typeahead dropdowns. Populates all three identity fields
  // (name, phone, memberId) plus the new `selectedCRMCustomer` state which
  // `handleSave` reads to forward CRM loyalty fields. Birthday/anniversary
  // are NOT auto-filled because `searchResult` transform does not return
  // them; owner can edit those manually.
  //
  // Member ID Auto-Derived Hide (2026-05-23 — Option C): `memberSearch` is
  // intentionally NOT set here. Setting it would re-surface the Member ID
  // field via the auto-derived-hide rule (see `isMemberIdAutoDerived` below),
  // which the owner asked us to hide for the auto-attached customer case.
  // `memberId` is still set so `handleSave` continues to route to the correct
  // existing-CRM-customer update branch.
  const selectModalCustomer = (c) => {
    setName(c.name || "");
    setPhone(c.phone || "");
    setMemberId(c.id || "");
    setIsCustomerSelected(true);
    setSelectedCRMCustomer(c);
    setShowNameSuggestions(false);
    setShowPhoneSuggestions(false);
    setShowMemberSuggestions(false);
  };

  // Name input change — clears selection state if user starts typing again
  // after a pick (mirrors CartPanel.handleNameChange behavior).
  const handleNameChange = (e) => {
    const v = e.target.value;
    setName(v);
    if (isCustomerSelected) {
      setIsCustomerSelected(false);
      setSelectedCRMCustomer(null);
    }
  };

  // Phone input change — same as name; keeps the 10-digit numeric mask.
  const handlePhoneChange = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(v);
    if (isCustomerSelected) {
      setIsCustomerSelected(false);
      setSelectedCRMCustomer(null);
    }
  };

  // Select member from Member ID suggestions
  const selectMember = (member) => {
    setMemberId(member.id);
    setName(member.name);
    setPhone(member.phone);
    setMemberSearch(member.id);
    setShowMemberSuggestions(false);
    // BUG-108 CustomerModal Search Parity (2026-05-23): also feed
    // `selectedCRMCustomer` so Member-ID picks share the same loyalty
    // forward path as Name/Phone picks. Behavior of the Member ID
    // dropdown is otherwise unchanged.
    setIsCustomerSelected(true);
    setSelectedCRMCustomer(member);
  };

  // Validate form
  const isValid = name.trim() && phone.trim();

  // Member ID Auto-Derived Hide (2026-05-23 — Option C, owner-approved):
  // When `memberId` is present but the cashier never typed into the
  // Member-ID search input (`memberSearch` is empty), the value was auto-
  // attached either via `initialData?.id` (modal opened with a customer
  // already on the cart) or via `selectModalCustomer` (typeahead pick on
  // the new Name/Phone fields). In both cases the Member ID field and its
  // green confirmation pill add visual noise — the cashier did not search
  // for a member, the CRM ID is just bookkeeping. Hide the field and pill.
  // Cashier interactions:
  //   • Manually search by Member ID  → memberSearch non-empty → field shown
  //   • Pick from Name/Phone typeahead → memberSearch stays empty → hidden
  //   • Open modal with cart customer → memberSearch stays empty → hidden
  //   • Open modal blank             → memberId empty → field shown
  // handleSave behavior is unchanged — `customerId = memberId` still routes
  // the existing-CRM-customer update path correctly when memberId is set.
  const isMemberIdAutoDerived = !!memberId && !memberSearch.trim();

  // Handle save — create or update in CRM
  const handleSave = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    setError(null);

    try {
      let customerId = memberId;
      // BUG-108 Loyalty Pipeline Fix (2026-05-23): hold CRM loyalty fields
      // resolved during this save flow so they can be forwarded to onSave().
      // Previously the modal called `lookupCustomer(phone)` to detect
      // duplicates but discarded the returned tier/totalPoints/pointsValue/
      // loyalty blob, causing the Collect Bill loyalty section to fall back
      // to "Loyalty program unavailable" after saving an existing customer.
      //
      // BUG-108 CustomerModal Search Parity (2026-05-23): when the cashier
      // picks a CRM customer via the new Name/Phone typeahead (or via the
      // existing Member ID search), `selectedCRMCustomer` carries the full
      // enriched record from `fromAPI.searchResult` — which already includes
      // the synthetic loyalty blob (Phase B Pipeline Fix). Prefer it as the
      // highest-priority loyalty source; fall back to `initialData` (modal
      // opened with a pre-resolved customer) and finally to a fresh
      // `lookupCustomer(phone)` for the manually-typed phone path.
      let crmLoyaltyFields = null;
      if (selectedCRMCustomer) {
        crmLoyaltyFields = {
          tier:          selectedCRMCustomer.tier,
          totalPoints:   selectedCRMCustomer.totalPoints,
          pointsValue:   selectedCRMCustomer.pointsValue,
          walletBalance: selectedCRMCustomer.walletBalance,
          loyalty:       selectedCRMCustomer.loyalty,
        };
      }

      if (customerId && !customerId.startsWith('CUST-')) {
        // Existing CRM customer — update
        await updateCustomer(customerId, {
          name: name.trim(),
          phone: phone.trim(),
          dob: birthday || undefined,
          anniversary: anniversary || undefined,
        }, restaurantId);
        // BUG-108 Loyalty Pipeline Fix: existing CRM customer selected via
        // the member-search typeahead carries loyalty fields on initialData /
        // the upstream search result. Use those directly when
        // `selectedCRMCustomer` hasn't already captured them above.
        if (!crmLoyaltyFields && initialData) {
          crmLoyaltyFields = {
            tier:          initialData.tier,
            totalPoints:   initialData.totalPoints,
            pointsValue:   initialData.pointsValue,
            walletBalance: initialData.walletBalance,
            loyalty:       initialData.loyalty,
          };
        }
      } else {
        // New customer — first check if phone exists in CRM
        let existing = null;
        try {
          existing = await lookupCustomer(phone.trim());
        } catch (lookupErr) {
          if (lookupErr.type === 'CRM_TIMEOUT') {
            // BUG-078: CRM timeout — show toast, allow cashier to proceed with manual entry.
            toast({
              title: 'CRM Timeout',
              description: lookupErr.message,
              variant: 'destructive',
              duration: 5000,
            });
            // existing stays null — fall through to "Truly new customer" create path below
          } else {
            throw lookupErr; // Re-throw unexpected errors to outer catch at L113
          }
        }
        if (existing) {
          // Phone already registered — use existing, update details
          customerId = existing.id;
          // BUG-108 Loyalty Pipeline Fix (2026-05-23): preserve the synthetic
          // loyalty blob and flat fields produced by `customerLookup` so the
          // Collect Bill loyalty section is populated immediately after save.
          // Only override `crmLoyaltyFields` if the in-modal typeahead pick
          // (`selectedCRMCustomer`) didn't already populate it.
          if (!crmLoyaltyFields) {
            crmLoyaltyFields = {
              tier:          existing.tier,
              totalPoints:   existing.totalPoints,
              pointsValue:   existing.pointsValue,
              walletBalance: existing.walletBalance,
              loyalty:       existing.loyalty,
            };
          }
          await updateCustomer(customerId, {
            name: name.trim(),
            phone: phone.trim(),
            dob: birthday || undefined,
            anniversary: anniversary || undefined,
          }, restaurantId);
        } else {
          // Truly new customer — create in CRM
          const result = await createCustomer({
            name: name.trim(),
            phone: phone.trim(),
            dob: birthday || undefined,
            anniversary: anniversary || undefined,
          }, restaurantId);

          if (result?.existing) {
            // Duplicate phone — CRM returned existing customer
            customerId = result.customer_id;
          } else {
            customerId = result?.customer_id || `CUST-${Date.now()}`;
          }
        }
      }

      const customerData = {
        id: customerId,
        name: name.trim(),
        phone: phone.trim(),
        birthday: birthday || null,
        dob: birthday || null,
        anniversary: anniversary || null,
        // BUG-108 Loyalty Pipeline Fix (2026-05-23): forward any CRM loyalty
        // fields we resolved above so CollectPaymentPanel can render the
        // loyalty preview without a follow-up lookup. Spread is last so it
        // overrides only the loyalty-related keys when present.
        ...(crmLoyaltyFields || {}),
      };

      onSave(customerData);
      onClose();
    } catch (err) {
      console.error('[CustomerModal] Save failed:', err);
      setError(err.readableMessage || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
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
          {/* Error message */}
          {error && (
            <div className="px-3 py-2 rounded-xl text-sm" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }} data-testid="customer-error">
              {error}
            </div>
          )}

          {/* Primary Fields - Name & Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div ref={nameInputRef} className="relative">
              <label className="text-xs font-medium mb-1.5 block" style={{ color: COLORS.grayText }}>
                Name <span style={{ color: COLORS.primaryOrange }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Customer name"
                value={name}
                onChange={handleNameChange}
                onFocus={() => {
                  if (!isCustomerSelected && filteredByName.length > 0) {
                    setShowNameSuggestions(true);
                  }
                }}
                className="w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2"
                style={{ borderColor: COLORS.borderGray }}
                data-testid="customer-name-input"
              />
              {/* BUG-108 CustomerModal Search Parity (2026-05-23): Name typeahead dropdown */}
              {showNameSuggestions && filteredByName.length > 0 && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 rounded-xl shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto"
                  style={{ backgroundColor: "white", border: `1px solid ${COLORS.borderGray}` }}
                  data-testid="customer-name-suggestions"
                >
                  {filteredByName.map((c) => (
                    <button
                      key={`name-${c.id || c.phone}`}
                      data-suggestion-modal="true"
                      onMouseDown={(e) => { e.preventDefault(); selectModalCustomer(c); }}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors border-b last:border-b-0"
                      style={{ borderColor: COLORS.borderGray }}
                      data-testid={`customer-name-suggestion-${c.id || c.phone}`}
                    >
                      <div className="font-medium" style={{ color: COLORS.darkText }}>{c.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: COLORS.grayText }}>{c.phone}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div ref={phoneInputRef} className="relative">
              <label className="text-xs font-medium mb-1.5 block" style={{ color: COLORS.grayText }}>
                Phone Number <span style={{ color: COLORS.primaryOrange }}>*</span>
              </label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit mobile number"
                value={phone}
                onChange={handlePhoneChange}
                onFocus={() => {
                  if (!isCustomerSelected && filteredByPhone.length > 0) {
                    setShowPhoneSuggestions(true);
                  }
                }}
                className="w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2"
                style={{ borderColor: COLORS.borderGray }}
                data-testid="customer-phone-input"
              />
              {/* BUG-108 CustomerModal Search Parity (2026-05-23): Phone typeahead dropdown */}
              {showPhoneSuggestions && filteredByPhone.length > 0 && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 rounded-xl shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto"
                  style={{ backgroundColor: "white", border: `1px solid ${COLORS.borderGray}` }}
                  data-testid="customer-phone-suggestions"
                >
                  {filteredByPhone.map((c) => (
                    <button
                      key={`phone-${c.id || c.phone}`}
                      data-suggestion-modal="true"
                      onMouseDown={(e) => { e.preventDefault(); selectModalCustomer(c); }}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors border-b last:border-b-0"
                      style={{ borderColor: COLORS.borderGray }}
                      data-testid={`customer-phone-suggestion-${c.id || c.phone}`}
                    >
                      <div className="font-medium" style={{ color: COLORS.darkText }}>{c.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: COLORS.grayText }}>{c.phone}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Secondary Fields - Birthday, Anniversary, Member ID */}
          {/* Member ID Auto-Derived Hide (2026-05-23 — Option C): grid drops
              from 3 to 2 cols when the Member ID block is hidden, so Birthday
              and Anniversary still align neatly. */}
          <div className={`grid ${isMemberIdAutoDerived ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
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
            {/* Member ID Auto-Derived Hide (2026-05-23 — Option C): wrap the
                whole grid cell so it only renders when the cashier actually
                interacted with the Member-ID search input. See
                `isMemberIdAutoDerived` derivation above for rules. */}
            {!isMemberIdAutoDerived && (
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
                          onClick={() => selectMember(member)}
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
            )}
          </div>

          {/* Member badge — also hidden when Member ID was auto-derived
              from the cart / Name-Phone typeahead pick (Option C). */}
          {!isMemberIdAutoDerived && memberId && !memberId.startsWith('CUST-') && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ backgroundColor: `${COLORS.primaryGreen}15` }}
            >
              <CreditCard className="w-4 h-4" style={{ color: COLORS.primaryGreen }} />
              <span className="text-sm font-medium" style={{ color: COLORS.primaryGreen }}>
                Member: {memberId.substring(0, 8)}...
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
            disabled={!isValid || saving}
            className="w-full py-3.5 font-semibold text-white text-base rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: COLORS.primaryGreen }}
            data-testid="customer-save-btn"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerModal;
