'use client'

interface HeroProps {
  onStartScraping: (platform: string) => void
}

export default function Hero({ onStartScraping }: HeroProps) {
  return (
    <section className="relative py-20 px-4 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-8 animate-fadeIn">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            100 free credits every month
          </div>

          {/* Main heading */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 mb-6 tracking-tight animate-fadeIn">
            Find & Verify Emails
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              From Any Creator
            </span>
          </h1>

          {/* Description */}
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto animate-fadeIn">
            Extract emails from Instagram, TikTok, YouTube, LinkedIn, Twitter, and Facebook. 
            Every email verified with our 4-layer system. Zero bounced emails.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fadeIn">
            <button 
              onClick={() => onStartScraping('instagram')}
              className="px-8 py-4 text-lg font-semibold text-white gradient-primary rounded-xl hover:opacity-90 transition shadow-lg shadow-blue-500/25"
            >
              Start Scraping Free
            </button>
            <button className="px-8 py-4 text-lg font-semibold text-slate-700 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition">
              Watch Demo
            </button>
          </div>

          {/* Social proof */}
          <div className="mt-12 flex items-center justify-center gap-8 text-slate-500 text-sm animate-fadeIn">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>96% verification rate</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>2% bounce rate</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>GDPR compliant</span>
            </div>
          </div>
        </div>

        {/* Mock UI */}
        <div className="mt-16 max-w-5xl mx-auto animate-fadeIn">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-slate-800 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <span className="text-slate-400 text-sm ml-4">Scravio Dashboard</span>
            </div>
            <div className="bg-white p-6">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { platform: 'Instagram', emails: '2,847', color: 'from-pink-500 to-rose-500' },
                  { platform: 'YouTube', emails: '1,234', color: 'from-red-500 to-orange-500' },
                  { platform: 'LinkedIn', emails: '856', color: 'from-blue-600 to-blue-700' },
                ].map((item, i) => (
                  <div key={i} className={`p-4 rounded-xl bg-gradient-to-br ${item.color} text-white`}>
                    <div className="text-sm opacity-80">{item.platform}</div>
                    <div className="text-2xl font-bold">{item.emails}</div>
                    <div className="text-xs opacity-80 mt-1">verified emails</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}