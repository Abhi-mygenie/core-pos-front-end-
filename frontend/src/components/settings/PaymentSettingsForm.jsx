import { useState, useEffect } from 'react';
import { ArrowLeft, Save, CreditCard, Smartphone, Banknote, Building } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';

const PAYMENT_METHODS = [
  { key: 'pay_cash', label: 'Cash', icon: Banknote, description: 'Accept cash payments' },
  { key: 'pay_upi', label: 'UPI', icon: Smartphone, description: 'Accept UPI payments' },
  { key: 'pay_cc', label: 'Card', icon: CreditCard, description: 'Accept card payments' },
  { key: 'pay_tab', label: 'TAB', icon: Building, description: 'Allow tab/credit payments' },
];

const PaymentSettingsForm = ({ onBack }) => {
  const { restaurant } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [formData, setFormData] = useState({
    pay_cash: false,
    pay_upi: false,
    pay_cc: false,
    pay_tab: false,
    upi_id: '',
    dynamic_upi_value: false,
    online_payment: false,
    edc_type: '',
    edc_pinelab: false,
  });

  useEffect(() => {
    if (restaurant) {
      setFormData({
        pay_cash: restaurant.pay_cash === 'Yes',
        pay_upi: restaurant.pay_upi === 'Yes',
        pay_cc: restaurant.pay_cc === 'Yes',
        pay_tab: restaurant.pay_tab === 'Yes',
        upi_id: restaurant.upi_id || '',
        dynamic_upi_value: restaurant.dynamic_upi_value === 'Yes',
        online_payment: restaurant.online_payment === 'Yes',
        edc_type: restaurant.edc?.edc_type || '',
        edc_pinelab: restaurant.edc?.edc_pinelab === 'Yes',
      });
    }
  }, [restaurant]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // TODO: Call update API when available
      toast.success('Payment settings saved successfully');
      setHasChanges(false);
    } catch (error) {
      toast.error('Failed to save payment settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full" data-testid="payment-settings-form">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: COLORS.borderGray }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            data-testid="payment-settings-back"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: COLORS.grayText }} />
          </button>
          <h2 className="text-lg font-semibold" style={{ color: COLORS.darkText }}>
            Payment Settings
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
          data-testid="payment-settings-save"
        >
          <Save className="w-4 h-4" />
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Payment Methods */}
        <section 
          className="rounded-xl p-5"
          style={{ backgroundColor: COLORS.sectionBg, border: `1px solid ${COLORS.borderGray}` }}
        >
          <h3 
            className="text-sm font-semibold uppercase tracking-wide mb-4 flex items-center gap-2"
            style={{ color: COLORS.grayText }}
          >
            <CreditCard className="w-4 h-4" />
            Payment Methods
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PAYMENT_METHODS.map((method) => {
              const Icon = method.icon;
              return (
                <div 
                  key={method.key}
                  className="flex items-center justify-between p-4 rounded-lg"
                  style={{ backgroundColor: COLORS.lightBg }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${COLORS.primaryGreen}15` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: COLORS.primaryGreen }} />
                    </div>
                    <div>
                      <div className="font-medium" style={{ color: COLORS.darkText }}>
                        {method.label}
                      </div>
                      <div className="text-xs" style={{ color: COLORS.grayText }}>
                        {method.description}
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={formData[method.key]}
                    onCheckedChange={(checked) => handleChange(method.key, checked)}
                    data-testid={`payment-toggle-${method.key}`}
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* UPI Settings */}
        <section 
          className="rounded-xl p-5"
          style={{ backgroundColor: COLORS.sectionBg, border: `1px solid ${COLORS.borderGray}` }}
        >
          <h3 
            className="text-sm font-semibold uppercase tracking-wide mb-4 flex items-center gap-2"
            style={{ color: COLORS.grayText }}
          >
            <Smartphone className="w-4 h-4" />
            UPI Settings
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="upi_id">UPI ID</Label>
              <Input
                id="upi_id"
                value={formData.upi_id}
                onChange={(e) => handleChange('upi_id', e.target.value)}
                placeholder="yourname@upi"
                data-testid="input-upi-id"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: COLORS.lightBg }}>
              <div>
                <div className="font-medium text-sm" style={{ color: COLORS.darkText }}>
                  Dynamic UPI Value
                </div>
                <div className="text-xs" style={{ color: COLORS.grayText }}>
                  Generate dynamic UPI payment links
                </div>
              </div>
              <Switch
                checked={formData.dynamic_upi_value}
                onCheckedChange={(checked) => handleChange('dynamic_upi_value', checked)}
                data-testid="toggle-dynamic-upi"
              />
            </div>
          </div>
        </section>

        {/* EDC Configuration */}
        <section 
          className="rounded-xl p-5"
          style={{ backgroundColor: COLORS.sectionBg, border: `1px solid ${COLORS.borderGray}` }}
        >
          <h3 
            className="text-sm font-semibold uppercase tracking-wide mb-4 flex items-center gap-2"
            style={{ color: COLORS.grayText }}
          >
            <Building className="w-4 h-4" />
            EDC Configuration
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>EDC Provider</Label>
              <Select 
                value={formData.edc_type} 
                onValueChange={(value) => handleChange('edc_type', value)}
              >
                <SelectTrigger data-testid="select-edc-type">
                  <SelectValue placeholder="Select EDC provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pinelab">Pinelab</SelectItem>
                  <SelectItem value="Razorpay">Razorpay</SelectItem>
                  <SelectItem value="Paytm">Paytm</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: COLORS.lightBg }}>
              <div>
                <div className="font-medium text-sm" style={{ color: COLORS.darkText }}>
                  Enable EDC Integration
                </div>
                <div className="text-xs" style={{ color: COLORS.grayText }}>
                  Connect to EDC machine for card payments
                </div>
              </div>
              <Switch
                checked={formData.edc_pinelab}
                onCheckedChange={(checked) => handleChange('edc_pinelab', checked)}
                data-testid="toggle-edc"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PaymentSettingsForm;
