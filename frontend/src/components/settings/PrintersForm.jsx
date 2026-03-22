import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Printer, Plus, Trash2, Edit2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';

const PrintersForm = ({ onBack }) => {
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [printers, setPrinters] = useState([]);

  useEffect(() => {
    if (profile?.restaurant_printer_new) {
      setPrinters(profile.restaurant_printer_new);
    }
  }, [profile]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // TODO: Call update API when available
      toast.success('Printer settings saved successfully');
      setHasChanges(false);
    } catch (error) {
      toast.error('Failed to save printer settings');
    } finally {
      setIsLoading(false);
    }
  };

  const getPrinterTypeIcon = (type) => {
    switch (type) {
      case 'bluetooth': return '📶';
      case 'usb': return '🔌';
      case 'wifi': return '📡';
      default: return '🖨️';
    }
  };

  return (
    <div className="flex flex-col h-full" data-testid="printers-form">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: COLORS.borderGray }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            data-testid="printers-back"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: COLORS.grayText }} />
          </button>
          <h2 className="text-lg font-semibold" style={{ color: COLORS.darkText }}>
            Printers
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            disabled
            data-testid="add-printer"
          >
            <Plus className="w-4 h-4" />
            Add Printer
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isLoading}
            className="gap-2"
            style={{ 
              backgroundColor: hasChanges ? COLORS.primaryGreen : COLORS.borderGray,
              color: hasChanges ? 'white' : COLORS.grayText 
            }}
            data-testid="printers-save"
          >
            <Save className="w-4 h-4" />
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {printers.map((printer) => (
            <div 
              key={printer.id}
              className="rounded-xl p-5"
              style={{ backgroundColor: COLORS.sectionBg, border: `1px solid ${COLORS.borderGray}` }}
              data-testid={`printer-card-${printer.id}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${COLORS.primaryGreen}15` }}
                  >
                    <Printer className="w-6 h-6" style={{ color: COLORS.primaryGreen }} />
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{ color: COLORS.darkText }}>
                      {printer.area_name}
                    </h3>
                    <span 
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: COLORS.lightBg, color: COLORS.grayText }}
                    >
                      {printer.printer_type}
                    </span>
                  </div>
                </div>
                <button 
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled
                >
                  <Edit2 className="w-4 h-4" style={{ color: COLORS.grayText }} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span style={{ color: COLORS.grayText }}>Connection</span>
                  <span className="font-medium" style={{ color: COLORS.darkText }}>
                    {getPrinterTypeIcon(printer.printer_name)} {printer.printer_name}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span style={{ color: COLORS.grayText }}>Paper Size</span>
                  <span className="font-medium" style={{ color: COLORS.darkText }}>
                    {printer.printer_paper_roll}mm
                  </span>
                </div>

                {printer.printer_ip && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: COLORS.grayText }}>Address</span>
                    <span 
                      className="font-mono text-xs truncate max-w-[150px]" 
                      style={{ color: COLORS.darkText }}
                      title={printer.printer_ip}
                    >
                      {printer.printer_ip}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span style={{ color: COLORS.grayText }}>Categories</span>
                  <span className="font-medium" style={{ color: COLORS.darkText }}>
                    {printer.categories_id?.length || 0} assigned
                  </span>
                </div>
              </div>

              <div 
                className="mt-4 pt-4 border-t flex justify-between"
                style={{ borderColor: COLORS.borderGray }}
              >
                <Button variant="outline" size="sm" disabled>
                  Configure
                </Button>
                <Button variant="outline" size="sm" disabled>
                  Test Print
                </Button>
              </div>
            </div>
          ))}

          {printers.length === 0 && (
            <div 
              className="col-span-full flex flex-col items-center justify-center py-12 rounded-xl"
              style={{ backgroundColor: COLORS.sectionBg, border: `2px dashed ${COLORS.borderGray}` }}
            >
              <Printer className="w-12 h-12 mb-4" style={{ color: COLORS.grayText }} />
              <p className="font-medium" style={{ color: COLORS.darkText }}>No printers configured</p>
              <p className="text-sm" style={{ color: COLORS.grayText }}>Add a printer to start printing KOTs and bills</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrintersForm;
