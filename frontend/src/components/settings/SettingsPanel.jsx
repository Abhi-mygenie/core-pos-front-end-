import { useState } from 'react';
import { 
  Building2, Clock, Zap, CreditCard, Receipt, Printer, 
  Tag, FileText, ChevronRight, X, LayoutGrid
} from 'lucide-react';
import { COLORS } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import BasicInfoForm from './BasicInfoForm';
import OperatingHoursForm from './OperatingHoursForm';
import FeaturesForm from './FeaturesForm';
import PaymentSettingsForm from './PaymentSettingsForm';
import TaxChargesForm from './TaxChargesForm';
import PrintersForm from './PrintersForm';
import DiscountsForm from './DiscountsForm';
import TermsForm from './TermsForm';
import TableManagementForm from './TableManagementForm';

const settingsMenuItems = [
  {
    id: 'basic-info',
    label: 'Basic Info',
    description: 'Name, Logo, Contact, Address',
    icon: Building2,
    permission: 'restaurant_setup',
  },
  {
    id: 'table-management',
    label: 'Table Management',
    description: 'Tables, Rooms, Sections',
    icon: LayoutGrid,
    permission: 'restaurant_settings',
  },
  {
    id: 'operating-hours',
    label: 'Operating Hours',
    description: 'Weekly schedule, Open/Close times',
    icon: Clock,
    permission: 'restaurant_settings',
  },
  {
    id: 'features',
    label: 'Features',
    description: 'Dine-in, Delivery, Takeaway toggles',
    icon: Zap,
    permission: 'restaurant_settings',
  },
  {
    id: 'payment',
    label: 'Payment Settings',
    description: 'UPI, Card, Cash, EDC Config',
    icon: CreditCard,
    permission: 'restaurant_settings',
  },
  {
    id: 'tax-charges',
    label: 'Tax & Charges',
    description: 'GST, Service Charge, Tips',
    icon: Receipt,
    permission: 'restaurant_settings',
  },
  {
    id: 'printers',
    label: 'Printers',
    description: 'KOT, Bill Configuration',
    icon: Printer,
    permission: 'printer_management',
  },
  {
    id: 'discounts',
    label: 'Discounts',
    description: 'Staff, Review, Custom discounts',
    icon: Tag,
    permission: 'discount',
  },
  {
    id: 'terms',
    label: 'Terms & Conditions',
    description: 'Bill T&C',
    icon: FileText,
    permission: 'restaurant_settings',
  },
];

const SettingsPanel = ({ onClose }) => {
  const { hasPermission, restaurant, roles, isLoading } = useAuth();
  const [activeSection, setActiveSection] = useState(null);

  const handleBack = () => {
    setActiveSection(null);
  };

  // Filter menu items based on permissions
  const visibleMenuItems = settingsMenuItems.filter(
    item => !item.permission || roles.length === 0 || hasPermission(item.permission)
  );

  // Render active section content
  if (activeSection === 'basic-info') {
    return (
      <div 
        className="h-full flex flex-col rounded-2xl shadow-sm overflow-hidden"
        style={{ backgroundColor: COLORS.lightBg }}
        data-testid="settings-panel"
      >
        <BasicInfoForm onBack={handleBack} />
      </div>
    );
  }

  if (activeSection === 'table-management') {
    return (
      <div 
        className="h-full flex flex-col rounded-2xl shadow-sm overflow-hidden"
        style={{ backgroundColor: COLORS.lightBg }}
        data-testid="settings-panel"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: COLORS.borderGray }}>
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-sm font-medium hover:opacity-80"
            style={{ color: COLORS.primaryGreen }}
          >
            ← Back to Settings
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <TableManagementForm />
        </div>
      </div>
    );
  }

  if (activeSection === 'operating-hours') {
    return (
      <div 
        className="h-full flex flex-col rounded-2xl shadow-sm overflow-hidden"
        style={{ backgroundColor: COLORS.lightBg }}
        data-testid="settings-panel"
      >
        <OperatingHoursForm onBack={handleBack} />
      </div>
    );
  }

  if (activeSection === 'features') {
    return (
      <div 
        className="h-full flex flex-col rounded-2xl shadow-sm overflow-hidden"
        style={{ backgroundColor: COLORS.lightBg }}
        data-testid="settings-panel"
      >
        <FeaturesForm onBack={handleBack} />
      </div>
    );
  }

  if (activeSection === 'payment') {
    return (
      <div 
        className="h-full flex flex-col rounded-2xl shadow-sm overflow-hidden"
        style={{ backgroundColor: COLORS.lightBg }}
        data-testid="settings-panel"
      >
        <PaymentSettingsForm onBack={handleBack} />
      </div>
    );
  }

  if (activeSection === 'tax-charges') {
    return (
      <div 
        className="h-full flex flex-col rounded-2xl shadow-sm overflow-hidden"
        style={{ backgroundColor: COLORS.lightBg }}
        data-testid="settings-panel"
      >
        <TaxChargesForm onBack={handleBack} />
      </div>
    );
  }

  if (activeSection === 'printers') {
    return (
      <div 
        className="h-full flex flex-col rounded-2xl shadow-sm overflow-hidden"
        style={{ backgroundColor: COLORS.lightBg }}
        data-testid="settings-panel"
      >
        <PrintersForm onBack={handleBack} />
      </div>
    );
  }

  if (activeSection === 'discounts') {
    return (
      <div 
        className="h-full flex flex-col rounded-2xl shadow-sm overflow-hidden"
        style={{ backgroundColor: COLORS.lightBg }}
        data-testid="settings-panel"
      >
        <DiscountsForm onBack={handleBack} />
      </div>
    );
  }

  if (activeSection === 'terms') {
    return (
      <div 
        className="h-full flex flex-col rounded-2xl shadow-sm overflow-hidden"
        style={{ backgroundColor: COLORS.lightBg }}
        data-testid="settings-panel"
      >
        <TermsForm onBack={handleBack} />
      </div>
    );
  }

  // Default: Show settings menu
  return (
    <div 
      className="h-full flex flex-col rounded-2xl shadow-sm overflow-hidden"
      style={{ backgroundColor: COLORS.lightBg }}
      data-testid="settings-panel"
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-6 py-5 border-b"
        style={{ borderColor: COLORS.borderGray }}
      >
        <div>
          <h1 className="text-xl font-semibold" style={{ color: COLORS.darkText }}>
            Restaurant Settings
          </h1>
          {restaurant && (
            <p className="text-sm mt-1" style={{ color: COLORS.grayText }}>
              {restaurant.name}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          data-testid="settings-close"
        >
          <X className="w-5 h-5" style={{ color: COLORS.grayText }} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm" style={{ color: COLORS.grayText }}>Loading settings...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className="flex flex-col items-start p-5 rounded-xl transition-all text-left hover:shadow-md hover:scale-[1.02] cursor-pointer"
                  style={{ 
                    backgroundColor: COLORS.sectionBg,
                    border: `1px solid ${COLORS.borderGray}`,
                  }}
                  data-testid={`settings-menu-${item.id}`}
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${COLORS.primaryGreen}15` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: COLORS.primaryGreen }} />
                  </div>
                  <div className="flex-1 w-full">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold" style={{ color: COLORS.darkText }}>
                        {item.label}
                      </span>
                      <ChevronRight className="w-4 h-4" style={{ color: COLORS.grayText }} />
                    </div>
                    <p className="text-sm" style={{ color: COLORS.grayText }}>
                      {item.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPanel;
