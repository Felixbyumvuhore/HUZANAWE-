import { Link } from "react-router-dom";
import { motion } from "framer-motion"; // eslint-disable-line no-unused-vars
import RatingStars from "./RatingStars";

export default function ProviderCard({ provider }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all border border-gray-100 overflow-hidden"
    >
      <div className="h-40 bg-linear-to-br from-primary-100 to-primary-50 flex items-center justify-center relative">
        {provider.portfolio?.length > 0 ? (
          <img
            src={provider.portfolio[0].imageUrl}
            alt={provider.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <i className="fas fa-user-circle text-6xl text-primary-300" />
        )}
        <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-xs font-semibold px-3 py-1 rounded-full text-primary-700">
          {provider.category}
        </span>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-lg">{provider.name}</h3>
        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
          <i className="fas fa-map-marker-alt text-xs" />
          {provider.location}
        </p>

        <div className="flex items-center justify-between mt-3">
          <RatingStars rating={provider.rating} count={provider.totalReviews} />
          <span className="text-primary-600 font-bold">
            {provider.price > 0 ? `$${provider.price}` : "Contact"}
          </span>
        </div>

        <p className="text-sm text-gray-500 mt-2 line-clamp-2">
          {provider.description || "Professional service provider"}
        </p>

        <Link
          to={`/provider/${provider.id}`}
          className="mt-3 block text-center bg-primary-50 text-primary-600 py-2 rounded-xl hover:bg-primary-100 transition font-medium text-sm"
        >
          View Profile
        </Link>
      </div>
    </motion.div>
  );
}
