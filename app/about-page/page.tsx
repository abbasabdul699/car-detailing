'use client'

import MetricsSection from "./components/MetricsSection";
import { motion } from "framer-motion";
import CountUp from 'react-countup';
const OrgChart = require("./components/OrgChart");
import Story from "./components/Story";
import Navbar from '@/app/components/Navbar'

export default function AboutPage() {
  const metrics = [
    { number: 50000, label: "Active Users", suffix: "+" },
    { number: 1000, label: "Active Detailers", suffix: "+" },
    { number: 100000, label: "Services Completed", suffix: "+" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="space-y-24">
        {/* Hero Section */}
        <div className="text-center mb-24 pt-24">
          <h1 className="text-5xl font-bold tracking-tight text-[rgba(10,34,23,1)] sm:text-6xl mb-6">
            Meet the Team
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            It's where your car gets the care it deserves. Renu connects car owners with professional mobile detailers, making it easier than ever to maintain your vehicle's beauty.
          </p>
        </div>
        
        {/* Story Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <Story />
        </motion.div>
        
        {/* Metrics Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <MetricsSection />
        </motion.div>

        {/* Organization Chart */}
        <OrgChart />
      </main>
    </div>
  );
} 

