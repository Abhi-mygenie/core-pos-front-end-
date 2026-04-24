import { Printer, Loader2 } from "lucide-react";
import { COLORS } from "../../constants";
import { useRestaurant, useMenu } from "../../contexts";
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
      await printOrder(orderId, 'kot', stationKot);
      toast({ title: "KOT request sent", description: `Stations: ${stationKot}` });
    } catch (error) {
      console.error('[RePrint] KOT print error:', error);
      toast({ title: "Failed to send KOT request", variant: "destructive" });
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

// KOT/Bill checkboxes only (for new items to be placed)
export const KotBillCheckboxes = () => {
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
