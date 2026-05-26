'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

import api from '../lib/api'

interface ScraperFormProps {
  platform: string
  onComplete: () => void
}

const platformConfig: Record<string, { name: string; icon: string; placeholder: string; examples: string }> = {
  instagram: { name: 'Instagram', icon: '📸', placeholder: '@username or #hashtag or profile URL', examples: '@therock, #marketing, instagram.com/username' },
  youtube: { name: 'YouTube', icon: '▶️', placeholder: 'Channel name or URL', examples: '@MrBeast, youtube.com/channel/UC...' },
  tiktok: { name: 'TikTok', icon: '🎵', placeholder: '@username or profile URL', examples: '@charlidamelio, tiktok.com/@username' },
  linkedin: { name: 'LinkedIn', icon: '💼', placeholder: 'Profile URL or company name', examples: 'linkedin.com/in/username, Acme Corp' },
  twitter: { name: 'X (Twitter)', icon: '🐦', placeholder: '@username or #hashtag', examples: '@elonmusk, #tech' },
  facebook: { name: 'Facebook', icon: '👥', placeholder: 'Page name or URL', examples: 'facebook.com/pagename, Brand Name' },
}

export default function ScraperForm({ platform, onComplete }: ScraperFormProps) {
  const [query, setQuery] = useState('')
  const [maxResults, setMaxResults] = useState(50)
  const [isLoading, setIsLoading] = useState(false)
  
  const config = platformConfig[platform] || platformConfig.instagram

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!query.trim()) {
      toast.error('Please enter a search query')
      return
    }
    
    setIsLoading(true)
    
    try {
      if (platform === 'instagram') {
        // Send message to the extension via our injected bridge
        window.postMessage({
          type: 'SCRAVIO_START_SCRAPING',
          payload: {
            target: query.trim(),
            max: maxResults,
            platform: 'instagram'
          }
        }, '*');
        
        toast.success(`Sent scraping task to extension for ${query}!`)
      } else {
        // Fallback to backend for other platforms
        await api.post('/scrape/start', {
          platform: platform,
          query: query.trim(),
          max_results: maxResults
        });
        toast.success(`Scraping started for ${query} on ${config.name}!`)
      }
      
      onComplete()
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to start scraping. Please try again.';
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-3xl">
          {config.icon}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Scrape {config.name}</h2>
          <p className="text-slate-600">Enter a username, hashtag, or URL to extract emails</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Query input */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Search Query
          </label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={config.placeholder}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
          />
          <p className="mt-2 text-sm text-slate-500">
            Examples: {config.examples}
          </p>
        </div>

        {/* Max results */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Maximum Results
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={maxResults}
              onChange={(e) => setMaxResults(parseInt(e.target.value))}
              className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span className="w-20 text-center font-semibold text-slate-900">{maxResults}</span>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Each profile scanned = 1 credit. You have 100 free credits.
          </p>
        </div>

        {/* Credits info */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">Credits to be used</p>
              <p className="text-sm text-slate-500">Estimated based on max results</p>
            </div>
            <div className="text-2xl font-bold text-blue-600">{maxResults}</div>
          </div>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 px-6 text-lg font-semibold text-white gradient-primary rounded-xl hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Starting Scrape...
            </>
          ) : (
            <>
              Start Scraping
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>
      </form>

      {/* Disclaimer */}
      <p className="mt-6 text-xs text-slate-500 text-center">
        By scraping, you agree to only contact individuals who have opted in to receive communications 
        and comply with applicable privacy regulations including GDPR and CCPA.
      </p>
    </div>
  )
}