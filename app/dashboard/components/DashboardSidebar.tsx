'use client';

interface DashboardSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export default function DashboardSidebar({ 
  activeSection, 
  onSectionChange 
}: DashboardSidebarProps) {
  const menuItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'profile', label: 'Profile' },
    { id: 'services', label: 'Services' },
    { id: 'photos', label: 'Photos' },
    { id: 'hours', label: 'Hours' },
    { id: 'settings', label: 'Settings' }
  ];

  return (
    <aside className="w-64 bg-white shadow-sm">
      <nav className="mt-5 px-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            className={`w-full text-left px-4 py-2 rounded-md mb-1 transition-colors ${
              activeSection === item.id
                ? 'bg-[#1D503A] text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
} 