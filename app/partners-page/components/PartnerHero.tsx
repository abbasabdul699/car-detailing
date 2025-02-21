export default function PartnerHero() {
  return (
    <section className="relative bg-white text-black py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto text-center">
        <button className="bg-[#E8F2EE] text-[#0A2217] px-6 py-2 rounded-full text-sm font-medium mb-12">
          Join our Partner Program
        </button>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-serif tracking-tight mb-8">
          Partner With Renu and Grow Together
        </h1>

        <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto mb-12">
          Earn commissions by referring detailers to our platform. Help grow the community of professional detailers while growing your business.
        </p>

        <div className="flex justify-center gap-4">
          <button className="bg-[#0A2217] text-white px-8 py-4 rounded-full text-lg font-medium hover:bg-[#0A2217]/90 transition-colors">
            Let's get started
          </button>
          <button className="bg-white text-[#0A2217] px-8 py-4 rounded-full text-lg font-medium border-2 border-[#0A2217] hover:bg-[#E8F2EE] transition-colors">
            Log in
          </button>
        </div>
      </div>
    </section>
  );
} 