import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { Users, AlertCircle, Info, Loader, LogIn } from 'lucide-react'
import Navbar from '../../components/Navbar'

const TeacherLogin: React.FC = () => {
  const [employeeId, setEmployeeId] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const navigate = useNavigate()
  const location = useLocation()
  const returnUrl = (location.state as any)?.returnUrl || '/teacher/dashboard'

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await axios.post('/api/teacher/login',
        { employee_id: employeeId },
        { withCredentials: true }
      )
      
      if (response.data.success) {
        navigate(returnUrl)
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Employee ID not found. Please check your ID and try again.')
      } else {
        setError('Employee ID not found. Please check your ID and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          {/* Card */}
          <div className="bg-white rounded-lg shadow-lg p-8 fade-in">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-block bg-green-100 rounded-full p-4 mb-4">
                <Users className="text-green-600" size={48} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Teacher Login</h2>
              <p className="text-gray-600">Enter your Employee ID to view evaluations</p>
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
                <label htmlFor="employee_id" className="block text-gray-700 font-semibold mb-2">
                  Employee ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="employee_id"
                  name="employee_id"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="Enter your Employee ID"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
                <p className="mt-2 text-sm text-gray-500 flex items-center">
                  <Info className="mr-1" size={16} />
                  Contact your administrator if you don't know your Employee ID
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
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
          </div>
        </div>
      </div>
    </div>
  )
}

export default TeacherLogin
