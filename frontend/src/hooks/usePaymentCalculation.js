import { useMemo } from "react";
import { TAX_RATES } from "../data/mockDiscounts";

/**
 * Custom hook for payment calculations
 * Handles item total, discounts, taxes (SGST/CGST/VAT), and final total
 */
const usePaymentCalculation = ({
  cartItems = [],
  customer,
  useLoyalty,
  loyaltyPointsToRedeem = 0,
  selectedCoupon,
  manualDiscount = { type: "none", mode: "flat", amount: 0 },
}) => {
  // Calculate item total
  const itemTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  }, [cartItems]);

  // Separate food and alcohol items for tax calculation
  const { foodTotal, alcoholTotal } = useMemo(() => {
    let food = 0;
    let alcohol = 0;
    
    cartItems.forEach(item => {
      const itemAmount = item.price * item.qty;
      if (item.taxCategory === "alcohol") {
        alcohol += itemAmount;
      } else {
        food += itemAmount;
      }
    });
    
    return { foodTotal: food, alcoholTotal: alcohol };
  }, [cartItems]);

  // Calculate manual discount
  // Named discounts are always percentage, "none" can be flat or percent
  const manualDiscountAmount = useMemo(() => {
    if (!manualDiscount || manualDiscount.type === "none") {
      // No discount type selected - use mode (flat/percent)
      if (!manualDiscount.amount) return 0;
      if (manualDiscount.mode === "percent") {
        return Math.round((itemTotal * manualDiscount.amount) / 100);
      }
      return Math.min(manualDiscount.amount, itemTotal);
    }
    
    // Named discount - always percentage
    if (!manualDiscount.amount) return 0;
    return Math.round((itemTotal * manualDiscount.amount) / 100);
  }, [manualDiscount, itemTotal]);

  // Calculate loyalty discount
  const loyaltyDiscount = useMemo(() => {
    if (!useLoyalty || !customer || !customer.loyaltyPoints) return 0;
    const pointsToUse = Math.min(loyaltyPointsToRedeem, customer.loyaltyPoints);
    return Math.min(pointsToUse, itemTotal - manualDiscountAmount);
  }, [useLoyalty, customer, loyaltyPointsToRedeem, itemTotal, manualDiscountAmount]);

  // Calculate coupon discount
  const couponDiscount = useMemo(() => {
    if (!selectedCoupon) return 0;
    const remainingAmount = itemTotal - manualDiscountAmount - loyaltyDiscount;
    
    if (selectedCoupon.type === "percent") {
      const discount = Math.round((remainingAmount * selectedCoupon.discount) / 100);
      return Math.min(discount, selectedCoupon.maxDiscount || Infinity, remainingAmount);
    }
    return Math.min(selectedCoupon.discount || 0, remainingAmount);
  }, [selectedCoupon, itemTotal, manualDiscountAmount, loyaltyDiscount]);

  // Total discount
  const totalDiscount = useMemo(() => 
    manualDiscountAmount + loyaltyDiscount + couponDiscount,
    [manualDiscountAmount, loyaltyDiscount, couponDiscount]
  );

  // Subtotal after discounts
  const subtotal = useMemo(() => 
    Math.max(0, itemTotal - totalDiscount),
    [itemTotal, totalDiscount]
  );

  // Calculate taxes based on item categories (applied after discount proportionally)
  const { sgstAmount, cgstAmount, vatAmount } = useMemo(() => {
    if (itemTotal === 0) return { sgstAmount: 0, cgstAmount: 0, vatAmount: 0 };
    
    // Calculate proportion of discount for each category
    const discountRatio = totalDiscount / itemTotal;
    const effectiveFoodTotal = foodTotal * (1 - discountRatio);
    const effectiveAlcoholTotal = alcoholTotal * (1 - discountRatio);
    
    // SGST and CGST for food (2.5% each)
    const sgst = Math.round(effectiveFoodTotal * TAX_RATES.SGST);
    const cgst = Math.round(effectiveFoodTotal * TAX_RATES.CGST);
    
    // VAT for alcohol
    const vat = Math.round(effectiveAlcoholTotal * TAX_RATES.VAT);
    
    return { sgstAmount: sgst, cgstAmount: cgst, vatAmount: vat };
  }, [foodTotal, alcoholTotal, totalDiscount, itemTotal]);

  // Final total
  const finalTotal = useMemo(() => 
    subtotal + sgstAmount + cgstAmount + vatAmount,
    [subtotal, sgstAmount, cgstAmount, vatAmount]
  );

  // Calculate change for cash payment
  const calculateChange = (amountReceived) => {
    if (!amountReceived) return 0;
    return Math.max(0, parseFloat(amountReceived) - finalTotal);
  };

  // Get quick amount suggestions
  const getQuickAmounts = useMemo(() => {
    const amounts = [finalTotal];
    const roundedUp100 = Math.ceil(finalTotal / 100) * 100;
    const roundedUp500 = Math.ceil(finalTotal / 500) * 500;
    
    if (roundedUp100 !== finalTotal) amounts.push(roundedUp100);
    if (roundedUp500 !== finalTotal && roundedUp500 !== roundedUp100) amounts.push(roundedUp500);
    
    return amounts;
  }, [finalTotal]);

  return {
    itemTotal,
    foodTotal,
    alcoholTotal,
    manualDiscountAmount,
    loyaltyDiscount,
    couponDiscount,
    totalDiscount,
    subtotal,
    sgstAmount,
    cgstAmount,
    vatAmount,
    finalTotal,
    calculateChange,
    getQuickAmounts,
  };
};

export default usePaymentCalculation;
