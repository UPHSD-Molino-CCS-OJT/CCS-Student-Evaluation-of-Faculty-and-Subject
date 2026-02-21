import React from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap, ShieldCheck } from 'lucide-react'

interface NavbarProps {
  showAdminButton?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ showAdminButton = true }) => {
  return (
    <nav className="bg-gradient-to-r from-blue-700 to-blue-900 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <GraduationCap size={32} />
            <div>
              <h1 className="text-xl font-bold">UPHSD</h1>
              <p className="text-xs text-blue-200">Student Faculty Evaluation</p>
            </div>
          </div>

          {/* Login Buttons */}
          {showAdminButton && (
            <div className="flex items-center space-x-3">
              <Link
                to="/staff/login"
                className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 px-6 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 shadow-md"
              >
                <ShieldCheck size={20} />
                <span className="font-medium">Staff Login</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
