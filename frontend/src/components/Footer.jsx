import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <i className="fas fa-handshake text-white text-sm" />
              </div>
              <span className="text-xl font-bold text-white">Huzanawe</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
              Connecting you with trusted local service providers. From barbers to tailors, find the right professional for every need.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white transition">Home</Link></li>
              <li><Link to="/search" className="hover:text-white transition">Find Services</Link></li>
              <li><Link to="/register" className="hover:text-white transition">Join as Provider</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Categories</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/search?category=Barber" className="hover:text-white transition">Barbers</Link></li>
              <li><Link to="/search?category=Salon" className="hover:text-white transition">Salons</Link></li>
              <li><Link to="/search?category=Cleaning" className="hover:text-white transition">Cleaning</Link></li>
              <li><Link to="/search?category=Tailoring" className="hover:text-white transition">Tailoring</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Huzanawe. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
