'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import api from '../../lib/api'

export default function AdminPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [users, setUsers] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  
  const [isLoading, setIsLoading] = useState(true)
  const [isVerifying, setIsVerifying] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modals state
  const [showAddCredits, setShowAddCredits] = useState(false)
  const [showEditUser, setShowEditUser] = useState(false)
  const [showDeleteUser, setShowDeleteUser] = useState(false)
  
  const [selectedUser, setSelectedUser] = useState<any>(null)
  
  // Form states
  const [creditAmount, setCreditAmount] = useState<number>(1000)
  const [editIsAdmin, setEditIsAdmin] = useState(false)
  const [editIsActive, setEditIsActive] = useState(true)
  
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        const res = await api.get('/auth/me')
        if (!res.data.is_admin) {
          toast.error("You don't have permission to view this page.")
          router.push('/')
        } else {
          setIsVerifying(false)
          fetchAllData()
        }
      } catch (error: any) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          toast.error("Authentication failed or forbidden.")
          localStorage.removeItem('scravio_token')
          window.location.href = '/'
        } else {
          toast.error("An error occurred verifying admin access.")
          setIsVerifying(false)
        }
      }
    }
    verifyAdmin()
  }, [router])

  const fetchAllData = async () => {
    setIsLoading(true)
    try {
      const [statsRes, usersRes, campaignsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/campaigns')
      ])
      setStats(statsRes.data)
      setUsers(usersRes.data)
      setCampaigns(campaignsRes.data)
    } catch (error) {
      toast.error('Failed to fetch admin data')
    } finally {
      setIsLoading(false)
    }
  }

  // User Actions
  const handleAddCredits = async () => {
    if (!selectedUser) return
    setIsSubmitting(true)
    try {
      await api.post(`/admin/users/${selectedUser.id}/add-credits`, { amount: creditAmount })
      toast.success(`Added ${creditAmount.toLocaleString()} credits`)
      setShowAddCredits(false)
      fetchAllData()
    } catch (error) {
      toast.error('Failed to add credits')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateUser = async () => {
    if (!selectedUser) return
    setIsSubmitting(true)
    try {
      await api.put(`/admin/users/${selectedUser.id}`, {
        is_admin: editIsAdmin,
        is_active: editIsActive
      })
      toast.success('User updated successfully')
      setShowEditUser(false)
      fetchAllData()
    } catch (error) {
      toast.error('Failed to update user')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return
    setIsSubmitting(true)
    try {
      await api.delete(`/admin/users/${selectedUser.id}`)
      toast.success('User deleted')
      setShowDeleteUser(false)
      fetchAllData()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete user')
    } finally {
      setIsSubmitting(false)
    }
  }

  // UI Helpers
  const openCreditModal = (user: any) => { setSelectedUser(user); setCreditAmount(1000); setShowAddCredits(true); }
  const openEditModal = (user: any) => { setSelectedUser(user); setEditIsAdmin(user.is_admin); setEditIsActive(user.is_active); setShowEditUser(true); }
  const openDeleteModal = (user: any) => { setSelectedUser(user); setShowDeleteUser(true); }

  const filteredUsers = users.filter(u => 
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/')} className="p-2 rounded-lg hover:bg-slate-100 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <h1 className="text-xl font-bold text-slate-900">Admin Control Center</h1>
            </div>
            
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button 
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${activeTab === 'overview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Overview
              </button>
              <button 
                onClick={() => setActiveTab('users')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${activeTab === 'users' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Users
              </button>
              <button 
                onClick={() => setActiveTab('campaigns')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${activeTab === 'campaigns' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Campaigns
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading && !stats ? (
          <div className="flex justify-center items-center py-32">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && stats && (
              <div className="animate-fadeIn">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-slate-900">Platform Statistics</h2>
                  <p className="text-slate-500">High-level overview of system usage and performance.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Stat Cards */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Total Users</p>
                    <h3 className="text-3xl font-bold text-slate-900">{stats.total_users.toLocaleString()}</h3>
                  </div>
                  
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    </div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Total Campaigns</p>
                    <h3 className="text-3xl font-bold text-slate-900">{stats.total_campaigns.toLocaleString()}</h3>
                  </div>
                  
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Valid Emails Scraped</p>
                    <h3 className="text-3xl font-bold text-slate-900">{stats.total_valid_emails.toLocaleString()}</h3>
                  </div>
                  
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Total Credits Issued</p>
                    <h3 className="text-3xl font-bold text-slate-900">{stats.total_credits_distributed.toLocaleString()}</h3>
                  </div>
                </div>
              </div>
            )}

            {/* USERS TAB */}
            {activeTab === 'users' && (
              <div className="animate-fadeIn">
                <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
                    <p className="text-slate-500">Manage accounts, roles, and balances.</p>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role & Status</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Credits</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Joined</th>
                          <th className="px-6 py-4 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-slate-50 group">
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold mr-3">
                                  {user.full_name ? user.full_name.substring(0, 2).toUpperCase() : 'U'}
                                </div>
                                <div>
                                  <div className="font-medium text-slate-900">{user.full_name || 'No Name'}</div>
                                  <div className="text-sm text-slate-500">{user.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1 items-start">
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${user.is_admin ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-800'}`}>
                                  {user.is_admin ? 'Admin' : 'User'}
                                </span>
                                {!user.is_active && (
                                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">Inactive</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-bold text-slate-900">{(user.credits_remaining || 0).toLocaleString()}</div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500">
                              {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-medium">
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openCreditModal(user)} className="text-blue-600 bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100 transition">Credits</button>
                                <button onClick={() => openEditModal(user)} className="text-slate-600 bg-slate-100 px-3 py-1.5 rounded hover:bg-slate-200 transition">Edit</button>
                                <button onClick={() => openDeleteModal(user)} className="text-red-600 bg-red-50 px-3 py-1.5 rounded hover:bg-red-100 transition">Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* CAMPAIGNS TAB */}
            {activeTab === 'campaigns' && (
              <div className="animate-fadeIn">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-900">System Campaigns</h2>
                  <p className="text-slate-500">Monitor active and completed scraping tasks across all users.</p>
                </div>
                
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Campaign</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Platform</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Results</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {campaigns.map((campaign) => (
                          <tr key={campaign.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4">
                              <div className="font-medium text-slate-900">{campaign.name}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                ${campaign.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 
                                  campaign.status === 'running' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                                {campaign.status === 'running' && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5 animate-pulse"></span>}
                                {campaign.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="capitalize text-sm font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">{campaign.platform}</span>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500">
                              <span className="font-medium text-slate-900">{campaign.valid_emails.toLocaleString()}</span> / {campaign.total_scraped.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500">
                              {campaign.created_at ? new Date(campaign.created_at).toLocaleDateString() : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* MODALS */}
      {showAddCredits && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isSubmitting && setShowAddCredits(false)}></div>
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fadeIn">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Add Credits</h3>
            <p className="text-slate-500 text-sm mb-6">Current balance: <span className="font-bold text-slate-900">{(selectedUser.credits_remaining || 0).toLocaleString()}</span></p>
            <input type="number" value={creditAmount} onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)} className="w-full px-4 py-2 mb-6 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowAddCredits(false)} className="px-4 py-2 border rounded-lg hover:bg-slate-50" disabled={isSubmitting}>Cancel</button>
              <button onClick={handleAddCredits} disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add</button>
            </div>
          </div>
        </div>
      )}

      {showEditUser && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isSubmitting && setShowEditUser(false)}></div>
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fadeIn">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Edit User Roles</h3>
            <div className="space-y-4 mb-8">
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition">
                <input type="checkbox" checked={editIsAdmin} onChange={(e) => setEditIsAdmin(e.target.checked)} className="w-5 h-5 rounded text-blue-600" />
                <div>
                  <div className="font-medium text-slate-900">Admin Privileges</div>
                  <div className="text-sm text-slate-500">User can access this admin dashboard</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition">
                <input type="checkbox" checked={editIsActive} onChange={(e) => setEditIsActive(e.target.checked)} className="w-5 h-5 rounded text-blue-600" />
                <div>
                  <div className="font-medium text-slate-900">Account Active</div>
                  <div className="text-sm text-slate-500">Uncheck to deactivate/ban the user</div>
                </div>
              </label>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowEditUser(false)} className="px-4 py-2 border rounded-lg hover:bg-slate-50" disabled={isSubmitting}>Cancel</button>
              <button onClick={handleUpdateUser} disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteUser && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isSubmitting && setShowDeleteUser(false)}></div>
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fadeIn">
            <h3 className="text-xl font-bold text-red-600 mb-2">Delete User</h3>
            <p className="text-slate-600 mb-6">Are you sure you want to permanently delete <strong>{selectedUser.email}</strong>? This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDeleteUser(false)} className="px-4 py-2 border rounded-lg hover:bg-slate-50" disabled={isSubmitting}>Cancel</button>
              <button onClick={handleDeleteUser} disabled={isSubmitting} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Delete User</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
