import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Tag, Plus, Trash2, Edit2, Percent } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';

const DiscountsForm = ({ onBack }) => {
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [discounts, setDiscounts] = useState([]);
  const [newDiscount, setNewDiscount] = useState({ discount_type: '', discount_percent: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (profile?.restaurant_discount_type) {
      setDiscounts(profile.restaurant_discount_type);
    }
  }, [profile]);

  const handleAddDiscount = () => {
    if (!newDiscount.discount_type || !newDiscount.discount_percent) {
      toast.error('Please fill in all fields');
      return;
    }
    setDiscounts(prev => [...prev, { 
      ...newDiscount, 
      id: Date.now(),
      discount_percent: parseFloat(newDiscount.discount_percent).toFixed(2)
    }]);
    setNewDiscount({ discount_type: '', discount_percent: '' });
    setShowAddForm(false);
    setHasChanges(true);
  };

  const handleDeleteDiscount = (id) => {
    setDiscounts(prev => prev.filter(d => d.id !== id));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // TODO: Call update API when available
      toast.success('Discounts saved successfully');
      setHasChanges(false);
    } catch (error) {
      toast.error('Failed to save discounts');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full" data-testid="discounts-form">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: COLORS.borderGray }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            data-testid="discounts-back"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: COLORS.grayText }} />
          </button>
          <h2 className="text-lg font-semibold" style={{ color: COLORS.darkText }}>
            Discounts
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setShowAddForm(true)}
            data-testid="add-discount"
          >
            <Plus className="w-4 h-4" />
            Add Discount
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isLoading}
            className="gap-2"
            style={{ 
              backgroundColor: hasChanges ? COLORS.primaryGreen : COLORS.borderGray,
              color: hasChanges ? 'white' : COLORS.grayText 
            }}
            data-testid="discounts-save"
          >
            <Save className="w-4 h-4" />
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Add Discount Form */}
        {showAddForm && (
          <div 
            className="mb-6 p-5 rounded-xl"
            style={{ backgroundColor: COLORS.sectionBg, border: `1px solid ${COLORS.primaryGreen}` }}
          >
            <h3 className="font-semibold mb-4" style={{ color: COLORS.darkText }}>
              Add New Discount
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discount_type">Discount Name</Label>
                <Input
                  id="discount_type"
                  value={newDiscount.discount_type}
                  onChange={(e) => setNewDiscount(prev => ({ ...prev, discount_type: e.target.value }))}
                  placeholder="e.g., Staff Discount"
                  data-testid="input-new-discount-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount_percent">Discount Percentage (%)</Label>
                <Input
                  id="discount_percent"
                  type="number"
                  value={newDiscount.discount_percent}
                  onChange={(e) => setNewDiscount(prev => ({ ...prev, discount_percent: e.target.value }))}
                  placeholder="10"
                  data-testid="input-new-discount-percent"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddDiscount}
                style={{ backgroundColor: COLORS.primaryGreen }}
                data-testid="confirm-add-discount"
              >
                Add Discount
              </Button>
            </div>
          </div>
        )}

        {/* Discounts List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {discounts.map((discount) => (
            <div 
              key={discount.id}
              className="rounded-xl p-5 flex items-center justify-between"
              style={{ backgroundColor: COLORS.sectionBg, border: `1px solid ${COLORS.borderGray}` }}
              data-testid={`discount-card-${discount.id}`}
            >
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${COLORS.primaryOrange}15` }}
                >
                  <Percent className="w-6 h-6" style={{ color: COLORS.primaryOrange }} />
                </div>
                <div>
                  <h3 className="font-semibold" style={{ color: COLORS.darkText }}>
                    {discount.discount_type}
                  </h3>
                  <span 
                    className="text-2xl font-bold"
                    style={{ color: COLORS.primaryGreen }}
                  >
                    {discount.discount_percent}%
                  </span>
                </div>
              </div>
              <button 
                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                onClick={() => handleDeleteDiscount(discount.id)}
                data-testid={`delete-discount-${discount.id}`}
              >
                <Trash2 className="w-4 h-4" style={{ color: '#EF4444' }} />
              </button>
            </div>
          ))}

          {discounts.length === 0 && !showAddForm && (
            <div 
              className="col-span-full flex flex-col items-center justify-center py-12 rounded-xl"
              style={{ backgroundColor: COLORS.sectionBg, border: `2px dashed ${COLORS.borderGray}` }}
            >
              <Tag className="w-12 h-12 mb-4" style={{ color: COLORS.grayText }} />
              <p className="font-medium" style={{ color: COLORS.darkText }}>No discounts configured</p>
              <p className="text-sm mb-4" style={{ color: COLORS.grayText }}>Add discount types for staff, reviews, etc.</p>
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="w-4 h-4" />
                Add First Discount
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiscountsForm;
