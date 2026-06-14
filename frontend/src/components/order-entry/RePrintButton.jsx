import { Printer, Loader2 } from "lucide-react";
import { COLORS } from "../../constants";
import { useRestaurant, useMenu, useOrders } from "../../contexts";
import { useState, useEffect } from "react";
import { printOrder } from "../../api/services/orderService";
import { useToast } from "../../hooks/use-toast";
import { getStationsFromOrderItems } from "../../api/services/stationService";
import StationPickerModal from "../modals/StationPickerModal";

// Re-Print button only (for placed items) - With station picker
export const RePrintOnlyButton = ({ orderId, cartItems = [] }) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [showStationPicker, setShowStationPicker] = useState(false);
  const [availableStations, setAvailableStations] = useState([]);
  const { toast } = useToast();
  const { getProductById } = useMenu();
  // CR-POS2-003 (May-2026): printer agents threaded into Re-Print KOT call.
  const { printerAgents } = useRestaurant();

  const handlePrintKot = async () => {
    if (!orderId || isPrinting) return;
    
    // Get placed items only (ROOM_CHECKIN_FIX_V2: exclude synthetic Check-In marker)
    const placedItems = cartItems.filter(item => item.placed && !item.isCheckInMarker);
    
    // Get stations from placed items
    const stations = getStationsFromOrderItems(placedItems, getProductById);
    console.log('[RePrint] Stations for KOT:', stations);
    
    if (stations.length === 0) {
      toast({ title: "No KOT stations", description: "No items with stations found", variant: "destructive" });
      return;
    }
    
    if (stations.length === 1) {
      // Single station - print directly
      await executePrintKot([stations[0].station]);
    } else {
      // Multiple stations - show picker
      setAvailableStations(stations);
      setShowStationPicker(true);
    }
  };

  // Execute print KOT with selected stations
  const executePrintKot = async (selectedStations) => {
    setShowStationPicker(false);
    setIsPrinting(true);
    
    try {
      const stationKot = selectedStations.join(',');
      // HOTFIX-KOT (2026-05-26): pass order data for waiterName/tablename/orderNote/items
      const order = getOrderById(orderId);
      await printOrder(orderId, 'kot', stationKot, order, 0, {}, printerAgents || []);
    } catch (error) {
      console.error('[RePrint] KOT print error:', error);
      toast({ title: "Failed to send KOT request", description: error.readableMessage, variant: "destructive" });
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <>
      <button 
        className={`flex items-center gap-2 px-4 py-2 rounded-full border ${isPrinting ? 'opacity-50' : ''}`}
        style={{ borderColor: COLORS.borderGray, color: COLORS.primaryGreen }}
        data-testid="reprint-kot-btn"
        onClick={handlePrintKot}
        disabled={isPrinting || !orderId}
        title={orderId ? "Re-Print KOT" : "Save order first to re-print"}
      >
        {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
        <span className="text-sm font-medium">Re-Print</span>
      </button>

      {/* Station Picker Modal */}
      <StationPickerModal
        isOpen={showStationPicker}
        onClose={() => setShowStationPicker(false)}
        onConfirm={executePrintKot}
        stations={availableStations}
        isLoading={isPrinting}
      />
    </>
  );
};

// Print Bill button — CR-007 / A2.3 (May-2026). Self-contained "Print Bill"
// action button that lives outside CollectPaymentPanel (e.g. in the OrderEntry
// header row next to the order-id chip).
// JSX mirrors CollectPaymentPanel:593-605 verbatim (Q-O4: "same as collect
// bill, try to reuse components and code").
// handlePrintBill mirrors OrderCard.handlePrintBill (L120-138) verbatim —
// honours restaurant.autoServiceCharge flag, NO live overrides path.
// Visibility (canPrintBill + hasPlacedItems + orderId) is the parent's call.
export const PrintBillButton = ({ orderId }) => {
  const [isPrintingBill, setIsPrintingBill] = useState(false);
  const { toast } = useToast();
  const { restaurant, printerAgents } = useRestaurant();
  const { getOrderById } = useOrders();

  const handlePrintBill = async () => {
    if (!orderId || isPrintingBill) return;
    setIsPrintingBill(true);
    try {
      const order = getOrderById(orderId);
      const scPctForPrint = restaurant?.autoServiceCharge ? (restaurant?.serviceChargePercentage || 0) : 0;
      // CR-013 (May-2026): pass component-specific GST rate pcts so the
      // dashboard re-print recompute branch (buildBillPrintPayload) uses the
      // same SC/Tip/Delivery GST rates as the live Collect Bill flow.
      // Missing/unset → 0 (force-0 fallback per frozen rule §1 row 10).
      await printOrder(orderId, 'bill', null, order, scPctForPrint, {
        serviceChargeTaxPct:  restaurant?.serviceChargeTaxPct  || 0,
        deliveryChargeGstPct: restaurant?.deliveryChargeGstPct || 0,
      }, printerAgents || []);
      // BUG-071: display user-facing number only
    } catch (error) {
      console.error('[PrintBillButton] Bill print error:', error);
      toast({ title: "Failed to send Bill request", description: error.readableMessage, variant: "destructive" });
    } finally {
      setIsPrintingBill(false);
    }
  };

  return (
    <button
      onClick={handlePrintBill}
      disabled={isPrintingBill || !orderId}
      className="flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ borderColor: COLORS.primaryOrange, color: COLORS.primaryOrange }}
      data-testid={`order-entry-print-bill-btn-${orderId}`}
      title="Print Bill"
    >
      <Printer className="w-3.5 h-3.5" />
      <span>{isPrintingBill ? 'Printing…' : 'Print Bill'}</span>
    </button>
  );
};

// KOT/Bill checkboxes only (for new items to be placed)
// BUG-3C (Apr-2026): controlled component. Parent (OrderEntry) owns state;
// component reads/writes via props. Local state and useEffect re-sync removed
// (parent owns both initialisation and runtime state).
export const KotBillCheckboxes = ({
  printAllKOT,
  setPrintAllKOT,
  printAllBill,
  setPrintAllBill,
}) => {
  return (
    <div className="flex items-center gap-4">
      {/* KOT Checkbox */}
      <label className="flex items-center gap-2 cursor-pointer" data-testid="auto-kot-checkbox">
        <input
          type="checkbox"
          checked={!!printAllKOT}
          onChange={(e) => setPrintAllKOT(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
          style={{ accentColor: COLORS.primaryOrange }}
        />
        <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>KOT</span>
      </label>

      {/* Bill Checkbox */}
      <label className="flex items-center gap-2 cursor-pointer" data-testid="auto-bill-checkbox">
        <input
          type="checkbox"
          checked={!!printAllBill}
          onChange={(e) => setPrintAllBill(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-500"
          style={{ accentColor: COLORS.primaryGreen }}
        />
        <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>Bill</span>
      </label>
    </div>
  );
};

// Legacy component - keeps both together for backward compatibility
const RePrintButton = () => {
  const { settings } = useRestaurant();
  
  // Initialize checkbox states from settings (auto values)
  const [kotChecked, setKotChecked] = useState(false);
  const [billChecked, setBillChecked] = useState(false);

  // Sync with settings when they load
  useEffect(() => {
    setKotChecked(settings?.autoKot ?? false);
    setBillChecked(settings?.autoBill ?? false);
  }, [settings?.autoKot, settings?.autoBill]);

  return (
    <div className="flex items-center gap-4">
      {/* Re-Print Button */}
      <button 
        className="flex items-center gap-2 px-4 py-2 rounded-full border"
        style={{ borderColor: COLORS.borderGray, color: COLORS.primaryGreen }}
        data-testid="reprint-kot-btn"
      >
        <Printer className="w-4 h-4" />
        <span className="text-sm font-medium">Re-Print</span>
      </button>

      {/* KOT Checkbox */}
      <label className="flex items-center gap-2 cursor-pointer" data-testid="auto-kot-checkbox">
        <input
          type="checkbox"
          checked={kotChecked}
          onChange={(e) => setKotChecked(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
          style={{ accentColor: COLORS.primaryOrange }}
        />
        <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>KOT</span>
      </label>

      {/* Bill Checkbox */}
      <label className="flex items-center gap-2 cursor-pointer" data-testid="auto-bill-checkbox">
        <input
          type="checkbox"
          checked={billChecked}
          onChange={(e) => setBillChecked(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-500"
          style={{ accentColor: COLORS.primaryGreen }}
        />
        <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>Bill</span>
      </label>
    </div>
  );
};

export default RePrintButton;
