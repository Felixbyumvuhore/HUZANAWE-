import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import api from '../utils/api';

export default function Dashboard() {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('profile');

  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: '', phone: '', category: '', location: '', price: '', description: ''
  });
  const [saving, setSaving] = useState(false);

  // Service form
  const [serviceModal, setServiceModal] = useState(false);
  const [serviceForm, setServiceForm] = useState({ name: '', price: '', duration: '' });
  const [addingService, setAddingService] = useState(false);

  // Upload
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchProvider(); }, []);

  const fetchProvider = async () => {
    try {
      const res = await api.get('/providers');
      const myProvider = res.data.find(p => p.userId === user.id);
      if (myProvider) {
        setProvider(myProvider);
        setProfileForm({
          name: myProvider.name || '',
          phone: myProvider.phone || '',
          category: myProvider.category || '',
          location: myProvider.location || '',
          price: myProvider.price || '',
          description: myProvider.description || '',
        });
      }
    } catch {
      addToast('Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!provider) return;
    setSaving(true);
    try {
      const res = await api.put(`/providers/${provider.id}`, profileForm);
      setProvider({ ...provider, ...res.data });
      updateUser({ ...user, name: profileForm.name, phone: profileForm.phone });
      addToast('Profile updated!', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    if (!serviceForm.name || !serviceForm.price) {
      return addToast('Name and price are required', 'warning');
    }
    setAddingService(true);
    try {
      await api.post(`/providers/${provider.id}/services`, {
        name: serviceForm.name,
        price: Number(serviceForm.price),
        duration: serviceForm.duration || null,
      });
      addToast('Service added!', 'success');
      setServiceModal(false);
      setServiceForm({ name: '', price: '', duration: '' });
      fetchProvider();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to add service', 'error');
    } finally {
      setAddingService(false);
    }
  };

  const handleDeleteService = async (serviceId) => {
    try {
      await api.delete(`/providers/${provider.id}/services/${serviceId}`);
      addToast('Service deleted', 'success');
      fetchProvider();
    } catch {
      addToast('Failed to delete service', 'error');
    }
  };

  const handleUploadImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    setUploading(true);
    try {
      await api.post(`/upload/${provider.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      addToast('Image uploaded!', 'success');
      fetchProvider();
    } catch (err) {
      addToast(err.response?.data?.error || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageId) => {
    try {
      await api.delete(`/upload/${provider.id}/${imageId}`);
      addToast('Image deleted', 'success');
      fetchProvider();
    } catch {
      addToast('Failed to delete image', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <i className="fas fa-spinner fa-spin text-3xl text-primary-500" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="text-center py-20">
        <i className="fas fa-exclamation-circle text-5xl text-gray-300 mb-4 block" />
        <h2 className="text-xl font-bold text-gray-600">Provider profile not found</h2>
        <p className="text-gray-400 mt-2">Something went wrong loading your profile.</p>
      </div>
    );
  }

  const tabs = [
    { key: 'profile', label: 'Profile', icon: 'fa-user' },
    { key: 'services', label: 'Services', icon: 'fa-list' },
    { key: 'portfolio', label: 'Portfolio', icon: 'fa-images' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Provider Dashboard</h1>
        <p className="text-gray-500 mb-6">Manage your profile, services, and portfolio</p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Rating', value: provider.rating?.toFixed(1) || '0.0', icon: 'fa-star', color: 'text-yellow-500' },
            { label: 'Reviews', value: provider.totalReviews || 0, icon: 'fa-comment', color: 'text-blue-500' },
            { label: 'Services', value: provider.services?.length || 0, icon: 'fa-list', color: 'text-green-500' },
            { label: 'Photos', value: provider.portfolio?.length || 0, icon: 'fa-images', color: 'text-purple-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
              <i className={`fas ${stat.icon} ${stat.color} text-lg mb-1`} />
              <div className="text-xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${
                tab === t.key ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className={`fas ${t.icon} mr-2`} />{t.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {tab === 'profile' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Edit Profile</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2">Name</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2">Phone</label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2">Category</label>
                  <select
                    value={profileForm.category}
                    onChange={e => setProfileForm({ ...profileForm, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  >
                    {['Barber','Salon','Cleaning','Tailoring','Plumbing','Electrician','Mechanic','Painting','Catering','Photography','Tutoring','General'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2">Location</label>
                  <input
                    type="text"
                    value={profileForm.location}
                    onChange={e => setProfileForm({ ...profileForm, location: e.target.value })}
                    placeholder="City or area"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2">Base Price ($)</label>
                  <input
                    type="number"
                    value={profileForm.price}
                    onChange={e => setProfileForm({ ...profileForm, price: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Description</label>
                <textarea
                  value={profileForm.description}
                  onChange={e => setProfileForm({ ...profileForm, description: e.target.value })}
                  rows={4}
                  placeholder="Describe your services..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-700 transition disabled:opacity-50"
              >
                {saving ? <i className="fas fa-spinner fa-spin mr-2" /> : <i className="fas fa-save mr-2" />}
                Save Changes
              </button>
            </form>
          </div>
        )}

        {/* Services Tab */}
        {tab === 'services' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Your Services</h2>
              <button
                onClick={() => setServiceModal(true)}
                className="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-700 transition"
              >
                <i className="fas fa-plus mr-1" /> Add Service
              </button>
            </div>
            {provider.services?.length > 0 ? (
              <div className="space-y-3">
                {provider.services.map(service => (
                  <div key={service.id} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-800">{service.name}</p>
                      {service.duration && <p className="text-xs text-gray-400">{service.duration}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-primary-600">${service.price}</span>
                      <button
                        onClick={() => handleDeleteService(service.id)}
                        className="text-red-400 hover:text-red-600 transition"
                      >
                        <i className="fas fa-trash text-sm" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <i className="fas fa-list text-3xl mb-3 block" />
                <p>No services yet. Add your first service!</p>
              </div>
            )}
          </div>
        )}

        {/* Portfolio Tab */}
        {tab === 'portfolio' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Portfolio</h2>
              <label className="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-700 transition cursor-pointer">
                {uploading ? <i className="fas fa-spinner fa-spin mr-1" /> : <i className="fas fa-upload mr-1" />}
                Upload Image
                <input type="file" accept="image/*" className="hidden" onChange={handleUploadImage} disabled={uploading} />
              </label>
            </div>
            {provider.portfolio?.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {provider.portfolio.map(img => (
                  <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden">
                    <img src={img.imageUrl} alt="Portfolio" className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleDeleteImage(img.id)}
                      className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                    >
                      <i className="fas fa-trash text-xs" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <i className="fas fa-images text-3xl mb-3 block" />
                <p>No portfolio images yet. Upload your best work!</p>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Add Service Modal */}
      <Modal isOpen={serviceModal} onClose={() => setServiceModal(false)} title="Add Service">
        <form onSubmit={handleAddService} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Service Name *</label>
            <input
              type="text"
              value={serviceForm.name}
              onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })}
              placeholder="e.g. Haircut"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Price ($) *</label>
            <input
              type="number"
              value={serviceForm.price}
              onChange={e => setServiceForm({ ...serviceForm, price: e.target.value })}
              placeholder="0"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Duration</label>
            <input
              type="text"
              value={serviceForm.duration}
              onChange={e => setServiceForm({ ...serviceForm, duration: e.target.value })}
              placeholder="e.g. 30 min"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={addingService}
            className="w-full bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 transition disabled:opacity-50"
          >
            {addingService ? <i className="fas fa-spinner fa-spin mr-2" /> : null}
            Add Service
          </button>
        </form>
      </Modal>
    </div>
  );
}
