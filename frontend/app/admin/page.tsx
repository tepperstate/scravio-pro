'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import api from '../../lib/api'

export default function AdminPage() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isVerifying, setIsVerifying] = useState(true)
  
  // Credit Add Modal State
  const [showAddCredits, setShowAddCredits] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [creditAmount, setCreditAmount] = useState<number>(1000)
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        const res = await api.get('/auth/me')
        if (!res.data.is_admin) {
          toast.error("You don't have permission to view this page.")
          router.push('/')
        } else {
          setIsVerifying(false)
          fetchUsers()
        }
      } catch (error) {
        toast.error("Authentication failed.")
        router.push('/')
      }
    }
    
    verifyAdmin()
  }, [router])

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      const res = await api.get('/admin/users')
      setUsers(res.data)
    } catch (error) {
      toast.error('Failed to fetch users')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddCredits = async () => {
    if (!selectedUser) return
    setIsAdding(true)
    try {
      await api.post(`/admin/users/${selectedUser.id}/add-credits`, {
        amount: creditAmount
      })
      toast.success(`Successfully added ${creditAmount.toLocaleString()} credits to ${selectedUser.email}`)
      setShowAddCredits(false)
      fetchUsers() // Refresh list
    } catch (error) {
      toast.error('Failed to add credits')
      console.error(error)
    } finally {
      setIsAdding(false)
    }
  }

  const openCreditModal = (user: any) => {
    setSelectedUser(user)
    setCreditAmount(1000)
    setShowAddCredits(true)
  }

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
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.push('/')}
                className="p-2 rounded-lg hover:bg-slate-100 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-slate-900">Admin Dashboard</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">User Management</h2>
          <p className="text-slate-500">View all registered users and manage their credit balances.</p>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Credits</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-slate-500">#{user.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold mr-3 flex-shrink-0">
                            {user.full_name ? user.full_name.substring(0, 2).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{user.full_name || 'No Name'}</div>
                            <div className="text-sm text-slate-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.is_admin ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {user.is_admin ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900">{user.credits_remaining.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <button 
                          onClick={() => openCreditModal(user)}
                          className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
                        >
                          Add Credits
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Add Credits Modal */}
      {showAddCredits && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAddCredits(false)}></div>
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-fadeIn">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Add Credits</h3>
              <p className="text-slate-500 text-sm mb-6">
                Adding credits to <span className="font-semibold text-slate-700">{selectedUser.email}</span>.
                Current balance: <span className="font-semibold text-slate-700">{selectedUser.credits_remaining.toLocaleString()}</span>
              </p>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Amount to Add</label>
                <input 
                  type="number" 
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setShowAddCredits(false)}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                  disabled={isAdding}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddCredits}
                  disabled={isAdding || creditAmount <= 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isAdding ? 'Adding...' : 'Add Credits'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
