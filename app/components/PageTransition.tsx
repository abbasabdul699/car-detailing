'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Define the custom event type
interface TransitionEvent extends CustomEvent {
  detail: {
    x: number;
    y: number;
  };
}

export default function PageTransition() {
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const router = useRouter()

  useEffect(() => {
    const handleTransitionStart = async (e: Event) => {
      const event = e as TransitionEvent;
      const { x, y } = event.detail;
      setCoords({ x, y });
      setIsTransitioning(true);
      
      // Wait for expansion animation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Navigate to new page
      router.push('/for-detailers');
      
      // Wait for page to load then start retraction
      await new Promise(resolve => setTimeout(resolve, 100));
      setIsTransitioning(false);
    };

    window.addEventListener('startTransition', handleTransitionStart);
    return () => window.removeEventListener('startTransition', handleTransitionStart);
  }, [router]);

  return (
    <AnimatePresence mode="wait">
      {isTransitioning && (
        <motion.div
          initial={{ clipPath: `circle(0px at ${coords.x}px ${coords.y}px)` }}
          animate={{ clipPath: `circle(150% at ${coords.x}px ${coords.y}px)` }}
          exit={{ clipPath: `circle(0px at ${coords.x}px ${coords.y}px)` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 bg-[#389167] z-50 pointer-events-none"
        />
      )}
    </AnimatePresence>
  )
} 