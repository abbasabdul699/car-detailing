import SearchSection from '@/app/(home)/components/SearchSection';
import DetailersSection from '@/app/(home)/components/DetailersSection';
import Features from '@/app/(home)/components/Features';
import Footer from '@/app/components/Footer';

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