import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { GraduationCap, Menu, X, LogOut, TrendingUp, FileText, Book, Presentation, Shield, BookOpen } from 'lucide-react'

interface NavLinkProps {
  to: string;
  icon: string;
  text: string;
}

interface MobileNavLinkProps {
  to: string;
  icon: string;
  text: string;
}

const AdminNavbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const navigate = useNavigate()

  const handleLogout = async (): Promise<void> => {
    try {
      await axios.get('/admin/logout', { withCredentials: true })
      navigate('/admin/login')
    } catch (error: unknown) {
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
            <GraduationCap size={32} />
            <div>
              <h1 className="text-xl font-bold">Evaluation Management System</h1>
              <p className="text-xs text-blue-200">UPHSD Molino Admin Portal</p>
            </div>
          </Link>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden text-white focus:outline-none"
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
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
              <LogOut size={20} />
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
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}

const NavLink: React.FC<NavLinkProps> = ({ to, icon, text }) => {
  const iconMap: { [key: string]: React.ReactNode } = {
    'fa-chart-line': <TrendingUp size={20} />,
    'fa-file-alt': <FileText size={20} />,
    'fa-book': <Book size={20} />,
    'fa-chalkboard-teacher': <Presentation size={20} />,
    'fa-graduation-cap': <BookOpen size={20} />,
    'fa-user-graduate': <GraduationCap size={20} />,
    'fa-shield-alt': <Shield size={20} />
  }
  
  return (
    <Link
      to={to}
      className="px-4 py-2 hover:bg-blue-800 rounded-lg transition-colors duration-200 flex items-center space-x-2"
    >
      {iconMap[icon]}
      <span>{text}</span>
    </Link>
  )
}

const MobileNavLink: React.FC<MobileNavLinkProps> = ({ to, icon, text }) => {
  const iconMap: { [key: string]: React.ReactNode } = {
    'fa-chart-line': <TrendingUp size={20} />,
    'fa-file-alt': <FileText size={20} />,
    'fa-book': <Book size={20} />,
    'fa-chalkboard-teacher': <Presentation size={20} />,
    'fa-graduation-cap': <BookOpen size={20} />,
    'fa-user-graduate': <GraduationCap size={20} />,
    'fa-shield-alt': <Shield size={20} />
  }
  
  return (
    <Link
      to={to}
      className="block px-4 py-2 hover:bg-blue-800 rounded-lg transition-colors duration-200 flex items-center space-x-2"
    >
      {iconMap[icon]}
      <span>{text}</span>
    </Link>
  )
}

export default AdminNavbar
