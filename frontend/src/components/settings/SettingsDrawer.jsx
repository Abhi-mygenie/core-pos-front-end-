import { useState } from 'react';
import { 
  Building2, Clock, Zap, CreditCard, Receipt, Printer, 
  Tag, FileText, ChevronRight 
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { COLORS } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import BasicInfoForm from './BasicInfoForm';

const settingsMenuItems = [
  {
    id: 'basic-info',
    label: 'Basic Info',
    description: 'Name, Logo, Contact, Address',
    icon: Building2,
    permission: 'restaurant_setup',
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

const SettingsDrawer = ({ open, onOpenChange }) => {
  const { hasPermission, restaurant, roles, isLoading } = useAuth();
  const [activeSection, setActiveSection] = useState(null);

  const handleClose = () => {
    setActiveSection(null);
    onOpenChange(false);
  };

  const handleBack = () => {
    setActiveSection(null);
  };

  // Filter menu items based on permissions
  // Show all items if roles aren't loaded yet or user has the permission
  const visibleMenuItems = settingsMenuItems.filter(
    item => !item.permission || roles.length === 0 || hasPermission(item.permission)
  );

  const renderContent = () => {
    if (activeSection === 'basic-info') {
      return <BasicInfoForm onBack={handleBack} />;
    }

    // Default: Show settings menu
    return (
      <div className="flex flex-col h-full">
        <SheetHeader className="px-6 py-4 border-b" style={{ borderColor: COLORS.borderGray }}>
          <SheetTitle className="text-lg font-semibold" style={{ color: COLORS.darkText }}>
            Restaurant Settings
          </SheetTitle>
          {restaurant && (
            <p className="text-sm" style={{ color: COLORS.grayText }}>
              {restaurant.name}
            </p>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm" style={{ color: COLORS.grayText }}>Loading...</div>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleMenuItems.map((item) => {
                const Icon = item.icon;
                const isImplemented = item.id === 'basic-info';
                
                return (
                  <button
                    key={item.id}
                    onClick={() => isImplemented && setActiveSection(item.id)}
                    disabled={!isImplemented}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all text-left ${
                      isImplemented 
                        ? 'hover:bg-gray-50 cursor-pointer' 
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                    style={{ 
                      backgroundColor: COLORS.lightBg,
                      border: `1px solid ${COLORS.borderGray}`,
                    }}
                    data-testid={`settings-menu-${item.id}`}
                  >
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${COLORS.primaryGreen}15` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: COLORS.primaryGreen }} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium" style={{ color: COLORS.darkText }}>
                        {item.label}
                      </div>
                      <div className="text-sm" style={{ color: COLORS.grayText }}>
                        {item.description}
                      </div>
                    </div>
                    {isImplemented && (
                      <ChevronRight className="w-5 h-5" style={{ color: COLORS.grayText }} />
                    )}
                    {!isImplemented && (
                      <span 
                        className="text-xs px-2 py-1 rounded-full"
                        style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText }}
                      >
                        Coming Soon
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent 
        side="right" 
        className="w-[480px] sm:max-w-[480px] p-0"
        style={{ backgroundColor: COLORS.sectionBg }}
        data-testid="settings-drawer"
      >
        {renderContent()}
      </SheetContent>
    </Sheet>
  );
};

export default SettingsDrawer;
