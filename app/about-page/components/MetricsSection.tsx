'use client'

import CountUp from 'react-countup';
import { useEffect, useState } from 'react';

const metrics = [
    { number: 50000, label: "Active Users", suffix: "+" },
    { number: 1000, label: "Active Detailers", suffix: "+" },
    { number: 100000, label: "Services Completed", suffix: "+" },
];

function MetricsSection() {
    const [startCounting, setStartCounting] = useState(false);

    useEffect(() => {
        setStartCounting(true);
    }, []);

    return (
        <section className="relative w-[100vw] bg-[rgba(10,34,23,0.1)] py-16 left-[calc(-50vw+50%)] ml-0 mr-0 overflow-x-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {metrics.map((metric, index) => (
              <div 
                key={index} 
                className="text-center bg-white rounded-2xl shadow-lg p-8"
              >
                <h3 
                  className="text-4xl font-bold text-[rgba(10,34,23,1)] mb-2"
                >
                  {startCounting && (
                    <CountUp
                      start={0}
                      end={metric.number}
                      duration={2.5}
                      separator=","
                      suffix={metric.suffix}
                    />
                  )}
                  {!startCounting && '0+'}
                </h3>
                <p className="text-[rgba(10,34,23,1)]">{metric.label}</p>
              </div>
            ))}
          </div>
        </section>
    );
}

export default MetricsSection; 