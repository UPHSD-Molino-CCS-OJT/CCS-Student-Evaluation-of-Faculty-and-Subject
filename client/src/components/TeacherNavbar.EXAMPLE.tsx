import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Users, LogOut, BarChart3 } from 'lucide-react'
import axios from 'axios'
import { useModal } from './ModalContext'

const TeacherNavbar: React.FC = () => {
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)
  const { showAlert, showConfirm } = useModal()

  const handleLogout = async () => {
    // Replace window.confirm with modal confirm
    const confirmed = await showConfirm(
      'Are you sure you want to logout?',
      {
        title: 'Confirm Logout',
        variant: 'warning',
        confirmText: 'Logout',
        cancelText: 'Cancel'
      }
    )

    if (!confirmed) return

    try {
      setLoggingOut(true)
      await axios.post('/api/teacher/logout', {}, { withCredentials: true })
      navigate('/teacher/login')
    } catch (error) {
      console.error('Logout error:', error)
      // Replace alert with modal alert
      showAlert('Error logging out. Please try again.', {
        title: 'Logout Error',
        variant: 'danger'
      })
    } finally {
      setLoggingOut(false)
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
