import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Navbar from '../../components/Navbar'

const StudentLogin: React.FC = () => {
  const [studentNumber, setStudentNumber] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await axios.post('/api/student/login',
        { withCredentials: true }
      )
      
      if (response.data.success) {
        navigate('/student/subjects')
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'School ID not found. Please check your ID and try again.')
      } else {
        setError('School ID not found. Please check your ID and try again.')
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
              <div className="inline-block bg-blue-100 rounded-full p-4 mb-4">
                <i className="fas fa-user-graduate text-4xl text-blue-600"></i>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Student Login</h2>
              <p className="text-gray-600">Enter your School ID to evaluate faculty</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
                <i className="fas fa-exclamation-circle mr-2"></i>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label htmlFor="student_number" className="block text-gray-700 font-semibold mb-2">
                  School ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="student_number"
                  name="student_number"
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                  placeholder="00-0000-000"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="mt-2 text-sm text-gray-500">
                  <i className="fas fa-info-circle mr-1"></i>
                  Format: 00-0000-000
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Logging in...
                  </>
                ) : (
                  <>
                    <i className="fas fa-sign-in-alt mr-2"></i>
                    Login
                  </>
                )}
              </button>
            </form>

            {/* Info Box */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2 flex items-center">
                <i className="fas fa-shield-alt mr-2"></i>
                Privacy Protected
              </h3>
              <p className="text-sm text-blue-700">
                Your responses are completely anonymous. We use advanced privacy protection to ensure your identity cannot be traced to your evaluations.
              </p>
            </div>
          </div>

          {/* Help Text */}
          <div className="text-center mt-6 text-gray-600">
            <p className="text-sm">
              <i className="fas fa-question-circle mr-1"></i>
              Need help? Contact the registrar's office
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StudentLogin
