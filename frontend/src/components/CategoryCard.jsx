import { Link } from "react-router-dom";
import { motion } from "framer-motion"; // eslint-disable-line no-unused-vars

const categoryIcons = {
  Barber: "fa-scissors",
  Salon: "fa-spa",
  Cleaning: "fa-broom",
  Tailoring: "fa-shirt",
  Plumbing: "fa-wrench",
  Electrician: "fa-bolt",
  Mechanic: "fa-car",
  Painting: "fa-paint-roller",
  Catering: "fa-utensils",
  Photography: "fa-camera",
  Tutoring: "fa-book",
  General: "fa-briefcase",
};

const categoryColors = {
  Barber: "from-blue-500 to-blue-600",
  Salon: "from-pink-500 to-pink-600",
  Cleaning: "from-green-500 to-green-600",
  Tailoring: "from-purple-500 to-purple-600",
  Plumbing: "from-cyan-500 to-cyan-600",
  Electrician: "from-yellow-500 to-yellow-600",
  Mechanic: "from-red-500 to-red-600",
  Painting: "from-orange-500 to-orange-600",
  Catering: "from-emerald-500 to-emerald-600",
  Photography: "from-indigo-500 to-indigo-600",
  Tutoring: "from-teal-500 to-teal-600",
  General: "from-gray-500 to-gray-600",
};

export default function CategoryCard({ category }) {
  const icon = categoryIcons[category] || "fa-briefcase";
  const color = categoryColors[category] || "from-gray-500 to-gray-600";

  return (
    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
      <Link
        to={`/search?category=${category}`}
        className="block text-center p-6 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all border border-gray-100"
      >
        <div
          className={`w-14 h-14 rounded-xl bg-linear-to-br ${color} flex items-center justify-center mx-auto mb-3`}
        >
          <i className={`fas ${icon} text-white text-xl`} />
        </div>
        <span className="font-medium text-gray-800 text-sm">{category}</span>
      </Link>
    </motion.div>
  );
}
