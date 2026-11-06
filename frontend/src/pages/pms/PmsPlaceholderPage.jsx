// CR-358-P1: Shared placeholder for PMS Phase 2-5 unbuilt routes
import { useState } from 'react';
import { Clock } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';

const PmsPlaceholderPage = ({ title = 'Coming Soon', phase = 2 }) => {
  // BUG-361: persist sidebar state across reloads
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(
    () => localStorage.getItem('mygenie_sidebar_expanded') === 'true'
  );

  return (
    <div className="flex h-screen bg-[#F7F7F7]" data-testid="pms-placeholder-page">
      <Sidebar
        isExpanded={isSidebarExpanded}
        setIsExpanded={(v) => {
          setIsSidebarExpanded(v);
          localStorage.setItem('mygenie_sidebar_expanded', String(v));
        }}
      />
      <main className="flex-1 overflow-auto flex items-center justify-center">
        <div className="text-center p-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-50 mb-4">
            <Clock className="w-8 h-8 text-orange-400" />
          </div>
          <h1 className="text-xl font-semibold text-gray-800 mb-2">{title}</h1>
          <p className="text-sm text-gray-500">
            This screen ships in Phase {phase} of the PMS rollout.
          </p>
        </div>
      </main>
    </div>
  );
};

export default PmsPlaceholderPage;
