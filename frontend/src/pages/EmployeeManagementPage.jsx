// CR-069: Employee Management Page — shell with Employees | Roles tabs
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Users, Shield } from 'lucide-react';
import EmployeeListView from '@/components/panels/employee/EmployeeListView';
import RoleListView from '@/components/panels/employee/RoleListView';
import RoleFormView from '@/components/panels/employee/RoleFormView';

export default function EmployeeManagementPage() {
  const [activeTab, setActiveTab] = useState('employees');
  const [editingRole, setEditingRole] = useState(undefined); // undefined=list, null=add, object=edit

  const handleEditRole = (role) => {
    setEditingRole(role); // null = add new, object = edit existing
  };

  const handleBackToList = () => {
    setEditingRole(undefined);
  };

  return (
    <div className="min-h-screen bg-slate-50" data-testid="employee-management-page">
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
            <Users className="w-5 h-5 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900"
              style={{ fontFamily: 'Manrope, sans-serif' }}>
            Employee Management
          </h1>
        </div>

        {/* Tabs — hidden when editing a role */}
        {editingRole === undefined ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-transparent border-b border-slate-200 rounded-none w-full justify-start gap-0 h-auto p-0 mb-6">
              <TabsTrigger
                value="employees"
                data-testid="tab-employees"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
              >
                <Users className="w-4 h-4 mr-1.5" />
                Employees
              </TabsTrigger>
              <TabsTrigger
                value="roles"
                data-testid="tab-roles"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
              >
                <Shield className="w-4 h-4 mr-1.5" />
                Roles
              </TabsTrigger>
            </TabsList>

            <TabsContent value="employees" className="mt-0">
              <EmployeeListView />
            </TabsContent>

            <TabsContent value="roles" className="mt-0">
              <RoleListView onEditRole={handleEditRole} />
            </TabsContent>
          </Tabs>
        ) : (
          /* Role Form View — replaces tabs when editing/creating */
          <RoleFormView role={editingRole} onBack={handleBackToList} />
        )}
      </div>
    </div>
  );
}
