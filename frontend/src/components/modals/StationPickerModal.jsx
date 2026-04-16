import { useState, useEffect } from "react";
import { X, Printer } from "lucide-react";
import { COLORS } from "../../constants";

/**
 * Station Picker Modal - Multi-select stations for KOT printing
 * @param {boolean} isOpen - Modal visibility
 * @param {function} onClose - Close handler
 * @param {function} onConfirm - Confirm handler with selected stations
 * @param {Array} stations - Array of { station, itemCount } objects
 * @param {boolean} isLoading - Loading state
 */
const StationPickerModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  stations = [], 
  isLoading = false 
}) => {
  const [selectedStations, setSelectedStations] = useState([]);

  // Reset selections when modal opens
  useEffect(() => {
    if (isOpen) {
      // Select all stations by default
      setSelectedStations(stations.map(s => s.station));
    }
  }, [isOpen, stations]);

  if (!isOpen) return null;

  const handleToggleStation = (station) => {
    setSelectedStations(prev => {
      if (prev.includes(station)) {
        return prev.filter(s => s !== station);
      }
      return [...prev, station];
    });
  };

  const handleSelectAll = () => {
    if (selectedStations.length === stations.length) {
      setSelectedStations([]);
    } else {
      setSelectedStations(stations.map(s => s.station));
    }
  };

  const handleConfirm = () => {
    if (selectedStations.length > 0) {
      onConfirm(selectedStations);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4"
        onClick={e => e.stopPropagation()}
        data-testid="station-picker-modal"
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: COLORS.borderGray }}
        >
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5" style={{ color: COLORS.primaryGreen }} />
            <h3 className="font-semibold text-base" style={{ color: COLORS.darkText }}>
              Print KOT - Select Stations
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
            data-testid="station-picker-close"
          >
            <X className="w-5 h-5" style={{ color: COLORS.grayText }} />
          </button>
        </div>

        {/* Station List */}
        <div className="p-4 space-y-2">
          {/* Select All */}
          <label 
            className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 border"
            style={{ borderColor: COLORS.borderGray }}
          >
            <input
              type="checkbox"
              checked={selectedStations.length === stations.length}
              onChange={handleSelectAll}
              className="w-5 h-5 rounded"
              style={{ accentColor: COLORS.primaryGreen }}
              data-testid="station-select-all"
            />
            <span className="font-medium" style={{ color: COLORS.darkText }}>
              Select All
            </span>
          </label>

          {/* Individual Stations */}
          {stations.map(({ station, itemCount }) => (
            <label 
              key={station}
              className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-gray-50 border"
              style={{ 
                borderColor: selectedStations.includes(station) ? COLORS.primaryGreen : COLORS.borderGray,
                backgroundColor: selectedStations.includes(station) ? '#F0FDF4' : 'white'
              }}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedStations.includes(station)}
                  onChange={() => handleToggleStation(station)}
                  className="w-5 h-5 rounded"
                  style={{ accentColor: COLORS.primaryGreen }}
                  data-testid={`station-checkbox-${station}`}
                />
                <span className="font-medium" style={{ color: COLORS.darkText }}>
                  {station}
                </span>
              </div>
              <span 
                className="text-sm px-2 py-1 rounded-full"
                style={{ backgroundColor: COLORS.borderGray, color: COLORS.grayText }}
              >
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
            </label>
          ))}
        </div>

        {/* Footer */}
        <div 
          className="flex gap-3 px-4 py-3 border-t"
          style={{ borderColor: COLORS.borderGray }}
        >
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-lg font-medium border"
            style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
            data-testid="station-picker-cancel"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedStations.length === 0 || isLoading}
            className="flex-1 py-3 rounded-lg font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: COLORS.primaryGreen }}
            data-testid="station-picker-confirm"
          >
            {isLoading ? 'Printing...' : `Print KOT (${selectedStations.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StationPickerModal;
