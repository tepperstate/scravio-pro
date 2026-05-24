'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

interface DashboardProps {
  onBack: () => void
}

// Mock data
const mockCampaigns = [
  { id: 1, name: 'Instagram - @marketinggurus', platform: 'instagram', status: 'completed', total: 150, valid: 89, created: '2024-01-15' },
  { id: 2, name: 'YouTube - Tech Channels', platform: 'youtube', status: 'running', total: 45, valid: 23, created: '2024-01-14' },
  { id: 3, name: 'TikTok - Fitness Creators', platform: 'tiktok', status: 'completed', total: 200, valid: 156, created: '2024-01-13' },
]

const mockEmails = [
  { id: 1, email: 'contact@mrbeast.com', platform: 'youtube', username: '@MrBeast', status: 'verified', followers: 150000000 },
  { id: 2, email: 'team@charlidamelio.com', platform: 'tiktok', username: '@charlidamelio', status: 'verified', followers: 150000000 },
  { id: 3, email: 'marketing@therock.com', platform: 'instagram', username: '@therock', status: 'risky', followers: 350000000 },
  { id: 4, email: 'hello@teslamotors.com', platform: 'twitter', username: '@elonmusk', status: 'verified', followers: 150000000 },
  { id: 5, email: 'info@acme.com', platform: 'linkedin', username: 'Acme Corp', status: 'pending', followers: 5000 },
]

const platformIcons: Record<string, string> = {
  instagram: '📸',
  youtube: '▶️',
  tiktok: '🎵',
  linkedin: '💼',
  twitter: '🐦',
  facebook: '👥',
}

const statusColors: Record<string, string> = {
  verified: 'bg-green-100 text-green-800',
  risky: 'bg-yellow-100 text-yellow-800',
  invalid: 'bg-red-100 text-red-800',
  pending: 'bg-gray-100 text-gray-800',
  catch_all: 'bg-orange-100 text-orange-800',
}

export default function Dashboard({ onBack }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'emails' | 'export'>('campaigns')
  const [credits] = useState(87)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button 
                onClick={onBack}
                className="p-2 rounded-lg hover:bg-slate-100 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-slate-900">Scravio</span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Credits badge */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold text-blue-700">{credits}</span>
                <span className="text-blue-600 text-sm">credits</span>
              </div>

              {/* User menu */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-medium">
                  JD
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats overview */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Emails', value: '1,247', change: '+12%' },
            { label: 'Verified', value: '892', change: '+8%' },
            { label: 'Campaigns', value: '8', change: '+2' },
            { label: 'Exports', value: '24', change: '+5' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-xs text-green-600 font-medium">{stat.change} this week</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'campaigns', label: 'Campaigns', icon: '🎯' },
            { id: 'emails', label: 'Emails', icon: '📧' },
            { id: 'export', label: 'Export', icon: '📤' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'campaigns' && (
          <div className="space-y-4">
            {mockCampaigns.map((campaign) => (
              <div key={campaign.id} className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-2xl">
                      {platformIcons[campaign.platform]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{campaign.name}</h3>
                      <p className="text-sm text-slate-500">Created {campaign.created}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Scraped</p>
                      <p className="font-semibold">{campaign.total}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Valid</p>
                      <p className="font-semibold text-green-600">{campaign.valid}</p>
                    </div>
                    <div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        campaign.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {campaign.status}
                      </span>
                    </div>
                    <button className="p-2 rounded-lg hover:bg-slate-100 transition">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Progress bar for running campaigns */}
                {campaign.status === 'running' && (
                  <div className="mt-4">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: '45%' }} />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">45% complete</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'emails' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase">Platform</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase">Source</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase">Followers</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {mockEmails.map((email) => (
                  <tr key={email.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono text-sm">{email.email}</td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-2">
                        {platformIcons[email.platform]}
                        <span className="capitalize">{email.platform}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{email.username}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[email.status]}`}>
                        {email.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {(email.followers / 1000000).toFixed(0)}M
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button className="p-2 rounded-lg hover:bg-slate-100 transition text-slate-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => toast.success('Email copied!')}
                          className="p-2 rounded-lg hover:bg-slate-100 transition text-slate-400"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'export' && (
          <div className="grid md:grid-cols-3 gap-6">
            {['CSV', 'Excel (XLSX)', 'JSON'].map((format) => (
              <button
                key={format}
                onClick={() => toast.success(`Exporting to ${format}...`)}
                className="bg-white rounded-xl border border-slate-200 p-6 text-center hover:border-blue-500 hover:shadow-lg transition"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-slate-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">Export to {format}</h3>
                <p className="text-sm text-slate-500">Download your verified emails</p>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}