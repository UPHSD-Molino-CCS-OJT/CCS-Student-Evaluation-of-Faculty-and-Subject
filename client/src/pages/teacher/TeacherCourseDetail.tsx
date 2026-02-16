import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Loader, BookOpen, Users, TrendingUp, Award, MessageSquare, ArrowLeft, BarChart3 } from 'lucide-react'
import TeacherNavbar from '../../components/TeacherNavbar'

interface QuestionAverages {
  [key: string]: number;
}

interface CourseInfo {
  course_id: string;
  course_name: string;
  course_code: string;
  section_code: string;
  school_year: string;
  semester: string;
  total_students: number;
  evaluated_students: number;
}

interface TeacherInfo {
  full_name: string;
  employee_id: string;
}

interface Statistics {
  average_rating: number;
  question_averages: QuestionAverages;
  remarks: string;
}

interface Comment {
  comment: string;
  submitted_at: string;
}

interface CourseDetailData {
  success: boolean;
  course: CourseInfo;
  teacher: TeacherInfo;
  statistics: Statistics;
  comments: Comment[];
}

const TeacherCourseDetail: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')
  const [data, setData] = useState<CourseDetailData | null>(null)

  useEffect(() => {
    loadCourseDetail()
  }, [courseId])

  const loadCourseDetail = async (): Promise<void> => {
    try {
      const response = await axios.get(`/api/teacher/course/${courseId}`, {
        withCredentials: true
      })

      if (response.data.success) {
        setData(response.data)
      } else {
        setError(response.data.message || 'Failed to load course detail')
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Failed to load course detail')
      } else {
        setError('Failed to load course detail')
      }
    } finally {
      setLoading(false)
    }
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
      'teacher_diction': "1. Clarity's of diction (voice projection)",
      'teacher_grammar': '2. Use of correct grammar (and appropriate words)',
      'teacher_personality': '3. Personality (Grooming and attire)',
      'teacher_disposition': '4. Disposition (Composure and sense of humor)',
      'teacher_dynamic': '5. Dynamic and interesting in sharing of ideas',
      'teacher_fairness': '6. Just and fair in dealings with students (No favoritism)',
      // Learning Process
      'learning_motivation': "7. Motivation (Ability to sustain students' interest)",
      'learning_critical_thinking': '8. Encouragement given to students to develop critical thinking',
      'learning_organization': '9. Organization of lessons / lectures',
      'learning_interest': '10. Interest on ensuring that students are learning the lessons',
      'learning_explanation': '11. The teacher can very well explain words and concepts.',
      'learning_clarity': '12. Clarity in the Formulation of questions',
      'learning_integration': '13. Integration of subject matter to life situations',
      'learning_mastery': '14. Mastery of teaching the subject (not bookish)',
      'learning_methodology': '15. Teaching methodology is dynamic and interesting',
      'learning_values': '16. Integration of perpetualite values to the lessons',
      'learning_grading': '17. Fair and just in giving grades in Exams, assignments and recitations',
      'learning_synthesis': '18. Ability to synthesize learning activities',
      'learning_reasonableness': '19. Reasonableness of quizzes and examinations',
      // Classroom Management
      'classroom_attendance': "20. Regularity of checking students' attendance",
      'classroom_policies': '21. Ability to convey classroom policies to students',
      'classroom_discipline': '22. Maintenance of classroom discipline',
      'classroom_authority': '23. Exercise of Reasonable authority in the classroom (hindi nananakot)',
      'classroom_prayers': '24. Recitation of opening and / or closing prayers',
      'classroom_punctuality': '25. Punctuality in Starting and Ending of class'
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
            <p className="text-gray-600">Loading course details...</p>
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
          <button
            onClick={() => navigate('/teacher/dashboard')}
            className="mb-6 flex items-center text-green-600 hover:text-green-700 font-semibold"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Dashboard
          </button>
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
        {/* Back Button */}
        <button
          onClick={() => navigate('/teacher/dashboard')}
          className="mb-6 flex items-center text-green-600 hover:text-green-700 font-semibold transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Dashboard
        </button>

        {/* Course Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                {data.course.course_code} - {data.course.course_name}
              </h1>
              <p className="text-gray-600 mb-4">
                Section: {data.course.section_code} • {data.course.school_year} • {data.course.semester}
              </p>
              
              {/* Stats Row */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Users size={20} className="text-gray-500" />
                  <span className="text-sm text-gray-700">
                    <strong>{data.course.evaluated_students}</strong> / {data.course.total_students} students evaluated
                  </span>
                </div>

                {data.statistics.average_rating > 0 && (
                  <>
                    <div className="flex items-center space-x-2">
                      <TrendingUp size={20} className={getRatingColor(data.statistics.average_rating)} />
                      <span className={`text-sm font-semibold ${getRatingColor(data.statistics.average_rating)}`}>
                        Average: {data.statistics.average_rating.toFixed(2)} / 5.00
                      </span>
                    </div>

                    <div className={`px-4 py-2 rounded-full ${getRatingBgColor(data.statistics.average_rating)}`}>
                      <div className="flex items-center space-x-2">
                        <Award size={20} className={getRatingColor(data.statistics.average_rating)} />
                        <span className={`text-sm font-semibold ${getRatingColor(data.statistics.average_rating)}`}>
                          {data.statistics.remarks}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* No Evaluations Message */}
        {data.course.evaluated_students === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <BarChart3 className="mx-auto text-gray-400 mb-4" size={64} />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Evaluations Yet</h3>
            <p className="text-gray-600">Students haven't submitted evaluations for this course yet.</p>
          </div>
        ) : (
          <>
            {/* Detailed Ratings */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Detailed Ratings by Question</h2>
              
              {/* Teacher Attributes */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                  <BookOpen size={20} className="mr-2" />
                  Teacher Attributes
                </h3>
                <div className="space-y-3">
                  {['teacher_diction', 'teacher_grammar', 'teacher_personality', 'teacher_disposition', 'teacher_dynamic', 'teacher_fairness'].map((key) => (
                    <div key={key} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-700 font-medium">{getQuestionLabel(key)}</span>
                        <span className={`font-bold text-lg ${getRatingColor(data.statistics.question_averages[key])}`}>
                          {data.statistics.question_averages[key].toFixed(2)} / 5.00
                        </span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full transition-all duration-500 ${getRatingBgColor(data.statistics.question_averages[key])}`}
                          style={{ width: `${(data.statistics.question_averages[key] / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Learning Process */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                  <TrendingUp size={20} className="mr-2" />
                  Learning Process
                </h3>
                <div className="space-y-3">
                  {['learning_motivation', 'learning_critical_thinking', 'learning_organization', 'learning_interest', 'learning_explanation', 'learning_clarity', 'learning_integration', 'learning_mastery', 'learning_methodology', 'learning_values', 'learning_grading', 'learning_synthesis', 'learning_reasonableness'].map((key) => (
                    <div key={key} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-700 font-medium">{getQuestionLabel(key)}</span>
                        <span className={`font-bold text-lg ${getRatingColor(data.statistics.question_averages[key])}`}>
                          {data.statistics.question_averages[key].toFixed(2)} / 5.00
                        </span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full transition-all duration-500 ${getRatingBgColor(data.statistics.question_averages[key])}`}
                          style={{ width: `${(data.statistics.question_averages[key] / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Classroom Management */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                  <Users size={20} className="mr-2" />
                  Classroom Management
                </h3>
                <div className="space-y-3">
                  {['classroom_attendance', 'classroom_policies', 'classroom_discipline', 'classroom_authority', 'classroom_prayers', 'classroom_punctuality'].map((key) => (
                    <div key={key} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-700 font-medium">{getQuestionLabel(key)}</span>
                        <span className={`font-bold text-lg ${getRatingColor(data.statistics.question_averages[key])}`}>
                          {data.statistics.question_averages[key].toFixed(2)} / 5.00
                        </span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full transition-all duration-500 ${getRatingBgColor(data.statistics.question_averages[key])}`}
                          style={{ width: `${(data.statistics.question_averages[key] / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                <MessageSquare size={24} className="mr-2" />
                Student Comments ({data.comments.length})
              </h2>
              
              {data.comments.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="mx-auto text-gray-400 mb-3" size={48} />
                  <p className="text-gray-600">No comments submitted for this course.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.comments.map((comment, index) => (
                    <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {comment.comment}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default TeacherCourseDetail
