import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import Navbar from '../../components/Navbar'
import { SubjectListSkeleton } from '../../components/Skeleton'
import { Enrollment, Student } from '../../types'

const StudentSubjects: React.FC = () => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchSubjects()
  }, [])

  const fetchSubjects = async (): Promise<void> => {
    try {
      const response = await axios.get('/api/student/subjects', { withCredentials: true })
      
      if (!response.data.authenticated) {
        navigate('/student/login')
        return
      }

      setStudent(response.data.student)
      setEnrollments(response.data.enrollments)
    } catch (err: unknown) {
      setError('Failed to load subjects. Please try again.')
      console.error('Error fetching subjects:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar showAdminButton={false} />
        <div className="container mx-auto px-4 py-8">
          {/* Student Info Skeleton */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg p-6 mb-8 animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-500 rounded-full w-16 h-16"></div>
              <div className="flex-1 space-y-2">
                <div className="h-6 bg-blue-500 rounded w-1/3"></div>
                <div className="h-4 bg-blue-500 rounded w-1/2"></div>
                <div className="h-3 bg-blue-500 rounded w-2/3"></div>
              </div>
            </div>
          </div>
          
          <div className="mb-6 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          
          <SubjectListSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar showAdminButton={false} />
      
      <div className="container mx-auto px-4 py-8">
        {/* Student Info Card */}
        {student && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg shadow-lg p-6 mb-8 fade-in">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 rounded-full p-4">
                <i className="fas fa-user-graduate text-3xl"></i>
              </div>
              <div>
                <h2 className="text-2xl font-bold">{student.full_name}</h2>
                <p className="text-blue-100">
                  {student.program?.name} - Year {student.year_level}
                </p>
                <p className="text-blue-200 text-sm">
                  School Year: {student.school_year} | Semester: {student.semester}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Your Subjects</h1>
          <p className="text-gray-600">Select a subject to evaluate the faculty member</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <i className="fas fa-exclamation-circle mr-2"></i>
            {error}
          </div>
        )}

        {/* Subjects Grid */}
        {enrollments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <i className="fas fa-inbox text-6xl text-gray-300 mb-4"></i>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Subjects Found</h3>
            <p className="text-gray-500">You have no enrolled subjects at this time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrollments.map((enrollment) => (
              <div
                key={enrollment._id}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden fade-in"
              >
                {/* Card Header */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
                  <h3 className="font-bold text-lg mb-1">{enrollment.course?.code}</h3>
                  <p className="text-sm text-blue-100">{enrollment.course?.name}</p>
                </div>

                {/* Card Body */}
                <div className="p-4">
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-1">Instructor</p>
                    <p className="font-semibold text-gray-800 flex items-center">
                      <i className="fas fa-chalkboard-teacher mr-2 text-blue-600"></i>
                      {enrollment.teacher?.full_name}
                    </p>
                  </div>

                  {/* Status Badge */}
                  {enrollment.has_evaluated ? (
                    <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg text-center mb-4">
                      <i className="fas fa-check-circle mr-2"></i>
                      <span className="font-semibold">Completed</span>
                    </div>
                  ) : (
                    <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg text-center mb-4">
                      <i className="fas fa-clock mr-2"></i>
                      <span className="font-semibold">Pending</span>
                    </div>
                  )}

                  {/* Action Button */}
                  <Link
                    to={`/student/evaluate/${enrollment._id}`}
                    className={`block w-full text-center px-4 py-3 rounded-lg font-semibold transition-colors duration-200 ${
                      enrollment.has_evaluated
                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                    onClick={(e: React.MouseEvent<HTMLAnchorElement>) => enrollment.has_evaluated && e.preventDefault()}
                  >
                    {enrollment.has_evaluated ? (
                      <>
                        <i className="fas fa-check mr-2"></i>
                        Already Evaluated
                      </>
                    ) : (
                      <>
                        <i className="fas fa-edit mr-2"></i>
                        Evaluate Now
                      </>
                    )}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Progress Summary */}
        {enrollments.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h3 className="font-bold text-gray-800 mb-4">Evaluation Progress</h3>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">
                {enrollments.filter(e => e.has_evaluated).length} of {enrollments.length} completed
              </span>
              <span className="font-bold text-blue-600">
                {Math.round((enrollments.filter(e => e.has_evaluated).length / enrollments.length) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${(enrollments.filter(e => e.has_evaluated).length / enrollments.length) * 100}%`
                }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StudentSubjects
