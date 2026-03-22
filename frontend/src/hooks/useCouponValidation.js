import { useState, useCallback } from "react";

/**
 * Custom hook for coupon validation
 */
const useCouponValidation = (customer, subtotal) => {
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");

  const handleApplyCoupon = useCallback(() => {
    setCouponError("");
    if (!couponCode) return false;
    
    const foundCoupon = customer?.coupons?.find(
      (c) => c.code.toLowerCase() === couponCode.toLowerCase()
    );
    
    if (foundCoupon) {
      if (foundCoupon.minOrder && subtotal < foundCoupon.minOrder) {
        setCouponError(`Min order ₹${foundCoupon.minOrder} required`);
        return false;
      }
      setSelectedCoupon(foundCoupon);
      setCouponCode("");
      return true;
    }
    
    setCouponError("Invalid coupon code");
    return false;
  }, [couponCode, customer, subtotal]);

  const handleSelectCoupon = useCallback((coupon) => {
    setSelectedCoupon(prev => prev?.code === coupon.code ? null : coupon);
    setCouponError("");
  }, []);

  const clearCoupon = useCallback(() => {
    setSelectedCoupon(null);
    setCouponCode("");
    setCouponError("");
  }, []);

  return {
    selectedCoupon,
    couponCode,
    setCouponCode,
    couponError,
    handleApplyCoupon,
    handleSelectCoupon,
    clearCoupon,
  };
};

export default useCouponValidation;
