'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const faqCategories = {
  getting_started: {
    id: 'getting_started',
    title: 'Getting started with Reeva',
    questions: [
      {
        question: 'What is Reeva and how does it work?',
        answer: 'Reeva is a complete detailing platform that lets you start, grow, and manage your detailing business. It is a space made to connect car owners with professional, mobile car detailers in their local area. You can create a professional profile, manage bookings, and connect with customers looking for quality detailing services.'
      },
      {
        question: 'How much does Reeva cost?',
        answer: 'Try Reeva Starter for free, no credit card required. For growing businesses, our Pro plan is $20/month when billed annually.'
      },
      {
        question: 'What is Reeva to a Detailer',
        answer: 'A place to start, grow, and manage your detailing business. An opportunity to showcase your work and services without the hassle of competing for SEO and the monthly costs of a personal website, with pricey ad-ons. Stop paying for social media marketing, when you’re not getting the reach you deserve.'
      },
    ]
  },
  detailing: {
    id: 'detailing',
    title: 'Detailing on Reeva',
    questions: [
      {
        question: 'What do I need to start detailing on Reeva?',
        answer: 'To start detailing on Reeva, you will need a Reeva account and your detailing equipment. We handle the booking, payments, and customer management for you.'
      },
      {
        question: 'Where can I offer my services with Reeva?',
        answer: 'Reeva lets you offer your services wherever your customers are, including mobile detailing at their location or at your own facility.'
      },
    ]
  },
  payments: {
    id: 'payments',
    title: 'Payments on Reeva',
    questions: [
      {
        question: 'How do I get paid?',
        answer: 'Payments are processed automatically after each service. We deposit funds directly to your bank account within 2 business days.'
      },
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept all major credit cards, debit cards, and digital wallets including Apple Pay and Google Pay.'
      },
    ]
  }
}

export default function FAQPage() {
  const [activeSection, setActiveSection] = useState('getting_started')

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId)
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="pt-32 pb-12 bg-[#F3F3F3]">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Reeva FAQ</h1>
          <p className="text-xl text-gray-600">
            If you're new to Reeva or looking to grow your detailing business, this guide will help you learn more about the platform and its features.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex gap-12">
          {/* Left Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <div className="sticky top-24">
              <nav className="space-y-2">
                {Object.values(faqCategories).map((category) => (
                  <button
                    key={category.id}
                    onClick={() => scrollToSection(category.id)}
                    className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeSection === category.id
                        ? 'bg-[#389167] text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {category.title}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 max-w-3xl">
            {Object.values(faqCategories).map((category) => (
              <section 
                key={category.id}
                id={category.id}
                className="mb-16"
              >
                <h2 className="text-2xl font-bold mb-8">{category.title}</h2>
                <div className="space-y-6">
                  {category.questions.map((faq, index) => (
                    <div key={index} className="border-b border-gray-200 pb-6">
                      <h3 className="text-lg font-semibold mb-3">{faq.question}</h3>
                      <p className="text-gray-600">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            <div className="mt-16 p-8 bg-[#F3F3F3] rounded-lg">
              <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
              <p className="text-gray-600 mb-6">
                Our team is here to help you get started with Reeva
              </p>
              <Link 
                href="/get-in-touch" 
                className="inline-block bg-[#389167] text-white px-8 py-3 rounded-lg hover:bg-[#389167]/90 transition-colors"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 