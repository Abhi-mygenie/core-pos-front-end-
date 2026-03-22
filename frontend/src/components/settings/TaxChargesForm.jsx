import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Receipt, Percent } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';

const TaxChargesForm = ({ onBack }) => {
  const { restaurant, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [formData, setFormData] = useState({
    tax: '',
    gst_tax: '',
    gst_status: false,
    gst_code: '',
    service_charge: false,
    service_charge_percentage: '',
    auto_service_charge: false,
    tip: false,
    tip_tax: '',
    service_charge_tax: '',
    deliver_charge_gst: '',
    surcharge: false,
  });

  useEffect(() => {
    if (restaurant) {
      setFormData({
        tax: restaurant.tax || '',
        gst_tax: restaurant.gst_tax || '',
        gst_status: restaurant.gst_status === true,
        gst_code: profile?.gst_code || restaurant.gst_code || '',
        service_charge: restaurant.service_charge === 'Yes',
        service_charge_percentage: restaurant.service_charge_percentage || '',
        auto_service_charge: restaurant.auto_service_charge === 'Yes',
        tip: restaurant.tip === 'Yes',
        tip_tax: restaurant.tip_tax || '',
        service_charge_tax: restaurant.service_charge_tax || '',
        deliver_charge_gst: restaurant.settings?.deliver_charge_gst || '',
        surcharge: restaurant.surcharge === 'Yes',
      });
    }
  }, [restaurant, profile]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // TODO: Call update API when available
      toast.success('Tax & charges saved successfully');
      setHasChanges(false);
    } catch (error) {
      toast.error('Failed to save tax & charges');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full" data-testid="tax-charges-form">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: COLORS.borderGray }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            data-testid="tax-charges-back"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: COLORS.grayText }} />
          </button>
          <h2 className="text-lg font-semibold" style={{ color: COLORS.darkText }}>
            Tax & Charges
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
          data-testid="tax-charges-save"
        >
          <Save className="w-4 h-4" />
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* GST Settings */}
        <section 
          className="rounded-xl p-5"
          style={{ backgroundColor: COLORS.sectionBg, border: `1px solid ${COLORS.borderGray}` }}
        >
          <h3 
            className="text-sm font-semibold uppercase tracking-wide mb-4 flex items-center gap-2"
            style={{ color: COLORS.grayText }}
          >
            <Receipt className="w-4 h-4" />
            GST Settings
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: COLORS.lightBg }}>
              <div>
                <div className="font-medium text-sm" style={{ color: COLORS.darkText }}>
                  Enable GST
                </div>
                <div className="text-xs" style={{ color: COLORS.grayText }}>
                  Apply GST on all orders
                </div>
              </div>
              <Switch
                checked={formData.gst_status}
                onCheckedChange={(checked) => handleChange('gst_status', checked)}
                data-testid="toggle-gst"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gst_tax">GST Percentage (%)</Label>
                <Input
                  id="gst_tax"
                  type="number"
                  value={formData.gst_tax}
                  onChange={(e) => handleChange('gst_tax', e.target.value)}
                  placeholder="5.00"
                  data-testid="input-gst-tax"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gst_code">GST Number</Label>
                <Input
                  id="gst_code"
                  value={formData.gst_code}
                  onChange={(e) => handleChange('gst_code', e.target.value)}
                  placeholder="GSTIN"
                  data-testid="input-gst-code"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax">Additional Tax (%)</Label>
              <Input
                id="tax"
                type="number"
                value={formData.tax}
                onChange={(e) => handleChange('tax', e.target.value)}
                placeholder="0"
                data-testid="input-tax"
              />
            </div>
          </div>
        </section>

        {/* Service Charge */}
        <section 
          className="rounded-xl p-5"
          style={{ backgroundColor: COLORS.sectionBg, border: `1px solid ${COLORS.borderGray}` }}
        >
          <h3 
            className="text-sm font-semibold uppercase tracking-wide mb-4 flex items-center gap-2"
            style={{ color: COLORS.grayText }}
          >
            <Percent className="w-4 h-4" />
            Service Charge
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: COLORS.lightBg }}>
              <div>
                <div className="font-medium text-sm" style={{ color: COLORS.darkText }}>
                  Enable Service Charge
                </div>
                <div className="text-xs" style={{ color: COLORS.grayText }}>
                  Add service charge to bills
                </div>
              </div>
              <Switch
                checked={formData.service_charge}
                onCheckedChange={(checked) => handleChange('service_charge', checked)}
                data-testid="toggle-service-charge"
              />
            </div>

            {formData.service_charge && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="service_charge_percentage">Service Charge (%)</Label>
                    <Input
                      id="service_charge_percentage"
                      type="number"
                      value={formData.service_charge_percentage}
                      onChange={(e) => handleChange('service_charge_percentage', e.target.value)}
                      placeholder="10.00"
                      data-testid="input-service-charge-percentage"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service_charge_tax">Service Charge Tax (%)</Label>
                    <Input
                      id="service_charge_tax"
                      type="number"
                      value={formData.service_charge_tax}
                      onChange={(e) => handleChange('service_charge_tax', e.target.value)}
                      placeholder="0.00"
                      data-testid="input-service-charge-tax"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: COLORS.lightBg }}>
                  <div>
                    <div className="font-medium text-sm" style={{ color: COLORS.darkText }}>
                      Auto Apply Service Charge
                    </div>
                    <div className="text-xs" style={{ color: COLORS.grayText }}>
                      Automatically add service charge to all orders
                    </div>
                  </div>
                  <Switch
                    checked={formData.auto_service_charge}
                    onCheckedChange={(checked) => handleChange('auto_service_charge', checked)}
                    data-testid="toggle-auto-service-charge"
                  />
                </div>
              </>
            )}
          </div>
        </section>

        {/* Tips & Other Charges */}
        <section 
          className="rounded-xl p-5"
          style={{ backgroundColor: COLORS.sectionBg, border: `1px solid ${COLORS.borderGray}` }}
        >
          <h3 
            className="text-sm font-semibold uppercase tracking-wide mb-4"
            style={{ color: COLORS.grayText }}
          >
            Tips & Other Charges
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: COLORS.lightBg }}>
              <div>
                <div className="font-medium text-sm" style={{ color: COLORS.darkText }}>
                  Enable Tips
                </div>
                <div className="text-xs" style={{ color: COLORS.grayText }}>
                  Allow customers to add tips
                </div>
              </div>
              <Switch
                checked={formData.tip}
                onCheckedChange={(checked) => handleChange('tip', checked)}
                data-testid="toggle-tip"
              />
            </div>

            {formData.tip && (
              <div className="space-y-2">
                <Label htmlFor="tip_tax">Tip Tax (%)</Label>
                <Input
                  id="tip_tax"
                  type="number"
                  value={formData.tip_tax}
                  onChange={(e) => handleChange('tip_tax', e.target.value)}
                  placeholder="0.00"
                  data-testid="input-tip-tax"
                />
              </div>
            )}

            <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: COLORS.lightBg }}>
              <div>
                <div className="font-medium text-sm" style={{ color: COLORS.darkText }}>
                  Surcharge
                </div>
                <div className="text-xs" style={{ color: COLORS.grayText }}>
                  Apply additional surcharge on orders
                </div>
              </div>
              <Switch
                checked={formData.surcharge}
                onCheckedChange={(checked) => handleChange('surcharge', checked)}
                data-testid="toggle-surcharge"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliver_charge_gst">Delivery Charge GST (%)</Label>
              <Input
                id="deliver_charge_gst"
                type="number"
                value={formData.deliver_charge_gst}
                onChange={(e) => handleChange('deliver_charge_gst', e.target.value)}
                placeholder="5.00"
                data-testid="input-delivery-gst"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TaxChargesForm;
