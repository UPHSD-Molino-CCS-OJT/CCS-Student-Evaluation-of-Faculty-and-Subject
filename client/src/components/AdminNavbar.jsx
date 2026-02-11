import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import axios from 'axios'

const AdminNavbar = () => {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await axios.get('/admin/logout', { withCredentials: true })
      navigate('/admin/login')
    } catch (error) {
      console.error('Logout error:', error)
      navigate('/admin/login')
    }
  }

  return (
    <nav className="bg-gradient-to-r from-blue-700 to-blue-900 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Brand */}
          <Link to="/admin/dashboard" className="flex items-center space-x-3">
            <i className="fas fa-graduation-cap text-3xl"></i>
            <div>
              <h1 className="text-xl font-bold">UPHSD Admin Portal</h1>
              <p className="text-xs text-blue-200">Evaluation Management System</p>
            </div>
          </Link>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden text-white focus:outline-none"
          >
            <i className={`fas ${isOpen ? 'fa-times' : 'fa-bars'} text-2xl`}></i>
          </button>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center space-x-1">
            <NavLink to="/admin/dashboard" icon="fa-chart-line" text="Dashboard" />
            <NavLink to="/admin/evaluations" icon="fa-file-alt" text="Evaluations" />
            <NavLink to="/admin/programs" icon="fa-book" text="Programs" />
            <NavLink to="/admin/teachers" icon="fa-chalkboard-teacher" text="Teachers" />
            <NavLink to="/admin/courses" icon="fa-graduation-cap" text="Courses" />
            <NavLink to="/admin/students" icon="fa-user-graduate" text="Students" />
            <NavLink to="/admin/privacy-audit" icon="fa-shield-alt" text="Privacy" />
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors duration-200 flex items-center space-x-2"
            >
              <i className="fas fa-sign-out-alt"></i>
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="lg:hidden pb-4 space-y-2">
            <MobileNavLink to="/admin/dashboard" icon="fa-chart-line" text="Dashboard" />
            <MobileNavLink to="/admin/evaluations" icon="fa-file-alt" text="Evaluations" />
            <MobileNavLink to="/admin/programs" icon="fa-book" text="Programs" />
            <MobileNavLink to="/admin/teachers" icon="fa-chalkboard-teacher" text="Teachers" />
            <MobileNavLink to="/admin/courses" icon="fa-graduation-cap" text="Courses" />
            <MobileNavLink to="/admin/students" icon="fa-user-graduate" text="Students" />
            <MobileNavLink to="/admin/privacy-audit" icon="fa-shield-alt" text="Privacy Audit" />
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors duration-200 flex items-center space-x-2"
            >
              <i className="fas fa-sign-out-alt"></i>
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}

const NavLink = ({ to, icon, text }) => (
  <Link
    to={to}
    className="px-4 py-2 hover:bg-blue-800 rounded-lg transition-colors duration-200 flex items-center space-x-2"
  >
    <i className={`fas ${icon}`}></i>
    <span>{text}</span>
  </Link>
)

const MobileNavLink = ({ to, icon, text }) => (
  <Link
    to={to}
    className="block px-4 py-2 hover:bg-blue-800 rounded-lg transition-colors duration-200"
  >
    <i className={`fas ${icon} mr-3`}></i>
    {text}
  </Link>
)

export default AdminNavbar
