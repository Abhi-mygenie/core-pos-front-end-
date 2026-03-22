import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Upload, GripVertical, ImageIcon } from 'lucide-react';
import { COLORS } from '../../constants';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';

const ProductModal = ({ 
  open, 
  onOpenChange, 
  product = null, 
  categories = [], 
  menus = [],
  selectedMenu = 'Normal',
  onSave 
}) => {
  const isEdit = !!product;
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    food_for: selectedMenu,
    station_name: 'KDS',
    veg: 1,
    egg: 0,
    jain: 0,
    tax: '5',
    tax_type: 'GST',
    tax_calc: 'Exclusive',
    dinein: 'Yes',
    takeaway: 'Yes',
    delivery: 'Yes',
    available_time_starts: '00:00',
    available_time_ends: '23:59',
    stock_out: 'N',
    status: 1,
    complementary: 'no',
    complementary_price: '',
    give_discount: 'Yes',
    prep_time: '',
    pack_charges: '',
    variations: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  // Load product data when editing
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        category_id: product.category_id?.toString() || '',
        food_for: product.food_for || selectedMenu,
        station_name: product.station_name || 'KDS',
        veg: product.veg ?? 1,
        egg: product.egg ?? 0,
        jain: product.jain ?? 0,
        tax: product.tax?.toString() || '5',
        tax_type: product.tax_type || 'GST',
        tax_calc: product.tax_calc || 'Exclusive',
        dinein: product.dinein || 'Yes',
        takeaway: product.takeaway || 'Yes',
        delivery: product.delivery || 'Yes',
        available_time_starts: product.available_time_starts?.substring(0, 5) || '00:00',
        available_time_ends: product.available_time_ends?.substring(0, 5) || '23:59',
        stock_out: product.stock_out || 'N',
        status: product.status ?? 1,
        complementary: product.complementary || 'no',
        complementary_price: product.complementary_price || '',
        give_discount: product.give_discount || 'Yes',
        prep_time: product.prep_time || '',
        pack_charges: product.pack_charges || '',
        variations: product.variations || [],
      });
      setImagePreview(product.image || null);
    } else {
      // Reset for new product
      setFormData({
        name: '',
        description: '',
        price: '',
        category_id: '',
        food_for: selectedMenu,
        station_name: 'KDS',
        veg: 1,
        egg: 0,
        jain: 0,
        tax: '5',
        tax_type: 'GST',
        tax_calc: 'Exclusive',
        dinein: 'Yes',
        takeaway: 'Yes',
        delivery: 'Yes',
        available_time_starts: '00:00',
        available_time_ends: '23:59',
        stock_out: 'N',
        status: 1,
        complementary: 'no',
        complementary_price: '',
        give_discount: 'Yes',
        prep_time: '',
        pack_charges: '',
        variations: [],
      });
      setImagePreview(null);
    }
  }, [product, selectedMenu]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFoodTypeChange = (type) => {
    if (type === 'veg') {
      setFormData(prev => ({ ...prev, veg: 1, egg: 0 }));
    } else if (type === 'nonveg') {
      setFormData(prev => ({ ...prev, veg: 0, egg: 0 }));
    } else if (type === 'egg') {
      setFormData(prev => ({ ...prev, veg: 0, egg: 1 }));
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Variation management
  const addVariation = () => {
    setFormData(prev => ({
      ...prev,
      variations: [
        ...prev.variations,
        {
          name: '',
          type: 'single',
          required: 'off',
          values: [{ label: '', optionPrice: '0' }],
        },
      ],
    }));
  };

  const removeVariation = (index) => {
    setFormData(prev => ({
      ...prev,
      variations: prev.variations.filter((_, i) => i !== index),
    }));
  };

  const updateVariation = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      variations: prev.variations.map((v, i) => 
        i === index ? { ...v, [field]: value } : v
      ),
    }));
  };

  const addVariationOption = (varIndex) => {
    setFormData(prev => ({
      ...prev,
      variations: prev.variations.map((v, i) => 
        i === varIndex 
          ? { ...v, values: [...v.values, { label: '', optionPrice: '0' }] }
          : v
      ),
    }));
  };

  const removeVariationOption = (varIndex, optIndex) => {
    setFormData(prev => ({
      ...prev,
      variations: prev.variations.map((v, i) => 
        i === varIndex 
          ? { ...v, values: v.values.filter((_, j) => j !== optIndex) }
          : v
      ),
    }));
  };

  const updateVariationOption = (varIndex, optIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      variations: prev.variations.map((v, i) => 
        i === varIndex 
          ? {
              ...v,
              values: v.values.map((opt, j) => 
                j === optIndex ? { ...opt, [field]: value } : opt
              ),
            }
          : v
      ),
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }
    if (!formData.price) {
      toast.error('Price is required');
      return;
    }
    if (!formData.category_id) {
      toast.error('Category is required');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Call API when available
      await onSave({ ...formData, image: imagePreview || formData.image });
      toast.success(isEdit ? 'Product updated successfully' : 'Product added successfully');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to save product');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        data-testid="product-modal"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Product' : 'Add Product'}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
          {/* Basic Info */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase" style={{ color: COLORS.grayText }}>
              Basic Info
            </h3>
            <div className="flex gap-4">
              {/* Image Upload */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                  data-testid="product-image-input"
                />
                {imagePreview ? (
                  <div className="relative group">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-24 h-24 rounded-lg object-cover"
                      style={{ border: `1px solid ${COLORS.borderGray}` }}
                      data-testid="product-image-preview"
                    />
                    <div className="absolute inset-0 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1.5 bg-white/90 rounded-md hover:bg-white transition-colors"
                        title="Change image"
                      >
                        <Upload className="w-3.5 h-3.5" style={{ color: COLORS.darkText }} />
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="p-1.5 bg-white/90 rounded-md hover:bg-white transition-colors"
                        title="Remove image"
                        data-testid="remove-product-image"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 hover:bg-gray-50 transition-colors cursor-pointer"
                    style={{ borderColor: COLORS.borderGray }}
                    data-testid="product-image-upload-btn"
                  >
                    <ImageIcon className="w-6 h-6" style={{ color: COLORS.grayText }} />
                    <span className="text-xs" style={{ color: COLORS.grayText }}>Upload</span>
                  </button>
                )}
                <span className="text-xs" style={{ color: COLORS.grayText }}>Max 5MB</span>
              </div>
              
              <div className="flex-1 space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Product name"
                    data-testid="product-name"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Product description"
                    rows={2}
                    data-testid="product-description"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => handleChange('price', e.target.value)}
                  placeholder="0.00"
                  data-testid="product-price"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="station">Station</Label>
                <Select value={formData.station_name} onValueChange={(v) => handleChange('station_name', v)}>
                  <SelectTrigger data-testid="product-station">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KDS">KDS</SelectItem>
                    <SelectItem value="BAR">BAR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Classification */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase" style={{ color: COLORS.grayText }}>
              Classification
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Menu *</Label>
                <Select value={formData.food_for} onValueChange={(v) => handleChange('food_for', v)}>
                  <SelectTrigger data-testid="product-menu">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {menus.map(menu => (
                      <SelectItem key={menu.name} value={menu.name}>{menu.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Category *</Label>
                <Select value={formData.category_id} onValueChange={(v) => handleChange('category_id', v)}>
                  <SelectTrigger data-testid="product-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Food Type */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase" style={{ color: COLORS.grayText }}>
              Food Type
            </h3>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="foodType"
                  checked={formData.veg === 1 && formData.egg === 0}
                  onChange={() => handleFoodTypeChange('veg')}
                  className="w-4 h-4"
                />
                <span className="flex items-center gap-1">
                  <div className="w-4 h-4 border-2 border-green-600 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-green-600"></div>
                  </div>
                  Veg
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="foodType"
                  checked={formData.veg === 0 && formData.egg === 0}
                  onChange={() => handleFoodTypeChange('nonveg')}
                  className="w-4 h-4"
                />
                <span className="flex items-center gap-1">
                  <div className="w-4 h-4 border-2 border-red-600 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-red-600"></div>
                  </div>
                  Non-Veg
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="foodType"
                  checked={formData.egg === 1}
                  onChange={() => handleFoodTypeChange('egg')}
                  className="w-4 h-4"
                />
                <span className="flex items-center gap-1">
                  <div className="w-4 h-4 border-2 border-yellow-600 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-yellow-600"></div>
                  </div>
                  Egg
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.jain === 1}
                  onChange={(e) => handleChange('jain', e.target.checked ? 1 : 0)}
                  className="w-4 h-4"
                />
                Jain
              </label>
            </div>
          </section>

          {/* Tax */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase" style={{ color: COLORS.grayText }}>
              Tax Settings
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Tax %</Label>
                <Input
                  type="number"
                  value={formData.tax}
                  onChange={(e) => handleChange('tax', e.target.value)}
                  data-testid="product-tax"
                />
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={formData.tax_type} onValueChange={(v) => handleChange('tax_type', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GST">GST</SelectItem>
                    <SelectItem value="VAT">VAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Calculation</Label>
                <Select value={formData.tax_calc} onValueChange={(v) => handleChange('tax_calc', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Exclusive">Exclusive</SelectItem>
                    <SelectItem value="Inclusive">Inclusive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Availability */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase" style={{ color: COLORS.grayText }}>
              Availability
            </h3>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.dinein === 'Yes'}
                  onChange={(e) => handleChange('dinein', e.target.checked ? 'Yes' : 'No')}
                  className="w-4 h-4"
                />
                Dine-in
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.takeaway === 'Yes'}
                  onChange={(e) => handleChange('takeaway', e.target.checked ? 'Yes' : 'No')}
                  className="w-4 h-4"
                />
                Takeaway
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.delivery === 'Yes'}
                  onChange={(e) => handleChange('delivery', e.target.checked ? 'Yes' : 'No')}
                  className="w-4 h-4"
                />
                Delivery
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Available From</Label>
                <Input
                  type="time"
                  value={formData.available_time_starts}
                  onChange={(e) => handleChange('available_time_starts', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Available Until</Label>
                <Input
                  type="time"
                  value={formData.available_time_ends}
                  onChange={(e) => handleChange('available_time_ends', e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.stock_out === 'Y'}
                onCheckedChange={(checked) => handleChange('stock_out', checked ? 'Y' : 'N')}
              />
              <Label>Mark as Out of Stock</Label>
            </div>
          </section>

          {/* Variations */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase" style={{ color: COLORS.grayText }}>
                Variations
              </h3>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1"
                onClick={addVariation}
                data-testid="add-variation"
              >
                <Plus className="w-4 h-4" />
                Add Variation
              </Button>
            </div>

            {formData.variations.map((variation, varIndex) => (
              <div 
                key={varIndex}
                className="p-4 rounded-lg space-y-3"
                style={{ backgroundColor: COLORS.sectionBg, border: `1px solid ${COLORS.borderGray}` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <Input
                      value={variation.name}
                      onChange={(e) => updateVariation(varIndex, 'name', e.target.value)}
                      placeholder="Variation name (e.g., Size, Choice of)"
                      className="max-w-xs"
                    />
                    <Select 
                      value={variation.type} 
                      onValueChange={(v) => updateVariation(varIndex, 'type', v)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="multiple">Multiple</SelectItem>
                      </SelectContent>
                    </Select>
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={variation.required === 'on'}
                        onChange={(e) => updateVariation(varIndex, 'required', e.target.checked ? 'on' : 'off')}
                      />
                      Required
                    </label>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => removeVariation(varIndex)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {variation.values.map((option, optIndex) => (
                    <div key={optIndex} className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4" style={{ color: COLORS.grayText }} />
                      <Input
                        value={option.label}
                        onChange={(e) => updateVariationOption(varIndex, optIndex, 'label', e.target.value)}
                        placeholder="Option name"
                        className="flex-1"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-sm" style={{ color: COLORS.grayText }}>+₹</span>
                        <Input
                          type="number"
                          value={option.optionPrice}
                          onChange={(e) => updateVariationOption(varIndex, optIndex, 'optionPrice', e.target.value)}
                          className="w-20"
                        />
                      </div>
                      {variation.values.length > 1 && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeVariationOption(varIndex, optIndex)}
                        >
                          <X className="w-4 h-4" style={{ color: COLORS.grayText }} />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-sm"
                    onClick={() => addVariationOption(varIndex)}
                  >
                    <Plus className="w-3 h-3" />
                    Add Option
                  </Button>
                </div>
              </div>
            ))}

            {formData.variations.length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: COLORS.grayText }}>
                No variations added. Add variations for size, toppings, etc.
              </p>
            )}
          </section>

          {/* Additional Settings */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase" style={{ color: COLORS.grayText }}>
              Additional Settings
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <Switch
                  checked={formData.complementary === 'yes'}
                  onCheckedChange={(checked) => handleChange('complementary', checked ? 'yes' : 'no')}
                />
                <Label>Complementary Item</Label>
                {formData.complementary === 'yes' && (
                  <Input
                    type="number"
                    value={formData.complementary_price}
                    onChange={(e) => handleChange('complementary_price', e.target.value)}
                    placeholder="Comp. Price"
                    className="w-32"
                  />
                )}
              </div>
              <div className="flex items-center gap-4">
                <Switch
                  checked={formData.give_discount === 'Yes'}
                  onCheckedChange={(checked) => handleChange('give_discount', checked ? 'Yes' : 'No')}
                />
                <Label>Allow Discount</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Preparation Time (mins)</Label>
                  <Input
                    type="number"
                    value={formData.prep_time}
                    onChange={(e) => handleChange('prep_time', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Pack Charges</Label>
                  <Input
                    type="number"
                    value={formData.pack_charges}
                    onChange={(e) => handleChange('pack_charges', e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: COLORS.borderGray }}>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isLoading}
            style={{ backgroundColor: COLORS.primaryGreen }}
            data-testid="save-product"
          >
            {isLoading ? 'Saving...' : (isEdit ? 'Update Product' : 'Add Product')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductModal;
