import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import AdminNavbar from '../../components/AdminNavbar'
import { PopulatedEvaluation, RatingItemProps } from '../../types'

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
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <i className="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
            <p className="text-gray-600">Loading evaluation details...</p>
          </div>
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
            <i className="fas fa-exclamation-triangle text-5xl text-red-500 mb-4"></i>
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
          <i className="fas fa-arrow-left mr-2"></i>
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
            <i className="fas fa-user-graduate text-blue-600 mr-2"></i>
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
              <i className="fas fa-shield-alt mr-2"></i>
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
              <i className="fas fa-chalkboard-teacher text-blue-600 mr-2"></i>
              The Teacher
            </h2>
            <RatingItem label="1. Shows care and consideration to students" rating={evaluation.teacher_care} />
            <RatingItem label="2. Respects students' ideas and opinions" rating={evaluation.teacher_respect} />
            <RatingItem label="3. Exhibits patience in dealing with students" rating={evaluation.teacher_patience} />
            <RatingItem label="4. Shows mastery of the subject matter" rating={evaluation.teacher_shows_mastery} />
            <RatingItem label="5. Is updated and well-informed on current trends" rating={evaluation.teacher_updated_informed} />
            <RatingItem label="6. Demonstrates professional competence" rating={evaluation.teacher_demonstrates_competence} />
          </div>

          {/* Learning Process Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="font-bold text-xl mb-4 text-gray-800 flex items-center">
              <i className="fas fa-book-reader text-blue-600 mr-2"></i>
              The Learning Process
            </h2>
            <RatingItem label="7. Explains learning objectives clearly" rating={evaluation.learning_clear_objectives} />
            <RatingItem label="8. Follows the prescribed syllabus/course outline" rating={evaluation.learning_syllabus_followed} />
            <RatingItem label="9. Starts and ends classes on time" rating={evaluation.learning_starts_ends_on_time} />
            <RatingItem label="10. Ensures concepts are clearly understood" rating={evaluation.learning_concepts_understood} />
            <RatingItem label="11. Uses appropriate and relevant teaching materials" rating={evaluation.learning_materials_appropriate} />
            <RatingItem label="12. Allows students to ask questions" rating={evaluation.learning_allows_questions} />
            <RatingItem label="13. Encourages active student participation" rating={evaluation.learning_encourages_participation} />
            <RatingItem label="14. Provides relevant and practical examples" rating={evaluation.learning_provides_relevant_examples} />
            <RatingItem label="15. Provides meaningful learning activities" rating={evaluation.learning_provides_activities} />
            <RatingItem label="16. Relates lessons to real-life situations" rating={evaluation.learning_relates_to_life} />
            <RatingItem label="17. Relates subject matter to other courses" rating={evaluation.learning_relates_to_other_subjects} />
            <RatingItem label="18. Applies fair and objective grading system" rating={evaluation.learning_fair_grading} />
            <RatingItem label="19. Returns checked outputs on time with feedback" rating={evaluation.learning_returns_outputs_on_time} />
          </div>

          {/* Classroom Management Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="font-bold text-xl mb-4 text-gray-800 flex items-center">
              <i className="fas fa-door-open text-blue-600 mr-2"></i>
              Classroom Management
            </h2>
            <RatingItem label="20. Comes to class on time and prepared" rating={evaluation.classroom_starts_on_time} />
            <RatingItem label="21. Manages time effectively during class" rating={evaluation.classroom_time_managed_effectively} />
            <RatingItem label="22. Manages student behavior appropriately" rating={evaluation.classroom_student_behavior} />
            <RatingItem label="23. Creates a conducive learning environment" rating={evaluation.classroom_conducive_environment} />
            <RatingItem label="24. Uses appropriate classroom management strategies" rating={evaluation.classroom_appropriate_strategies} />
            <RatingItem label="25. Establishes clear communication channels" rating={evaluation.classroom_communication_channels} />
          </div>

          {/* Comments Section */}
          {evaluation.comments && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="font-bold text-xl mb-4 text-gray-800 flex items-center">
                <i className="fas fa-comments text-blue-600 mr-2"></i>
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
