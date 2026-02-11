import { Link } from 'react-router-dom'

const Navbar = ({ showAdminButton = true }) => {
  return (
    <nav className="bg-gradient-to-r from-blue-700 to-blue-900 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <i className="fas fa-graduation-cap text-3xl"></i>
            <div>
              <h1 className="text-xl font-bold">UPHSD</h1>
              <p className="text-xs text-blue-200">Student Faculty Evaluation</p>
            </div>
          </div>

          {/* Admin Button */}
          {showAdminButton && (
            <Link
              to="/admin/login"
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
            >
              <i className="fas fa-user-shield"></i>
              <span className="hidden sm:inline">Admin Login</span>
              <span className="sm:hidden">Admin</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
