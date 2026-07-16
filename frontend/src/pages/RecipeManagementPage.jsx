// CR-072: Recipe Management Page
import { ChefHat } from 'lucide-react';
import RecipeManagementPanel from '@/components/inventory/RecipeManagementPanel';

export default function RecipeManagementPage() {
  return (
    <div className="min-h-screen bg-slate-50" data-testid="recipe-management-page">
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
    </div>
  );
}
