import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import AdminNavbar from '../../components/AdminNavbar'
import { EvaluationDetailSkeleton } from '../../components/Skeleton'
import { PopulatedEvaluation, RatingItemProps } from '../../types'
import { AlertTriangle, ArrowLeft, GraduationCap, Shield, Presentation, BookOpen, DoorOpen, MessageSquare } from 'lucide-react'

const AdminEvaluationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [evaluation, setEvaluation] = useState<PopulatedEvaluation | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    fetchEvaluation()
  }, [id])

  const fetchEvaluation = async (): Promise<void> => {
    try {
      const response = await axios.get(`/api/admin/evaluations/${id}`, { withCredentials: true })
      setEvaluation(response.data.evaluation)
    } catch (error: unknown) {
      console.error('Error fetching evaluation:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRatingColor = (rating: number): string => {
    if (rating >= 4) return 'text-green-600 bg-green-50'
    if (rating >= 3) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getRatingLabel = (rating: number): string => {
    if (rating === 5) return 'Outstanding'
    if (rating === 4) return 'High Satisfactory'
    if (rating === 3) return 'Satisfactory'
    if (rating === 2) return 'Needs Improvement'
    return 'Poor'
  }

  const RatingItem: React.FC<RatingItemProps> = ({ label, rating }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100">
      <span className="text-gray-700">{label}</span>
      <div className="flex items-center space-x-3">
        <span className={`px-3 py-1 rounded-full font-semibold ${getRatingColor(rating)}`}>
          {rating}
        </span>
        <span className="text-sm text-gray-500">{getRatingLabel(rating)}</span>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
          <EvaluationDetailSkeleton />
        </div>
      </div>
    )
  }

  if (!evaluation) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <AlertTriangle size={64} className="text-red-500 mb-4 mx-auto" />
            <h2 className="text-2xl font-bold text-red-800 mb-2">Evaluation Not Found</h2>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Link
          to="/admin/evaluations"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 font-semibold mb-6"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Evaluations
        </Link>

        {/* Header Card */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg shadow-lg p-6 mb-8">
          <h1 className="text-2xl font-bold mb-4">Evaluation Details</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-blue-200 text-sm mb-1">Teacher</p>
              <p className="font-semibold text-lg">{evaluation.teacher?.full_name}</p>
            </div>
            <div>
              <p className="text-blue-200 text-sm mb-1">Course</p>
              <p className="font-semibold text-lg">{evaluation.course?.name}</p>
              <p className="text-blue-100 text-sm">{evaluation.course?.code}</p>
            </div>
            <div>
              <p className="text-blue-200 text-sm mb-1">Submitted</p>
              <p className="font-semibold text-lg">
                {evaluation.createdAt && new Date(evaluation.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Student Info (Privacy Protected) */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="font-bold text-lg mb-4 text-gray-800 flex items-center">
            <GraduationCap size={20} className="text-blue-600 mr-2" />
            Student Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Program</p>
              <p className="font-semibold text-gray-800">{evaluation.program?.name}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Year Level</p>
              <p className="font-semibold text-gray-800">{evaluation.year_level}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">School Year</p>
              <p className="font-semibold text-gray-800">{evaluation.school_year}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Status</p>
              <p className="font-semibold text-gray-800">{evaluation.status}</p>
            </div>
          </div>
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700 flex items-center">
              <Shield size={16} className="mr-2" />
              Student ID is hidden for privacy protection
            </p>
          </div>
        </div>

        {/* Overall Ratings */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-500 text-sm mb-2">Teacher Average</p>
            <p className={`text-4xl font-bold ${getRatingColor(evaluation.teacher_average)}`}>
              {(evaluation.teacher_average || 0).toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-500 text-sm mb-2">Learning Process</p>
            <p className={`text-4xl font-bold ${getRatingColor(evaluation.learning_average)}`}>
              {(evaluation.learning_average || 0).toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-500 text-sm mb-2">Classroom Mgmt</p>
            <p className={`text-4xl font-bold ${getRatingColor(evaluation.classroom_average)}`}>
              {(evaluation.classroom_average || 0).toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-500 text-sm mb-2">Overall Average</p>
            <p className={`text-4xl font-bold ${getRatingColor(evaluation.overall_average)}`}>
              {(evaluation.overall_average || 0).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Detailed Ratings */}
        <div className="space-y-6">
          {/* Teacher Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="font-bold text-xl mb-4 text-gray-800 flex items-center">
              <Presentation size={24} className="text-blue-600 mr-2" />
              The Teacher
            </h2>
            <RatingItem label="1. Diction (clear and understandable speech)" rating={evaluation.teacher_diction} />
            <RatingItem label="2. Grammar (correct use of language)" rating={evaluation.teacher_grammar} />
            <RatingItem label="3. Personality (pleasant and approachable)" rating={evaluation.teacher_personality} />
            <RatingItem label="4. Disposition (temperament and attitude)" rating={evaluation.teacher_disposition} />
            <RatingItem label="5. Dynamic (energetic and engaging)" rating={evaluation.teacher_dynamic} />
            <RatingItem label="6. Fairness (treats students equally)" rating={evaluation.teacher_fairness} />
          </div>

          {/* Learning Process Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="font-bold text-xl mb-4 text-gray-800 flex items-center">
              <BookOpen size={24} className="text-blue-600 mr-2" />
              The Learning Process
            </h2>
            <RatingItem label="7. Motivation (inspires and encourages learning)" rating={evaluation.learning_motivation} />
            <RatingItem label="8. Critical Thinking (promotes analytical skills)" rating={evaluation.learning_critical_thinking} />
            <RatingItem label="9. Organization (well-structured lessons)" rating={evaluation.learning_organization} />
            <RatingItem label="10. Interest (makes subject engaging)" rating={evaluation.learning_interest} />
            <RatingItem label="11. Explanation (clear and easy to understand)" rating={evaluation.learning_explanation} />
            <RatingItem label="12. Clarity (presents ideas clearly)" rating={evaluation.learning_clarity} />
            <RatingItem label="13. Integration (connects theory and practice)" rating={evaluation.learning_integration} />
            <RatingItem label="14. Mastery (demonstrates subject expertise)" rating={evaluation.learning_mastery} />
            <RatingItem label="15. Methodology (effective teaching methods)" rating={evaluation.learning_methodology} />
            <RatingItem label="16. Values (promotes ethical values)" rating={evaluation.learning_values} />
            <RatingItem label="17. Grading (fair assessment system)" rating={evaluation.learning_grading} />
            <RatingItem label="18. Synthesis (brings ideas together)" rating={evaluation.learning_synthesis} />
            <RatingItem label="19. Reasonableness (realistic expectations)" rating={evaluation.learning_reasonableness} />
          </div>

          {/* Classroom Management Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="font-bold text-xl mb-4 text-gray-800 flex items-center">
              <DoorOpen size={24} className="text-blue-600 mr-2" />
              Classroom Management
            </h2>
            <RatingItem label="20. Attendance (monitors student attendance)" rating={evaluation.classroom_attendance} />
            <RatingItem label="21. Policies (implements class policies)" rating={evaluation.classroom_policies} />
            <RatingItem label="22. Discipline (maintains order and discipline)" rating={evaluation.classroom_discipline} />
            <RatingItem label="23. Authority (commands respect and attention)" rating={evaluation.classroom_authority} />
            <RatingItem label="24. Prayers (facilitates spiritual activities)" rating={evaluation.classroom_prayers} />
            <RatingItem label="25. Punctuality (starts and ends on time)" rating={evaluation.classroom_punctuality} />
          </div>

          {/* Comments Section */}
          {evaluation.comments && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="font-bold text-xl mb-4 text-gray-800 flex items-center">
                <MessageSquare size={24} className="text-blue-600 mr-2" />
                Additional Comments
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">{evaluation.comments}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminEvaluationDetail
