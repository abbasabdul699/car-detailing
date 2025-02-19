import Footer from "../about-page/components/Footer";
import Navbar from "../about-page/components/Navbar"
import MetricsSection from "./components/MetricsSection";
import { motion } from "framer-motion";
import CountUp from 'react-countup';
const OrgChart = require("./components/OrgChart");

export default function AboutPage() {
  const metrics = [
    { number: 50000, label: "Active Users", suffix: "+" },
    { number: 1000, label: "Active Detailers", suffix: "+" },
    { number: 100000, label: "Services Completed", suffix: "+" },
  ];

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <Navbar />
      <main className="relative overflow-x-hidden">
        {/* Hero Section */}
        <div className="text-center mb-24 pt-24">
          <h1 className="text-5xl font-bold tracking-tight text-[rgba(10,34,23,1)] sm:text-6xl mb-6">
            Meet the Team
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            It's where your car gets the care it deserves. Renu connects car owners with professional mobile detailers, making it easier than ever to maintain your vehicle's beauty.
          </p>
        </div>

        {/* Our Story Section */}
        <div className="mb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-8">Our story</h2>
          
          <div className="space-y-16">
            <div className="max-w-3xl">
              <h3 className="text-2xl font-semibold mb-4">Prologue</h3>
              <p className="text-gray-600 leading-relaxed">
                Renu was started to solve a common problem: finding reliable, professional car detailing services. Our founders shared a passion for pristine vehicles and recognized the challenges car owners faced in finding quality mobile detailing services.
              </p>
            </div>

            <div className="max-w-3xl">
              <h3 className="text-2xl font-semibold mb-4">Chapter One</h3>
              <p className="text-gray-600 leading-relaxed">
                In 2024, we launched Renu to bridge the gap between car owners and professional detailers. The platform quickly gained traction as people discovered how easy it was to book quality detailing services. What started as a simple solution has grown into a trusted community of car enthusiasts and professional detailers.
              </p>
            </div>

            <div className="max-w-3xl">
              <h3 className="text-2xl font-semibold mb-4">Where are we now?</h3>
              <p className="text-gray-600 leading-relaxed">
                Today, Renu serves communities across the country, connecting car owners with skilled detailers. From basic washes to premium detailing services, Renu has become the go-to platform for automotive care, making professional detailing accessible to everyone.
              </p>
            </div>
          </div>
        </div>

        {/* Metrics Section */}
        <MetricsSection />

        {/* Organization Chart */}
        <OrgChart />
      </main>
      <Footer />
    </div>
  );
} 

