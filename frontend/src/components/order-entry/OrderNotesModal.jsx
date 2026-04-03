import { useState } from "react";
import { X, Plus, Clock, User } from "lucide-react";
import { COLORS } from "../../constants";
import { orderLevelPresets, getCustomerPreferences } from "../../data";

const OrderNotesModal = ({ tableId, onClose, onSave, initialNotes = [], customerId = null }) => {
  const [selectedNotes, setSelectedNotes] = useState(initialNotes);
  const [customNote, setCustomNote] = useState("");

  // Get customer preferences if available
  const customerData = customerId ? getCustomerPreferences(customerId, "order") : null;

  // Toggle preset note
  const togglePreset = (preset) => {
    setSelectedNotes((prev) => {
      const exists = prev.find((n) => n.id === preset.id);
      if (exists) {
        return prev.filter((n) => n.id !== preset.id);
      }
      return [...prev, { id: preset.id, label: preset.label, icon: preset.icon, type: "preset" }];
    });
  };

  // Add custom note
  const addCustomNote = () => {
    if (!customNote.trim()) return;
    const newNote = {
      id: `custom-${Date.now()}`,
      label: customNote.trim(),
      type: "custom",
    };
    setSelectedNotes((prev) => [...prev, newNote]);
    setCustomNote("");
  };

  // Remove note
  const removeNote = (noteId) => {
    setSelectedNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  // Add from customer preference
  const addFromPreference = (pref) => {
    const newNote = {
      id: `pref-${Date.now()}`,
      label: pref.note,
      type: "preference",
    };
    setSelectedNotes((prev) => [...prev, newNote]);
  };

  // Check if preset is selected
  const isPresetSelected = (presetId) => {
    return selectedNotes.some((n) => n.id === presetId);
  };

  // Handle save
  const handleSave = () => {
    onSave(selectedNotes);
    onClose();
  };

  // Handle key press for custom note
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustomNote();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" data-testid="order-notes-modal">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b" style={{ borderColor: COLORS.borderGray }}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold" style={{ color: COLORS.darkText }}>
                Order Notes
              </h2>
              <p className="text-sm mt-1" style={{ color: COLORS.grayText }}>
                Table {tableId} - General instructions
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5" style={{ color: COLORS.grayText }} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Custom Note Input - Top */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type custom note..."
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2"
              style={{ borderColor: COLORS.borderGray, backgroundColor: COLORS.sectionBg }}
            />
            <button
              onClick={addCustomNote}
              disabled={!customNote.trim()}
              className="px-4 py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
              style={{ backgroundColor: COLORS.primaryOrange, color: "white" }}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Added Notes Section */}
          {selectedNotes.length > 0 && (
            <div>
              <label className="text-xs font-medium mb-2 block uppercase tracking-wide" style={{ color: COLORS.grayText }}>
                Added
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedNotes.map((note) => (
                  <span
                    key={note.id}
                    className="px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1 cursor-pointer hover:opacity-80"
                    style={{ backgroundColor: COLORS.primaryGreen, color: "white" }}
                    onClick={() => removeNote(note.id)}
                  >
                    {note.icon && <span>{note.icon}</span>}
                    {note.label}
                    <X className="w-3 h-3" />
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Quick Notes Section */}
          <div>
            <label className="text-xs font-medium mb-2 block uppercase tracking-wide" style={{ color: COLORS.grayText }}>
              Quick Notes
            </label>
            <div className="flex flex-wrap gap-2">
              {orderLevelPresets.map((preset) => {
                const isSelected = isPresetSelected(preset.id);
                return (
                  <button
                    key={preset.id}
                    onClick={() => togglePreset(preset)}
                    className="px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5"
                    style={{
                      backgroundColor: isSelected ? COLORS.primaryGreen : COLORS.sectionBg,
                      color: isSelected ? "white" : COLORS.darkText,
                      border: `1px solid ${isSelected ? COLORS.primaryGreen : COLORS.borderGray}`,
                    }}
                  >
                    <span>{preset.icon}</span>
                    <span>{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Customer History Section */}
          {customerData ? (
            <div>
              <label className="text-xs font-medium mb-2 block uppercase tracking-wide" style={{ color: COLORS.grayText }}>
                👤 Customer History ({customerData.name})
              </label>
              <div className="space-y-2">
                {customerData.preferences.map((pref, idx) => (
                  <button
                    key={idx}
                    onClick={() => addFromPreference(pref)}
                    className="w-full p-3 rounded-xl text-left text-sm transition-all hover:shadow-md flex items-start gap-2"
                    style={{
                      backgroundColor: COLORS.sectionBg,
                      border: `1px solid ${COLORS.borderGray}`,
                    }}
                  >
                    <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: COLORS.grayText }} />
                    <span style={{ color: COLORS.darkText }}>{pref.note}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium mb-2 block uppercase tracking-wide" style={{ color: COLORS.grayText }}>
                👤 Customer History
              </label>
              <div
                className="p-4 rounded-xl text-center text-sm flex flex-col items-center gap-2"
                style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText }}
              >
                <User className="w-8 h-8" style={{ color: COLORS.borderGray }} />
                <span>No customer linked.</span>
                <span>Add customer to see preferences.</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t" style={{ borderColor: COLORS.borderGray, backgroundColor: COLORS.sectionBg }}>
          <button
            onClick={handleSave}
            className="w-full py-3.5 font-semibold text-white text-base rounded-xl transition-colors"
            style={{ backgroundColor: COLORS.primaryGreen }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderNotesModal;
