import Navbar from '@/components/Navbar';
import SearchSection from '@/components/SearchSection';
import DetailersSection from '@/components/DetailersSection';
import Features from '@/components/Features';
import Footer from '@/components/Footer';

function App() {
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

export default App;