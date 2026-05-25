'use client'

import { motion } from 'framer-motion'

interface HeroProps {
  onStartScraping: (platform: string) => void
}

export default function Hero({ onStartScraping }: HeroProps) {
  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  }

  return (
    <section className="relative pt-32 pb-24 px-4 overflow-hidden min-h-[90vh] flex items-center bg-slate-950">
      {/* Background glowing orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen" />
      </div>

      <div className="relative max-w-7xl mx-auto w-full">
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="text-center max-w-5xl mx-auto"
        >
          {/* Badge */}
          <motion.div variants={item} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/50 border border-slate-800 text-blue-400 text-sm font-medium mb-8 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Get 100 free verified leads this month
          </motion.div>

          {/* Main heading */}
          <motion.h1 variants={item} className="text-5xl md:text-7xl font-extrabold text-white mb-6 tracking-tight leading-[1.1]">
            Turn Social Followers Into
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Verified Customers
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p variants={item} className="text-xl md:text-2xl text-slate-400 mb-10 max-w-3xl mx-auto leading-relaxed">
            Stop guessing emails. Extract direct contact info from Instagram, LinkedIn, and YouTube creators. Every email is verified through our rigorous 4-layer system so you never bounce.
          </motion.p>

          {/* CTA buttons */}
          <motion.div variants={item} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button 
              onClick={() => onStartScraping('instagram')}
              className="px-8 py-4 w-full sm:w-auto text-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-2xl shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] transition-all duration-300 hover:scale-[1.02] active:scale-95"
            >
              Start Extracting Free
            </button>
            <button className="px-8 py-4 w-full sm:w-auto text-lg font-semibold text-slate-300 bg-slate-900/50 hover:bg-slate-800 border border-slate-700/50 rounded-2xl backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] active:scale-95">
              See How It Works
            </button>
          </motion.div>

          {/* Social proof */}
          <motion.div variants={item} className="mt-14 flex flex-wrap items-center justify-center gap-8 text-slate-500 text-sm font-medium">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>99% Inbox Delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Zero Bounces</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>GDPR & CCPA Ready</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Dashboard Preview */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-20 max-w-5xl mx-auto"
        >
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/50 shadow-2xl shadow-black/50 backdrop-blur-xl">
            {/* Window Controls */}
            <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-slate-500 text-xs ml-4 font-mono">app.socialscravio.com</span>
            </div>
            
            {/* Mock Data Grid */}
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { platform: 'Instagram Influencers', emails: '2,847', color: 'text-pink-400', bg: 'bg-pink-400/10' },
                  { platform: 'YouTube Creators', emails: '1,234', color: 'text-red-400', bg: 'bg-red-400/10' },
                  { platform: 'LinkedIn Founders', emails: '856', color: 'text-blue-400', bg: 'bg-blue-400/10' },
                ].map((item, i) => (
                  <div key={i} className={`p-6 rounded-2xl border border-slate-800/60 bg-slate-800/30`}>
                    <div className="text-sm text-slate-400 mb-4">{item.platform}</div>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-4xl font-bold ${item.color}`}>{item.emails}</span>
                      <span className="text-sm text-slate-500">emails</span>
                    </div>
                    <div className="mt-4 flex -space-x-2">
                      {[1,2,3].map(j => (
                        <div key={j} className={`w-8 h-8 rounded-full border-2 border-slate-900 ${item.bg}`} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}