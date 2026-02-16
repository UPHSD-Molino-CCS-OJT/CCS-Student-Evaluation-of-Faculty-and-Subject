import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Loader, BookOpen, Users, BarChart3, TrendingUp, Award, ChevronRight } from 'lucide-react'
import TeacherNavbar from '../../components/TeacherNavbar'

interface QuestionAverages {
  [key: string]: number;
}

interface CourseStats {
  course_id: string;
  course_name: string;
  course_code: string;
  section_code: string;
  school_year: string;
  semester: string;
  total_students: number;
  evaluated_students: number;
  average_rating: number;
  question_averages: QuestionAverages;
  remarks: string;
}

interface TeacherInfo {
  full_name: string;
  employee_id: string;
  department?: string;
  email?: string;
}

interface DashboardData {
  success: boolean;
  teacher: TeacherInfo;
  courses: CourseStats[];
}

const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async (): Promise<void> => {
    try {
      const response = await axios.get('/api/teacher/dashboard', {
        withCredentials: true
      })

      if (response.data.success) {
        setData(response.data)
      } else {
        setError(response.data.message || 'Failed to load dashboard')
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Failed to load dashboard data')
      } else {
        setError('Failed to load dashboard data')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCourseClick = (courseId: string) => {
    navigate(`/teacher/course/${courseId}`)
  }

  const getRatingColor = (rating: number): string => {
    if (rating >= 4.5) return 'text-green-600'
    if (rating >= 4.0) return 'text-blue-600'
    if (rating >= 3.5) return 'text-yellow-600'
    if (rating >= 3.0) return 'text-orange-600'
    return 'text-red-600'
  }

  const getRatingBgColor = (rating: number): string => {
    if (rating >= 4.5) return 'bg-green-100'
    if (rating >= 4.0) return 'bg-blue-100'
    if (rating >= 3.5) return 'bg-yellow-100'
    if (rating >= 3.0) return 'bg-orange-100'
    return 'bg-red-100'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TeacherNavbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <Loader className="mx-auto text-green-600 mb-4 animate-spin" size={48} />
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TeacherNavbar />
        <div className="container mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
            <p className="font-semibold">Error</p>
            <p>{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TeacherNavbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome, {data.teacher.full_name}!</h1>
          <p className="text-gray-600">
            Employee ID: {data.teacher.employee_id}
            {data.teacher.department && ` • Department: ${data.teacher.department}`}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Courses</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{data.courses.length}</p>
              </div>
              <BookOpen className="text-green-600" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Students</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">
                  {data.courses.reduce((sum, c) => sum + c.total_students, 0)}
                </p>
              </div>
              <Users className="text-blue-600" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Evaluations Received</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">
                  {data.courses.reduce((sum, c) => sum + c.evaluated_students, 0)}
                </p>
              </div>
              <BarChart3 className="text-purple-600" size={40} />
            </div>
          </div>
        </div>

        {/* Courses List */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">Your Courses</h2>

          {data.courses.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <BookOpen className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600">No courses assigned yet.</p>
            </div>
          ) : (
            data.courses.map((course) => (
              <button
                key={course.course_id}
                onClick={() => handleCourseClick(course.course_id)}
                className="w-full bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 text-left"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 mb-1">
                        {course.course_code} - {course.course_name}
                      </h3>
                      <p className="text-gray-600 text-sm mb-3">
                        Section: {course.section_code} • {course.school_year} • {course.semester}
                      </p>
                      
                      {/* Stats Row */}
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center space-x-2">
                          <Users size={18} className="text-gray-500" />
                          <span className="text-sm text-gray-700">
                            <strong>{course.evaluated_students}</strong> / {course.total_students} students evaluated
                          </span>
                        </div>

                        {course.average_rating > 0 && (
                          <>
                            <div className="flex items-center space-x-2">
                              <TrendingUp size={18} className={getRatingColor(course.average_rating)} />
                              <span className={`text-sm font-semibold ${getRatingColor(course.average_rating)}`}>
                                Average: {course.average_rating.toFixed(2)} / 5.00
                              </span>
                            </div>

                            <div className={`px-3 py-1 rounded-full ${getRatingBgColor(course.average_rating)}`}>
                              <div className="flex items-center space-x-1">
                                <Award size={16} className={getRatingColor(course.average_rating)} />
                                <span className={`text-sm font-semibold ${getRatingColor(course.average_rating)}`}>
                                  {course.remarks}
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Arrow Icon */}
                    <div className="ml-4 flex-shrink-0">
                      <ChevronRight size={24} className="text-gray-400" />
                    </div>
                  </div>
                  
                  {/* View Details Hint */}
                  {course.evaluated_students > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm text-green-600 font-medium">
                        Click to view detailed ratings and student comments →
                      </p>
                    </div>
                  )}
                  
                  {/* No Evaluations Message */}
                  {course.evaluated_students === 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-500">
                        No evaluations received yet for this course.
                      </p>
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default TeacherDashboard
