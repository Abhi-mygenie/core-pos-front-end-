// CR-132: Restaurant Settings Transform — 8-step wizard rewrite
// Wizard: step1=Basic, step2=Printer, step3=Channels&Info, step4=Tax,
//         step5=Order&Kitchen, step6=Online, step7=Inventory, step8=Room

// =============================================================================
// Helpers
// =============================================================================

const toBool = (val) => {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val === 1;
  if (typeof val === 'string') return val.toLowerCase() === 'yes' || val === '1' || val === 'true';
  return false;
};

const toYesNo = (bool) => (bool ? 'Yes' : 'No');

// =============================================================================
// API → Frontend (fromAPI)
// =============================================================================
export const fromAPI = {
  settingsResponse: (data) => {
    const basic    = data.basic    || {};
    const advanced = data.advanced || {};
    const vendor   = data.vendor   || {};

    return {
      // ── Step 1: Basic Settings ──────────────────────────────────────────────
      step1: {
        // Restaurant Identity
        name:              basic.name    || '',
        address:           basic.address || '',
        fssai:             basic.fssai   || '',
        phoneNumberOnBill: basic.phone_number_on_bill || '',
        shortCode:         toBool(basic.short_code),
        logoUrl:           basic.logo      || null,
        pdfMenuUrl:        basic.pdf_menu  || null,
        restaurantFor:     basic.restaurant_for || 'Normal',
        defOrdStatus:      parseInt(advanced.def_ord_status) || 2, // UI on screen1, still reads advanced
        // Operational Flags
        prepaidAutoSattle: toBool(basic.prepaid_auto_sattle),
        autoDispatch:      toBool(basic.auto_dispatch),
        ordersAutoPaid:    basic.ordersAutoPaid === 1 || basic.ordersAutoPaid === true,
        // Display & UI (F1-09: label renamed to "Show Popular Items" in UI)
        showPopularCategory: toBool(advanced.show_popular_category),
        showFoodVarriance:   toBool(advanced.show_food_varriance),
        showAcNonMenu:       toBool(advanced.show_ac_non_menu),
        foodDate:            toBool(advanced.food_date),
        foodLevelNotes:      toBool(advanced.food_level_notes),
        isBanner:            toBool(basic.is_banner),      // F1-07: pass-through, no UI
        isCategoryBox:       toBool(basic.is_category_box), // F1-08: pass-through, no UI
        // CRM & Loyalty
        isLoyality:      toBool(basic.is_loyality),   // typo preserved R9
        isCustomerWallet: toBool(basic.is_customer_wallet),
        isCoupon:         toBool(basic.is_coupon),
      },

      // ── Step 2: Printer Settings ────────────────────────────────────────────
      step2: {
        printKot:             toBool(advanced.print_kot),             // from advanced
        billingAutoBillPrint: toBool(advanced.billing_auto_bill_print), // from advanced
        noOfBill:             basic.no_of_bill   || '1',
        noOfKot:              basic.no_of_kot    || '1',
        printingInKds:        toBool(basic.printing_in_kds),
        printBillCustomerCopy: toBool(basic.print_bill_customer_copy),
        useToken:             toBool(basic.use_token),
        kotLanguage:          basic.kot_language || 'English',
      },

      // ── Step 3: Channels, Payments & Info ───────────────────────────────────
      step3: {
        // Service Channels
        dineIn:           toBool(advanced.dine_in),
        takeAway:         toBool(advanced.take_away),
        delivery:         toBool(advanced.delivery),
        room:             toBool(basic.room), // CR-132 REGRESSION FIX: was advanced.room
        onlineOrder:      toBool(basic.online_order),
        multipleMenu:     toBool(basic.multiple_menu),
        foodDifferentPrice: toBool(basic.food_different_price),
        dineinNumber:     toBool(basic.dinein_number),
        dineinOtpRequire: toBool(basic.dinein_otp_require),
        // Payments
        payCash:            toBool(advanced.pay_cash),
        payUpi:             toBool(advanced.pay_upi),
        payCc:              toBool(advanced.pay_cc),
        payTab:             toBool(advanced.pay_tab),
        onlinePayment:      toBool(advanced.online_payment),
        upiId:              advanced.upi_id || '',
        dynamicUpiValue:    toBool(advanced.dynamic_upi_value),
        orderPaymentType:   advanced.order_payment_type || 'both',
        showCashOnDelivery: toBool(advanced.show_cash_on_delivery),
        walkinOnlinePayment:   toBool(advanced.walkin_online_payment),
        dineinOnlinePayment:   toBool(advanced.dinein_online_payment),
        takeawayOnlinePayment: toBool(advanced.takeaway_online_payment),
        deliveryOnlinePayment: toBool(advanced.delivery_online_payment),
        roleBaseDiscount:   toBool(basic.role_base_discount),
        // Contact & Delivery (F1-03: phone moved here from Screen 1)
        phone:             basic.phone || '',
        reportNumber:      basic.report_number || '',
        deliveryContactNo: basic.delivery_contact_no || '',
        deliveryPersonName: advanced.delivery_person_name || '',
        // Settlement & Feedback
        settelmentReport: toBool(advanced.settelment_report),
        feedBack:         toBool(advanced.feed_back),
        sendFeedbackLink: advanced.send_feedback_link || 'internal',
        feedbackUrl:      advanced.feedback_url || '',
        // Owner Info (moved from old step6)
        firstName:   vendor.f_name || '',
        lastName:    vendor.l_name || '',
        vendorPhone: vendor.phone  || '',
      },

      // ── Step 4: Tax & Charges ────────────────────────────────────────────────
      step4: {
        // GST/VAT (moved from old step1)
        gstEnabled: (basic.gst?.status ?? 0) === 1,
        gstCode:    basic.gst?.code || '',
        gstMode:    advanced.restaurent_gst || 'category',
        gstTax:     parseFloat(advanced.gst_tax) || 0,
        tax:        parseFloat(advanced.tax)     || 0,
        vatEnabled: (basic.vat?.status ?? 0) === 1,
        vatCode:    basic.vat?.code || '',
        // Service Charge (from old step3)
        serviceCharge:           toBool(advanced.service_charge),
        autoServiceCharge:       toBool(advanced.auto_service_charge),
        serviceChargePercentage: parseFloat(advanced.service_charge_percentage) || 0,
        serviceChargeTax:        parseFloat(advanced.service_charge_tax) || 0,
        tip:               toBool(advanced.tip),
        availableDiscount: toBool(advanced.available_discount),
        totalRound:        toBool(advanced.total_round),
        // Other Charges (new)
        takeawayCharges:  parseInt(basic.takeaway_charges) || 0,
        serviceChrgTaxt:  basic.service_chrg_taxt || 'Service Charge',
        deliverChargeGst: parseFloat(basic.deliver_charge_gst) || 0,
        showUserGst:      toBool(basic.show_user_gst),
      },

      // ── Step 5: Order & Kitchen ──────────────────────────────────────────────
      step5: {
        // Order Workflow
        canclePostServe: toBool(advanced.cancle_post_serve),
        orderAutoServe:  toBool(basic.order_auto_serve),
        scheduleOrder:   toBool(basic.schedule_order),
        listServeItem:   advanced.list_serve_item || 'Dynamic',
        // KDS
        voiceInKds:         toBool(advanced.voice_in_kds),
        realTimeOrderStatus: toBool(advanced.real_time_order_status),
        // Confirmations & Pop-ups
        orderConfirmForWeb: toBool(advanced.order_confirm_for_web),
        showScanPopup:      basic.show_scan_popup != null ? toBool(basic.show_scan_popup) : true, // CR-056
        confirmOrderShowTab: toBool(basic.confirm_order_show_tab),
        confirmOrderTone:    basic.confirm_order_tone || 'default',
        locationSelection:   basic.locationSelection  || 'scanner',
        searchBy: Array.isArray(advanced.search_by) ? advanced.search_by : [],
        // CR-135 pass-throughs (no UI — echo back in toAPI to avoid clearing)
        aggregatorOrderTone:    basic.aggregator_order_tone    || 'buzzer',
        aggregatorAutoKot:      toBool(basic.aggregator_auto_kot),
        aggregatorAutoBill:     toBool(basic.aggregator_auto_bill),
        aggregatorAutoBillStage: basic.aggregator_auto_bill_stage || 'Ready',
        defaultPrepTime:        parseInt(basic.default_prep_time) || 15,
        prepTimeCountMethod:    basic.prep_time_count_method || 'quantity',
        autoPrepTimeAck:        toBool(basic.auto_prep_time_ack),
        prepTimeBonusConfig:    basic.prep_time_bonus_config || null,
        autoPaid:               toBool(basic.auto_paid),
      },

      // ── Step 6: Online Ordering ──────────────────────────────────────────────
      step6: {
        onlineOrderingLink: basic.online_ordering_link || '',
      },

      // ── Step 7: Inventory ────────────────────────────────────────────────────
      step7: {
        inventory:            toBool(advanced.inventory),
        inventoryNegative:    toBool(advanced.inventory_negative),
        inventoryAlertNumber: advanced.inventory_alert_number || '',
        inventoryManagerName: basic.inventory_manager_name  || '',
        autoAcceptInventory:  toBool(basic.auto_accept_inventory),
      },

      // ── Step 8: Room & Hospitality (conditional — step3.room = true) ─────────
      step8: {
        roomGstApplicable:  toBool(basic.room_gst_applicable),
        roomBillingIncluded: toBool(basic.room_billing_included),
        roomOtpRequire:     toBool(basic.room_otp_require),
        roomPrice:          toBool(basic.room_price),
        payViaRoom:         toBool(basic.pay_via_room),
        guestDetails:       toBool(basic.guest_details),
        bookingDetails:     toBool(basic.booking_details),
        billingEmployee:    toBool(basic.billing_employee),
      },
    };
  },
};

// =============================================================================
// Frontend → API (toAPI)
// =============================================================================
export const toAPI = {
  settingsPayload: (formState) => {
    const s1 = formState.step1;
    const s2 = formState.step2;
    const s3 = formState.step3;
    const s4 = formState.step4;
    const s5 = formState.step5;
    const s6 = formState.step6;
    const s7 = formState.step7;
    const s8 = formState.step8;

    return {
      basic: {
        // Screen 1 — Identity
        name:    s1.name,
        address: s1.address,
        fssai:   s1.fssai,
        gst: { status: s4.gstEnabled ? 1 : 0, code: s4.gstCode },
        vat: { status: s4.vatEnabled ? 1 : 0, code: s4.vatCode },
        short_code:         toYesNo(s1.shortCode),
        phone_number_on_bill: s1.phoneNumberOnBill,
        restaurant_for:     s1.restaurantFor,
        // Screen 1 — Operational Flags
        prepaid_auto_sattle: toYesNo(s1.prepaidAutoSattle),
        auto_dispatch:       toYesNo(s1.autoDispatch),
        ordersAutoPaid:      s1.ordersAutoPaid ? 1 : 0,
        // Screen 1 — Display pass-throughs (F1-07/F1-08 hidden)
        is_banner:      toYesNo(s1.isBanner),
        is_category_box: toYesNo(s1.isCategoryBox),
        // Screen 1 — CRM & Loyalty
        is_loyality:       toYesNo(s1.isLoyality),
        is_customer_wallet: toYesNo(s1.isCustomerWallet),
        is_coupon:          toYesNo(s1.isCoupon),
        // Screen 2 — Printer Settings (basic fields)
        no_of_bill:              s2.noOfBill,
        no_of_kot:               s2.noOfKot,
        printing_in_kds:         toYesNo(s2.printingInKds),
        print_bill_customer_copy: toYesNo(s2.printBillCustomerCopy),
        use_token:               toYesNo(s2.useToken),
        kot_language:            s2.kotLanguage,
        // Screen 3 — Channels (room now in basic — REGRESSION FIX)
        room:                toYesNo(s3.room),
        online_order:        toYesNo(s3.onlineOrder),
        multiple_menu:       toYesNo(s3.multipleMenu),
        food_different_price: toYesNo(s3.foodDifferentPrice),
        dinein_number:       toYesNo(s3.dineinNumber),
        dinein_otp_require:  toYesNo(s3.dineinOtpRequire),
        role_base_discount:  toYesNo(s3.roleBaseDiscount),
        // Screen 3 — Contact (phone moved here from Screen 1)
        phone:               s3.phone,
        report_number:       s3.reportNumber,
        delivery_contact_no: s3.deliveryContactNo,
        // Screen 3 — misc basic
        show_scan_popup: s5.showScanPopup ? 1 : 0, // CR-056
        // Screen 4 — Other Charges
        takeaway_charges:  parseInt(s4.takeawayCharges || 0),
        service_chrg_taxt: s4.serviceChrgTaxt,
        deliver_charge_gst: String(parseFloat(s4.deliverChargeGst || 0).toFixed(2)),
        show_user_gst:     toYesNo(s4.showUserGst),
        // Screen 5 — Order & Kitchen (basic fields)
        order_auto_serve:     toYesNo(s5.orderAutoServe),
        schedule_order:       toYesNo(s5.scheduleOrder),
        confirm_order_show_tab: toYesNo(s5.confirmOrderShowTab),
        confirm_order_tone:   s5.confirmOrderTone,
        locationSelection:    s5.locationSelection,
        // Screen 5 — CR-135 pass-throughs
        aggregator_order_tone:    s5.aggregatorOrderTone,
        aggregator_auto_kot:      toYesNo(s5.aggregatorAutoKot),
        aggregator_auto_bill:     toYesNo(s5.aggregatorAutoBill),
        aggregator_auto_bill_stage: s5.aggregatorAutoBillStage,
        default_prep_time:        s5.defaultPrepTime,
        prep_time_count_method:   s5.prepTimeCountMethod,
        auto_prep_time_ack:       toYesNo(s5.autoPrepTimeAck),
        prep_time_bonus_config:   s5.prepTimeBonusConfig,
        auto_paid:                s5.autoPaid ? 1 : 0,
        // Screen 6 — Online Ordering
        online_ordering_link: s6.onlineOrderingLink,
        // Screen 7 — Inventory
        inventory_manager_name: s7.inventoryManagerName,
        auto_accept_inventory:  toYesNo(s7.autoAcceptInventory),
        // Screen 8 — Room & Hospitality
        room_gst_applicable:  toYesNo(s8.roomGstApplicable),
        room_billing_included: toYesNo(s8.roomBillingIncluded),
        room_otp_require:     toYesNo(s8.roomOtpRequire),
        room_price:           toYesNo(s8.roomPrice),
        pay_via_room:         toYesNo(s8.payViaRoom),
        guest_details:        toYesNo(s8.guestDetails),
        booking_details:      toYesNo(s8.bookingDetails),
        billing_employee:     toYesNo(s8.billingEmployee),
      },
      advanced: {
        // Screen 3 — Channels (mixed types preserved per R9 pattern)
        dine_in:   toYesNo(s3.dineIn),
        take_away: s3.takeAway,   // bool — backend DB schema
        delivery:  s3.delivery,   // bool — backend DB schema
        // NOTE: room REMOVED from advanced (now in basic) — CR-132 regression fix
        // Screen 3 — Payments
        pay_cash:            toYesNo(s3.payCash),
        pay_upi:             toYesNo(s3.payUpi),
        pay_cc:              toYesNo(s3.payCc),
        pay_tab:             toYesNo(s3.payTab),
        online_payment:      toYesNo(s3.onlinePayment),
        upi_id:              s3.upiId,
        dynamic_upi_value:   toYesNo(s3.dynamicUpiValue),
        order_payment_type:  s3.orderPaymentType,
        show_cash_on_delivery: toYesNo(s3.showCashOnDelivery),
        walkin_online_payment:   toYesNo(s3.walkinOnlinePayment),
        dinein_online_payment:   toYesNo(s3.dineinOnlinePayment),
        takeaway_online_payment: toYesNo(s3.takeawayOnlinePayment),
        delivery_online_payment: toYesNo(s3.deliveryOnlinePayment),
        delivery_person_name: s3.deliveryPersonName,
        // Screen 3 — Settlement & Feedback
        settelment_report:  toYesNo(s3.settelmentReport),
        feed_back:          toYesNo(s3.feedBack),
        send_feedback_link: s3.sendFeedbackLink,
        feedback_url:       s3.feedbackUrl,
        // Screen 4 — Tax
        restaurent_gst:            s4.gstMode,
        gst_tax:                   String(parseFloat(s4.gstTax   || 0).toFixed(2)),
        tax:                       String(s4.tax || 0),
        service_charge:            toYesNo(s4.serviceCharge),
        auto_service_charge:       toYesNo(s4.autoServiceCharge),
        service_charge_percentage: String(parseFloat(s4.serviceChargePercentage || 0).toFixed(2)),
        service_charge_tax:        String(parseFloat(s4.serviceChargeTax || 0).toFixed(2)),
        tip:               toYesNo(s4.tip),
        available_discount: toYesNo(s4.availableDiscount),
        total_round:        toYesNo(s4.totalRound),
        // Screen 1 — defOrdStatus UI on Screen 1 but still writes to advanced
        def_ord_status: parseInt(s1.defOrdStatus) || 2,
        // Screen 2 — Printer (advanced fields)
        print_kot:              toYesNo(s2.printKot),
        billing_auto_bill_print: toYesNo(s2.billingAutoBillPrint),
        // Screen 5 — Order & Kitchen (advanced fields)
        list_serve_item:      s5.listServeItem,
        cancle_post_serve:    toYesNo(s5.canclePostServe),
        voice_in_kds:         toYesNo(s5.voiceInKds),
        real_time_order_status: toYesNo(s5.realTimeOrderStatus),
        show_popular_category: toYesNo(s1.showPopularCategory),
        food_level_notes:      toYesNo(s1.foodLevelNotes),
        show_food_varriance:   toYesNo(s1.showFoodVarriance),
        order_confirm_for_web: toYesNo(s5.orderConfirmForWeb),
        show_ac_non_menu:      toYesNo(s1.showAcNonMenu),
        food_date:             toYesNo(s1.foodDate),
        search_by:             s5.searchBy,
        // Screen 7 — Inventory
        inventory:             toYesNo(s7.inventory),
        inventory_negative:    toYesNo(s7.inventoryNegative),
        inventory_alert_number: s7.inventoryAlertNumber,
      },
      vendor: {
        f_name: s3.firstName,
        l_name: s3.lastName,
        phone:  s3.vendorPhone,
      },
    };
  },
};
