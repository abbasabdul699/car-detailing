"use client";
import Image from 'next/image';
import { motion, useAnimation, useScroll, useTransform } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useEffect, useRef } from 'react';

const features = [
  {
    id: 1,
    title: "Quality You Can Trust",
    description:
      "Every detailer on our platform is verified and vetted to meet high service standards. We carefully select professionals based on their experience, customer service, and quality of work—so you know you're booking with the best.",
    video: "/videos/mobile-detailing.mp4",
    poster: "/images/detailers/joshmobile.jpg",
  },
  {
    id: 2,
    title: "Car Detailing, Made Simple",
    description:
      "Browse top detailers in your area, check their services, and call them directly to discuss your needs. No waiting, no middlemen—just direct access to trusted professionals who are ready to help.",
    video: "/videos/interior-detailing.mp4",
    poster: "/images/detailers/all-star.jpg",
  },
  {
    id: 3,
    title: "Personalized Car Care",
    description:
      "Whether it's a quick wash, deep interior cleaning, or premium protection like ceramic coating, find the right detailer offering exactly what your car needs. Compare options, ask questions, and choose with confidence.",
    video: "/videos/exterior-detailing.mp4",
    poster: "/images/detailers/green-car.jpg",
  },
];

export default function Features() {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '20%']); // slow scroll effect

  return (
    <motion.section
      ref={sectionRef}
      style={{ backgroundPositionY: y }}
      className="relative w-full py-24 bg-gradient-to-br from-green-50 via-green-100 to-emerald-200 bg-fixed bg-[length:100%_150%]"
    >
      <div className="max-w-6xl mx-auto px-4 flex flex-col gap-16">
        {features.map((feature, i) => (
          <FeatureCard key={feature.id} feature={feature} reverse={i === 1} slideRight={i % 2 === 1} />
        ))}
      </div>
    </motion.section>
  );
}

function FeatureCard({
  feature,
  reverse,
  slideRight,
}: {
  feature: any;
  reverse: boolean;
  slideRight: boolean;
}) {
  const controls = useAnimation();
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  useEffect(() => {
    if (inView) controls.start("visible");
  }, [controls, inView]);

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={{
        hidden: { opacity: 0, x: slideRight ? 80 : -80 },
        visible: {
          opacity: 1,
          x: 0,
          transition: { duration: 0.8, ease: "easeOut" },
        },
      }}
      className={`flex flex-col ${
        reverse ? "md:flex-row-reverse" : "md:flex-row"
      } items-center bg-white rounded-3xl shadow-2xl fluid-shadow hover:fluid-shadow-hover smooth-transition p-8 md:p-12 gap-8 md:gap-12`}
    >
      {/* Text Section */}
      <div className="flex-1 text-center md:text-left flex flex-col justify-center items-center md:items-start">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-gray-900 via-green-900 to-green-700 bg-clip-text text-transparent">
          {feature.title}
        </h2>
        <p className="text-gray-700 text-lg md:text-xl leading-relaxed mb-2 max-w-xl">
          {feature.description}
        </p>
      </div>

      {/* Video Section */}
      <div className="flex-1 flex justify-center items-center w-full">
        <video
          className="w-full max-w-lg md:max-w-xl lg:max-w-2xl h-72 md:h-96 lg:h-[28rem] object-cover rounded-3xl shadow-xl border border-white/40"
          autoPlay
          muted
          loop
          playsInline
          poster={feature.poster}
        >
          <source src={feature.video} type="video/mp4" />
        </video>
      </div>
    </motion.div>
  );
}
