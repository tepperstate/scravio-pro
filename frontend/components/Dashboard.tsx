'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import PlatformSelector from './PlatformSelector'
import ScraperForm from './ScraperForm'

interface DashboardProps {
  onBack: () => void
}

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
  const [activeTab, setActiveTab] = useState<'campaigns' | 'emails' | 'export' | 'import'>('campaigns')
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
  
  const [credits, setCredits] = useState(0)
  const [userName, setUserName] = useState('')
  const [userInitials, setUserInitials] = useState('U')
  const [isAdmin, setIsAdmin] = useState(false)
  
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [emails, setEmails] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [selectedCampaigns, setSelectedCampaigns] = useState<number[]>([])
  const [selectedEmails, setSelectedEmails] = useState<number[]>([])

  const handleBatchDeleteCampaigns = async () => {
    if (selectedCampaigns.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedCampaigns.length} campaigns?`)) return;
    
    try {
      await api.post('/scrape/campaigns/batch-delete', { campaign_ids: selectedCampaigns })
      toast.success('Campaigns deleted successfully!')
      setSelectedCampaigns([])
      fetchData()
    } catch (error) {
      toast.error('Failed to delete campaigns')
    }
  }

  const handleBatchDeleteEmails = async () => {
    if (selectedEmails.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedEmails.length} emails?`)) return;
    
    try {
      await api.post('/scrape/emails/batch-delete', { email_ids: selectedEmails })
      toast.success('Emails deleted successfully!')
      setSelectedEmails([])
      fetchData()
    } catch (error) {
      toast.error('Failed to delete emails')
    }
  }

  const fetchData = async () => {
    try {
      setIsLoading(true)
      // Fetch user info
      const userRes = await api.get('/auth/me')
      setUserName(userRes.data.full_name)
      if (userRes.data.full_name) {
        setUserInitials(userRes.data.full_name.substring(0, 2).toUpperCase())
      }
      setIsAdmin(!!userRes.data.is_admin)
      
      // Fetch credits
      const creditsRes = await api.get('/scrape/credits')
      setCredits(creditsRes.data.credits_remaining)

      // Fetch campaigns
      const campRes = await api.get('/scrape/campaigns?limit=50')
      setCampaigns(campRes.data)

      // Fetch emails
      const emailsRes = await api.get('/scrape/emails?page=1&page_size=50')
      setEmails(emailsRes.data.emails)
      
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error)
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error('Authentication failed or expired. Please log in again.')
        localStorage.removeItem('SocialScravio_token')
        localStorage.removeItem('Scravio_token')
        window.location.href = '/'
      } else {
        toast.error('Failed to load dashboard data.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleExport = async (format: string) => {
    if (campaigns.length === 0) {
      toast.error('No campaigns available to export.')
      return
    }
    
    // For simplicity, we'll just export the most recent campaign
    const latestCampaignId = campaigns[0].id
    toast.success(`Starting ${format} export...`)
    
    try {
      const response = await api.post('/export/download', {
        campaign_id: latestCampaignId,
        format: format.toLowerCase() === 'excel (xlsx)' ? 'xlsx' : format.toLowerCase(),
        include_unverified: true
      }, {
        responseType: 'blob' // Important for downloading files
      })
      
      // Create a URL for the blob and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      
      // Try to extract filename from Content-Disposition header if possible
      let filename = `export_${latestCampaignId}.${format.toLowerCase() === 'excel (xlsx)' ? 'xlsx' : format.toLowerCase()}`
      
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Export downloaded successfully!')
    } catch (error) {
      toast.error('Failed to export. The campaign might not have any emails yet.')
    }
  }

  const handleCampaignComplete = () => {
    setIsCreatingCampaign(false)
    setSelectedPlatform(null)
    setActiveTab('campaigns')
    fetchData() // Refresh data
  }

  const handleEditCampaign = async (campaign: any) => {
    const newName = window.prompt('Enter new campaign name:', campaign.name)
    if (newName && newName.trim() !== '' && newName.trim() !== campaign.name) {
      try {
        await api.patch(`/scrape/campaign/${campaign.id}`, { name: newName.trim() })
        toast.success('Campaign renamed successfully')
        fetchData()
      } catch (error) {
        toast.error('Failed to rename campaign')
      }
    }
  }

  const handleDeleteCampaign = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this campaign? This will remove it from your dashboard.')) {
      try {
        await api.delete(`/scrape/campaign/${id}`)
        toast.success('Campaign deleted successfully')
        fetchData()
      } catch (error) {
        toast.error('Failed to delete campaign')
      }
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a valid CSV file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const rows = text.split(/\r?\n/);
        if (rows.length < 2) {
          toast.error('CSV file is empty or invalid.');
          return;
        }

        // Parse usernames from the second column (index 1)
        const usernames = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i].trim();
          if (!row) continue;
          
          // Basic CSV parsing handling quotes
          // Split by comma but respect quotes
          const match = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
          if (match && match.length >= 2) {
            let username = match[1].replace(/^"|"$/g, '').replace(/\/+$/, '').trim();
            if (username) {
              usernames.push(username);
            }
          }
        }

        if (usernames.length === 0) {
          toast.error('Could not find any usernames in the CSV.');
          return;
        }

        const platform = file.name.toLowerCase().includes('instagram') ? 'instagram' : 'instagram'; // Defaulting to instagram for extension

        toast.success(`Found ${usernames.length} profiles. Starting import...`);
        
        await api.post('/scrape/import', {
          platform: platform,
          usernames: usernames,
          name: `Extension Import - ${new Date().toLocaleDateString()}`
        });

        toast.success('Import campaign started successfully!');
        setActiveTab('campaigns');
        fetchData();

      } catch (error: any) {
        console.error('Import error:', error);
        toast.error(error.response?.data?.detail || 'Failed to import CSV.');
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    e.target.value = '';
  }

  // Calculate some overview stats
  const totalEmailsScraped = campaigns.reduce((acc, c) => acc + c.total_scraped, 0)
  const totalVerifiedEmails = campaigns.reduce((acc, c) => acc + c.valid_emails, 0)

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
                <span className="text-xl font-bold text-slate-900">SocialScravio</span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Credits badge */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold text-blue-700">{(credits || 0).toLocaleString()}</span>
                <span className="text-blue-600 text-sm">credits</span>
              </div>

              {/* Extension Download Button */}
              <a 
                href="/scravio-extension.zip" 
                download
                className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition flex items-center gap-2 shadow-sm border border-slate-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Extension
              </a>

              {/* Admin Panel Button */}
              {isAdmin && (
                <button 
                  onClick={() => window.location.href = '/admin'}
                  className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition flex items-center gap-2 shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Admin Panel
                </button>
              )}

              {/* User menu */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-medium" title={userName}>
                  {userInitials}
                </div>
                <button 
                  onClick={() => {
                    localStorage.removeItem('SocialScravio_token')
                    localStorage.removeItem('Scravio_token')
                    window.location.href = '/'
                  }}
                  className="text-sm font-medium text-slate-500 hover:text-slate-900 transition"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {isCreatingCampaign ? (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">New Campaign</h2>
                <p className="text-slate-500">Select a platform to extract targeted leads</p>
              </div>
              <button 
                onClick={() => { setIsCreatingCampaign(false); setSelectedPlatform(null); }}
                className="px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </div>
            
            {!selectedPlatform ? (
              <PlatformSelector onSelect={setSelectedPlatform} />
            ) : (
              <ScraperForm platform={selectedPlatform} onComplete={handleCampaignComplete} />
            )}
          </div>
        ) : (
          <>
            {/* Stats overview */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total Emails', value: totalEmailsScraped.toLocaleString() },
                { label: 'Verified', value: totalVerifiedEmails.toLocaleString() },
                { label: 'Campaigns', value: campaigns.length.toLocaleString() },
                { label: 'Available Credits', value: (credits || 0).toLocaleString() },
              ].map((stat, i) => (
                <div key={i} className="bg-white rounded-xl p-4 border border-slate-200">
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Tabs & New Campaign Button */}
            <div className="flex justify-between mb-6">
              <div className="flex gap-2">
                {[
                  { id: 'campaigns', label: 'Campaigns', icon: '🎯' },
                  { id: 'emails', label: 'Emails', icon: '📧' },
                  { id: 'import', label: 'Import Extension', icon: '📥' },
                  { id: 'export', label: 'Export', icon: '📤' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition ${
                      activeTab === tab.id 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-transparent'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
              
              <button 
                onClick={() => setIsCreatingCampaign(true)}
                className="px-5 py-2 gradient-primary text-white rounded-lg font-medium shadow-md hover:opacity-90 transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Campaign
              </button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                {/* Content */}
                {activeTab === 'campaigns' && (
                  <div className="space-y-4">
                    {selectedCampaigns.length > 0 && (
                      <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <span className="text-blue-800 font-medium">{selectedCampaigns.length} campaigns selected</span>
                        <button 
                          onClick={handleBatchDeleteCampaigns}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          Delete Selected
                        </button>
                      </div>
                    )}
                    {campaigns.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                        <div className="text-4xl mb-4">🎯</div>
                        <h3 className="text-lg font-bold text-slate-900">No campaigns yet</h3>
                        <p className="text-slate-500 mb-6">Start your first scraping campaign to find leads.</p>
                        <button 
                          onClick={() => setIsCreatingCampaign(true)}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                        >
                          Create Campaign
                        </button>
                      </div>
                    ) : (
                      campaigns.map((campaign) => (
                        <div key={campaign.id} className="bg-white rounded-xl border border-slate-200 p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <input 
                                type="checkbox" 
                                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                checked={selectedCampaigns.includes(campaign.id)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedCampaigns([...selectedCampaigns, campaign.id])
                                  else setSelectedCampaigns(selectedCampaigns.filter(id => id !== campaign.id))
                                }}
                              />
                              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-2xl">
                                {platformIcons[campaign.platform?.toLowerCase()] || '🌐'}
                              </div>
                              <div>
                                <h3 className="font-semibold text-slate-900">{campaign.name}</h3>
                                <p className="text-sm text-slate-500">Created {new Date(campaign.created_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <p className="text-sm text-slate-500">Scraped</p>
                                <p className="font-semibold">{campaign.total_scraped}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-slate-500">Valid</p>
                                <p className="font-semibold text-green-600">{campaign.valid_emails}</p>
                              </div>
                              <div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  campaign.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                  campaign.status === 'running' ? 'bg-blue-100 text-blue-800' :
                                  campaign.status === 'failed' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {campaign.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 border-l border-slate-200 pl-4 ml-2">
                                <button
                                  onClick={() => handleEditCampaign(campaign)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                  title="Rename Campaign"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteCampaign(campaign.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                                  title="Delete Campaign"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          {/* Progress bar for running campaigns */}
                          {campaign.status === 'running' && (
                            <div className="mt-4">
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${campaign.progress}%` }} />
                              </div>
                              <p className="text-xs text-slate-500 mt-2">{campaign.progress}% complete</p>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'emails' && (
                  <div className="space-y-4">
                    {selectedEmails.length > 0 && (
                      <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
                        <span className="text-blue-800 font-medium">{selectedEmails.length} emails selected</span>
                        <button 
                          onClick={handleBatchDeleteEmails}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          Delete Selected
                        </button>
                      </div>
                    )}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    {emails.length === 0 ? (
                       <div className="text-center py-12">
                         <p className="text-slate-500">No emails found. Run a campaign first.</p>
                       </div>
                    ) : (
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-6 py-4 text-left">
                              <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                checked={emails.length > 0 && selectedEmails.length === emails.length}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedEmails(emails.map(em => em.id))
                                  else setSelectedEmails([])
                                }}
                              />
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase">Platform</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase">Source</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase">Followers</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {emails.map((email) => (
                            <tr key={email.id} className="hover:bg-slate-50">
                              <td className="px-6 py-4">
                                <input 
                                  type="checkbox" 
                                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  checked={selectedEmails.includes(email.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) setSelectedEmails([...selectedEmails, email.id])
                                    else setSelectedEmails(selectedEmails.filter(id => id !== email.id))
                                  }}
                                />
                              </td>
                              <td className="px-6 py-4 font-mono text-sm">{email.email}</td>
                              <td className="px-6 py-4">
                                <span className="flex items-center gap-2">
                                  {platformIcons[email.platform.toLowerCase()] || '🌐'}
                                  <span className="capitalize">{email.platform}</span>
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-600 truncate max-w-[150px]">{email.source_username || email.source_url}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[email.verification_status?.toLowerCase()] || statusColors.pending}`}>
                                  {email.verification_status || 'unknown'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm">
                                {email.follower_count ? (email.follower_count > 1000000 ? (email.follower_count / 1000000).toFixed(1) + 'M' : email.follower_count.toLocaleString()) : '-'}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard.writeText(email.email)
                                      toast.success('Email copied!')
                                    }}
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
                    )}
                    </div>
                  </div>
                )}

                {activeTab === 'export' && (
                  <div className="grid md:grid-cols-3 gap-6">
                    {['CSV', 'Excel (XLSX)', 'JSON'].map((format) => (
                      <button
                        key={format}
                        onClick={() => handleExport(format)}
                        className="bg-white rounded-xl border border-slate-200 p-6 text-center hover:border-blue-500 hover:shadow-lg transition"
                      >
                        <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-slate-100 flex items-center justify-center">
                          <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </div>
                        <h3 className="font-semibold text-slate-900 mb-1">Export to {format}</h3>
                        <p className="text-sm text-slate-500">Download your latest campaign</p>
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === 'import' && (
                  <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-2xl mx-auto">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Import Extension Data</h3>
                    <p className="text-slate-500 mb-8">
                      Upload the CSV file exported from the SocialScravio Chrome Extension. 
                      We will automatically queue a deep scan to find their verified email addresses and phone numbers.
                    </p>
                    
                    <div className="relative group cursor-pointer">
                      <input 
                        type="file" 
                        accept=".csv" 
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 group-hover:border-blue-500 group-hover:bg-blue-50 transition">
                        <span className="text-blue-600 font-medium flex items-center justify-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Select CSV File
                        </span>
                        <p className="text-sm text-slate-400 mt-2">or drag and drop here</p>
                      </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-slate-200">
                      <h4 className="font-semibold text-slate-900 mb-2">Need the extension?</h4>
                      <p className="text-sm text-slate-500 mb-4">
                        Download the latest version of the SocialScravio Chrome Extension to start extracting profiles from Instagram.
                      </p>
                      <a 
                        href="/scravio-extension.zip" 
                        download
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download Extension v1.1 (.zip)
                      </a>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}