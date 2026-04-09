import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion"; // eslint-disable-line no-unused-vars
import RatingStars from "../components/RatingStars";
import Modal from "../components/Modal";
import Skeleton from "../components/Skeleton";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import api from "../utils/api";

export default function ProviderProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [submitting, setSubmitting] = useState(false);
  const [imageModal, setImageModal] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);

  const fetchProvider = useCallback(async () => {
    try {
      const res = await api.get(`/providers/${id}`);
      setProvider(res.data);
    } catch {
      addToast("Failed to load provider", "error");
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    fetchProvider();
  }, [fetchProvider]);

  useEffect(() => {
    if (user && user.role === "client" && id) {
      api.get(`/payments/check/client/${id}`)
        .then(res => setPaymentStatus(res.data))
        .catch(() => {});
    }
  }, [user, id]);

  const handleReview = async (e) => {
    e.preventDefault();
    if (!user) return addToast("Please login to leave a review", "warning");
    setSubmitting(true);
    try {
      await api.post("/reviews", { providerId: Number(id), ...reviewForm });
      addToast("Review submitted!", "success");
      setReviewModal(false);
      setReviewForm({ rating: 5, comment: "" });
      fetchProvider();
    } catch (err) {
      addToast(err.response?.data?.error || "Failed to submit review", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="text-center py-20">
        <i className="fas fa-user-slash text-5xl text-gray-300 mb-4 block" />
        <h2 className="text-xl font-bold text-gray-600">Provider Not Found</h2>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="h-32 bg-linear-to-r from-primary-500 to-primary-700" />
        <div className="px-6 pb-6 -mt-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="w-24 h-24 bg-white rounded-2xl shadow-md flex items-center justify-center border-4 border-white">
              {provider.portfolio?.length > 0 ? (
                <img
                  src={provider.portfolio[0].imageUrl}
                  alt={provider.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <i className="fas fa-user text-3xl text-primary-300" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">
                {provider.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
                <span className="bg-primary-50 text-primary-700 px-3 py-1 rounded-full font-medium">
                  {provider.category}
                </span>
                <span>
                  <i className="fas fa-map-marker-alt mr-1" />
                  {provider.location}
                </span>
                <RatingStars
                  rating={provider.rating}
                  count={provider.totalReviews}
                />
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary-600">
                {provider.price > 0
                  ? `$${provider.price}`
                  : "Contact for pricing"}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* About */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">About</h2>
            <p className="text-gray-600 leading-relaxed">
              {provider.description || "No description provided."}
            </p>
          </div>

          {/* Portfolio */}
          {provider.portfolio?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                Portfolio
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {provider.portfolio.map((img) => (
                  <motion.div
                    key={img.id}
                    whileHover={{ scale: 1.03 }}
                    className="aspect-square rounded-xl overflow-hidden cursor-pointer"
                    onClick={() => setImageModal(img.imageUrl)}
                  >
                    <img
                      src={img.imageUrl}
                      alt="Portfolio"
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Services */}
          {provider.services?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                Services & Pricing
              </h2>
              <div className="space-y-3">
                {provider.services.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-gray-800">
                        {service.name}
                      </p>
                      {service.duration && (
                        <p className="text-xs text-gray-400">
                          {service.duration}
                        </p>
                      )}
                    </div>
                    <span className="font-bold text-primary-600">
                      ${service.price}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                Reviews ({provider.reviews?.length || 0})
              </h2>
              {user && user.role !== "provider" && (
                <button
                  onClick={() => setReviewModal(true)}
                  className="bg-primary-50 text-primary-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-100 transition"
                >
                  <i className="fas fa-pen mr-1" /> Write Review
                </button>
              )}
            </div>
            {provider.reviews?.length > 0 ? (
              <div className="space-y-4">
                {provider.reviews.map((review) => (
                  <div
                    key={review.id}
                    className="border-b border-gray-50 pb-4 last:border-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800">
                        {review.userName}
                      </span>
                      <RatingStars rating={review.rating} />
                    </div>
                    {review.comment && (
                      <p className="text-sm text-gray-600 mt-1">
                        {review.comment}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-6">No reviews yet</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Contact</h2>
            {user?.role === "admin" || (user?.role === "client" && paymentStatus?.paid) ? (
              <div className="space-y-3">
                {provider.phone && (
                  <a
                    href={`tel:${provider.phone}`}
                    className="flex items-center gap-3 text-gray-700 hover:text-primary-600 transition"
                  >
                    <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                      <i className="fas fa-phone text-primary-600" />
                    </div>
                    <span className="text-sm">{provider.phone}</span>
                  </a>
                )}
                {provider.email && (
                  <a
                    href={`mailto:${provider.email}`}
                    className="flex items-center gap-3 text-gray-700 hover:text-primary-600 transition"
                  >
                    <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                      <i className="fas fa-envelope text-primary-600" />
                    </div>
                    <span className="text-sm">{provider.email}</span>
                  </a>
                )}
                <button
                  onClick={() => {
                    api.post("/chat/start", { targetUserId: provider.userId })
                      .then(() => navigate("/chat"))
                      .catch(err => addToast(err.response?.data?.error || "Cannot start chat yet", "warning"));
                  }}
                  className="w-full bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 transition text-sm mt-2"
                >
                  <i className="fas fa-comments mr-2" />Chat with Provider
                </button>
              </div>
            ) : user?.role === "client" && paymentStatus?.pending ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-clock text-yellow-600 text-xl" />
                </div>
                <p className="font-semibold text-gray-800 mb-1">Payment Pending</p>
                <p className="text-sm text-gray-500">
                  Your payment is waiting for admin confirmation
                </p>
              </div>
            ) : (
              <div className="text-center py-4">
                <i className="fas fa-lock text-3xl text-gray-300 mb-3 block" />
                <p className="text-sm text-gray-500 mb-3">
                  Pay 1,000 RWF to contact this provider
                </p>
                {user ? (
                  <button
                    onClick={() => navigate(`/payment?providerId=${id}`)}
                    className="w-full bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 transition text-sm"
                  >
                    <i className="fas fa-credit-card mr-2" />Pay to Contact (1,000 RWF)
                  </button>
                ) : (
                  <a
                    href="/login"
                    className="text-primary-600 text-sm font-semibold hover:underline"
                  >
                    Login to contact
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Quick Info */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Quick Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Category</span>
                <span className="font-medium text-gray-800">
                  {provider.category}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Location</span>
                <span className="font-medium text-gray-800">
                  {provider.location}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Rating</span>
                <span className="font-medium text-gray-800">
                  {provider.rating}/5
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Reviews</span>
                <span className="font-medium text-gray-800">
                  {provider.totalReviews}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={reviewModal}
        onClose={() => setReviewModal(false)}
        title="Write a Review"
      >
        <form onSubmit={handleReview} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              Rating
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                  className="text-2xl"
                >
                  <i
                    className={`${star <= reviewForm.rating ? "fas" : "far"} fa-star text-yellow-400`}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              Comment
            </label>
            <textarea
              value={reviewForm.comment}
              onChange={(e) =>
                setReviewForm({ ...reviewForm, comment: e.target.value })
              }
              rows={4}
              className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none resize-none"
              placeholder="Share your experience..."
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary-600 text-white py-2.5 rounded-xl font-semibold hover:bg-primary-700 transition disabled:opacity-50"
          >
            {submitting ? <i className="fas fa-spinner fa-spin mr-2" /> : null}
            Submit Review
          </button>
        </form>
      </Modal>

      {/* Image Modal */}
      <Modal
        isOpen={!!imageModal}
        onClose={() => setImageModal(null)}
        title="Portfolio Image"
      >
        {imageModal && (
          <img src={imageModal} alt="Portfolio" className="w-full rounded-xl" />
        )}
      </Modal>
    </div>
  );
}
