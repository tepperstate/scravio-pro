'use client'

import { useState } from 'react'
import Hero from '@/components/Hero'
import PlatformSelector from '@/components/PlatformSelector'
import ScraperForm from '@/components/ScraperForm'
import Dashboard from '@/components/Dashboard'
import StatsBar from '@/components/StatsBar'

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
  const [showDashboard, setShowDashboard] = useState(false)

  const handleStartScraping = (platform: string) => {
    setSelectedPlatform(platform)
    if (!isLoggedIn) {
      setIsLoggedIn(true)
    }
  }

  const handleViewDashboard = () => {
    setShowDashboard(true)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-slate-900">Scravio</span>
            </div>
            
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-slate-600 hover:text-slate-900 transition">Features</a>
              <a href="#platforms" className="text-slate-600 hover:text-slate-900 transition">Platforms</a>
              <a href="#pricing" className="text-slate-600 hover:text-slate-900 transition">Pricing</a>
            </nav>

            <div className="flex items-center gap-4">
              {isLoggedIn ? (
                <button 
                  onClick={handleViewDashboard}
                  className="px-4 py-2 text-sm font-medium text-slate-900 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                >
                  Dashboard
                </button>
              ) : (
                <>
                  <button className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition">
                    Sign In
                  </button>
                  <button className="px-4 py-2 text-sm font-medium text-white gradient-primary rounded-lg hover:opacity-90 transition">
                    Get Started Free
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {showDashboard ? (
        <Dashboard onBack={() => setShowDashboard(false)} />
      ) : (
        <>
          {/* Hero Section */}
          <Hero onStartScraping={handleStartScraping} />

          {/* Platform Selector */}
          <section id="platforms" className="py-20 px-4">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-slate-900 mb-4">
                  Target Every Major Platform
                </h2>
                <p className="text-slate-600 max-w-2xl mx-auto">
                  Extract verified emails from influencers and creators across all major social media platforms.
                </p>
              </div>
              
              <PlatformSelector onSelect={handleStartScraping} />
            </div>
          </section>

          {/* Features Grid */}
          <section id="features" className="py-20 px-4 bg-white">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-slate-900 mb-4">
                  Enterprise-Grade Email Extraction
                </h2>
                <p className="text-slate-600 max-w-2xl mx-auto">
                  Our 4-layer verification ensures every email is valid before you export it.
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  { icon: '🔍', title: 'Syntax Validation', desc: 'Catch malformed emails before they cause issues' },
                  { icon: '🌐', title: 'Domain & MX Check', desc: 'Verify domains have valid mail servers' },
                  { icon: '📧', title: 'SMTP Verification', desc: 'Confirm mailboxes actually exist' },
                  { icon: '🛡️', title: 'Catch-all Detection', desc: 'Identify risky domains that accept all emails' },
                ].map((feature, i) => (
                  <div key={i} className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-lg transition">
                    <div className="text-4xl mb-4">{feature.icon}</div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                    <p className="text-slate-600 text-sm">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Stats Section */}
          <StatsBar />

          {/* Scraper Form Section */}
          {selectedPlatform && (
            <section className="py-20 px-4">
              <div className="max-w-3xl mx-auto">
                <ScraperForm 
                  platform={selectedPlatform} 
                  onComplete={() => setShowDashboard(true)} 
                />
              </div>
            </section>
          )}

          {/* Footer */}
          <footer className="py-12 px-4 bg-slate-900 text-white">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-xl font-bold">Scravio</span>
                </div>
                
                <div className="flex gap-8 text-sm text-slate-400">
                  <a href="#" className="hover:text-white transition">Privacy</a>
                  <a href="#" className="hover:text-white transition">Terms</a>
                  <a href="#" className="hover:text-white transition">Contact</a>
                </div>
              </div>
              
              <div className="mt-8 pt-8 border-t border-slate-800 text-center text-sm text-slate-500">
                © 2024 Scravio by Zorix, LLC. All rights reserved.
              </div>
            </div>
          </footer>
        </>
      )}
    </main>
  )
}