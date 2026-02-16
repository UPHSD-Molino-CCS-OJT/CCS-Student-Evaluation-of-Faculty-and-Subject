import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Users, LogOut, BarChart3 } from 'lucide-react'
import axios from 'axios'

const TeacherNavbar: React.FC = () => {
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      try {
        setLoggingOut(true)
        await axios.post('/api/teacher/logout', {}, { withCredentials: true })
        navigate('/teacher/login')
      } catch (error) {
        console.error('Logout error:', error)
        alert('Error logging out. Please try again.')
      } finally {
        setLoggingOut(false)
      }
    }
  }

  return (
    <nav className="bg-green-600 text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <Link to="/teacher/dashboard" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <Users size={28} />
            <span className="text-xl font-bold">Teacher Portal</span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center space-x-6">
            <Link 
              to="/teacher/dashboard" 
              className="flex items-center space-x-2 hover:bg-green-700 px-3 py-2 rounded-lg transition-colors"
            >
              <BarChart3 size={20} />
              <span className="font-medium">Dashboard</span>
            </Link>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center space-x-2 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut size={20} />
              <span className="font-medium">{loggingOut ? 'Logging out...' : 'Logout'}</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default TeacherNavbar
