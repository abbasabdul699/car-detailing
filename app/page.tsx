import Navbar from '@/app/(home)/components/Navbar';
import SearchSection from '@/app/(home)/components/SearchSection';
import DetailersSection from '@/app/(home)/components/DetailersSection';
import Features from '@/app/(home)/components/Features';
import Footer from '@/app/(home)/components/Footer';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <SearchSection />
      <DetailersSection />
      <Features />
      <Footer />
    </div>
  );
} 