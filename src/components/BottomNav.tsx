import { FileText, History, Settings } from 'lucide-react';
import { cn } from '../lib/utils';
import { hapticFeedback } from '../lib/haptics';

interface BottomNavProps {
  activeTab: string;
  onChange: (tab: string) => void;
}

export function BottomNav({ activeTab, onChange }: BottomNavProps) {
  const tabs = [
    { id: 'new', label: 'New Bill', icon: FileText },
    { id: 'history', label: 'History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleTabClick = (id: string) => {
    if (activeTab !== id) {
      hapticFeedback('light');
      onChange(id);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 pb-safe z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center w-16 h-full space-y-1 transition-colors",
                isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              )}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium leading-none">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
