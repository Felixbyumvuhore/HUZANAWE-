import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/Skeleton';
import api from '../utils/api';

export default function Admin() {
  const { addToast } = useToast();
  const [tab, setTab] = useState('analytics');
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [providers, setProviders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [locations, setLocations] = useState([]);
  const [newLocation, setNewLocation] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, usersRes, providersRes, paymentsRes, activityRes, locationsRes] = await Promise.all([
        api.get('/admin/analytics'),
        api.get('/admin/users'),
        api.get('/admin/providers'),
        api.get('/payments/all'),
        api.get('/admin/activity'),
        api.get('/admin/locations'),
      ]);
      setAnalytics(analyticsRes.data);
      setUsers(usersRes.data);
      setProviders(providersRes.data);
      setPayments(paymentsRes.data);
      setActivities(activityRes.data);
      setLocations(locationsRes.data);
    } catch {
      addToast('Failed to load admin data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      addToast('User deleted', 'success');
      setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to delete user', 'error');
    }
  };

  const handleDeleteProvider = async (id) => {
    if (!window.confirm('Are you sure you want to remove this provider?')) return;
    try {
      await api.delete(`/admin/providers/${id}`);
      addToast('Provider removed', 'success');
      setProviders(providers.filter(p => p.id !== id));
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to delete provider', 'error');
    }
  };

  const handleConfirmPayment = async (id) => {
    try {
      await api.put(`/payments/${id}/confirm`);
      addToast('Payment confirmed!', 'success');
      setPayments(payments.map(p => p.id === id ? { ...p, status: 'confirmed' } : p));
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to confirm', 'error');
    }
  };

  const handleRejectPayment = async (id) => {
    if (!window.confirm('Reject this payment?')) return;
    try {
      await api.put(`/payments/${id}/reject`);
      addToast('Payment rejected', 'success');
      setPayments(payments.map(p => p.id === id ? { ...p, status: 'rejected' } : p));
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to reject', 'error');
    }
  };

  const handleAddLocation = async (e) => {
    e.preventDefault();
    if (!newLocation.trim()) return;
    try {
      const res = await api.post('/admin/locations', { name: newLocation.trim() });
      setLocations([...locations, res.data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewLocation('');
      addToast('Location added', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to add location', 'error');
    }
  };

  const handleDeleteLocation = async (id) => {
    try {
      await api.delete(`/admin/locations/${id}`);
      setLocations(locations.filter(l => l.id !== id));
      addToast('Location deleted', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to delete', 'error');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-28" count={4} />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const tabs = [
    { key: 'analytics', label: 'Analytics', icon: 'fa-chart-bar' },
    { key: 'payments', label: 'Payments', icon: 'fa-credit-card' },
    { key: 'users', label: 'Users', icon: 'fa-users' },
    { key: 'providers', label: 'Providers', icon: 'fa-briefcase' },
    { key: 'locations', label: 'Locations', icon: 'fa-map-marker-alt' },
    { key: 'activity', label: 'Activity', icon: 'fa-list' },
  ];

  const pendingPaymentsCount = payments.filter(p => p.status === 'pending').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Admin Panel</h1>
        <p className="text-gray-500 mb-6">Manage users, providers, and view analytics</p>

        {/* Stats Cards */}
        {analytics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Users', value: analytics.totalUsers, icon: 'fa-users', color: 'text-blue-500' },
              { label: 'Providers', value: analytics.totalProviders, icon: 'fa-briefcase', color: 'text-green-500' },
              { label: 'Revenue (RWF)', value: analytics.totalRevenue?.toLocaleString(), icon: 'fa-money-bill-wave', color: 'text-emerald-500' },
              { label: 'Pending Pay', value: analytics.pendingPayments, icon: 'fa-clock', color: 'text-yellow-500' },
              { label: 'Reviews', value: analytics.totalReviews, icon: 'fa-star', color: 'text-yellow-500' },
              { label: 'Premium Users', value: analytics.premiumUsers, icon: 'fa-crown', color: 'text-purple-500' },
              { label: 'Confirmed Pay', value: analytics.confirmedPayments, icon: 'fa-check-circle', color: 'text-green-500' },
              { label: 'Total Payments', value: analytics.totalPayments, icon: 'fa-credit-card', color: 'text-indigo-500' },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
                <i className={`fas ${stat.icon} ${stat.color} text-lg mb-1`} />
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition whitespace-nowrap px-3 ${
                tab === t.key ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className={`fas ${t.icon} mr-2`} />{t.label}
              {t.key === 'payments' && pendingPaymentsCount > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 inline-flex items-center justify-center">
                  {pendingPaymentsCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Analytics Tab */}
        {tab === 'analytics' && analytics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Categories */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Top Categories</h2>
              {analytics.topCategories?.length > 0 ? (
                <div className="space-y-3">
                  {analytics.topCategories.map((cat, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center text-sm font-bold text-primary-600">
                          {i + 1}
                        </div>
                        <span className="font-medium text-gray-800">{cat.category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-primary-500 h-2 rounded-full"
                            style={{ width: `${(cat.count / (analytics.topCategories[0]?.count || 1)) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-500 w-8 text-right">{cat.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-6">No categories yet</p>
              )}
            </div>

            {/* Recent Users */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Users</h2>
              {analytics.recentUsers?.length > 0 ? (
                <div className="space-y-3">
                  {analytics.recentUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                          <i className={`fas ${u.role === 'provider' ? 'fa-briefcase text-green-500' : 'fa-user text-blue-500'}`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          u.role === 'admin' ? 'bg-red-50 text-red-600' :
                          u.role === 'provider' ? 'bg-green-50 text-green-600' :
                          'bg-blue-50 text-blue-600'
                        }`}>
                          {u.role}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">{new Date(u.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-6">No users yet</p>
              )}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">All Users ({users.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-6 py-3 font-semibold text-gray-600">Name</th>
                    <th className="px-6 py-3 font-semibold text-gray-600">Email</th>
                    <th className="px-6 py-3 font-semibold text-gray-600">Phone</th>
                    <th className="px-6 py-3 font-semibold text-gray-600">Role</th>
                    <th className="px-6 py-3 font-semibold text-gray-600">Premium</th>
                    <th className="px-6 py-3 font-semibold text-gray-600">Joined</th>
                    <th className="px-6 py-3 font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="px-6 py-3 font-medium text-gray-800">{u.name}</td>
                      <td className="px-6 py-3 text-gray-600">{u.email}</td>
                      <td className="px-6 py-3 text-gray-600">{u.phone || '—'}</td>
                      <td className="px-6 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          u.role === 'admin' ? 'bg-red-50 text-red-600' :
                          u.role === 'provider' ? 'bg-green-50 text-green-600' :
                          'bg-blue-50 text-blue-600'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        {u.isPremium ? <i className="fas fa-crown text-accent-500" /> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-6 py-3 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-3">
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="text-red-400 hover:text-red-600 transition text-xs font-semibold"
                          >
                            <i className="fas fa-trash mr-1" />Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Providers Tab */}
        {tab === 'providers' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">All Providers ({providers.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-6 py-3 font-semibold text-gray-600">Name</th>
                    <th className="px-6 py-3 font-semibold text-gray-600">Email</th>
                    <th className="px-6 py-3 font-semibold text-gray-600">Category</th>
                    <th className="px-6 py-3 font-semibold text-gray-600">Location</th>
                    <th className="px-6 py-3 font-semibold text-gray-600">Rating</th>
                    <th className="px-6 py-3 font-semibold text-gray-600">Reviews</th>
                    <th className="px-6 py-3 font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map(p => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="px-6 py-3 font-medium text-gray-800">{p.name}</td>
                      <td className="px-6 py-3 text-gray-600">{p.email}</td>
                      <td className="px-6 py-3">
                        <span className="bg-primary-50 text-primary-700 text-xs font-semibold px-2 py-1 rounded-full">
                          {p.category}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-600">{p.location}</td>
                      <td className="px-6 py-3">
                        <span className="flex items-center gap-1">
                          <i className="fas fa-star text-yellow-400 text-xs" />
                          <span className="font-medium text-gray-800">{p.rating?.toFixed(1) || '0.0'}</span>
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-600">{p.totalReviews || 0}</td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => handleDeleteProvider(p.id)}
                          className="text-red-400 hover:text-red-600 transition text-xs font-semibold"
                        >
                          <i className="fas fa-trash mr-1" />Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {providers.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <i className="fas fa-briefcase text-3xl mb-3 block" />
                <p>No providers registered yet</p>
              </div>
            )}
          </div>
        )}

        {/* Payments Tab */}
        {tab === 'payments' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">All Payments ({payments.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-6 py-3 font-semibold text-gray-600">Ref</th>
                    <th className="px-6 py-3 font-semibold text-gray-600">Payer</th>
                    <th className="px-6 py-3 font-semibold text-gray-600">Type</th>
                    <th className="px-6 py-3 font-semibold text-gray-600">Target</th>
                    <th className="px-6 py-3 font-semibold text-gray-600">Amount</th>
                    <th className="px-6 py-3 font-semibold text-gray-600">Method</th>
                    <th className="px-6 py-3 font-semibold text-gray-600">Phone</th>
                    <th className="px-6 py-3 font-semibold text-gray-600">Status</th>
                    <th className="px-6 py-3 font-semibold text-gray-600">Date</th>
                    <th className="px-6 py-3 font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id} className={`border-b border-gray-50 hover:bg-gray-50 transition ${p.status === 'pending' ? 'bg-yellow-50/50' : ''}`}>
                      <td className="px-6 py-3 text-xs font-mono text-gray-500">{p.reference}</td>
                      <td className="px-6 py-3">
                        <p className="font-medium text-gray-800">{p.payerName}</p>
                        <p className="text-xs text-gray-400">{p.payerEmail}</p>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          p.payerRole === 'client' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                        }`}>
                          {p.payerRole}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <p className="font-medium text-gray-800">{p.targetName}</p>
                      </td>
                      <td className="px-6 py-3 font-bold text-gray-900">{p.amount?.toLocaleString()} RWF</td>
                      <td className="px-6 py-3">
                        <span className="text-xs">
                          {p.method === 'momo' ? (
                            <><i className="fas fa-mobile-alt text-yellow-500 mr-1" />MoMo</>
                          ) : (
                            <><i className="fas fa-university text-blue-500 mr-1" />Bank</>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-600 text-xs">{p.phone || '—'}</td>
                      <td className="px-6 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          p.status === 'confirmed' ? 'bg-green-50 text-green-600' :
                          p.status === 'pending' ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-500 text-xs">{new Date(p.createdAt).toLocaleString()}</td>
                      <td className="px-6 py-3">
                        {p.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleConfirmPayment(p.id)}
                              className="text-green-600 hover:text-green-700 text-xs font-semibold"
                            >
                              <i className="fas fa-check mr-1" />Confirm
                            </button>
                            <button
                              onClick={() => handleRejectPayment(p.id)}
                              className="text-red-400 hover:text-red-600 text-xs font-semibold"
                            >
                              <i className="fas fa-times mr-1" />Reject
                            </button>
                          </div>
                        )}
                        {p.status === 'confirmed' && (
                          <span className="text-xs text-gray-400">
                            <i className="fas fa-check-circle text-green-500 mr-1" />Done
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {payments.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <i className="fas fa-credit-card text-3xl mb-3 block" />
                <p>No payments yet</p>
              </div>
            )}
          </div>
        )}

        {/* Locations Tab */}
        {tab === 'locations' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                <i className="fas fa-map-marker-alt text-primary-500 mr-2" />
                Add Location
              </h2>
              <form onSubmit={handleAddLocation} className="flex gap-3">
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="e.g. Kigali, Huye, Musanze..."
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="bg-primary-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-primary-700 transition"
                >
                  <i className="fas fa-plus mr-2" />Add
                </button>
              </form>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                All Locations ({locations.length})
              </h2>
              {locations.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {locations.map(loc => (
                    <div key={loc.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50">
                      <span className="font-medium text-gray-800">
                        <i className="fas fa-map-pin text-primary-400 mr-2" />{loc.name}
                      </span>
                      <button
                        onClick={() => handleDeleteLocation(loc.id)}
                        className="text-red-400 hover:text-red-600 text-xs font-semibold"
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-6">No locations added yet</p>
              )}
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {tab === 'activity' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              <i className="fas fa-list text-primary-500 mr-2" />
              Recent Activity
            </h2>
            {activities.length > 0 ? (
              <div className="space-y-3">
                {activities.map(a => (
                  <div key={a.id} className="flex items-start gap-3 p-3 border-b border-gray-50 last:border-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      a.action.includes('payment') ? 'bg-green-100' :
                      a.action.includes('delete') ? 'bg-red-100' :
                      a.action.includes('location') ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <i className={`fas text-xs ${
                        a.action.includes('payment_confirmed') ? 'fa-check text-green-600' :
                        a.action.includes('payment_rejected') ? 'fa-times text-red-600' :
                        a.action.includes('payment_initiated') ? 'fa-credit-card text-green-600' :
                        a.action.includes('delete') ? 'fa-trash text-red-600' :
                        a.action.includes('location') ? 'fa-map-marker-alt text-blue-600' : 'fa-info text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-800">{a.details}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {a.userName && (
                          <span className="text-xs text-gray-500">by {a.userName}</span>
                        )}
                        <span className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-6">No activity recorded yet</p>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
