import SearchSection from './(home)/components/SearchSection';
import DetailersSection from './(home)/components/DetailersSection';
import Features from './(home)/components/Features';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-blue-50">
      <main className="relative">
        {/* Curved background shape for SearchSection */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-purple-600/5 to-pink-600/5 rounded-b-[3rem] transform -skew-y-1 origin-top-left"></div>

        <SearchSection />

        {/* White background section */}
        <div className="relative z-10 w-full bg-white">
          {/* Constrained content container */}
          <div className="max-w-7xl mx-auto px-4">
            <DetailersSection />
          </div>

          {/* Full-width gradient transition BELOW the constrained content */}
          <div className="w-full h-32 pointer-events-none bg-gradient-to-b from-white to-[#ecfdf5]" />
        </div>

        {/* Features Section */}
        <div className="relative z-0">
          <Features />
        </div>

        {/* Optional Hero Section */}
        <section
          style={{
            backgroundImage: "url('https://reevacar.s3.us-east-2.amazonaws.com/homeimages/reeva-hero.jpg')",
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
          className="relative rounded-t-[3rem] -mt-8"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-t-[3rem]" />
          <div className="relative z-10">
            {/* Optional hero content */}
          </div>
        </section>
      </main>
    </div>
  );
}
