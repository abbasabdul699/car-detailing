import Image from 'next/image'

export default function Quote() {
  return (
    <div className="relative w-full">
      <section className="bg-[#389167] pt-20 pb-16 w-screen">
        <div className="max-w-3xl mx-auto px-4 text-center text-white">
          <p className="text-3xl md:text-4xl font-serif leading-relaxed">
            "As a detailer for over 5 years, I know how hard it is to get your name
            out there. I built this platform because every great detailer deserves to
            be seen and booked without fighting through ads, SEO, or slow weeks."
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Image
              src="/images/daunte.png"
              alt="Daunte"
              width={48}
              height={48}
              className="rounded-full"
            />
            <p className="text-lg">Daunte, Co-Founder & Detailer</p>
          </div>
        </div>
      </section>
    </div>
  )
}