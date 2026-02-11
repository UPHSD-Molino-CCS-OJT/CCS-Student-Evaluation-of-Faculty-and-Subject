import React, { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const Unauthorized: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const context = searchParams.get('context') || 'admin'
  const returnUrl = searchParams.get('returnUrl') || ''

  useEffect(() => {
    // Redirect to appropriate login page after 3 seconds
    const timer = setTimeout(() => {
      if (context === 'student') {
        navigate('/student/login', { state: { returnUrl } })
      } else {
        navigate('/admin/login', { state: { returnUrl } })
      }
    }, 3000)

    return () => clearTimeout(timer)
  }, [context, navigate, returnUrl])

  const handleLoginNow = () => {
    if (context === 'student') {
      navigate('/student/login', { state: { returnUrl } })
    } else {
      navigate('/admin/login', { state: { returnUrl } })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-xl p-8 text-center">
          {/* Icon */}
          <div className="mb-6">
            <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <i className="fas fa-lock text-4xl text-red-600"></i>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Unauthorized Access
          </h1>

          {/* Message */}
          <p className="text-gray-600 mb-6">
            {context === 'student' 
              ? 'You need to be logged in as a student to access this page.'
              : 'You need to be logged in as an administrator to access this page.'
            }
          </p>

          {/* Redirect info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center text-blue-700">
              <i className="fas fa-info-circle mr-2"></i>
              <p className="text-sm">
                Redirecting to {context === 'student' ? 'student' : 'admin'} login in 3 seconds...
              </p>
            </div>
          </div>

          {/* Login button */}
          <button
            onClick={handleLoginNow}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            <i className="fas fa-sign-in-alt mr-2"></i>
            Go to Login Now
          </button>

          {/* Alternative link */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              {context === 'student' ? (
                <>
                  Are you an administrator?{' '}
                  <a
                    href="/admin/login"
                    className="text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    Admin Login
                  </a>
                </>
              ) : (
                <>
                  Are you a student?{' '}
                  <a
                    href="/student/login"
                    className="text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    Student Login
                  </a>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Security note */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            <i className="fas fa-shield-alt mr-1"></i>
            This page is protected to ensure data privacy and security
          </p>
        </div>
      </div>
    </div>
  )
}

export default Unauthorized
