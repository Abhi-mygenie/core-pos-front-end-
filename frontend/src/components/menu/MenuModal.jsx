import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { COLORS } from '../../constants';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';

const MenuModal = ({ 
  open, 
  onOpenChange, 
  menu = null, // { name: 'Normal', count: 135 } for edit
  existingMenus = [],
  onSave 
}) => {
  const isEdit = !!menu;
  
  const [menuName, setMenuName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (menu) {
      setMenuName(menu.name);
    } else {
      setMenuName('');
    }
    setError('');
  }, [menu, open]);

  const handleSubmit = async () => {
    // Validation
    const trimmedName = menuName.trim();
    
    if (!trimmedName) {
      setError('Menu name is required');
      return;
    }

    // Check for duplicate names (excluding current menu if editing)
    const isDuplicate = existingMenus.some(m => 
      m.name.toLowerCase() === trimmedName.toLowerCase() && 
      (!isEdit || m.name !== menu.name)
    );
    
    if (isDuplicate) {
      setError('A menu with this name already exists');
      return;
    }

    setIsLoading(true);
    try {
      await onSave(trimmedName, isEdit ? menu.name : null);
      toast.success(isEdit ? 'Menu updated successfully' : 'Menu created successfully');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to save menu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="menu-modal">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Menu' : 'Add New Menu'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="menuName">Menu Name *</Label>
            <Input
              id="menuName"
              value={menuName}
              onChange={(e) => {
                setMenuName(e.target.value);
                setError('');
              }}
              placeholder="e.g., Breakfast, Lunch, Premium"
              data-testid="menu-name-input"
            />
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>

          <div 
            className="p-3 rounded-lg text-sm"
            style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText }}
          >
            <p className="font-medium mb-1" style={{ color: COLORS.darkText }}>Examples:</p>
            <p>Breakfast, Lunch, Dinner, AC Menu, Non-AC Menu, Party Menu, Premium, Happy Hour</p>
          </div>

          {isEdit && menu.count > 0 && (
            <div 
              className="p-3 rounded-lg text-sm"
              style={{ backgroundColor: `${COLORS.primaryOrange}15`, color: COLORS.primaryOrange }}
            >
              <p>This menu has {menu.count} products. Renaming will update all products.</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isLoading}
            style={{ backgroundColor: COLORS.primaryGreen }}
            data-testid="save-menu"
          >
            {isLoading ? 'Saving...' : (isEdit ? 'Update Menu' : 'Create Menu')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MenuModal;
