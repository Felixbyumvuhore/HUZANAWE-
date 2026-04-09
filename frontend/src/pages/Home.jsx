import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion"; // eslint-disable-line no-unused-vars
import SearchBar from "../components/SearchBar";
import ProviderCard from "../components/ProviderCard";
import CategoryCard from "../components/CategoryCard";
import Skeleton from "../components/Skeleton";
import api from "../utils/api";

const defaultCategories = [
  "Barber",
  "Salon",
  "Cleaning",
  "Tailoring",
  "Plumbing",
  "Electrician",
  "Mechanic",
  "Photography",
];

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

export default function Home() {
  const [topProviders, setTopProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/providers?limit=6")
      .then((res) => setTopProviders(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="bg-linear-to-br from-primary-600 via-primary-700 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Find Trusted Local
              <span className="text-accent-400"> Service Providers</span>
            </h1>
            <p className="text-primary-100 text-lg md:text-xl mb-10 leading-relaxed">
              Connect with skilled professionals in your area. From barbers to
              electricians, Huzanawe makes it easy to find the right service.
            </p>
            <SearchBar className="max-w-2xl mx-auto" />
            <div className="flex flex-wrap justify-center gap-4 mt-8 text-sm text-primary-200">
              <span>
                <i className="fas fa-check-circle mr-1" /> Verified Providers
              </span>
              <span>
                <i className="fas fa-check-circle mr-1" /> Honest Reviews
              </span>
              <span>
                <i className="fas fa-check-circle mr-1" /> Easy Booking
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div {...fadeUp}>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900">
              Browse by Category
            </h2>
            <p className="text-gray-500 mt-2">
              Find the perfect service for your needs
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {defaultCategories.map((cat) => (
              <CategoryCard key={cat} category={cat} />
            ))}
          </div>
        </motion.div>
      </section>

      {/* Top Providers */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp}>
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-900">
                Top Service Providers
              </h2>
              <p className="text-gray-500 mt-2">
                Highly rated professionals in your area
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <Skeleton className="h-72" count={3} />
              </div>
            ) : topProviders.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {topProviders.map((provider) => (
                  <ProviderCard key={provider.id} provider={provider} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <i className="fas fa-users text-4xl mb-4 block" />
                <p>No providers yet. Be the first to join!</p>
              </div>
            )}

            <div className="text-center mt-8">
              <Link
                to="/search"
                className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-2xl hover:bg-primary-700 transition font-semibold"
              >
                View All Providers <i className="fas fa-arrow-right" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-linear-to-r from-accent-500 to-accent-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">
              Are You a Service Provider?
            </h2>
            <p className="text-orange-100 text-lg mb-8">
              Join Huzanawe and reach thousands of potential clients. Showcase
              your skills and grow your business.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-white text-accent-600 px-8 py-3 rounded-2xl font-bold hover:bg-gray-50 transition shadow-lg"
            >
              <i className="fas fa-rocket" /> Join Now — It&apos;s Free
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          {...fadeUp}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center"
        >
          {[
            { icon: "fa-users", value: "500+", label: "Service Providers" },
            { icon: "fa-star", value: "4.8", label: "Average Rating" },
            { icon: "fa-map-marker-alt", value: "50+", label: "Locations" },
            { icon: "fa-handshake", value: "10K+", label: "Connections Made" },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100"
            >
              <i
                className={`fas ${stat.icon} text-2xl text-primary-500 mb-2`}
              />
              <div className="text-2xl font-bold text-gray-900">
                {stat.value}
              </div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </section>
    </div>
  );
}
