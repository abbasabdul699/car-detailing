import { useTheme } from '@/app/components/ThemeContext';

export default function DashboardNavbar() {
  const { theme, toggleTheme } = useTheme();
  return (
    <header className={`w-full ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} border-b px-6 py-3 flex items-center justify-between`}>
      {/* Left: Hamburger + Search */}
      <div className="flex items-center gap-4 flex-1">
        {/* Search Bar */}
        <div className={`flex items-center ${theme === 'dark' ? 'bg-gray-800 border-gray-800' : 'bg-gray-50 border-gray-100'} rounded-lg px-4 py-2 flex-1 max-w-xl border`}>
          <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            className={`bg-transparent outline-none flex-1 ${theme === 'dark' ? 'text-gray-200 placeholder-gray-400' : 'text-gray-700 placeholder-gray-400'}`}
            placeholder="Search or type command..."
            disabled
          />
          <span className={`ml-2 px-2 py-0.5 ${theme === 'dark' ? 'bg-gray-900 text-gray-400 border-gray-700' : 'bg-gray-100 text-gray-400 border-gray-200'} text-xs rounded border`}>⌘ K</span>
        </div>
      </div>
      {/* Right: Icons + User */}
      <div className="flex items-center gap-4 ml-6">
        {/* Moon/Sun Icon */}
        <button
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 relative group"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 1v2m0 18v2m11-11h-2M3 12H1m16.95 7.07l-1.41-1.41M6.34 6.34L4.93 4.93m12.02 0l-1.41 1.41M6.34 17.66l-1.41 1.41" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
            </svg>
          )}
          <span className="absolute left-1/2 -bottom-8 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none bg-black text-white text-xs rounded px-2 py-1 transition-opacity whitespace-nowrap z-50">
            {theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          </span>
        </button>
        {/* Bell Icon with Dot */}
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 relative">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full border-2 border-white"></span>
        </button>
        {/* User Avatar + Name + Dropdown */}
        <div className="flex items-center gap-2 cursor-pointer">
          <img
            src="/images/detailers/default-business.jpg"
            alt="User Avatar"
            className="w-9 h-9 rounded-full object-cover border border-gray-200"
          />
          <span className={`font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Emirhan Boruch</span>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </header>
  );
} 