import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, LayoutGrid, DoorOpen, Users, RefreshCw } from 'lucide-react';
import { COLORS } from '../../constants';
import { tableAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { toast } from 'sonner';

const TableManagementForm = () => {
  const { token } = useAuth();
  const [tables, setTables] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tables'); // 'tables' | 'rooms'
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Fetch tables and rooms
  const fetchData = useCallback(async () => {
    if (!token) return;
    
    try {
      setIsLoading(true);
      const data = await tableAPI.getAllTables();
      
      // Separate tables and rooms
      const tableList = data.filter(item => item.rtype === 'TB');
      const roomList = data.filter(item => item.rtype === 'RM');
      
      setTables(tableList);
      setRooms(roomList);
    } catch (error) {
      console.error('Failed to fetch tables:', error);
      toast.error('Failed to load tables');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  // Placeholder handlers for CRUD (to be connected when APIs are provided)
  const handleAdd = () => {
    setEditingItem(null);
    setShowAddModal(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowAddModal(true);
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete ${activeTab === 'tables' ? 'Table' : 'Room'} ${item.table_no}?`)) {
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

  const currentItems = activeTab === 'tables' ? groupedTables : groupedRooms;
  const itemCount = activeTab === 'tables' ? tables.length : rooms.length;

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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleAdd}
            style={{ backgroundColor: COLORS.primaryGreen }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add {activeTab === 'tables' ? 'Table' : 'Room'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b" style={{ borderColor: COLORS.borderGray }}>
        <button
          onClick={() => setActiveTab('tables')}
          className="flex items-center gap-2 px-4 py-3 font-medium transition-colors"
          style={{
            color: activeTab === 'tables' ? COLORS.primaryGreen : COLORS.grayText,
            borderBottom: activeTab === 'tables' ? `2px solid ${COLORS.primaryGreen}` : '2px solid transparent',
          }}
        >
          <LayoutGrid className="w-4 h-4" />
          Tables ({tables.length})
        </button>
        <button
          onClick={() => setActiveTab('rooms')}
          className="flex items-center gap-2 px-4 py-3 font-medium transition-colors"
          style={{
            color: activeTab === 'rooms' ? COLORS.primaryGreen : COLORS.grayText,
            borderBottom: activeTab === 'rooms' ? `2px solid ${COLORS.primaryGreen}` : '2px solid transparent',
          }}
        >
          <DoorOpen className="w-4 h-4" />
          Rooms ({rooms.length})
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center" style={{ color: COLORS.grayText }}>
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
            <p>Loading {activeTab}...</p>
          </div>
        </div>
      ) : itemCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4" 
            style={{ backgroundColor: COLORS.sectionBg }}
          >
            {activeTab === 'tables' ? (
              <LayoutGrid className="w-8 h-8" style={{ color: COLORS.grayText }} />
            ) : (
              <DoorOpen className="w-8 h-8" style={{ color: COLORS.grayText }} />
            )}
          </div>
          <p className="text-lg font-medium" style={{ color: COLORS.darkText }}>
            No {activeTab === 'tables' ? 'Tables' : 'Rooms'} Found
          </p>
          <p className="text-sm mt-1" style={{ color: COLORS.grayText }}>
            Click "Add {activeTab === 'tables' ? 'Table' : 'Room'}" to create your first one.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(currentItems).map(([section, items]) => (
            <div key={section}>
              {/* Section Header */}
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>
                  {section}
                </h3>
                <span 
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText }}
                >
                  {items.length}
                </span>
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border p-4 hover:shadow-md transition-shadow"
                    style={{ 
                      borderColor: COLORS.borderGray,
                      backgroundColor: item.engage === 'Yes' ? `${COLORS.primaryOrange}10` : 'white'
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span 
                          className="text-lg font-bold"
                          style={{ color: COLORS.darkText }}
                        >
                          {activeTab === 'tables' ? 'T' : 'R'}{item.table_no}
                        </span>
                        <div className="flex items-center gap-1 mt-1">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: item.engage === 'Yes' ? `${COLORS.primaryOrange}20` : `${COLORS.primaryGreen}20`,
                              color: item.engage === 'Yes' ? COLORS.primaryOrange : COLORS.primaryGreen,
                            }}
                          >
                            {item.engage === 'Yes' ? 'Occupied' : 'Available'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" style={{ color: COLORS.grayText }} />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 rounded hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" style={{ color: '#ef4444' }} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="text-xs space-y-1" style={{ color: COLORS.grayText }}>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>Waiter ID: {item.waiter_id}</span>
                      </div>
                      {item.status === 1 && (
                        <span className="text-green-600">Active</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <AddEditModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={handleSave}
          item={editingItem}
          type={activeTab === 'tables' ? 'Table' : 'Room'}
          sections={Object.keys(currentItems)}
        />
      )}
    </div>
  );
};

// Add/Edit Modal Component
const AddEditModal = ({ isOpen, onClose, onSave, item, type, sections }) => {
  const [formData, setFormData] = useState({
    table_no: item?.table_no || '',
    title: item?.title || '',
    waiter_id: item?.waiter_id || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.table_no.trim()) {
      toast.error(`${type} number is required`);
      return;
    }
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b" style={{ borderColor: COLORS.borderGray }}>
          <h3 className="text-lg font-semibold" style={{ color: COLORS.darkText }}>
            {item ? `Edit ${type}` : `Add New ${type}`}
          </h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: COLORS.darkText }}>
              {type} Number *
            </label>
            <input
              type="text"
              value={formData.table_no}
              onChange={(e) => setFormData({ ...formData, table_no: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{ borderColor: COLORS.borderGray }}
              placeholder={`Enter ${type.toLowerCase()} number`}
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
              placeholder="Assign waiter (optional)"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              style={{ backgroundColor: COLORS.primaryGreen }}
            >
              {item ? 'Update' : 'Create'} {type}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TableManagementForm;
