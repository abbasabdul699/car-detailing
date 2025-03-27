import Navbar from '@/app/components/Navbar';
import Intro from './components/Intro';
import Quote from './components/Quote';
import Features from './components/Features';
import PlatformPreview from './components/PlatformPreview';
import GetStarted from './components/GetStarted';
import PricingSection from './components/PricingSection';

export default function ForDetailers() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <div className="relative">
          <Intro />
          <Quote />
          <GetStarted />
          <PlatformPreview />
          <Features />
          <PricingSection />
        </div>
      </main>
    </div>
  )
}