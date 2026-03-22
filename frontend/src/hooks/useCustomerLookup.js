import { useState, useCallback } from "react";
import { mockCustomers } from "../data";

/**
 * Custom hook for customer lookup functionality
 */
const useCustomerLookup = () => {
  const [phone, setPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customer, setCustomer] = useState(null);
  const [customerStatus, setCustomerStatus] = useState(null); // null, 'found', 'new'

  const handleFindCustomer = useCallback(() => {
    if (phone.length >= 10) {
      const found = mockCustomers.find(c => 
        c.phone.replace(/\D/g, "").includes(phone)
      );
      if (found) {
        setCustomer(found);
        setCustomerName(found.name);
        setCustomerStatus("found");
        return found;
      } else {
        setCustomer(null);
        setCustomerStatus("new");
        return null;
      }
    }
    return null;
  }, [phone]);

  const resetCustomer = useCallback(() => {
    setPhone("");
    setCustomerName("");
    setCustomer(null);
    setCustomerStatus(null);
  }, []);

  const handlePhoneChange = useCallback((value) => {
    setPhone(value.replace(/\D/g, "").slice(0, 10));
  }, []);

  return {
    phone,
    setPhone: handlePhoneChange,
    customerName,
    setCustomerName,
    customer,
    customerStatus,
    handleFindCustomer,
    resetCustomer,
  };
};

export default useCustomerLookup;
