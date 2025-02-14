'use client'

import CountUp from 'react-countup';

const metrics = [
    { number: 50000, label: "Active Users", suffix: "+" },
    { number: 1000, label: "Active Detailers", suffix: "+" },
    { number: 100000, label: "Services Completed", suffix: "+" },
];

function MetricsSection() {
    return (
        <div className="mb-24 bg-[COLOR_FROM_FOOTER] py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {metrics.map((metric, index) => (
              <div 
                key={index} 
                className="text-center"
              >
                <h3 
                  className="text-4xl font-bold text-gray-900 mb-2"
                >
                  <CountUp
                    end={metric.number}
                    duration={2.5}
                    separator=","
                    suffix={metric.suffix}
                    enableScrollSpy
                    scrollSpyOnce
                  />
                </h3>
                <p className="text-gray-600">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
    );
}

module.exports = MetricsSection; 