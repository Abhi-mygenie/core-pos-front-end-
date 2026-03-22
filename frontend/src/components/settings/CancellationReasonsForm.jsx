import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { COLORS } from '../../constants';
import { useInitialData } from '../../context/InitialDataContext';
import { Button } from '../ui/button';
import { toast } from 'sonner';

const CancellationReasonsForm = () => {
  const { cancellationReasons: preloadedReasons, isDataLoaded } = useInitialData();
  
  const [reasons, setReasons] = useState([]);
  const [totalSize, setTotalSize] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Initialize from preloaded data ONLY (no API calls)
  useEffect(() => {
    if (isDataLoaded) {
      setReasons(preloadedReasons);
      setTotalSize(preloadedReasons.length);
      setIsLoading(false);
    }
  }, [isDataLoaded, preloadedReasons]);

  // Handlers
  const handleAdd = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.reason}"?`)) {
      return;
    }
    // TODO: Call delete API when provided
    toast.info('Delete API not yet implemented');
  };

  const handleSave = async (formData) => {
    // TODO: Call create/update API when provided
    toast.info('Save API not yet implemented');
    setShowModal(false);
  };

  // Get display text for item_type
  const getAppliesTo = (itemType) => {
    if (itemType === 'Order') return 'Order';
    if (itemType === 'Item') return 'Item';
    return 'All';
  };

  // Get badge color for item_type
  const getAppliesToColor = (itemType) => {
    if (itemType === 'Order') return { bg: '#dbeafe', text: '#1d4ed8' }; // Blue
    if (itemType === 'Item') return { bg: '#fef3c7', text: '#d97706' }; // Yellow
    return { bg: '#e5e7eb', text: '#374151' }; // Gray for All
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center" style={{ color: COLORS.grayText }}>
          <p>Loading cancellation reasons...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: COLORS.darkText }}>
            Cancellation Reasons
          </h2>
          <p className="text-sm mt-1" style={{ color: COLORS.grayText }}>
            Manage reasons shown when cancelling orders or items
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleAdd}
          style={{ backgroundColor: COLORS.primaryGreen }}
          data-testid="add-reason-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Reason
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden" style={{ borderColor: COLORS.borderGray }}>
        <table className="w-full">
          <thead>
            <tr style={{ backgroundColor: COLORS.sectionBg }}>
              <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: COLORS.grayText }}>
                Reason
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: COLORS.grayText }}>
                Applies To
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: COLORS.grayText }}>
                Status
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium" style={{ color: COLORS.grayText }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {reasons.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center" style={{ color: COLORS.grayText }}>
                  No cancellation reasons found. Click "Add Reason" to create one.
                </td>
              </tr>
            ) : (
              reasons.map((item) => {
                const appliesToColor = getAppliesToColor(item.item_type);
                return (
                  <tr 
                    key={item.id} 
                    className="border-t hover:bg-gray-50 transition-colors"
                    style={{ borderColor: COLORS.borderGray }}
                    data-testid={`reason-row-${item.id}`}
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium" style={{ color: COLORS.darkText }}>
                        {item.reason}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span 
                        className="text-xs px-2 py-1 rounded-full font-medium"
                        style={{ backgroundColor: appliesToColor.bg, color: appliesToColor.text }}
                      >
                        {getAppliesTo(item.item_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span 
                        className="flex items-center gap-1.5 text-sm"
                        style={{ color: item.status === 1 ? COLORS.primaryGreen : COLORS.grayText }}
                      >
                        <span 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: item.status === 1 ? COLORS.primaryGreen : COLORS.grayText }}
                        />
                        {item.status === 1 ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 rounded hover:bg-gray-100 transition-colors"
                          title="Edit"
                          data-testid={`edit-reason-${item.id}`}
                        >
                          <Pencil className="w-4 h-4" style={{ color: COLORS.grayText }} />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-2 rounded hover:bg-red-50 transition-colors"
                          title="Delete"
                          data-testid={`delete-reason-${item.id}`}
                        >
                          <Trash2 className="w-4 h-4" style={{ color: '#ef4444' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {reasons.length > 0 && (
        <div className="text-sm" style={{ color: COLORS.grayText }}>
          Showing {reasons.length} of {totalSize} reasons
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <AddEditModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          item={editingItem}
        />
      )}
    </div>
  );
};

// Add/Edit Modal Component
const AddEditModal = ({ isOpen, onClose, onSave, item }) => {
  const [formData, setFormData] = useState({
    reason: item?.reason || '',
    item_type: item?.item_type || '',
    status: item?.status ?? 1,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.reason.trim()) {
      toast.error('Reason is required');
      return;
    }
    onSave({
      ...formData,
      item_type: formData.item_type || null, // Convert empty string to null for "All"
      user_type: 'restaurant',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b" style={{ borderColor: COLORS.borderGray }}>
          <h3 className="text-lg font-semibold" style={{ color: COLORS.darkText }}>
            {item ? 'Edit Cancellation Reason' : 'Add Cancellation Reason'}
          </h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Reason */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: COLORS.darkText }}>
              Reason *
            </label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{ borderColor: COLORS.borderGray }}
              placeholder="Enter cancellation reason"
              data-testid="reason-input"
            />
          </div>

          {/* Applies To */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: COLORS.darkText }}>
              Applies To *
            </label>
            <select
              value={formData.item_type}
              onChange={(e) => setFormData({ ...formData, item_type: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{ borderColor: COLORS.borderGray }}
              data-testid="item-type-select"
            >
              <option value="">All (Generic)</option>
              <option value="Order">Order</option>
              <option value="Item">Item</option>
            </select>
            <p className="text-xs mt-1" style={{ color: COLORS.grayText }}>
              {formData.item_type === 'Order' && 'Shown when cancelling entire order'}
              {formData.item_type === 'Item' && 'Shown when cancelling single item'}
              {formData.item_type === '' && 'Shown in both order and item cancellation'}
            </p>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: COLORS.darkText }}>
              Status
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  checked={formData.status === 1}
                  onChange={() => setFormData({ ...formData, status: 1 })}
                  className="w-4 h-4"
                  style={{ accentColor: COLORS.primaryGreen }}
                />
                <span className="text-sm" style={{ color: COLORS.darkText }}>Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  checked={formData.status === 0}
                  onChange={() => setFormData({ ...formData, status: 0 })}
                  className="w-4 h-4"
                />
                <span className="text-sm" style={{ color: COLORS.darkText }}>Inactive</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              data-testid="cancel-btn"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              style={{ backgroundColor: COLORS.primaryGreen }}
              data-testid="save-reason-btn"
            >
              {item ? 'Update' : 'Save'} Reason
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CancellationReasonsForm;
