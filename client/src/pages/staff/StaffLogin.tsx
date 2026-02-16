import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { ShieldCheck, AlertCircle, User, Lock, Loader, LogIn } from 'lucide-react'
import Navbar from '../../components/Navbar'
import { useModal } from '../../components/ModalContext'

interface Credentials {
  username: string;
  password: string;
}

const StaffLogin: React.FC = () => {
  const [credentials, setCredentials] = useState<Credentials>({
    username: '',
    password: ''
  })
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { showAlert } = useModal()
  
  // Determine return URL from location state or query params
  const returnUrl = (location.state as any)?.returnUrl || 
                    new URLSearchParams(location.search).get('returnUrl') || 
                    null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await axios.post('/api/staff/login', credentials, {
        withCredentials: true
      })

      if (response.data.success) {
        const { userType } = response.data
        
        // Show success message
        showAlert(`Welcome back! Logging in as ${userType}...`, {
          variant: 'success',
          title: 'Login Successful'
        })
        
        // Navigate based on user type and return URL
        if (returnUrl) {
          navigate(returnUrl)
        } else if (userType === 'admin') {
          navigate('/admin/dashboard')
        } else if (userType === 'teacher') {
          navigate('/teacher/dashboard')
        }
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Invalid username or password')
      } else {
        setError('Invalid username or password')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar showAdminButton={false} />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          {/* Card */}
          <div className="bg-white rounded-lg shadow-lg p-8 fade-in">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-block bg-gradient-to-br from-blue-100 to-green-100 rounded-full p-4 mb-4">
                <ShieldCheck className="text-blue-600" size={48} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Staff Login</h2>
              <p className="text-gray-600">Admin & Teacher Portal</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
                <AlertCircle className="mr-2" size={20} />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label htmlFor="username" className="block text-gray-700 font-semibold mb-2">
                  Username <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="text-gray-400" size={20} />
                  </div>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={credentials.username}
                    onChange={handleChange}
                    placeholder="Enter username"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="password" className="block text-gray-700 font-semibold mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="text-gray-400" size={20} />
                  </div>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={credentials.password}
                    onChange={handleChange}
                    placeholder="Enter password"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {loading ? (
                  <>
                    <Loader className="mr-2 animate-spin" size={20} />
                    Verifying...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2" size={20} />
                    Login
                  </>
                )}
              </button>
            </form>

            {/* Info Section */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-medium mb-2">📌 Access Information</p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• <strong>Admins:</strong> Use your admin credentials</li>
                  <li>• <strong>Teachers:</strong> Use your assigned username</li>
                  <li>• Contact your administrator for credential support</li>
                </ul>
              </div>
            </div>

            {/* Student Login Link */}
            <div className="mt-6 text-center">
              <p className="text-gray-600 text-sm">
                Are you a student?{' '}
                <a href="/student/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                  Student Login
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StaffLogin
