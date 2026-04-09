import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import api from "../utils/api";

export default function ClientDashboard() {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCV, setUploadingCV] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "" });
  const avatarInputRef = useRef(null);
  const cvInputRef = useRef(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/auth/me");
      setProfile(res.data);
      setForm({ name: res.data.name || "", phone: res.data.phone || "" });
    } catch {
      addToast("Failed to load profile", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return addToast("Name is required", "warning");
    setSaving(true);
    try {
      const res = await api.put("/auth/profile", form);
      setProfile(res.data);
      updateUser({ ...user, name: res.data.name, phone: res.data.phone });
      setEditing(false);
      addToast("Profile updated!", "success");
    } catch (err) {
      addToast(err.response?.data?.error || "Update failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("avatar", file);
    setUploadingAvatar(true);
    try {
      const res = await api.post("/auth/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setProfile(res.data);
      updateUser({ ...user, avatar: res.data.avatar });
      addToast("Profile photo updated!", "success");
    } catch (err) {
      addToast(err.response?.data?.error || "Upload failed", "error");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("cv", file);
    setUploadingCV(true);
    try {
      const res = await api.post("/auth/cv", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setProfile(res.data);
      updateUser({ ...user, cvUrl: res.data.cvUrl });
      addToast("CV uploaded!", "success");
    } catch (err) {
      addToast(err.response?.data?.error || "Upload failed", "error");
    } finally {
      setUploadingCV(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <i className="fas fa-spinner fa-spin text-3xl text-primary-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <i className="fas fa-exclamation-circle text-5xl text-gray-300 mb-4 block" />
        <h2 className="text-xl font-bold text-gray-600">
          Could not load profile
        </h2>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-1">My Dashboard</h1>
        <p className="text-gray-500 mb-8">Manage your profile, photo, and CV</p>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-28 h-28 rounded-full overflow-hidden bg-gray-100 border-4 border-primary-100 flex items-center justify-center">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <i className="fas fa-user text-4xl text-gray-300" />
                )}
              </div>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 bg-primary-600 text-white w-9 h-9 rounded-full shadow-lg flex items-center justify-center hover:bg-primary-700 transition"
              >
                {uploadingAvatar ? (
                  <i className="fas fa-spinner fa-spin text-sm" />
                ) : (
                  <i className="fas fa-camera text-sm" />
                )}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-bold text-gray-900">
                {profile.name}
              </h2>
              <p className="text-gray-500">{profile.email}</p>
              {profile.phone && (
                <p className="text-gray-400 text-sm mt-1">
                  <i className="fas fa-phone mr-1" />
                  {profile.phone}
                </p>
              )}
              <div className="flex items-center gap-3 mt-3 justify-center sm:justify-start">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-semibold capitalize">
                  <i className="fas fa-user-tag" />
                  {profile.role}
                </span>
                {profile.isPremium ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs font-semibold">
                    <i className="fas fa-crown" />
                    Premium
                  </span>
                ) : null}
                <span className="text-xs text-gray-400">
                  Joined {new Date(profile.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Edit Button */}
            <button
              onClick={() => setEditing(!editing)}
              className="shrink-0 bg-primary-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-primary-700 transition text-sm"
            >
              <i className={`fas ${editing ? "fa-times" : "fa-pen"} mr-2`} />
              {editing ? "Cancel" : "Edit Profile"}
            </button>
          </div>

          {/* Edit Form */}
          {editing && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleSaveProfile}
              className="mt-6 pt-6 border-t border-gray-100 space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    placeholder="+250..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-700 transition disabled:opacity-50"
                >
                  {saving ? (
                    <i className="fas fa-spinner fa-spin mr-2" />
                  ) : (
                    <i className="fas fa-save mr-2" />
                  )}
                  Save Changes
                </button>
              </div>
            </motion.form>
          )}
        </div>

        {/* CV Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                <i className="fas fa-file-alt text-primary-500 mr-2" />
                My CV / Resume
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Upload your CV (PDF or Word, max 10MB)
              </p>
            </div>
            <button
              onClick={() => cvInputRef.current?.click()}
              disabled={uploadingCV}
              className="bg-primary-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-primary-700 transition text-sm"
            >
              {uploadingCV ? (
                <i className="fas fa-spinner fa-spin mr-2" />
              ) : (
                <i className="fas fa-upload mr-2" />
              )}
              {profile.cvUrl ? "Replace CV" : "Upload CV"}
            </button>
            <input
              ref={cvInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={handleCVUpload}
            />
          </div>

          {profile.cvUrl ? (
            <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-file-pdf text-green-600 text-xl" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">CV Uploaded</p>
                <p className="text-sm text-gray-500">
                  Your CV is ready for employers to view
                </p>
              </div>
              <a
                href={profile.cvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 font-semibold text-sm"
              >
                <i className="fas fa-external-link-alt mr-1" />
                View
              </a>
            </div>
          ) : (
            <div className="text-center py-10 text-gray-400">
              <i className="fas fa-cloud-upload-alt text-4xl mb-3 block" />
              <p>No CV uploaded yet</p>
              <p className="text-sm mt-1">
                Upload your resume to share with service providers
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
