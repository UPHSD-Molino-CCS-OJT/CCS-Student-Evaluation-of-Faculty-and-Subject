import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Loader, BookOpen, Users, BarChart3, TrendingUp, Award, ChevronDown, ChevronUp } from 'lucide-react'
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
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')
  const [data, setData] = useState<DashboardData | null>(null)
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null)

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

  const toggleCourseDetails = (courseId: string) => {
    setExpandedCourse(expandedCourse === courseId ? null : courseId)
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

  const getQuestionLabel = (key: string): string => {
    const labels: { [key: string]: string } = {
      // Teacher ratings
      'teacher_diction': '1. Diction (clear and understandable speech)',
      'teacher_grammar': '2. Grammar (correct use of language)',
      'teacher_personality': '3. Personality (approachable and professional)',
      'teacher_disposition': '4. Disposition (positive attitude)',
      'teacher_dynamic': '5. Dynamic (engaging and energetic)',
      'teacher_fairness': '6. Fairness (treats students equally)',
      // Learning Process
      'learning_motivation': '7. Motivation (inspires and encourages learning)',
      'learning_critical_thinking': '8. Critical Thinking (promotes analysis)',
      'learning_organization': '9. Organization (well-structured lessons)',
      'learning_interest': '10. Interest (makes subject engaging)',
      'learning_explanation': '11. Explanation (clear and thorough)',
      'learning_clarity': '12. Clarity (easy to understand)',
      'learning_integration': '13. Integration (connects concepts)',
      'learning_mastery': '14. Mastery (demonstrates subject expertise)',
      'learning_methodology': '15. Methodology (effective teaching methods)',
      'learning_values': '16. Values (promotes ethics and values)',
      'learning_grading': '17. Grading (fair and transparent assessment)',
      'learning_synthesis': '18. Synthesis (helps combine ideas)',
      'learning_reasonableness': '19. Reasonableness (realistic expectations)',
      // Classroom Management
      'classroom_attendance': '20. Attendance (monitors attendance)',
      'classroom_policies': '21. Policies (clear class rules)',
      'classroom_discipline': '22. Discipline (maintains order)',
      'classroom_authority': '23. Authority (commands respect)',
      'classroom_prayers': '24. Prayers (includes spiritual activities)',
      'classroom_punctuality': '25. Punctuality (starts and ends on time)'
    }
    return labels[key] || key
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
              <div key={course.course_id} className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* Course Header */}
                <div className="p-6 border-b border-gray-200">
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

                    {/* Toggle Button */}
                    {course.evaluated_students > 0 && (
                      <button
                        onClick={() => toggleCourseDetails(course.course_id)}
                        className="ml-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {expandedCourse === course.course_id ? (
                          <ChevronUp size={24} className="text-gray-600" />
                        ) : (
                          <ChevronDown size={24} className="text-gray-600" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable Details */}
                {expandedCourse === course.course_id && course.evaluated_students > 0 && (
                  <div className="p-6 bg-gray-50">
                    <h4 className="text-lg font-bold text-gray-800 mb-4">Detailed Ratings by Question</h4>
                    
                    {/* Teacher Ratings */}
                    <div className="mb-6">
                      <h5 className="text-md font-semibold text-gray-700 mb-3">Teacher Attributes</h5>
                      <div className="space-y-2">
                        {['teacher_diction', 'teacher_grammar', 'teacher_personality', 'teacher_disposition', 'teacher_dynamic', 'teacher_fairness'].map((key) => (
                          <div key={key} className="bg-white p-3 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-700">{getQuestionLabel(key)}</span>
                              <span className={`font-bold ${getRatingColor(course.question_averages[key])}`}>
                                {course.question_averages[key].toFixed(2)} / 5.00
                              </span>
                            </div>
                            <div className="mt-2 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${getRatingBgColor(course.question_averages[key])}`}
                                style={{ width: `${(course.question_averages[key] / 5) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Learning Process */}
                    <div className="mb-6">
                      <h5 className="text-md font-semibold text-gray-700 mb-3">Learning Process</h5>
                      <div className="space-y-2">
                        {['learning_motivation', 'learning_critical_thinking', 'learning_organization', 'learning_interest', 'learning_explanation', 'learning_clarity', 'learning_integration', 'learning_mastery', 'learning_methodology', 'learning_values', 'learning_grading', 'learning_synthesis', 'learning_reasonableness'].map((key) => (
                          <div key={key} className="bg-white p-3 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-700">{getQuestionLabel(key)}</span>
                              <span className={`font-bold ${getRatingColor(course.question_averages[key])}`}>
                                {course.question_averages[key].toFixed(2)} / 5.00
                              </span>
                            </div>
                            <div className="mt-2 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${getRatingBgColor(course.question_averages[key])}`}
                                style={{ width: `${(course.question_averages[key] / 5) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Classroom Management */}
                    <div>
                      <h5 className="text-md font-semibold text-gray-700 mb-3">Classroom Management</h5>
                      <div className="space-y-2">
                        {['classroom_attendance', 'classroom_policies', 'classroom_discipline', 'classroom_authority', 'classroom_prayers', 'classroom_punctuality'].map((key) => (
                          <div key={key} className="bg-white p-3 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-700">{getQuestionLabel(key)}</span>
                              <span className={`font-bold ${getRatingColor(course.question_averages[key])}`}>
                                {course.question_averages[key].toFixed(2)} / 5.00
                              </span>
                            </div>
                            <div className="mt-2 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${getRatingBgColor(course.question_averages[key])}`}
                                style={{ width: `${(course.question_averages[key] / 5) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* No Evaluations Message */}
                {course.evaluated_students === 0 && (
                  <div className="p-6 bg-gray-50 text-center">
                    <p className="text-gray-600">No evaluations received yet for this course.</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default TeacherDashboard
