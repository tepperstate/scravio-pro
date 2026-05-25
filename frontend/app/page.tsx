'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Hero from '@/components/Hero'
import PlatformSelector from '@/components/PlatformSelector'
import ScraperForm from '@/components/ScraperForm'
import Dashboard from '@/components/Dashboard'
import StatsBar from '@/components/StatsBar'
import AuthModal from '@/components/AuthModal'

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
  const [showDashboard, setShowDashboard] = useState(false)
  const [authModal, setAuthModal] = useState<{isOpen: boolean, mode: 'login' | 'register'}>({ isOpen: false, mode: 'login' })

  useEffect(() => {
    const token = localStorage.getItem('SocialScravio_token')
    if (token) {
      setIsLoggedIn(true)
    }
  }, [])

  const handleStartScraping = (platform: string) => {
    setSelectedPlatform(platform)
    if (!isLoggedIn) {
      setAuthModal({ isOpen: true, mode: 'register' })
    }
  }

  const handleViewDashboard = () => {
    setShowDashboard(true)
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-2xl font-bold text-white tracking-tight">SocialScravio</span>
            </div>
            
            <nav className="hidden md:flex items-center gap-10">
              <a href="#features" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Features</a>
              <a href="#platforms" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Supported Platforms</a>
              <a href="#pricing" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Pricing</a>
            </nav>

            <div className="flex items-center gap-4">
              {isLoggedIn ? (
                <>
                  <button 
                    onClick={handleViewDashboard}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-slate-800 rounded-xl hover:bg-slate-700 transition border border-slate-700"
                  >
                    Dashboard
                  </button>
                  <button 
                    onClick={() => {
                      localStorage.removeItem('SocialScravio_token')
                      localStorage.removeItem('Scravio_token')
                      window.location.reload()
                    }}
                    className="px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white transition"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => setAuthModal({ isOpen: true, mode: 'login' })}
                    className="px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white transition"
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => setAuthModal({ isOpen: true, mode: 'register' })}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-500 transition shadow-lg shadow-blue-500/20"
                  >
                    Start Free
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {showDashboard ? (
        <div className="bg-slate-50 min-h-screen text-slate-900">
          <Dashboard onBack={() => setShowDashboard(false)} />
        </div>
      ) : (
        <>
          <Hero onStartScraping={handleStartScraping} />

          {/* Platform Selector Silo */}
          <section id="platforms" className="py-32 px-4 relative">
            <div className="max-w-7xl mx-auto relative z-10">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-16"
              >
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                  Target Any Social Platform
                </h2>
                <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                  Whether you need influencer emails from Instagram or founder contacts from LinkedIn, our intelligent scrapers adapt to any platform.
                </p>
              </motion.div>
              
              <PlatformSelector onSelect={handleStartScraping} />
            </div>
          </section>

          {/* Features Silo */}
          <section id="features" className="py-32 px-4 bg-slate-900 border-y border-slate-800">
            <div className="max-w-7xl mx-auto">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-16"
              >
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                  Military-Grade Verification
                </h2>
                <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                  We don't just find emails. We ping their servers to guarantee they exist. Never ruin your sender reputation again.
                </p>
              </motion.div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { icon: '🔍', title: 'Syntax Analysis', desc: 'Eliminate malformed emails instantly before they cost you money.' },
                  { icon: '🌐', title: 'Domain Verification', desc: 'Ensure the domain is active and configured to receive mail.' },
                  { icon: '📧', title: 'SMTP Handshake', desc: 'We securely communicate with the mail server to verify the exact inbox.' },
                  { icon: '🛡️', title: 'Catch-All Detection', desc: 'Avoid risky domains that artificially inflate your delivery metrics.' },
                ].map((feature, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    key={i} 
                    className="p-8 rounded-2xl bg-slate-800/50 border border-slate-700 hover:bg-slate-800 transition duration-300"
                  >
                    <div className="text-4xl mb-6">{feature.icon}</div>
                    <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                    <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Scraper Form Section */}
          {selectedPlatform && (
            <section className="py-32 px-4 relative">
              <div className="max-w-3xl mx-auto">
                <ScraperForm 
                  platform={selectedPlatform} 
                  onComplete={() => setShowDashboard(true)} 
                />
              </div>
            </section>
          )}

          {/* Footer */}
          <footer className="py-16 px-4 border-t border-slate-800 bg-slate-950">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-xl font-bold text-white">SocialScravio</span>
                </div>
                
                <div className="flex gap-8 text-sm font-medium text-slate-500">
                  <a href="#" className="hover:text-white transition">Privacy Policy</a>
                  <a href="#" className="hover:text-white transition">Terms of Service</a>
                  <a href="#" className="hover:text-white transition">Contact Us</a>
                </div>
              </div>
              
              <div className="mt-12 pt-8 border-t border-slate-800/50 text-center text-sm text-slate-600">
                © {new Date().getFullYear()} SocialScravio. All rights reserved.
              </div>
            </div>
          </footer>
        </>
      )}

      <AuthModal 
        key={authModal.mode}
        isOpen={authModal.isOpen}
        initialMode={authModal.mode}
        onClose={() => setAuthModal({ ...authModal, isOpen: false })}
        onSuccess={() => {
          setAuthModal({ ...authModal, isOpen: false })
          setIsLoggedIn(true)
          setShowDashboard(true)
        }}
      />
    </main>
  )
}