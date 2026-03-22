import { useMemo } from "react";
import { TAX_RATES, SERVICE_CHARGE_RATE } from "../data/mockDiscounts";

/**
 * Custom hook for payment calculations
 * Order: Item Total → Discount → Tip → Service Charge → Taxes → Final
 */
const usePaymentCalculation = ({
  cartItems = [],
  customer,
  useLoyalty,
  loyaltyPointsToRedeem = 0,
  selectedCoupon,
  manualDiscount = { type: "none", mode: "flat", amount: 0 },
  tip = 0,
  applyServiceCharge = false,
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
  const manualDiscountAmount = useMemo(() => {
    if (!manualDiscount || manualDiscount.type === "none") {
      if (!manualDiscount.amount) return 0;
      if (manualDiscount.mode === "percent") {
        return Math.round((itemTotal * manualDiscount.amount) / 100);
      }
      return Math.min(manualDiscount.amount, itemTotal);
    }
    
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

  // Amount after discount (base for service charge)
  const afterDiscount = useMemo(() => 
    Math.max(0, itemTotal - totalDiscount),
    [itemTotal, totalDiscount]
  );

  // Tip amount (flat)
  const tipAmount = useMemo(() => Math.max(0, tip || 0), [tip]);

  // Service charge (10% of after discount amount)
  const serviceChargeAmount = useMemo(() => {
    if (!applyServiceCharge) return 0;
    return Math.round(afterDiscount * SERVICE_CHARGE_RATE);
  }, [applyServiceCharge, afterDiscount]);

  // Subtotal (taxable amount = after discount + tip + service charge)
  const subtotal = useMemo(() => 
    afterDiscount + tipAmount + serviceChargeAmount,
    [afterDiscount, tipAmount, serviceChargeAmount]
  );

  // Calculate taxes based on item categories (applied on subtotal proportionally)
  const { sgstAmount, cgstAmount, vatAmount } = useMemo(() => {
    if (itemTotal === 0) return { sgstAmount: 0, cgstAmount: 0, vatAmount: 0 };
    
    // Calculate effective amounts after discount (proportional)
    const discountRatio = totalDiscount / itemTotal;
    const effectiveFoodTotal = foodTotal * (1 - discountRatio);
    const effectiveAlcoholTotal = alcoholTotal * (1 - discountRatio);
    
    // Add tip and service charge proportionally to food/alcohol
    const foodRatio = itemTotal > 0 ? foodTotal / itemTotal : 0;
    const alcoholRatio = itemTotal > 0 ? alcoholTotal / itemTotal : 0;
    
    const tipAndSC = tipAmount + serviceChargeAmount;
    const foodTaxable = effectiveFoodTotal + (tipAndSC * foodRatio);
    const alcoholTaxable = effectiveAlcoholTotal + (tipAndSC * alcoholRatio);
    
    const sgst = Math.round(foodTaxable * TAX_RATES.SGST);
    const cgst = Math.round(foodTaxable * TAX_RATES.CGST);
    const vat = Math.round(alcoholTaxable * TAX_RATES.VAT);
    
    return { sgstAmount: sgst, cgstAmount: cgst, vatAmount: vat };
  }, [foodTotal, alcoholTotal, totalDiscount, itemTotal, tipAmount, serviceChargeAmount]);

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
    afterDiscount,
    tipAmount,
    serviceChargeAmount,
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
