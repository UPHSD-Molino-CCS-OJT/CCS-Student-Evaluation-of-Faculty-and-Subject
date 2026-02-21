import React, { useState, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { Loader } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const location = useLocation()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get('/api/staff/check-auth', {
          withCredentials: true
        })
        setIsAuthenticated(response.data.authenticated && response.data.userType === 'admin')
      } catch (error: unknown) {
        setIsAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader className="mx-auto text-blue-600 mb-4 animate-spin" size={48} />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={`/unauthorized?context=admin&returnUrl=${encodeURIComponent(location.pathname)}`} replace />
  }

  return children
}

export default ProtectedRoute
