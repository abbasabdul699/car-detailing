import SearchSection from './(home)/components/SearchSection';
import DetailersSection from './(home)/components/DetailersSection';
import Features from './(home)/components/Features';


export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <main>
        <SearchSection />
        <DetailersSection />
        <Features />
      </main>
    </div>
  );
} 