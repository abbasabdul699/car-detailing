import PartnerHero from './components/PartnerHero';
import WhyPartner from './components/WhyPartner';
import PartnerTypes from './components/PartnerTypes';
import Benefits from './components/Benefits';
import Testimonials from './components/Testimonials';
import FAQ from './components/FAQ';

export default function PartnersPage() {
  return (
    <div className="min-h-screen bg-white">
      <main>
        <PartnerHero />
        <WhyPartner />
        <PartnerTypes />
        <Benefits />
        <Testimonials />
        <FAQ />
      </main>
    </div>
  );
} 