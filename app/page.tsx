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
        <section
          style={{
            backgroundImage: "url('/images/reeva-hero.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            minHeight: '80vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            color: 'white',
            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
          }}
        >
        </section>
        
      </main>
    </div>
  );
} 