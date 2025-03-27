interface ReviewFilterProps {
  activeTab: 'all' | 'users' | 'detailers'
  setActiveTab: (tab: 'all' | 'users' | 'detailers') => void
  sortBy: 'recent' | 'rating'
  setSortBy: (sort: 'recent' | 'rating') => void
}

export default function ReviewFilter({ 
  activeTab, 
  setActiveTab, 
  sortBy, 
  setSortBy 
}: ReviewFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
      {/* Tab Filters */}
      <div className="flex bg-white rounded-full p-1 shadow-sm">
        {['all', 'users', 'detailers'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as 'all' | 'users' | 'detailers')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab 
                ? 'bg-[#389167] text-white' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Sort Options */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Sort by:</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'recent' | 'rating')}
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="recent">Most Recent</option>
          <option value="rating">Highest Rated</option>
        </select>
      </div>
    </div>
  )
} 