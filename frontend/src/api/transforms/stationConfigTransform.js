// CR-161: Station Config Transform — local printer stations + printing mode
export const fromAPI = {
  stations(rawList) {
    return (rawList || []).map(s => ({
      id: s.id,
      areaName: s.area_name,
      printerName: s.printer_name || 'usb',       // connection type: usb/bluetooth/wifi
      printerType: s.printer_type || 'online',    // online/offline
      printerPaperRoll: s.printer_paper_roll || 58,
      printerIp: s.printer_ip || '',
      wifiPrinterIp: s.wifi_printer_ip || '',
      wifiPrinterName: s.wifi_printer_name || '',
      vendorId: s.vendor_id || '',
      productId: s.product_id || '',
      defaultStage: s.default,                    // null | 1(Ready) | 2(Serve) | 5(Delivered)
      stationGst: s.station_gst || '',
      autoServe: s.auto_serve === 'Yes',
    }));
  },

  areaOptions(raw) {
    return raw?.data?.options || [];
  },

  printingOption(raw) {
    return {
      mode: raw.printing_option || 'Fixed',
      employeeId: raw.employee_id || null,
      employees: (raw.employees || []).map(e => ({
        id: e.id,
        name: [e.f_name, e.l_name].filter(Boolean).join(' '),
        fixedStation: e.fixed_station === 'Yes',
      })),
    };
  },
};

export const toAPI = {
  station(form, isNew, restaurantFor) {
    const payload = {
      area_name:          form.areaName,
      printer_name:       form.printerName,
      printer_type:       form.printerType,
      printer_ip:         form.printerIp || null,
      printer_paper_roll: Number(form.printerPaperRoll),
      wifi_printer_ip:    form.wifiPrinterIp || null,
      wifi_printer_name:  form.wifiPrinterName || null,
      vendor_id:          form.vendorId || null,
      product_id:         form.productId || null,
      default:            form.defaultStage != null && form.defaultStage !== '' ? Number(form.defaultStage) : null,
      auto_serve:         form.autoServe ? 'Yes' : 'No',
      station_gst:        restaurantFor === 'food_court' ? (form.stationGst || null) : null,
    };
    if (!isNew) payload.id = form.id;
    return payload;
  },

  printingOption(mode, employeeId, restaurantId) {
    const payload = { restaurant_id: restaurantId, printing_option: mode };
    if (mode === 'Fixed' && employeeId) payload.employee_id = employeeId;
    return payload;
  },
};
