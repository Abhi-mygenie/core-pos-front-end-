// CR-479: Shared international phone input with country code picker
// Uses react-phone-number-input for flag dropdown + libphonenumber-js for parsing
import { useState, useCallback, useRef, useEffect } from 'react';
import { getCountries, getCountryCallingCode } from 'libphonenumber-js';

// CR-479: Country data — build once
const COUNTRY_DATA = (() => {
  const countries = getCountries();
  // Country names via Intl.DisplayNames
  let displayNames;
  try { displayNames = new Intl.DisplayNames(['en'], { type: 'region' }); } catch { displayNames = null; }

  return countries.map(code => {
    let callingCode;
    try { callingCode = getCountryCallingCode(code); } catch { return null; }
    const name = displayNames ? displayNames.of(code) : code;
    return { code, name, callingCode: `+${callingCode}` };
  }).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
})();

// CR-479: Emoji flag from country code
const countryFlag = (cc) => {
  if (!cc || cc.length !== 2) return '';
  return String.fromCodePoint(...[...cc.toUpperCase()].map(c => 0x1F1E6 - 65 + c.charCodeAt(0)));
};

// CR-479: Find country by calling code
// BUG-632 fix: prefer primary country for shared calling codes (e.g., +1→US not American Samoa)
const PRIMARY_COUNTRY_MAP = { '+1': 'US', '+44': 'GB', '+7': 'RU', '+61': 'AU', '+47': 'NO', '+64': 'NZ', '+39': 'IT', '+358': 'FI', '+212': 'MA', '+262': 'RE' };
const findCountryByCallingCode = (callingCode) => {
  if (!callingCode) return null;
  const cc = callingCode.startsWith('+') ? callingCode : `+${callingCode}`;
  const primary = PRIMARY_COUNTRY_MAP[cc];
  if (primary) {
    const found = COUNTRY_DATA.find(c => c.code === primary);
    if (found) return found;
  }
  return COUNTRY_DATA.find(c => c.callingCode === cc) || null;
};

/**
 * PhoneInputField — flag dropdown + phone input
 *
 * @param {string}   phone              — raw digits (e.g. '7911123456')
 * @param {string}   countryCode        — e.g. '+44' (default '+91')
 * @param {Function} onPhoneChange      — fn(digits)
 * @param {Function} onCountryCodeChange — fn(callingCode) e.g. '+44'
 * @param {string}   placeholder
 * @param {boolean}  error
 * @param {string}   testId
 * @param {boolean}  disabled
 */
export const PhoneInputField = ({
  phone = '',
  countryCode = '+91',
  onPhoneChange,
  onCountryCodeChange,
  onBlur, // BUG-631 fix: forward blur to parent (CartPanel handleFieldBlur)
  placeholder = 'Phone number',
  error = false,
  testId = 'phone-input',
  disabled = false,
  compact = false, // BUG-631: compact mode for narrow panels (flag+code, no chevron)
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropAbove, setDropAbove] = useState(false); // BUG-632: viewport flip
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // CR-479: Find current country from calling code
  const currentCountry = findCountryByCallingCode(countryCode) || { code: 'IN', name: 'India', callingCode: '+91' };

  // CR-479: Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler); };
  }, [open]);

  // CR-479: Filter countries by search
  const filtered = search.trim()
    ? COUNTRY_DATA.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.callingCode.includes(search) ||
        c.code.toLowerCase().includes(search.toLowerCase())
      )
    : COUNTRY_DATA;

  // CR-479: Select country
  const handleSelect = useCallback((country) => {
    onCountryCodeChange(country.callingCode);
    setOpen(false);
    setSearch('');
    inputRef.current?.focus();
  }, [onCountryCodeChange]);

  // CR-479: Phone input — strip non-digits, respect country limits
  const handlePhoneInput = useCallback((e) => {
    const maxLen = countryCode === '+91' ? 10 : 15;
    const digits = e.target.value.replace(/\D/g, '').slice(0, maxLen);
    onPhoneChange(digits);
  }, [countryCode, onPhoneChange]);

  return (
    <div className="relative" ref={dropdownRef} data-testid={`${testId}-wrap`}>
      <div
        className="flex items-center border rounded-lg overflow-hidden transition-colors h-10"
        style={{
          borderColor: error ? '#EF4444' : open ? '#F97316' : '#E5E5E5', // BUG-633: match sibling border
          boxShadow: open ? '0 0 0 2px rgba(249,115,22,0.15)' : '0 1px 3px rgba(0,0,0,0.08)', // BUG-633: match sibling shadow
          backgroundColor: disabled ? '#F8FAFC' : '#f9fafb', // BUG-633: match sibling bg
        }}
      >
        {/* Flag picker button — BUG-631: compact mode for narrow panels */}
        <button
          type="button"
          onClick={() => !disabled && setOpen(!open)}
          className={`flex items-center ${compact ? 'gap-0.5 px-1.5' : 'gap-1.5 px-2.5'} py-[7px] border-r flex-shrink-0 hover:bg-slate-50 transition-colors`}
          style={{ borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' }}
          data-testid={`${testId}-country-picker`}
          disabled={disabled}
        >
          <span className={`${compact ? 'text-sm' : 'text-lg'} leading-none`}>{countryFlag(currentCountry.code)}</span>
          <span className={`${compact ? 'text-xs' : 'text-sm'} font-semibold text-slate-700`}>{currentCountry.callingCode}</span>
          {!compact && ( /* BUG-631: hide chevron in compact mode */
            <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>

        {/* Phone input */}
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={handlePhoneInput}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 outline-none px-2.5 py-[7px] text-[13px] bg-transparent min-w-0"
          style={{ color: '#1A1A1A' }}
          data-testid={testId}
        />
      </div>

      {/* Validation hint — BUG-631: hidden in compact mode */}
      {!compact && (
        <p className="text-[10px] mt-1" style={{ color: '#94A3B8' }}>
          {countryCode === '+91' ? '10 digits, starts 6-9' : '6-15 digits'}
        </p>
      )}

      {/* Country dropdown */}
      {/* BUG-632: viewport-aware dropdown positioning */}
      {open && (() => { // BUG-632: check viewport space
        const rect = dropdownRef.current?.getBoundingClientRect();
        const flipUp = rect ? (window.innerHeight - rect.bottom) < 260 : false;
        const dropW = compact ? 256 : 288;
        const alignRight = rect ? (rect.left + dropW > window.innerWidth) : false; // BUG-632: prevent horizontal overflow
        return (
        <div
          className={`absolute ${alignRight ? 'right-0' : 'left-0'} ${flipUp ? 'bottom-full mb-1' : 'top-full mt-1'} bg-white border border-slate-200 rounded-xl shadow-lg z-50 ${compact ? 'w-64' : 'w-72'} max-h-[240px] overflow-hidden flex flex-col`}
          data-testid={`${testId}-country-dropdown`}
        >
          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search country..."
            className="w-full border-b border-slate-200 px-3 py-2 text-xs outline-none"
            autoFocus
            data-testid={`${testId}-country-search`}
          />
          {/* List */}
          <div className="overflow-y-auto flex-1">
            {filtered.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => handleSelect(country)}
                className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 hover:bg-orange-50 transition-colors ${
                  country.code === currentCountry.code ? 'bg-orange-50 text-orange-700 font-semibold' : 'text-slate-700' // BUG-637: compare ISO code not callingCode
                }`}
                data-testid={`${testId}-country-${country.code}`}
              >
                <span className="text-base leading-none">{countryFlag(country.code)}</span>
                <span className="flex-1 truncate">{country.name}</span>
                <span className="text-slate-400 font-mono text-[11px]">{country.callingCode}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-xs text-slate-400 text-center">No countries found</div>
            )}
          </div>
        </div>
        ); })()}
    </div>
  );
};

export default PhoneInputField;
