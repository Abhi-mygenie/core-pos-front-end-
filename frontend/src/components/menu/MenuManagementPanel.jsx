import { useState, useEffect } from 'react';
import { 
  Search, Filter, ChevronLeft, ChevronRight, 
  Utensils, Leaf, Egg, X, GripVertical, Plus, Trash2, Edit2,
  CheckSquare, Square, MinusSquare, ArrowRightLeft, Power
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useInitialData } from '../../context/InitialDataContext';
import { COLORS } from '../../constants';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import ProductModal from './ProductModal';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import MenuModal from './MenuModal';
import CategoryModal from './CategoryModal';
import { SortableItem, DragHandle } from './SortableItem';
import { toast } from 'sonner';

const MenuManagementPanel = ({ onClose }) => {
  const { 
    categories: preloadedCategories, 
    products: preloadedProducts,
    isDataLoaded 
  } = useInitialData();
  
  // State
  const [menus, setMenus] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [vegFilter, setVegFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 10,
    offset: 1,
    currentPage: 1,
  });

  // Modal states
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Menu modal states
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [deleteMenuDialogOpen, setDeleteMenuDialogOpen] = useState(false);
  const [deletingMenu, setDeletingMenu] = useState(null);

  // Category modal states
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteCategoryDialogOpen, setDeleteCategoryDialogOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState(null);

  // Bulk selection state
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [bulkCategoryDialogOpen, setBulkCategoryDialogOpen] = useState(false);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle category drag end
  const handleCategoryDragEnd = (event) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      const oldIndex = categoriesWithCount.findIndex(c => c.id === active.id);
      const newIndex = categoriesWithCount.findIndex(c => c.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        // Reorder categories
        const reorderedCategories = arrayMove(categoriesWithCount, oldIndex, newIndex);
        
        // Update cat_order for all affected categories
        const updatedCategories = categories.map(cat => {
          const reorderedIndex = reorderedCategories.findIndex(rc => rc.id === cat.id);
          if (reorderedIndex !== -1) {
            return { ...cat, cat_order: reorderedIndex + 1 };
          }
          return cat;
        });
        
        setCategories(updatedCategories);
        toast.success('Category order updated');
        
        // TODO: Call API to persist order
      }
    }
  };

  // Handle product drag end
  const handleProductDragEnd = (event) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    setProducts(prev => {
      // Get products for current menu/category, sorted by food_order
      const currentCategoryId = selectedCategory;
      const currentMenuName = selectedMenu;
      
      // Separate products into current view and others
      const inCurrentView = prev
        .filter(p => {
          if (currentMenuName && p.food_for !== currentMenuName) return false;
          if (currentCategoryId && p.category_id !== currentCategoryId) return false;
          return true;
        })
        .sort((a, b) => (a.food_order || 0) - (b.food_order || 0));
      
      const otherProducts = prev.filter(p => {
        if (currentMenuName && p.food_for !== currentMenuName) return true;
        if (currentCategoryId && p.category_id !== currentCategoryId) return true;
        return false;
      });
      
      // Find indices in the current view
      const oldIndex = inCurrentView.findIndex(p => p.id === active.id);
      const newIndex = inCurrentView.findIndex(p => p.id === over.id);
      
      if (oldIndex === -1 || newIndex === -1) return prev;
      
      // Reorder products in current view
      const reordered = arrayMove(inCurrentView, oldIndex, newIndex);
      
      // Update food_order for all reordered products
      const updatedCurrentView = reordered.map((product, index) => ({
        ...product,
        food_order: index + 1
      }));
      
      // Combine back with other products
      return [...updatedCurrentView, ...otherProducts];
    });
    
    toast.success('Product order updated');
    // TODO: Call API to persist order
  };

  // Initialize from preloaded data ONLY (no API calls)
  useEffect(() => {
    if (isDataLoaded) {
      // Set categories from preloaded data
      setCategories(preloadedCategories);
      
      // Set products from preloaded data
      setProducts(preloadedProducts);
      
      // Derive unique menus from preloaded products
      const menuMap = {};
      preloadedProducts.forEach(product => {
        const menuName = product.food_for || 'Normal';
        if (!menuMap[menuName]) {
          menuMap[menuName] = { name: menuName, count: 0 };
        }
        menuMap[menuName].count++;
      });
      
      const menuList = Object.values(menuMap);
      setMenus(menuList.length > 0 ? menuList : [{ name: 'Normal', count: 0 }]);
      
      // Select first menu by default
      if (menuList.length > 0) {
        setSelectedMenu(menuList[0].name);
      }
      
      setIsLoading(false);
    }
  }, [isDataLoaded, preloadedCategories, preloadedProducts]);

  // Filter products - ALL client-side filtering (menu, category, search, veg, status)
  const filteredProducts = products
    .filter(product => {
      // Menu filter
      if (selectedMenu && product.food_for !== selectedMenu) return false;
      
      // Category filter
      if (selectedCategory && product.category_id !== selectedCategory) return false;
      
      // Search filter
      if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      
      // Veg filter
      if (vegFilter === 'veg' && product.veg !== 1) return false;
      if (vegFilter === 'nonveg' && product.veg !== 0) return false;
      if (vegFilter === 'egg' && product.egg !== 1) return false;
      if (vegFilter === 'jain' && product.jain !== 1) return false;
      
      // Status filter
      if (statusFilter === 'active' && product.status !== 1) return false;
      if (statusFilter === 'inactive' && product.status !== 0) return false;
      if (statusFilter === 'outofstock' && product.stock_out !== 'Y') return false;
      
      return true;
    })
    .sort((a, b) => (a.food_order || 0) - (b.food_order || 0));

  // Get categories with product count - calculated from products in current menu
  const getCategoriesWithCount = () => {
    // Calculate product count per category from preloaded products (for current menu)
    const countMap = {};
    products
      .filter(p => !selectedMenu || p.food_for === selectedMenu)
      .forEach(p => {
        countMap[p.category_id] = (countMap[p.category_id] || 0) + 1;
      });
    
    return categories
      .map(cat => ({
        ...cat,
        productCount: countMap[cat.id] || 0
      }))
      .sort((a, b) => (a.cat_order || a.priority || 0) - (b.cat_order || b.priority || 0));
  };

  const categoriesWithCount = getCategoriesWithCount();
  
  // Total products in current menu (for "All Items" count)
  const totalInMenu = products.filter(p => !selectedMenu || p.food_for === selectedMenu).length;

  // Client-side pagination
  const totalPages = Math.ceil(filteredProducts.length / pagination.limit);
  const paginatedProducts = filteredProducts.slice(
    (pagination.currentPage - 1) * pagination.limit,
    pagination.currentPage * pagination.limit
  );

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
    }
  };

  const getFoodTypeIcon = (product) => {
    if (product.veg === 1) {
      return <div className="w-4 h-4 border-2 border-green-600 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-green-600"></div></div>;
    }
    if (product.egg === 1) {
      return <div className="w-4 h-4 border-2 border-yellow-600 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-yellow-600"></div></div>;
    }
    return <div className="w-4 h-4 border-2 border-red-600 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-red-600"></div></div>;
  };

  const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || 'Uncategorized';
  };

  // Product actions
  const handleAddProduct = () => {
    setEditingProduct(null);
    setProductModalOpen(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductModalOpen(true);
  };

  const handleDeleteProduct = (product) => {
    setDeletingProduct(product);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      // TODO: Call delete API when available
      // await menuAPI.deleteProduct(deletingProduct.id);
      
      // Optimistic update - remove from local state
      setProducts(prev => prev.filter(p => p.id !== deletingProduct.id));
      toast.success('Product deleted successfully');
      setDeleteDialogOpen(false);
      setDeletingProduct(null);
    } catch (error) {
      toast.error('Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveProduct = async (formData) => {
    // TODO: Call API when available
    if (editingProduct) {
      // Update existing product
      setProducts(prev => prev.map(p => 
        p.id === editingProduct.id ? { ...p, ...formData } : p
      ));
    } else {
      // Add new product (mock ID for now)
      const newProduct = {
        ...formData,
        id: Date.now(),
        image: 'https://preprod.mygenie.online/public/assets/admin/img/100x100/food-default-image.png',
      };
      setProducts(prev => [...prev, newProduct]);
    }
  };

  const handleToggleStatus = async (product) => {
    const newStatus = product.status === 1 ? 0 : 1;
    
    // Optimistic update
    setProducts(prev => prev.map(p => 
      p.id === product.id ? { ...p, status: newStatus } : p
    ));
    
    // TODO: Call API when available
    toast.success(`Product ${newStatus === 1 ? 'activated' : 'deactivated'}`);
  };

  // Menu actions
  const handleAddMenu = () => {
    setEditingMenu(null);
    setMenuModalOpen(true);
  };

  const handleEditMenu = (menu) => {
    setEditingMenu(menu);
    setMenuModalOpen(true);
  };

  const handleDeleteMenu = (menu) => {
    if (menu.count > 0) {
      toast.error('Cannot delete menu with products. Move or delete products first.');
      return;
    }
    setDeletingMenu(menu);
    setDeleteMenuDialogOpen(true);
  };

  const handleSaveMenu = async (newName, oldName = null) => {
    if (oldName) {
      // Edit - update all products with this menu
      setProducts(prev => prev.map(p => 
        p.food_for === oldName ? { ...p, food_for: newName } : p
      ));
      setMenus(prev => prev.map(m => 
        m.name === oldName ? { ...m, name: newName } : m
      ));
      if (selectedMenu === oldName) {
        setSelectedMenu(newName);
      }
    } else {
      // Add new menu
      setMenus(prev => [...prev, { name: newName, count: 0, products: [] }]);
      setSelectedMenu(newName);
    }
  };

  const handleConfirmDeleteMenu = async () => {
    setIsDeleting(true);
    try {
      setMenus(prev => prev.filter(m => m.name !== deletingMenu.name));
      if (selectedMenu === deletingMenu.name && menus.length > 1) {
        const remainingMenus = menus.filter(m => m.name !== deletingMenu.name);
        setSelectedMenu(remainingMenus[0]?.name || null);
      }
      toast.success('Menu deleted successfully');
      setDeleteMenuDialogOpen(false);
      setDeletingMenu(null);
    } catch (error) {
      toast.error('Failed to delete menu');
    } finally {
      setIsDeleting(false);
    }
  };

  // Category actions
  const handleAddCategory = () => {
    setEditingCategory(null);
    setCategoryModalOpen(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryModalOpen(true);
  };

  const handleDeleteCategory = (category) => {
    if (category.productCount > 0) {
      toast.error('Cannot delete category with products. Move or delete products first.');
      return;
    }
    setDeletingCategory(category);
    setDeleteCategoryDialogOpen(true);
  };

  const handleSaveCategory = async (categoryData) => {
    if (categoryData.id) {
      // Edit
      setCategories(prev => prev.map(c => 
        c.id === categoryData.id ? { ...c, ...categoryData } : c
      ));
    } else {
      // Add new category
      const newCategory = {
        ...categoryData,
        id: Date.now(),
        cat_order: categories.length + 1,
        restaurant_id: 478, // TODO: Get from auth context
        status: 1,
      };
      setCategories(prev => [...prev, newCategory]);
    }
  };

  const handleConfirmDeleteCategory = async () => {
    setIsDeleting(true);
    try {
      setCategories(prev => prev.filter(c => c.id !== deletingCategory.id));
      if (selectedCategory === deletingCategory.id) {
        setSelectedCategory(null);
      }
      toast.success('Category deleted successfully');
      setDeleteCategoryDialogOpen(false);
      setDeletingCategory(null);
    } catch (error) {
      toast.error('Failed to delete category');
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk selection handlers
  const handleToggleSelectProduct = (productId) => {
    setSelectedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const currentIds = paginatedProducts.map(p => p.id);
    const allSelected = currentIds.every(id => selectedProducts.has(id));
    if (allSelected) {
      setSelectedProducts(prev => {
        const next = new Set(prev);
        currentIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedProducts(prev => {
        const next = new Set(prev);
        currentIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const handleBulkDelete = () => {
    if (selectedProducts.size === 0) return;
    setProducts(prev => prev.filter(p => !selectedProducts.has(p.id)));
    toast.success(`${selectedProducts.size} product(s) deleted`);
    setSelectedProducts(new Set());
  };

  const handleBulkToggleStatus = (newStatus) => {
    if (selectedProducts.size === 0) return;
    setProducts(prev => prev.map(p =>
      selectedProducts.has(p.id) ? { ...p, status: newStatus } : p
    ));
    toast.success(`${selectedProducts.size} product(s) ${newStatus === 1 ? 'activated' : 'deactivated'}`);
    setSelectedProducts(new Set());
  };

  const handleBulkChangeCategory = (newCategoryId) => {
    if (selectedProducts.size === 0) return;
    setProducts(prev => prev.map(p =>
      selectedProducts.has(p.id) ? { ...p, category_id: parseInt(newCategoryId) } : p
    ));
    const catName = categories.find(c => c.id === parseInt(newCategoryId))?.name || 'Unknown';
    toast.success(`${selectedProducts.size} product(s) moved to "${catName}"`);
    setSelectedProducts(new Set());
    setBulkCategoryDialogOpen(false);
  };

  const handleClearSelection = () => {
    setSelectedProducts(new Set());
    setBulkCategoryDialogOpen(false);
  };

  return (
    <div 
      className="h-full flex flex-col rounded-2xl shadow-sm overflow-hidden"
      style={{ backgroundColor: COLORS.lightBg }}
      data-testid="menu-management-panel"
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-6 py-5 border-b"
        style={{ borderColor: COLORS.borderGray }}
      >
        <div>
          <h1 className="text-xl font-semibold" style={{ color: COLORS.darkText }}>
            Menu Management
          </h1>
          <p className="text-sm mt-1" style={{ color: COLORS.grayText }}>
            Manage your menus, categories and products
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleAddMenu}
            data-testid="add-menu-btn"
          >
            <Plus className="w-4 h-4" />
            Add Menu
          </Button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            data-testid="menu-management-close"
          >
            <X className="w-5 h-5" style={{ color: COLORS.grayText }} />
          </button>
        </div>
      </div>

      {/* Menu Tabs */}
      <div 
        className="px-6 py-4 border-b flex gap-3 overflow-x-auto"
        style={{ borderColor: COLORS.borderGray }}
      >
        {menus.map((menu) => (
          <div
            key={menu.name}
            className={`relative group px-4 py-3 rounded-xl transition-all flex-shrink-0 ${
              selectedMenu === menu.name 
                ? 'shadow-md' 
                : 'hover:bg-gray-50'
            }`}
            style={{
              backgroundColor: selectedMenu === menu.name ? COLORS.primaryGreen : COLORS.sectionBg,
              color: selectedMenu === menu.name ? 'white' : COLORS.darkText,
              border: `1px solid ${selectedMenu === menu.name ? COLORS.primaryGreen : COLORS.borderGray}`,
            }}
          >
            <button
              onClick={() => {
                setSelectedMenu(menu.name);
                setSelectedCategory(null);
                setPagination(prev => ({ ...prev, currentPage: 1 }));
              }}
              className="text-left"
              data-testid={`menu-tab-${menu.name}`}
            >
              <div className="font-semibold">{menu.name}</div>
              <div className="text-sm opacity-80">{menu.count} items</div>
            </button>
            
            {/* Edit/Delete buttons on hover */}
            <div 
              className={`absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                selectedMenu === menu.name ? '' : ''
              }`}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditMenu(menu);
                }}
                className="p-1 rounded-full bg-white shadow-md hover:bg-gray-100"
                title="Edit menu"
                data-testid={`edit-menu-${menu.name}`}
              >
                <Edit2 className="w-3 h-3" style={{ color: COLORS.grayText }} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteMenu(menu);
                }}
                className="p-1 rounded-full bg-white shadow-md hover:bg-red-50"
                title={menu.count > 0 ? 'Cannot delete menu with products' : 'Delete menu'}
                data-testid={`delete-menu-${menu.name}`}
              >
                <Trash2 className="w-3 h-3" style={{ color: menu.count > 0 ? COLORS.grayText : '#EF4444' }} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Categories Sidebar */}
        <div 
          className="w-64 border-r overflow-y-auto p-4"
          style={{ borderColor: COLORS.borderGray }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold uppercase" style={{ color: COLORS.grayText }}>
              Categories
            </h3>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2"
              onClick={handleAddCategory}
              data-testid="add-category-btn"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* All Items */}
          <button
            onClick={() => {
              setSelectedCategory(null);
              setPagination(prev => ({ ...prev, currentPage: 1 }));
            }}
            className={`w-full flex items-center justify-between p-3 rounded-lg mb-2 transition-colors ${
              !selectedCategory ? 'bg-gray-100' : 'hover:bg-gray-50'
            }`}
            data-testid="category-all"
          >
            <span className="font-medium" style={{ color: COLORS.darkText }}>All Items</span>
            <span 
              className="text-sm px-2 py-0.5 rounded-full"
              style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText }}
            >
              {totalInMenu}
            </span>
          </button>

          {/* Category List with Drag & Drop */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleCategoryDragEnd}
          >
            <SortableContext
              items={categoriesWithCount.map(c => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {categoriesWithCount.map((category) => (
                  <SortableItem key={category.id} id={category.id}>
                    {({ attributes, listeners, isDragging }) => (
                      <div
                        className={`group relative flex items-center gap-2 p-3 rounded-lg transition-colors ${
                          selectedCategory === category.id ? 'bg-gray-100' : 'hover:bg-gray-50'
                        } ${isDragging ? 'shadow-lg z-10' : ''}`}
                        style={{ backgroundColor: isDragging ? COLORS.lightBg : undefined }}
                      >
                        <DragHandle listeners={listeners} attributes={attributes} />
                        <button
                          onClick={() => {
                            setSelectedCategory(category.id);
                            setPagination(prev => ({ ...prev, currentPage: 1 }));
                          }}
                          className="flex-1 text-left font-medium truncate"
                          style={{ color: COLORS.darkText }}
                          data-testid={`category-${category.id}`}
                        >
                          {category.name}
                        </button>
                        <span 
                          className="text-sm px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText }}
                        >
                          {category.productCount}
                        </span>
                        
                        {/* Edit/Delete buttons on hover */}
                        <div className="absolute right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditCategory(category);
                            }}
                            className="p-1 rounded hover:bg-gray-200"
                            title="Edit category"
                            data-testid={`edit-category-${category.id}`}
                          >
                            <Edit2 className="w-3 h-3" style={{ color: COLORS.grayText }} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCategory(category);
                            }}
                            className="p-1 rounded hover:bg-red-100"
                            title={category.productCount > 0 ? 'Cannot delete category with products' : 'Delete category'}
                            data-testid={`delete-category-${category.id}`}
                          >
                            <Trash2 className="w-3 h-3" style={{ color: category.productCount > 0 ? COLORS.grayText : '#EF4444' }} />
                          </button>
                        </div>
                      </div>
                    )}
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Products Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Filters & Bulk Action Bar */}
          <div 
            className="px-4 py-3 border-b flex flex-col gap-2"
            style={{ borderColor: COLORS.borderGray }}
          >
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: COLORS.grayText }} />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPagination(prev => ({ ...prev, currentPage: 1 }));
                  }}
                  className="pl-9"
                  data-testid="search-products"
                />
              </div>
            
              <Select value={vegFilter} onValueChange={(v) => {
                setVegFilter(v);
                setPagination(prev => ({ ...prev, currentPage: 1 }));
              }}>
                <SelectTrigger className="w-32" data-testid="filter-veg">
                  <SelectValue placeholder="Food Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="veg">Veg</SelectItem>
                  <SelectItem value="nonveg">Non-Veg</SelectItem>
                  <SelectItem value="egg">Egg</SelectItem>
                  <SelectItem value="jain">Jain</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(v) => {
                setStatusFilter(v);
                setPagination(prev => ({ ...prev, currentPage: 1 }));
              }}>
                <SelectTrigger className="w-32" data-testid="filter-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="outofstock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>

              <Button
                className="gap-2"
                onClick={handleAddProduct}
                style={{ backgroundColor: COLORS.primaryGreen }}
                data-testid="add-product-btn"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </Button>
            </div>

            {/* Bulk Action Bar */}
            {selectedProducts.size > 0 && (
              <div 
                className="flex items-center gap-3 px-3 py-2 rounded-lg animate-in slide-in-from-top-2"
                style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}
                data-testid="bulk-action-bar"
              >
                <span className="text-sm font-medium" style={{ color: '#1E40AF' }}>
                  {selectedProducts.size} selected
                </span>
                <div className="h-4 w-px bg-blue-300" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={handleBulkDelete}
                  data-testid="bulk-delete-btn"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 hover:bg-green-50"
                  style={{ color: COLORS.primaryGreen }}
                  onClick={() => handleBulkToggleStatus(1)}
                  data-testid="bulk-activate-btn"
                >
                  <Power className="w-3.5 h-3.5" />
                  Activate
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                  onClick={() => handleBulkToggleStatus(0)}
                  data-testid="bulk-deactivate-btn"
                >
                  <Power className="w-3.5 h-3.5" />
                  Deactivate
                </Button>
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5"
                    style={{ color: '#4338CA' }}
                    onClick={() => setBulkCategoryDialogOpen(!bulkCategoryDialogOpen)}
                    data-testid="bulk-category-btn"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    Move to Category
                  </Button>
                  {bulkCategoryDialogOpen && (
                    <div 
                      className="absolute top-full left-0 mt-1 py-1 bg-white rounded-lg shadow-lg z-50 min-w-[200px] max-h-[200px] overflow-y-auto"
                      style={{ border: `1px solid ${COLORS.borderGray}` }}
                      data-testid="bulk-category-dropdown"
                    >
                      {categories.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => handleBulkChangeCategory(cat.id)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                          style={{ color: COLORS.darkText }}
                          data-testid={`bulk-category-option-${cat.id}`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSelection}
                  className="text-gray-500"
                  data-testid="clear-selection-btn"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Clear
                </Button>
              </div>
            )}
          </div>

          {/* Products List with Drag & Drop */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-sm" style={{ color: COLORS.grayText }}>Loading products...</div>
              </div>
            ) : paginatedProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Utensils className="w-12 h-12 mb-4" style={{ color: COLORS.grayText }} />
                <p className="font-medium" style={{ color: COLORS.darkText }}>No products found</p>
                <p className="text-sm" style={{ color: COLORS.grayText }}>
                  {searchQuery ? 'Try a different search term' : 'Add products to this category'}
                </p>
              </div>
            ) : (
              <>
                {/* Select All Header */}
                {paginatedProducts.length > 0 && (
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <button
                      onClick={handleSelectAll}
                      className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
                      style={{ color: COLORS.grayText }}
                      data-testid="select-all-checkbox"
                    >
                      {(() => {
                        const currentIds = paginatedProducts.map(p => p.id);
                        const allSelected = currentIds.length > 0 && currentIds.every(id => selectedProducts.has(id));
                        const someSelected = currentIds.some(id => selectedProducts.has(id));
                        if (allSelected) return <CheckSquare className="w-4.5 h-4.5" style={{ color: COLORS.primaryGreen }} />;
                        if (someSelected) return <MinusSquare className="w-4.5 h-4.5" style={{ color: COLORS.primaryGreen }} />;
                        return <Square className="w-4.5 h-4.5" />;
                      })()}
                      <span>Select All</span>
                    </button>
                    <span className="text-xs" style={{ color: COLORS.grayText }}>
                      ({paginatedProducts.length} on this page)
                    </span>
                  </div>
                )}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleProductDragEnd}
                >
                <SortableContext
                  items={paginatedProducts.map(p => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {paginatedProducts.map((product) => (
                      <SortableItem key={product.id} id={product.id}>
                        {({ attributes, listeners, isDragging }) => (
                          <div
                            className={`flex items-center gap-3 p-4 rounded-xl transition-all hover:shadow-md ${
                              isDragging ? 'shadow-lg z-10' : ''
                            }`}
                            style={{ 
                              backgroundColor: isDragging ? COLORS.lightBg : selectedProducts.has(product.id) ? '#F0FDF4' : COLORS.sectionBg, 
                              border: `1px solid ${selectedProducts.has(product.id) ? COLORS.primaryGreen : COLORS.borderGray}` 
                            }}
                            data-testid={`product-${product.id}`}
                          >
                            {/* Selection Checkbox */}
                            <button
                              onClick={() => handleToggleSelectProduct(product.id)}
                              className="flex-shrink-0 hover:opacity-80 transition-opacity"
                              data-testid={`select-product-${product.id}`}
                            >
                              {selectedProducts.has(product.id) 
                                ? <CheckSquare className="w-5 h-5" style={{ color: COLORS.primaryGreen }} />
                                : <Square className="w-5 h-5" style={{ color: COLORS.grayText }} />
                              }
                            </button>

                            {/* Drag Handle */}
                            <DragHandle listeners={listeners} attributes={attributes} />

                            {/* Product Image */}
                            <div 
                              className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0"
                              style={{ backgroundColor: COLORS.borderGray }}
                            >
                              <img 
                                src={product.image} 
                                alt={product.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.src = 'https://preprod.mygenie.online/public/assets/admin/img/100x100/food-default-image.png';
                                }}
                              />
                            </div>

                            {/* Product Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {getFoodTypeIcon(product)}
                                <span 
                                  className={`w-2 h-2 rounded-full ${product.status === 1 ? 'bg-green-500' : 'bg-red-500'}`}
                                />
                                <h4 className="font-semibold truncate" style={{ color: COLORS.darkText }}>
                                  {product.name}
                                </h4>
                                {product.variations?.length > 0 && (
                                  <span 
                                    className="text-xs px-2 py-0.5 rounded-full"
                                    style={{ backgroundColor: `${COLORS.primaryGreen}15`, color: COLORS.primaryGreen }}
                                  >
                                    +{product.variations[0]?.values?.length || 0} variants
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-sm" style={{ color: COLORS.grayText }}>
                                <span className="font-medium" style={{ color: COLORS.darkText }}>
                                  ₹{product.price}
                                </span>
                                <span>+ {product.tax}% {product.tax_type}</span>
                                <span>|</span>
                                <span>{getCategoryName(product.category_id)}</span>
                                <span>|</span>
                                <span>{product.station_name}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: COLORS.grayText }}>
                                {product.dinein === 'Yes' && <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: COLORS.lightBg }}>Dine-in</span>}
                                {product.takeaway === 'Yes' && <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: COLORS.lightBg }}>Takeaway</span>}
                                {product.delivery === 'Yes' && <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: COLORS.lightBg }}>Delivery</span>}
                                {product.complementary === 'yes' && (
                                  <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: `${COLORS.primaryOrange}15`, color: COLORS.primaryOrange }}>
                                    Comp: ₹{product.complementary_price}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <Switch
                                checked={product.status === 1}
                                onCheckedChange={() => handleToggleStatus(product)}
                                data-testid={`toggle-status-${product.id}`}
                              />
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEditProduct(product)}
                                data-testid={`edit-product-${product.id}`}
                              >
                                Edit
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeleteProduct(product)}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                data-testid={`delete-product-${product.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </SortableItem>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              </>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div 
              className="px-4 py-3 border-t flex items-center justify-between"
              style={{ borderColor: COLORS.borderGray }}
            >
              <span className="text-sm" style={{ color: COLORS.grayText }}>
                Showing {((pagination.currentPage - 1) * pagination.limit) + 1} - {Math.min(pagination.currentPage * pagination.limit, pagination.total)} of {pagination.total}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm px-3" style={{ color: COLORS.darkText }}>
                  Page {pagination.currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product Modal */}
      <ProductModal
        open={productModalOpen}
        onOpenChange={setProductModalOpen}
        product={editingProduct}
        categories={categories}
        menus={menus}
        selectedMenu={selectedMenu}
        onSave={handleSaveProduct}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
        itemName={deletingProduct?.name}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />

      {/* Menu Modal */}
      <MenuModal
        open={menuModalOpen}
        onOpenChange={setMenuModalOpen}
        menu={editingMenu}
        existingMenus={menus}
        onSave={handleSaveMenu}
      />

      {/* Delete Menu Dialog */}
      <DeleteConfirmDialog
        open={deleteMenuDialogOpen}
        onOpenChange={setDeleteMenuDialogOpen}
        title="Delete Menu"
        description="Are you sure you want to delete this menu? This action cannot be undone."
        itemName={deletingMenu?.name}
        isLoading={isDeleting}
        onConfirm={handleConfirmDeleteMenu}
      />

      {/* Category Modal */}
      <CategoryModal
        open={categoryModalOpen}
        onOpenChange={setCategoryModalOpen}
        category={editingCategory}
        existingCategories={categories}
        onSave={handleSaveCategory}
      />

      {/* Delete Category Dialog */}
      <DeleteConfirmDialog
        open={deleteCategoryDialogOpen}
        onOpenChange={setDeleteCategoryDialogOpen}
        title="Delete Category"
        description="Are you sure you want to delete this category? This action cannot be undone."
        itemName={deletingCategory?.name}
        isLoading={isDeleting}
        onConfirm={handleConfirmDeleteCategory}
      />
    </div>
  );
};

export default MenuManagementPanel;
