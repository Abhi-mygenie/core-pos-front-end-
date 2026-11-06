// CR-479: Phone validation per CRM rules
// India (+91): exactly 10 digits, starts 6-9, not all same
// International: 6-15 digits

export const validatePhone = (phone, countryCode = '+91') => {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  if (countryCode === '+91') {
    return /^[6-9]\d{9}$/.test(digits) && !/^(\d)\1{9}$/.test(digits);
  }
  return digits.length >= 6 && digits.length <= 15;
};

export const formatPhoneDisplay = (phone, countryCode) => {
  if (!phone) return '';
  return countryCode && countryCode !== '+91' ? `${countryCode} ${phone}` : phone;
};
