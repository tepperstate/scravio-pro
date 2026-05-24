'use client'

interface PlatformSelectorProps {
  onSelect: (platform: string) => void
}

const platforms = [
  { 
    id: 'instagram', 
    name: 'Instagram', 
    icon: '📸',
    color: 'from-pink-500 to-rose-500',
    description: 'Bios, hashtags, followers, commenters',
    users: '2B+ users'
  },
  { 
    id: 'youtube', 
    name: 'YouTube', 
    icon: '▶️',
    color: 'from-red-500 to-orange-500',
    description: 'Channel about pages, video descriptions',
    users: '2B+ users'
  },
  { 
    id: 'tiktok', 
    name: 'TikTok', 
    icon: '🎵',
    color: 'from-cyan-400 to-pink-500',
    description: 'Creator profiles, bios, link-in-bio',
    users: '1B+ users'
  },
  { 
    id: 'linkedin', 
    name: 'LinkedIn', 
    icon: '💼',
    color: 'from-blue-600 to-blue-700',
    description: 'Professional profiles, company pages',
    users: '900M+ users'
  },
  { 
    id: 'twitter', 
    name: 'X (Twitter)', 
    icon: '🐦',
    color: 'from-sky-400 to-blue-500',
    description: 'Profile bios, pinned tweets',
    users: '400M+ users'
  },
  { 
    id: 'facebook', 
    name: 'Facebook', 
    icon: '👥',
    color: 'from-blue-500 to-indigo-600',
    description: 'Page about sections, business profiles',
    users: '3B+ users'
  },
]

export default function PlatformSelector({ onSelect }: PlatformSelectorProps) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {platforms.map((platform) => (
        <button
          key={platform.id}
          onClick={() => onSelect(platform.id)}
          className="group relative p-6 rounded-2xl bg-white border border-slate-200 hover:border-transparent hover:shadow-xl transition-all duration-300 text-left overflow-hidden"
        >
          {/* Gradient background on hover */}
          <div className={`absolute inset-0 bg-gradient-to-br ${platform.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
          
          <div className="relative">
            {/* Icon and name */}
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${platform.color} flex items-center justify-center text-2xl`}>
                {platform.icon}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{platform.name}</h3>
                <p className="text-sm text-slate-500">{platform.users}</p>
              </div>
            </div>
            
            {/* Description */}
            <p className="text-slate-600 text-sm mb-4">{platform.description}</p>
            
            {/* Action */}
            <div className="flex items-center gap-2 text-sm font-medium text-slate-400 group-hover:text-slate-900 transition-colors">
              <span>Start scraping</span>
              <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}