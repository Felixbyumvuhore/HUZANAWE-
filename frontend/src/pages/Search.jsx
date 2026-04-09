import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion"; // eslint-disable-line no-unused-vars
import ProviderCard from "../components/ProviderCard";
import Skeleton from "../components/Skeleton";
import api from "../utils/api";

const categories = [
  "All",
  "Barber",
  "Salon",
  "Cleaning",
  "Tailoring",
  "Plumbing",
  "Electrician",
  "Mechanic",
  "Painting",
  "Catering",
  "Photography",
  "Tutoring",
];

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const isInitialMount = useRef(true);

  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    category: searchParams.get("category") || "All",
    location: searchParams.get("location") || "",
    minPrice: "",
    maxPrice: "",
    minRating: "",
  });

  const [showFilters, setShowFilters] = useState(false);

  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const skipNextParamsEffect = useRef(false);

  const fetchProviders = async (overrides = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const f = { ...filtersRef.current, ...overrides };
      if (f.category && f.category !== "All")
        params.set("category", f.category);
      if (f.location) params.set("location", f.location);
      if (f.search) params.set("search", f.search);
      if (f.minPrice) params.set("minPrice", f.minPrice);
      if (f.maxPrice) params.set("maxPrice", f.maxPrice);
      if (f.minRating) params.set("minRating", f.minRating);

      const res = await api.get(`/providers?${params.toString()}`);
      setProviders(res.data);
    } catch {
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load using URL params
  useEffect(() => {
    const cat = searchParams.get("category");
    const search = searchParams.get("search");
    const loc = searchParams.get("location");
    const initialOverrides = {};
    if (cat) initialOverrides.category = cat;
    if (search) initialOverrides.search = search;
    if (loc) initialOverrides.location = loc;
    fetchProviders(initialOverrides);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to URL changes (e.g. clicking category links from other pages)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (skipNextParamsEffect.current) {
      skipNextParamsEffect.current = false;
      return;
    }
    const cat = searchParams.get("category");
    const search = searchParams.get("search");
    const loc = searchParams.get("location");
    const newFilters = {
      ...filters,
      category: cat || "All",
      search: search || "",
      location: loc || "",
    };
    setFilters(newFilters);
    fetchProviders(newFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleApply = () => {
    // Fetch with current filters directly; update URL but skip the searchParams effect
    skipNextParamsEffect.current = true;
    const params = new URLSearchParams();
    if (filters.category !== "All") params.set("category", filters.category);
    if (filters.search) params.set("search", filters.search);
    if (filters.location) params.set("location", filters.location);
    setSearchParams(params);
    fetchProviders(filters);
  };

  const handleReset = () => {
    const resetFilters = {
      search: "",
      category: "All",
      location: "",
      minPrice: "",
      maxPrice: "",
      minRating: "",
    };
    skipNextParamsEffect.current = true;
    setFilters(resetFilters);
    setSearchParams({});
    fetchProviders(resetFilters);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Find Services</h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="md:hidden flex items-center gap-2 text-primary-600 font-medium"
        >
          <i className="fas fa-filter" /> Filters
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters */}
        <motion.aside
          initial={false}
          animate={{
            height: showFilters || window.innerWidth >= 768 ? "auto" : 0,
          }}
          className={`md:w-64 shrink-0 overflow-hidden md:overflow-visible ${!showFilters ? "hidden md:block" : ""}`}
        >
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sticky top-20 space-y-5">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Search
              </label>
              <input
                type="text"
                placeholder="Keywords..."
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) =>
                  setFilters({ ...filters, category: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Location
              </label>
              <input
                type="text"
                placeholder="City or area..."
                value={filters.location}
                onChange={(e) =>
                  setFilters({ ...filters, location: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">
                  Min Price
                </label>
                <input
                  type="number"
                  placeholder="$0"
                  value={filters.minPrice}
                  onChange={(e) =>
                    setFilters({ ...filters, minPrice: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">
                  Max Price
                </label>
                <input
                  type="number"
                  placeholder="$1000"
                  value={filters.maxPrice}
                  onChange={(e) =>
                    setFilters({ ...filters, maxPrice: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Min Rating
              </label>
              <select
                value={filters.minRating}
                onChange={(e) =>
                  setFilters({ ...filters, minRating: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
              >
                <option value="">Any</option>
                <option value="4">4+ Stars</option>
                <option value="3">3+ Stars</option>
                <option value="2">2+ Stars</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleApply}
                className="flex-1 bg-primary-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-primary-700 transition"
              >
                Apply
              </button>
              <button
                onClick={handleReset}
                className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl text-sm font-semibold hover:bg-gray-200 transition"
              >
                Reset
              </button>
            </div>
          </div>
        </motion.aside>

        {/* Results */}
        <main className="flex-1">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-72" />
              ))}
            </div>
          ) : providers.length > 0 ? (
            <>
              <p className="text-sm text-gray-500 mb-4">
                {providers.length} provider(s) found
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {providers.map((provider) => (
                  <ProviderCard key={provider.id} provider={provider} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-gray-400">
              <i className="fas fa-search text-5xl mb-4 block" />
              <h3 className="text-lg font-semibold text-gray-600">
                No providers found
              </h3>
              <p className="mt-1">Try adjusting your filters or search terms</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
