import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { COLORS } from "../../constants";
import { useToast } from "../../hooks/use-toast";
import CategoryList from "./menu/CategoryList";
import ProductList from "./menu/ProductList";
import * as menuService from "../../api/services/menuManagementService";
import { fromAPI } from "../../api/transforms/menuManagementTransform";

const MenuManagementPanel = ({ isOpen, onClose, sidebarWidth }) => {
  const { toast } = useToast();
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [menuType, setMenuType] = useState("Normal");
  const [menuTypes, setMenuTypes] = useState([{ id: 0, name: "Normal" }]);
  const [foods, setFoods] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stations, setStations] = useState([]);
  const [addons, setAddons] = useState([]);
  const [deleteReasons, setDeleteReasons] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch foods list
  const fetchFoods = useCallback(async () => {
    setLoading(true);
    try {
      const res = await menuService.getFoodsList(menuType);
      const rawFoods = res.data?.foods ? res.data : res.data?.data || res.data;
      const { foods: transformed } = fromAPI.foodsListResponse(rawFoods);
      setFoods(transformed);
    } catch (err) {
      console.error('[MenuMgmt] Failed to fetch foods:', err);
      toast({ title: "Error", description: "Failed to load menu items." });
    } finally {
      setLoading(false);
    }
  }, [menuType, toast]);

  // Fetch categories from dedicated API
  const fetchCategories = useCallback(async () => {
    try {
      const res = await menuService.getCategories();
      const rawData = res.data?.categories ? res.data : res.data?.data || res.data;
      setCategories(fromAPI.categoryList(rawData));
    } catch (err) {
      console.error('[MenuMgmt] Failed to fetch categories:', err);
    }
  }, []);

  // Fetch addons
  const fetchAddons = useCallback(async () => {
    try {
      const res = await menuService.getAddonList();
      const rawData = res.data?.addons ? res.data : res.data?.data || res.data;
      setAddons(fromAPI.addonList(rawData));
    } catch (err) {
      console.error('[MenuMgmt] Failed to fetch addons:', err);
    }
  }, []);

  // Fetch meta on mount (menu types, delete reasons, stations, categories, addons)
  useEffect(() => {
    if (!isOpen) return;
    const fetchMeta = async () => {
      try {
        const [masterRes, reasonsRes, stationsRes] = await Promise.all([
          menuService.getMenuMaster(),
          menuService.getDeleteReasons(),
          menuService.getStationPrinterList(),
        ]);
        const masterData = masterRes.data?.menus ? masterRes.data : masterRes.data?.data || masterRes.data;
        const reasonsData = reasonsRes.data?.reason ? reasonsRes.data : reasonsRes.data?.data || reasonsRes.data;
        const stationsData = stationsRes.data?.stations ? stationsRes.data : stationsRes.data?.data || stationsRes.data;
        setMenuTypes(fromAPI.menuMaster(masterData));
        setDeleteReasons(fromAPI.deleteReasons(reasonsData));
        setStations(fromAPI.stationPrinterList(stationsData));
      } catch (err) {
        console.error('[MenuMgmt] Failed to fetch meta:', err);
      }
    };
    fetchMeta();
    fetchCategories();
    fetchAddons();
  }, [isOpen, fetchCategories, fetchAddons]);

  // Re-fetch foods when panel opens or menu type changes
  useEffect(() => {
    if (isOpen) fetchFoods();
  }, [isOpen, fetchFoods]);

  const handleClose = () => {
    setSelectedCategoryId(null);
    onClose();
  };

  return (
    <div
      data-testid="menu-management-panel"
      className="fixed top-0 right-0 h-full z-50 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl"
      style={{
        left: `${sidebarWidth || 70}px`,
        backgroundColor: COLORS.lightBg,
        transform: isOpen ? "translateX(0)" : "translateX(100%)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ borderBottom: `1px solid ${COLORS.borderGray}` }}
      >
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold" style={{ color: COLORS.darkText }}>
            Menu Management
          </h2>
          <select
            value={menuType}
            onChange={(e) => setMenuType(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border outline-none bg-white"
            style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
            data-testid="menu-type-selector"
          >
            {menuTypes.map((mt) => (
              <option key={mt.id} value={mt.name}>{mt.name}</option>
            ))}
          </select>
          {loading && (
            <span className="text-xs" style={{ color: COLORS.grayText }}>Loading...</span>
          )}
        </div>
        <button
          data-testid="menu-close-btn"
          onClick={handleClose}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" style={{ color: COLORS.grayText }} />
        </button>
      </div>

      {/* 2-Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Categories (30%) */}
        <div
          className="w-[30%] p-4 overflow-hidden flex flex-col"
          style={{ borderRight: `1px solid ${COLORS.borderGray}` }}
        >
          <CategoryList
            categories={categories}
            stations={stations}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
            onRefresh={fetchCategories}
          />
        </div>

        {/* Right: Products (70%) */}
        <div className="w-[70%] p-4 overflow-hidden flex flex-col">
          <ProductList
            foods={foods}
            categories={categories}
            addons={addons}
            selectedCategoryId={selectedCategoryId}
            deleteReasons={deleteReasons}
            menuType={menuType}
            onRefresh={fetchFoods}
            onRefreshAddons={fetchAddons}
          />
        </div>
      </div>
    </div>
  );
};

export default MenuManagementPanel;
