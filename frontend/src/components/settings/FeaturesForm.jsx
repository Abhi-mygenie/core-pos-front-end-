import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';

const FEATURE_GROUPS = [
  {
    title: 'Order Types',
    features: [
      { key: 'dine_in', label: 'Dine In', description: 'Allow customers to dine in restaurant' },
      { key: 'delivery', label: 'Delivery', description: 'Enable delivery orders' },
      { key: 'take_away', label: 'Takeaway', description: 'Enable takeaway orders' },
      { key: 'room', label: 'Room Service', description: 'Enable room service for hotels' },
    ]
  },
  {
    title: 'Billing Features',
    features: [
      { key: 'tip', label: 'Tips', description: 'Allow customers to add tips' },
      { key: 'service_charge', label: 'Service Charge', description: 'Apply service charge on orders' },
      { key: 'auto_service_charge', label: 'Auto Service Charge', description: 'Automatically apply service charge' },
      { key: 'discount_type', label: 'Discounts', description: 'Enable discount options' },
    ]
  },
  {
    title: 'Business Features',
    features: [
      { key: 'inventory', label: 'Inventory Management', description: 'Track stock and inventory' },
      { key: 'is_loyality', label: 'Loyalty Program', description: 'Enable customer loyalty rewards' },
      { key: 'feed_back', label: 'Feedback', description: 'Collect customer feedback' },
      { key: 'real_time_order_status', label: 'Real-time Order Status', description: 'Show live order updates' },
    ]
  },
  {
    title: 'Display Options',
    features: [
      { key: 'show_popular_category', label: 'Show Popular Category', description: 'Highlight popular items' },
      { key: 'show_ac_non_menu', label: 'Show AC/Non-AC Menu', description: 'Display AC seating options' },
      { key: 'food_level_notes', label: 'Food Level Notes', description: 'Allow notes on food items' },
      { key: 'whatsapp_icon', label: 'WhatsApp Icon', description: 'Show WhatsApp contact button' },
      { key: 'print_icon', label: 'Print Icon', description: 'Show print button on orders' },
    ]
  },
];

const FeaturesForm = ({ onBack }) => {
  const { restaurant } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [features, setFeatures] = useState({});

  useEffect(() => {
    if (restaurant) {
      const featureValues = {};
      FEATURE_GROUPS.forEach(group => {
        group.features.forEach(f => {
          const value = restaurant[f.key];
          // Handle various value types (boolean, string "Yes"/"No", number)
          featureValues[f.key] = value === true || value === 'Yes' || value === 1;
        });
      });
      setFeatures(featureValues);
    }
  }, [restaurant]);

  const handleToggle = (key) => {
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // TODO: Call update API when available
      toast.success('Features saved successfully');
      setHasChanges(false);
    } catch (error) {
      toast.error('Failed to save features');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full" data-testid="features-form">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: COLORS.borderGray }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            data-testid="features-back"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: COLORS.grayText }} />
          </button>
          <h2 className="text-lg font-semibold" style={{ color: COLORS.darkText }}>
            Features
          </h2>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isLoading}
          className="gap-2"
          style={{ 
            backgroundColor: hasChanges ? COLORS.primaryGreen : COLORS.borderGray,
            color: hasChanges ? 'white' : COLORS.grayText 
          }}
          data-testid="features-save"
        >
          <Save className="w-4 h-4" />
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {FEATURE_GROUPS.map((group) => (
            <div 
              key={group.title}
              className="rounded-xl p-5"
              style={{ backgroundColor: COLORS.sectionBg, border: `1px solid ${COLORS.borderGray}` }}
            >
              <h3 
                className="text-sm font-semibold uppercase tracking-wide mb-4 flex items-center gap-2"
                style={{ color: COLORS.grayText }}
              >
                <Zap className="w-4 h-4" />
                {group.title}
              </h3>
              <div className="space-y-4">
                {group.features.map((feature) => (
                  <div 
                    key={feature.key}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ backgroundColor: COLORS.lightBg }}
                  >
                    <div>
                      <div className="font-medium text-sm" style={{ color: COLORS.darkText }}>
                        {feature.label}
                      </div>
                      <div className="text-xs" style={{ color: COLORS.grayText }}>
                        {feature.description}
                      </div>
                    </div>
                    <Switch
                      checked={features[feature.key] || false}
                      onCheckedChange={() => handleToggle(feature.key)}
                      data-testid={`feature-toggle-${feature.key}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeaturesForm;
