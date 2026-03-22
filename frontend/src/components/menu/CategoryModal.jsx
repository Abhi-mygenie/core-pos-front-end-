import { useState, useEffect } from 'react';
import { Upload } from 'lucide-react';
import { COLORS } from '../../constants';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';

const CategoryModal = ({ 
  open, 
  onOpenChange, 
  category = null, // { id, name, image, cat_order } for edit
  existingCategories = [],
  onSave 
}) => {
  const isEdit = !!category;
  
  const [formData, setFormData] = useState({
    name: '',
    image: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        image: category.image || '',
      });
    } else {
      setFormData({
        name: '',
        image: '',
      });
    }
    setError('');
  }, [category, open]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async () => {
    // Validation
    const trimmedName = formData.name.trim();
    
    if (!trimmedName) {
      setError('Category name is required');
      return;
    }

    // Check for duplicate names (excluding current category if editing)
    const isDuplicate = existingCategories.some(c => 
      c.name.toLowerCase() === trimmedName.toLowerCase() && 
      (!isEdit || c.id !== category.id)
    );
    
    if (isDuplicate) {
      setError('A category with this name already exists');
      return;
    }

    setIsLoading(true);
    try {
      await onSave({
        ...formData,
        name: trimmedName,
        id: isEdit ? category.id : null,
      });
      toast.success(isEdit ? 'Category updated successfully' : 'Category created successfully');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to save category');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="category-modal">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Category' : 'Add New Category'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Category Image */}
          <div className="flex items-start gap-4">
            <div 
              className="w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden flex-shrink-0"
              style={{ borderColor: COLORS.borderGray }}
            >
              {formData.image ? (
                <img 
                  src={formData.image} 
                  alt="Category" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <Upload className="w-6 h-6" style={{ color: COLORS.grayText }} />
              )}
            </div>
            <div className="flex-1">
              <Label className="text-xs" style={{ color: COLORS.grayText }}>
                Category Image (optional)
              </Label>
              <p className="text-xs mt-1" style={{ color: COLORS.grayText }}>
                Image upload will be available when API is connected
              </p>
            </div>
          </div>

          {/* Category Name */}
          <div className="space-y-2">
            <Label htmlFor="categoryName">Category Name *</Label>
            <Input
              id="categoryName"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Starters, Main Course, Beverages"
              data-testid="category-name-input"
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
            <p>Starters, Soups, Salads, Main Course, Biryani, Breads, Desserts, Beverages, Cocktails</p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isLoading}
            style={{ backgroundColor: COLORS.primaryGreen }}
            data-testid="save-category"
          >
            {isLoading ? 'Saving...' : (isEdit ? 'Update Category' : 'Create Category')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryModal;
