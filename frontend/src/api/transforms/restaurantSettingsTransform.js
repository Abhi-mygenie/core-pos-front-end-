// Restaurant Settings Transform — CR-019
// Converts between API shape (basic/advanced/vendor) and per-step form objects

// =============================================================================
// Helpers
// =============================================================================

/**
 * Convert API value to boolean
 * Handles: "Yes"/"No" (string), true/false (bool), 1/0 (number)
 */
const toBool = (val) => {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val === 1;
  if (typeof val === 'string') return val.toLowerCase() === 'yes' || val === '1' || val === 'true';
  return false;
};

/**
 * Convert boolean to API "Yes"/"No" string
 */
const toYesNo = (bool) => (bool ? 'Yes' : 'No');

// =============================================================================
// API → Frontend (fromAPI)
// =============================================================================
export const fromAPI = {
  /**
   * Transform full settings response into per-step form objects
   * @param {Object} data - { basic, advanced, vendor }
   * @returns {Object} - { step1, step2, step3, step4, step5, step6 }
   */
  settingsResponse: (data) => {
    const basic = data.basic || {};
    const advanced = data.advanced || {};
    const vendor = data.vendor || {};

    return {
      step1: {
        name: basic.name || '',
        phone: basic.phone || '',
        address: basic.address || '',
        fssai: basic.fssai || '',
        shortCode: toBool(basic.short_code),
        logoUrl: basic.logo || null,
        pdfMenuUrl: basic.pdf_menu || null,
        gstEnabled: (basic.gst?.status ?? 0) === 1,
        gstCode: basic.gst?.code || '',
        gstMode: advanced.restaurent_gst || 'category',
        gstTax: parseFloat(advanced.gst_tax) || 0,
        tax: parseFloat(advanced.tax) || 0,
        vatEnabled: (basic.vat?.status ?? 0) === 1,
        vatCode: basic.vat?.code || '',
      },
      step2: {
        dineIn: toBool(advanced.dine_in),
        takeAway: toBool(advanced.take_away),
        delivery: toBool(advanced.delivery),
        room: toBool(advanced.room),
        payCash: toBool(advanced.pay_cash),
        payUpi: toBool(advanced.pay_upi),
        payCc: toBool(advanced.pay_cc),
        payTab: toBool(advanced.pay_tab),
        onlinePayment: toBool(advanced.online_payment),
        upiId: advanced.upi_id || '',
        dynamicUpiValue: toBool(advanced.dynamic_upi_value),
        orderPaymentType: advanced.order_payment_type || 'both',
        showCashOnDelivery: toBool(advanced.show_cash_on_delivery),
        walkinOnlinePayment: toBool(advanced.walkin_online_payment),
        dineinOnlinePayment: toBool(advanced.dinein_online_payment),
        takeawayOnlinePayment: toBool(advanced.takeaway_online_payment),
        deliveryOnlinePayment: toBool(advanced.delivery_online_payment),
      },
      step3: {
        serviceCharge: toBool(advanced.service_charge),
        autoServiceCharge: toBool(advanced.auto_service_charge),
        serviceChargePercentage: parseFloat(advanced.service_charge_percentage) || 0,
        serviceChargeTax: parseFloat(advanced.service_charge_tax) || 0,
        tip: toBool(advanced.tip),
        availableDiscount: toBool(advanced.available_discount),
        totalRound: toBool(advanced.total_round),
      },
      step4: {
        defOrdStatus: parseInt(advanced.def_ord_status) || 2,
        listServeItem: advanced.list_serve_item || 'Dynamic',
        printKot: toBool(advanced.print_kot),
        billingAutoBillPrint: toBool(advanced.billing_auto_bill_print),
        canclePostServe: toBool(advanced.cancle_post_serve),
        voiceInKds: toBool(advanced.voice_in_kds),
        realTimeOrderStatus: toBool(advanced.real_time_order_status),
        showPopularCategory: toBool(advanced.show_popular_category),
        foodLevelNotes: toBool(advanced.food_level_notes),
        showFoodVarriance: toBool(advanced.show_food_varriance),
        orderConfirmForWeb: toBool(advanced.order_confirm_for_web),
        showAcNonMenu: toBool(advanced.show_ac_non_menu),
        foodDate: toBool(advanced.food_date),
        searchBy: Array.isArray(advanced.search_by) ? advanced.search_by : [],
      },
      step5: {
        inventory: toBool(advanced.inventory),
        inventoryNegative: toBool(advanced.inventory_negative),
        inventoryAlertNumber: advanced.inventory_alert_number || '',
        inventoryManagerName: basic.inventory_manager_name || '',
        phoneNumberOnBill: basic.phone_number_on_bill || '',
        reportNumber: basic.report_number || '',
        deliveryContactNo: basic.delivery_contact_no || '',
        deliveryPersonName: advanced.delivery_person_name || '',
        settelmentReport: toBool(advanced.settelment_report),
        feedBack: toBool(advanced.feed_back),
        sendFeedbackLink: advanced.send_feedback_link || 'internal',
        feedbackUrl: advanced.feedback_url || '',
        onlineOrderingLink: basic.online_ordering_link || '',
      },
      step6: {
        firstName: vendor.f_name || '',
        lastName: vendor.l_name || '',
        phone: vendor.phone || '',
      },
    };
  },
};

// =============================================================================
// Frontend → API (toAPI)
// =============================================================================
export const toAPI = {
  /**
   * Reconstruct API payload from per-step form state
   * @param {Object} formState - { step1, step2, step3, step4, step5, step6 }
   * @returns {Object} - { basic, advanced, vendor }
   */
  settingsPayload: (formState) => {
    const s1 = formState.step1;
    const s2 = formState.step2;
    const s3 = formState.step3;
    const s4 = formState.step4;
    const s5 = formState.step5;
    const s6 = formState.step6;

    return {
      basic: {
        name: s1.name,
        phone: s1.phone,
        address: s1.address,
        gst: { status: s1.gstEnabled ? 1 : 0, code: s1.gstCode },
        vat: { status: s1.vatEnabled ? 1 : 0, code: s1.vatCode },
        fssai: s1.fssai,
        report_number: s5.reportNumber,
        delivery_contact_no: s5.deliveryContactNo,
        inventory_manager_name: s5.inventoryManagerName,
        online_ordering_link: s5.onlineOrderingLink,
        phone_number_on_bill: s5.phoneNumberOnBill,
        short_code: toYesNo(s1.shortCode),
      },
      advanced: {
        // Step 2 — Channels (preserve original types: dine_in="Yes"/"No", take_away/delivery=bool)
        // Step 2 — Channels (mixed types: dine_in/room="Yes"/"No" string, take_away/delivery=boolean — backend DB schema)
        dine_in: toYesNo(s2.dineIn),
        take_away: s2.takeAway,
        delivery: s2.delivery,
        room: toYesNo(s2.room),
        // Step 2 — Payments
        pay_cash: toYesNo(s2.payCash),
        pay_upi: toYesNo(s2.payUpi),
        pay_cc: toYesNo(s2.payCc),
        pay_tab: toYesNo(s2.payTab),
        online_payment: toYesNo(s2.onlinePayment),
        upi_id: s2.upiId,
        dynamic_upi_value: toYesNo(s2.dynamicUpiValue),
        order_payment_type: s2.orderPaymentType,
        show_cash_on_delivery: toYesNo(s2.showCashOnDelivery),
        walkin_online_payment: toYesNo(s2.walkinOnlinePayment),
        dinein_online_payment: toYesNo(s2.dineinOnlinePayment),
        takeaway_online_payment: toYesNo(s2.takeawayOnlinePayment),
        delivery_online_payment: toYesNo(s2.deliveryOnlinePayment),
        // Step 3 — Charges
        service_charge: toYesNo(s3.serviceCharge),
        auto_service_charge: toYesNo(s3.autoServiceCharge),
        service_charge_percentage: String(parseFloat(s3.serviceChargePercentage || 0).toFixed(2)),
        service_charge_tax: String(parseFloat(s3.serviceChargeTax || 0).toFixed(2)),
        tip: toYesNo(s3.tip),
        available_discount: toYesNo(s3.availableDiscount),
        total_round: toYesNo(s3.totalRound),
        // Step 4 — Order & Kitchen
        def_ord_status: parseInt(s4.defOrdStatus) || 2,
        list_serve_item: s4.listServeItem,
        print_kot: toYesNo(s4.printKot),
        billing_auto_bill_print: toYesNo(s4.billingAutoBillPrint),
        cancle_post_serve: toYesNo(s4.canclePostServe),
        voice_in_kds: toYesNo(s4.voiceInKds),
        real_time_order_status: toYesNo(s4.realTimeOrderStatus),
        show_popular_category: toYesNo(s4.showPopularCategory),
        food_level_notes: toYesNo(s4.foodLevelNotes),
        show_food_varriance: toYesNo(s4.showFoodVarriance),
        order_confirm_for_web: toYesNo(s4.orderConfirmForWeb),
        show_ac_non_menu: toYesNo(s4.showAcNonMenu),
        food_date: toYesNo(s4.foodDate),
        search_by: s4.searchBy,
        // Step 5 — Inventory & Extras
        inventory: toYesNo(s5.inventory),
        inventory_negative: toYesNo(s5.inventoryNegative),
        inventory_alert_number: s5.inventoryAlertNumber,
        delivery_person_name: s5.deliveryPersonName,
        settelment_report: toYesNo(s5.settelmentReport),
        feed_back: toYesNo(s5.feedBack),
        send_feedback_link: s5.sendFeedbackLink,
        feedback_url: s5.feedbackUrl,
        // Tax fields from Step 1
        restaurent_gst: s1.gstMode,
        gst_tax: String(parseFloat(s1.gstTax || 0).toFixed(2)),
        tax: String(s1.tax || 0),
      },
      vendor: {
        f_name: s6.firstName,
        l_name: s6.lastName,
        phone: s6.phone,
      },
    };
  },
};
