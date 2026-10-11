// CR-072: Recipe Management Page
// BUG-196: Added Sidebar navigation
// CR-081: +InventoryTabBar
import { useState } from 'react';
import { ChefHat } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import RecipeManagementPanel from '@/components/inventory/RecipeManagementPanel';
import InventoryTabBar from '@/components/inventory/InventoryTabBar'; // CR-081

export default function RecipeManagementPage() {
  // BUG-361: persist sidebar state across reloads
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(
    () => localStorage.getItem('mygenie_sidebar_expanded') === 'true'
  );
  return (
    <div className="flex h-screen" data-testid="recipe-management-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} />
      <main className="flex-1 overflow-auto bg-slate-50">
        <InventoryTabBar active="recipes" />
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Recipes Management
            </h1>
          </div>
          <RecipeManagementPanel />
        </div>
      </main>
    </div>
  );
}
