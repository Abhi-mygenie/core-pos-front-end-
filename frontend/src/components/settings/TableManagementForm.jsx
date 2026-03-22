import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { COLORS } from '../../constants';
import { tableAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useInitialData } from '../../context/InitialDataContext';
import { Button } from '../ui/button';
import { toast } from 'sonner';

const TableManagementForm = () => {
  const { token } = useAuth();
  const { 
    tables: preloadedTables, 
    rooms: preloadedRooms, 
    isDataLoaded,
    refreshTables 
  } = useInitialData();
  
  const [tables, setTables] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState('table'); // 'table' | 'room'
  const [editingItem, setEditingItem] = useState(null);

  // Initialize from preloaded data
  useEffect(() => {
    if (isDataLoaded) {
      setTables(preloadedTables);
      setRooms(preloadedRooms);
      setIsLoading(false);
    }
  }, [isDataLoaded, preloadedTables, preloadedRooms]);

  // Fetch tables and rooms (for refresh or fallback)
  const fetchData = useCallback(async () => {
    if (!token) return;
    
    try {
      setIsLoading(true);
      // Use context refresh which updates the shared state
      await refreshTables();
    } catch (error) {
      console.error('Failed to fetch tables:', error);
      toast.error('Failed to load tables');
    } finally {
      setIsLoading(false);
    }
  }, [token, refreshTables]);

  // Fallback fetch if not preloaded
  useEffect(() => {
    if (!isDataLoaded) {
      fetchData();
    }
  }, [isDataLoaded, fetchData]);

  // Group items by section (title)
  const groupBySection = (items) => {
    const grouped = {};
    items.forEach(item => {
      const section = item.title || 'Main';
      if (!grouped[section]) {
        grouped[section] = [];
      }
      grouped[section].push(item);
    });
    return grouped;
  };

  const groupedTables = groupBySection(tables);
  const groupedRooms = groupBySection(rooms);

  // Get all unique sections
  const allSections = [...new Set([
    ...Object.keys(groupedTables),
    ...Object.keys(groupedRooms)
  ])];

  // Handlers
  const handleAddTable = () => {
    setEditingItem(null);
    setAddType('table');
    setShowAddModal(true);
  };

  const handleAddRoom = () => {
    setEditingItem(null);
    setAddType('room');
    setShowAddModal(true);
  };

  const handleEdit = (item, type) => {
    setEditingItem(item);
    setAddType(type);
    setShowAddModal(true);
  };

  const handleDelete = async (item, type) => {
    const typeName = type === 'table' ? 'Table' : 'Room';
    if (!window.confirm(`Are you sure you want to delete ${typeName} ${item.table_no}?`)) {
      return;
    }
    // TODO: Call delete API when provided
    toast.info('Delete API not yet implemented');
  };

  const handleSave = async (formData) => {
    // TODO: Call create/update API when provided
    toast.info('Save API not yet implemented');
    setShowAddModal(false);
  };

  // Render item card
  const renderItemCard = (item, type) => (
    <div
      key={item.id}
      className="rounded-lg border p-4 bg-white hover:shadow-md transition-shadow"
      style={{ borderColor: COLORS.borderGray }}
      data-testid={`${type}-card-${item.id}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <span 
            className="text-lg font-bold"
            style={{ color: COLORS.darkText }}
          >
            {type === 'table' ? 'T' : 'R'}{item.table_no}
          </span>
          <div className="text-xs mt-1" style={{ color: COLORS.grayText }}>
            W: {item.waiter_id}
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => handleEdit(item, type)}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors"
            title="Edit"
            data-testid={`edit-${type}-${item.id}`}
          >
            <Pencil className="w-4 h-4" style={{ color: COLORS.grayText }} />
          </button>
          <button
            onClick={() => handleDelete(item, type)}
            className="p-1.5 rounded hover:bg-red-50 transition-colors"
            title="Delete"
            data-testid={`delete-${type}-${item.id}`}
          >
            <Trash2 className="w-4 h-4" style={{ color: '#ef4444' }} />
          </button>
        </div>
      </div>
    </div>
  );

  // Render section
  const renderSection = (sectionName, items, type) => (
    <div key={sectionName} className="mb-4">
      <div className="flex items-center gap-2 mb-3">
        <h4 className="text-sm font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>
          {sectionName}
        </h4>
        <span 
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText }}
        >
          {items.length}
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {items.map(item => renderItemCard(item, type))}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center" style={{ color: COLORS.grayText }}>
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
          <p>Loading tables and rooms...</p>
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
            Table Management
          </h2>
          <p className="text-sm mt-1" style={{ color: COLORS.grayText }}>
            Manage your restaurant tables and rooms
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={isLoading}
          data-testid="refresh-tables-btn"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Tables Section */}
      <div className="border rounded-lg p-4" style={{ borderColor: COLORS.borderGray }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: COLORS.darkText }}>
            Tables ({tables.length})
          </h3>
          <Button
            size="sm"
            onClick={handleAddTable}
            style={{ backgroundColor: COLORS.primaryGreen }}
            data-testid="add-table-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Table
          </Button>
        </div>
        
        {tables.length === 0 ? (
          <div className="text-center py-8" style={{ color: COLORS.grayText }}>
            <p>No tables found. Click "Add New Table" to create one.</p>
          </div>
        ) : (
          Object.entries(groupedTables).map(([section, items]) => 
            renderSection(section, items, 'table')
          )
        )}
      </div>

      {/* Rooms Section */}
      <div className="border rounded-lg p-4" style={{ borderColor: COLORS.borderGray }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: COLORS.darkText }}>
            Rooms ({rooms.length})
          </h3>
          <Button
            size="sm"
            onClick={handleAddRoom}
            style={{ backgroundColor: COLORS.primaryGreen }}
            data-testid="add-room-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Room
          </Button>
        </div>
        
        {rooms.length === 0 ? (
          <div className="text-center py-8" style={{ color: COLORS.grayText }}>
            <p>No rooms found. Click "Add New Room" to create one.</p>
          </div>
        ) : (
          Object.entries(groupedRooms).map(([section, items]) => 
            renderSection(section, items, 'room')
          )
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <AddEditModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={handleSave}
          item={editingItem}
          type={addType}
          sections={allSections}
        />
      )}
    </div>
  );
};

// Add/Edit Modal Component
const AddEditModal = ({ isOpen, onClose, onSave, item, type, sections }) => {
  const typeName = type === 'table' ? 'Table' : 'Room';
  const [formData, setFormData] = useState({
    table_no: item?.table_no || '',
    title: item?.title || '',
    waiter_id: item?.waiter_id || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.table_no.trim()) {
      toast.error(`${typeName} number is required`);
      return;
    }
    onSave({ ...formData, rtype: type === 'table' ? 'TB' : 'RM' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b" style={{ borderColor: COLORS.borderGray }}>
          <h3 className="text-lg font-semibold" style={{ color: COLORS.darkText }}>
            {item ? `Edit ${typeName}` : `Add New ${typeName}`}
          </h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: COLORS.darkText }}>
              {typeName} Number *
            </label>
            <input
              type="text"
              value={formData.table_no}
              onChange={(e) => setFormData({ ...formData, table_no: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{ borderColor: COLORS.borderGray }}
              placeholder={`Enter ${typeName.toLowerCase()} number`}
              data-testid="table-number-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: COLORS.darkText }}>
              Section/Area
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{ borderColor: COLORS.borderGray }}
              placeholder="e.g., Main, Outdoor, VIP"
              list="sections-list"
              data-testid="section-input"
            />
            <datalist id="sections-list">
              {sections.map(section => (
                <option key={section} value={section} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: COLORS.darkText }}>
              Waiter ID
            </label>
            <input
              type="text"
              value={formData.waiter_id}
              onChange={(e) => setFormData({ ...formData, waiter_id: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{ borderColor: COLORS.borderGray }}
              placeholder="Assign waiter ID (optional)"
              data-testid="waiter-input"
            />
          </div>

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
              data-testid="save-btn"
            >
              {item ? 'Update' : 'Create'} {typeName}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TableManagementForm;
