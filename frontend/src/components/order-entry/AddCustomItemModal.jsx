import { useState, useRef, useEffect } from "react";
import { X, Minus, Plus } from "lucide-react";
import { COLORS } from "../../constants";

const AddCustomItemModal = ({ categories = [], products = [], onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);

  const nameRef = useRef(null);
  const categoryRef = useRef(null);

  const isValid = name.trim() && categoryId && parseFloat(price) > 0;
  const total = (parseFloat(price) || 0) * qty;

  // Check exact name match — same food_for cannot have same item name
  const exactMatch = name.trim().length > 0 && products.some(
    p => p.productName.toLowerCase() === name.trim().toLowerCase()
  );

  // Product name suggestions — read-only, warn user item already exists
  const nameSuggestions = name.trim().length > 0
    ? products
        .filter(p => p.isActive && !p.isDisabled &&
          p.productName.toLowerCase().includes(name.toLowerCase()))
        .slice(0, 6)
    : [];

  // Category suggestions — filter from categories prop
  const categorySuggestions = categorySearch.length > 0
    ? categories
        .filter(c => c.isActive &&
          c.categoryName.toLowerCase().includes(categorySearch.toLowerCase()))
        .slice(0, 6)
    : categories.filter(c => c.isActive).slice(0, 6);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (nameRef.current && !nameRef.current.contains(e.target)) setShowNameSuggestions(false);
      if (categoryRef.current && !categoryRef.current.contains(e.target)) setShowCategorySuggestions(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // On category suggestion click
  const selectCategory = (cat) => {
    setCategoryId(String(cat.categoryId));
    setCategorySearch(cat.categoryName);
    setShowCategorySuggestions(false);
  };

  const handleNameChange = (val) => {
    setName(val);
    setShowNameSuggestions(val.trim().length > 0);
  };

  const decreaseQty = () => { if (qty > 1) setQty(qty - 1); };
  const increaseQty = () => setQty(qty + 1);

  const handleAdd = async () => {
    if (!isValid || exactMatch || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onAdd({ name: name.trim(), categoryId: parseInt(categoryId), price: parseFloat(price), qty, notes });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to add item. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Get category name for selected categoryId
  const selectedCategoryName = categories.find(c => String(c.categoryId) === String(categoryId))?.categoryName || '';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" data-testid="add-custom-item-modal">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b" style={{ borderColor: COLORS.borderGray }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold" style={{ color: COLORS.darkText }}>Add Custom Item</h2>
              <p className="text-sm mt-1" style={{ color: COLORS.grayText }}>Item not in menu? Add it here</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors" data-testid="custom-item-close-btn">
              <X className="w-5 h-5" style={{ color: COLORS.grayText }} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Item Name with autocomplete */}
          <div ref={nameRef} className="relative">
            <label className="text-sm font-medium mb-2 block" style={{ color: COLORS.grayText }}>
              Item Name <span style={{ color: COLORS.errorText }}>*</span>
            </label>
            <input
              type="text"
              placeholder="Type to search or add new item..."
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onFocus={() => name.trim().length > 0 && setShowNameSuggestions(true)}
              className="w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
              data-testid="custom-item-name-input"
              autoFocus
            />

            {/* Product Suggestions — READ-ONLY warning that item exists */}
            {showNameSuggestions && nameSuggestions.length > 0 && (
              <div
                className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border z-10 overflow-hidden"
                style={{ borderColor: COLORS.borderGray }}
              >
                <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
                  style={{ backgroundColor: '#FFF3E0', color: COLORS.primaryOrange }}>
                  Already in menu — info only
                </div>
                {nameSuggestions.map(product => {
                  const cat = categories.find(c => c.categoryId === product.categoryId);
                  return (
                    <div
                      key={product.productId}
                      className="w-full px-4 py-2.5 flex items-center justify-between gap-3"
                      style={{ cursor: 'default', opacity: 0.7 }}
                      data-testid={`name-suggestion-${product.productId}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: COLORS.darkText }}>
                          {product.productName}
                        </div>
                        {cat && (
                          <div className="text-xs" style={{ color: COLORS.grayText }}>{cat.categoryName}</div>
                        )}
                      </div>
                      <span className="text-sm font-semibold flex-shrink-0" style={{ color: COLORS.primaryOrange }}>
                        ₹{product.basePrice}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Category — searchable input */}
          <div ref={categoryRef} className="relative">
            <label className="text-sm font-medium mb-2 block" style={{ color: COLORS.grayText }}>
              Category <span style={{ color: COLORS.errorText }}>*</span>
            </label>
            <input
              type="text"
              placeholder="Search or select category..."
              value={categorySearch}
              onChange={(e) => { setCategorySearch(e.target.value); setCategoryId(''); setShowCategorySuggestions(true); }}
              onFocus={() => setShowCategorySuggestions(true)}
              className="w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2"
              style={{
                borderColor: categoryId ? COLORS.primaryGreen : COLORS.borderGray,
                color: COLORS.darkText
              }}
              data-testid="custom-item-category-input"
            />
            {/* Selected indicator */}
            {categoryId && (
              <div className="mt-1 text-xs px-2" style={{ color: COLORS.primaryGreen }}>
                ✓ {selectedCategoryName}
              </div>
            )}

            {/* Category Suggestions Dropdown */}
            {showCategorySuggestions && categorySuggestions.length > 0 && (
              <div
                className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border z-10 max-h-40 overflow-y-auto"
                style={{ borderColor: COLORS.borderGray }}
              >
                {categorySuggestions.map(cat => (
                  <button
                    key={cat.categoryId}
                    onMouseDown={() => selectCategory(cat)}
                    className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center justify-between"
                    style={{ backgroundColor: String(cat.categoryId) === String(categoryId) ? `${COLORS.primaryGreen}10` : 'transparent' }}
                    data-testid={`category-suggestion-${cat.categoryId}`}
                  >
                    <span className="text-sm" style={{ color: COLORS.darkText }}>{cat.categoryName}</span>
                    <span className="text-xs" style={{ color: COLORS.grayText }}>{cat.itemCount || ''}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Price */}
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: COLORS.grayText }}>
              Price (₹) <span style={{ color: COLORS.errorText }}>*</span>
            </label>
            <input
              type="number"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min="0"
              step="0.01"
              className="w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
              data-testid="custom-item-price-input"
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: COLORS.grayText }}>Quantity</label>
            <div className="flex items-center gap-3">
              <button onClick={decreaseQty} disabled={qty <= 1}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors disabled:opacity-40"
                style={{ backgroundColor: COLORS.borderGray }}
                data-testid="custom-item-qty-decrease">
                <Minus className="w-4 h-4" style={{ color: COLORS.darkText }} />
              </button>
              <span className="w-10 text-center font-bold text-lg" style={{ color: COLORS.primaryOrange }} data-testid="custom-item-qty-value">
                {qty}
              </span>
              <button onClick={increaseQty}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                style={{ backgroundColor: COLORS.sectionBg, border: `1px solid ${COLORS.borderGray}` }}
                data-testid="custom-item-qty-increase">
                <Plus className="w-4 h-4" style={{ color: COLORS.primaryGreen }} />
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: COLORS.grayText }}>Notes (Optional)</label>
            <textarea
              placeholder="Any special instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 rounded-xl border text-sm resize-none focus:outline-none"
              style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
              data-testid="custom-item-notes-input"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t" style={{ borderColor: COLORS.borderGray, backgroundColor: COLORS.sectionBg }}>
          {price && qty > 0 && (
            <div className="flex items-center justify-between mb-3 text-sm">
              <span style={{ color: COLORS.grayText }}>₹{parseFloat(price) || 0} × {qty}</span>
              <span className="font-bold" style={{ color: COLORS.primaryOrange }}>₹{total.toLocaleString()}</span>
            </div>
          )}
          {exactMatch && (
            <div className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ backgroundColor: '#FFF3E0', color: COLORS.primaryOrange }}>
              This item already exists in the menu. Please use a different name.
            </div>
          )}
          {error && (
            <div className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ backgroundColor: '#FEE2E2', color: '#EF4444' }}>
              {error}
            </div>
          )}
          <button
            onClick={handleAdd}
            disabled={!isValid || exactMatch || submitting}
            data-testid="custom-item-add-btn"
            className="w-full py-3.5 font-semibold text-white text-base rounded-xl transition-colors disabled:opacity-50"
            style={{ backgroundColor: COLORS.primaryGreen }}
          >
            {submitting ? 'Adding...' : 'Add to Order'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddCustomItemModal;
