import { useMemo } from "react";

/**
 * Custom hook for payment calculations
 * Handles subtotal, tax, discounts, and final total
 */
const usePaymentCalculation = ({
  total,
  taxRate = 0.05,
  customer,
  useLoyalty,
  useWallet,
  walletAmount,
  selectedCoupon,
}) => {
  const subtotal = total;
  const tax = useMemo(() => Math.round(subtotal * taxRate), [subtotal, taxRate]);

  // Calculate loyalty discount
  const loyaltyDiscount = useMemo(() => {
    if (!useLoyalty || !customer) return 0;
    return Math.min(customer.loyaltyPoints || 0, subtotal);
  }, [useLoyalty, customer, subtotal]);

  // Calculate wallet discount
  const walletDiscount = useMemo(() => {
    if (!useWallet || !customer) return 0;
    const maxWallet = walletAmount || customer.walletBalance || 0;
    return Math.min(maxWallet, subtotal - loyaltyDiscount);
  }, [useWallet, customer, walletAmount, subtotal, loyaltyDiscount]);

  // Calculate coupon discount
  const couponDiscount = useMemo(() => {
    if (!selectedCoupon) return 0;
    if (selectedCoupon.type === "percent") {
      return Math.min(
        Math.round((subtotal * selectedCoupon.discount) / 100),
        selectedCoupon.maxDiscount || Infinity
      );
    }
    return selectedCoupon.discount || 0;
  }, [selectedCoupon, subtotal]);

  // Total calculations
  const totalDiscount = useMemo(() => 
    loyaltyDiscount + walletDiscount + couponDiscount,
    [loyaltyDiscount, walletDiscount, couponDiscount]
  );

  const finalTotal = useMemo(() => 
    Math.max(0, subtotal + tax - totalDiscount),
    [subtotal, tax, totalDiscount]
  );

  // Calculate change for cash payment
  const calculateChange = (amountReceived) => {
    if (!amountReceived) return 0;
    return Math.max(0, parseFloat(amountReceived) - finalTotal);
  };

  // Get quick amount suggestions
  const getQuickAmounts = useMemo(() => [
    finalTotal,
    Math.ceil(finalTotal / 100) * 100,
    Math.ceil(finalTotal / 500) * 500,
  ], [finalTotal]);

  return {
    subtotal,
    tax,
    loyaltyDiscount,
    walletDiscount,
    couponDiscount,
    totalDiscount,
    finalTotal,
    calculateChange,
    getQuickAmounts,
  };
};

export default usePaymentCalculation;
