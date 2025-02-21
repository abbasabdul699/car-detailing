import Navbar from '@/app/components/Navbar';
import Intro from './components/Intro';
import Quote from './components/Quote';
import Features from './components/Features';
import PlatformPreview from './components/PlatformPreview';
import GetStarted from './components/GetStarted';

export default function ForDetailers() {
  return (
    <div className="bg-white">
      <Navbar />
      <main>
        <div className="relative">
          <Intro />
          <Quote />
          <GetStarted />
          <PlatformPreview />
          <Features />
        </div>
      </main>
    </div>
  )
}