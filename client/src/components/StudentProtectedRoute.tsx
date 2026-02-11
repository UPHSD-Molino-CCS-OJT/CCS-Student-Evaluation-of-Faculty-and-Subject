import React, { useState, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import axios from 'axios'

interface StudentProtectedRouteProps {
  children: React.ReactNode;
}

const StudentProtectedRoute: React.FC<StudentProtectedRouteProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const location = useLocation()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get('/api/student/check-auth', {
          withCredentials: true
        })
        setIsAuthenticated(response.data.authenticated)
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
          <i className="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={`/unauthorized?context=student&returnUrl=${encodeURIComponent(location.pathname)}`} replace />
  }

  return children
}

export default StudentProtectedRoute
