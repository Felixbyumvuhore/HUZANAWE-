import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <i className="fas fa-handshake text-white text-sm" />
            </div>
            <span className="text-xl font-bold text-gray-900">Huzanawe</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className="text-gray-600 hover:text-primary-600 transition font-medium"
            >
              Home
            </Link>
            <Link
              to="/search"
              className="text-gray-600 hover:text-primary-600 transition font-medium"
            >
              Find Services
            </Link>
            {user ? (
              <>
                {user.role === "client" && (
                  <Link
                    to="/my-dashboard"
                    className="text-gray-600 hover:text-primary-600 transition font-medium"
                  >
                    My Profile
                  </Link>
                )}
                {user.role === "provider" && (
                  <Link
                    to="/dashboard"
                    className="text-gray-600 hover:text-primary-600 transition font-medium"
                  >
                    Dashboard
                  </Link>
                )}
                {user.role === "admin" && (
                  <Link
                    to="/admin"
                    className="text-gray-600 hover:text-primary-600 transition font-medium"
                  >
                    Admin
                  </Link>
                )}
                <Link
                  to="/chat"
                  className="text-gray-600 hover:text-primary-600 transition font-medium"
                >
                  <i className="fas fa-comments mr-1" />
                  Chat
                </Link>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">
                    {user.name}{" "}
                    {user.isPremium ? (
                      <i className="fas fa-crown text-accent-500 ml-1" />
                    ) : null}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-red-500 hover:text-red-600 font-medium"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-primary-600 font-medium"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-primary-600 text-white px-4 py-2 rounded-2xl hover:bg-primary-700 transition font-medium text-sm"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-gray-600"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <i className={`fas ${menuOpen ? "fa-times" : "fa-bars"} text-xl`} />
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t bg-white overflow-hidden"
          >
            <div className="px-4 py-4 space-y-3">
              <Link
                to="/"
                className="block text-gray-700 font-medium"
                onClick={() => setMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                to="/search"
                className="block text-gray-700 font-medium"
                onClick={() => setMenuOpen(false)}
              >
                Find Services
              </Link>
              {user ? (
                <>
                  {user.role === "client" && (
                    <Link
                      to="/my-dashboard"
                      className="block text-gray-700 font-medium"
                      onClick={() => setMenuOpen(false)}
                    >
                      My Profile
                    </Link>
                  )}
                  {user.role === "provider" && (
                    <Link
                      to="/dashboard"
                      className="block text-gray-700 font-medium"
                      onClick={() => setMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                  )}
                  {user.role === "admin" && (
                    <Link
                      to="/admin"
                      className="block text-gray-700 font-medium"
                      onClick={() => setMenuOpen(false)}
                    >
                      Admin
                    </Link>
                  )}
                  <Link
                    to="/chat"
                    className="block text-gray-700 font-medium"
                    onClick={() => setMenuOpen(false)}
                  >
                    <i className="fas fa-comments mr-1" />
                    Chat
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setMenuOpen(false);
                    }}
                    className="text-red-500 font-medium"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="block text-gray-700 font-medium"
                    onClick={() => setMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="block bg-primary-600 text-white text-center py-2 rounded-2xl font-medium"
                    onClick={() => setMenuOpen(false)}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
