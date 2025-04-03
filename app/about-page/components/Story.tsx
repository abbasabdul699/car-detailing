'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'

// Custom hook for typewriter effect
const useTypewriter = (text: string, speed = 50) => {
  const [displayText, setDisplayText] = useState('')

  useEffect(() => {
    let i = 0
    setDisplayText('') // Reset text on each effect run
    
    const typeCharacter = () => {
      if (i < text.length) {
        setDisplayText(current => current + text.charAt(i))
        i++
        const nextDelay = text.charAt(i) === ' ' ? speed * 2 : speed
        setTimeout(typeCharacter, nextDelay)
      }
    }

    const timer = setTimeout(typeCharacter, speed)

    return () => {
      clearTimeout(timer)
      setDisplayText('')
    }
  }, [text, speed])

  return displayText
}

export default function Story() {
  // Removed extra spaces at the start and normalized spacing between words
  const quote = "  We believe every car detailer should be independent and have the opportunity to showcase their craft."
  const displayText = useTypewriter(quote, 50)

  return (
    <div className="max-w-7xl mx-auto px-4 py-24">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Left Column - Story Content */}
        <div>
          <h1 className="text-4xl font-bold mb-12">Our story</h1>
          
          <div className="space-y-12">
            <div>
              <h2 className="text-2xl font-bold mb-4">Prologue</h2>
              <p className="text-gray-600 leading-relaxed">
                Reeva was started to solve a common problem: finding reliable, professional car detailing services. Our
                founders shared a passion for pristine vehicles and recognized the challenges car owners faced in finding
                quality mobile detailing services.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">Chapter One</h2>
              <p className="text-gray-600 leading-relaxed">
                In 2024, we launched Reeva to bridge the gap between car owners and professional detailers. The platform
                quickly gained traction as people discovered how easy it was to book quality detailing services. What
                started as a simple solution has grown into a trusted community of car enthusiasts and professional
                detailers.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">Where are we now?</h2>
              <p className="text-gray-600 leading-relaxed">
                Today, Reeva serves communities across the country, connecting car owners with skilled detailers. From
                basic washes to premium detailing services, Reeva has become the go-to platform for automotive care,
                making professional detailing accessible to everyone.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - Quote */}
        <div className="flex items-center">
          <div className="bg-[#389167] text-white p-12 rounded-2xl">
            <div className="text-2xl md:text-3xl font-serif leading-relaxed mb-8 relative font-mono tracking-wide">
              "{displayText}"
              <span className="inline-block w-[2px] h-[1em] bg-white ml-1 align-middle animate-blink" />
            </div>
            
            <div className="flex items-center gap-4 opacity-0 animate-fadeIn" 
                 style={{ animationDelay: `${quote.length * 50 + 500}ms` }}>
              <div className="w-12 h-12 relative">
                <Image
                  src="/images/abdul.png"
                  alt="Abdul Abbas"
                  width={48}
                  height={48}
                  className="rounded-full object-cover"
                />
              </div>
              <div>
                <p className="font-medium">Abdul Abbas</p>
                <p className="text-sm text-white/80">Co-Founder & CTO</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blink {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .animate-blink {
          animation: blink 1s step-end infinite;
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s forwards;
        }
      `}</style>
    </div>
  );
} 