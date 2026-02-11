import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import Navbar from '../../components/Navbar'

const StudentEvaluate = () => {
  const { enrollmentId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [enrollment, setEnrollment] = useState(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [error, setError] = useState('')
  const [draftSaved, setDraftSaved] = useState(false)

  // Form data
  const [formData, setFormData] = useState({
    // Teacher ratings (1-5)
    teacher_care: '',
    teacher_respect: '',
    teacher_patience: '',
    teacher_shows_mastery: '',
    teacher_updated_informed: '',
    teacher_demonstrates_competence: '',
    // Learning Process ratings (1-5)
    learning_clear_objectives: '',
    learning_syllabus_followed: '',
    learning_starts_ends_on_time: '',
    learning_concepts_understood: '',
    learning_materials_appropriate: '',
    learning_allows_questions: '',
    learning_encourages_participation: '',
    learning_provides_relevant_examples: '',
    learning_provides_activities: '',
    learning_relates_to_life: '',
    learning_relates_to_other_subjects: '',
    learning_fair_grading: '',
    learning_returns_outputs_on_time: '',
    // Classroom Management ratings (1-5)
    classroom_starts_on_time: '',
    classroom_time_managed_effectively: '',
    classroom_student_behavior: '',
    classroom_conducive_environment: '',
    classroom_appropriate_strategies: '',
    classroom_communication_channels: '',
    // Comments (optional)
    comments: ''
  })

  // Section accordion states
  const [openSection, setOpenSection] = useState('teacher')
  
  // Progress tracking
  const [progress, setProgress] = useState(0)

  // Load enrollment data
  useEffect(() => {
    loadEnrollment()
  }, [enrollmentId])

  // Auto-save draft every 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loading && enrollment) {
        saveDraft()
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [formData, loading])

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem(`evaluation_draft_${enrollmentId}`)
    if (draft) {
      try {
        setFormData(JSON.parse(draft))
      } catch (e) {
        console.error('Error loading draft:', e)
      }
    }
  }, [enrollmentId])

  // Calculate progress
  useEffect(() => {
    calculateProgress()
  }, [formData])

  // Keyboard shortcut for manual save (Ctrl+S or Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        saveDraft(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [formData])

  const loadEnrollment = async () => {
    try {
      const response = await axios.get(`/api/student/enrollment/${enrollmentId}`, {
        withCredentials: true
      })

      if (!response.data.success) {
        setError(response.data.message || 'Failed to load enrollment')
        return
      }

      setEnrollment(response.data.enrollment)
    } catch (err) {
      setError('Failed to load enrollment data')
      console.error('Error loading enrollment:', err)
    } finally {
      setLoading(false)
    }
  }

  const calculateProgress = () => {
    const requiredFields = Object.keys(formData).filter(key => key !== 'comments')
    const filledFields = requiredFields.filter(key => formData[key] !== '')
    const percentage = Math.round((filledFields.length / requiredFields.length) * 100)
    setProgress(percentage)
  }

  const saveDraft = (manual = false) => {
    try {
      localStorage.setItem(`evaluation_draft_${enrollmentId}`, JSON.stringify(formData))
      if (manual) {
        setDraftSaved(true)
        setTimeout(() => setDraftSaved(false), 2000)
      }
    } catch (e) {
      console.error('Error saving draft:', e)
    }
  }

  const clearDraft = () => {
    if (window.confirm('Are you sure you want to clear your draft? This cannot be undone.')) {
      localStorage.removeItem(`evaluation_draft_${enrollmentId}`)
      setFormData({
        teacher_care: '', teacher_respect: '', teacher_patience: '',
        teacher_shows_mastery: '', teacher_updated_informed: '',
        teacher_demonstrates_competence: '', learning_clear_objectives: '',
        learning_syllabus_followed: '', learning_starts_ends_on_time: '',
        learning_concepts_understood: '', learning_materials_appropriate: '',
        learning_allows_questions: '', learning_encourages_participation: '',
        learning_provides_relevant_examples: '', learning_provides_activities: '',
        learning_relates_to_life: '', learning_relates_to_other_subjects: '',
        learning_fair_grading: '', learning_returns_outputs_on_time: '',
        classroom_starts_on_time: '', classroom_time_managed_effectively: '',
        classroom_student_behavior: '', classroom_conducive_environment: '',
        classroom_appropriate_strategies: '', classroom_communication_channels: '',
        comments: ''
      })
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const validateForm = () => {
    const requiredFields = Object.keys(formData).filter(key => key !== 'comments')
    const emptyFields = requiredFields.filter(key => formData[key] === '')
    
    if (emptyFields.length > 0) {
      // Find first empty field and scroll to it
      const firstEmpty = document.querySelector(`[name="${emptyFields[0]}"]`)
      if (firstEmpty) {
        // Open section if closed
        if (emptyFields[0].startsWith('teacher_')) setOpenSection('teacher')
        else if (emptyFields[0].startsWith('learning_')) setOpenSection('learning')
        else if (emptyFields[0].startsWith('classroom_')) setOpenSection('classroom')
        
        setTimeout(() => {
          firstEmpty.scrollIntoView({ behavior: 'smooth', block: 'center' })
          firstEmpty.focus()
          firstEmpty.classList.add('shake', 'border-red-500')
          setTimeout(() => {
            firstEmpty.classList.remove('shake', 'border-red-500')
          }, 500)
        }, 300)
      }
      setError('Please fill in all required fields')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) {
      return
    }

    if (!window.confirm('Are you sure you want to submit this evaluation? You cannot edit it after submission.')) {
      return
    }

    setSubmitting(true)

    try {
      const response = await axios.post('/api/student/submit-evaluation', {
        enrollment_id: enrollmentId,
        ...formData
      }, { withCredentials: true })

      if (response.data.success) {
        // Clear draft
        localStorage.removeItem(`evaluation_draft_${enrollmentId}`)
        setShowSuccessModal(true)
        
        // Redirect after 3 seconds
        setTimeout(() => {
          navigate('/student/subjects')
        }, 3000)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit evaluation')
    } finally {
      setSubmitting(false)
    }
  }

  const RatingQuestion = ({ name, label, section }) => (
    <div className="mb-6">
      <label className="block text-gray-700 font-medium mb-3">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="flex flex-wrap gap-3">
        {[
          { value: '5', label: 'Outstanding', color: 'bg-green-500' },
          { value: '4', label: 'High Satisfactory', color: 'bg-blue-500' },
          { value: '3', label: 'Satisfactory', color: 'bg-yellow-500' },
          { value: '2', label: 'Needs Improvement', color: 'bg-orange-500' },
          { value: '1', label: 'Poor', color: 'bg-red-500' }
        ].map((option) => (
          <label
            key={option.value}
            className={`flex-1 min-w-[140px] cursor-pointer ${
              formData[name] === option.value
                ? `${option.color} text-white shadow-lg scale-105`
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } border-2 ${
              formData[name] === option.value ? 'border-transparent' : 'border-gray-300'
            } rounded-lg p-3 text-center transition-all duration-200`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={formData[name] === option.value}
              onChange={handleInputChange}
              className="sr-only"
            />
            <div className="font-semibold text-lg">{option.value}</div>
            <div className="text-sm">{option.label}</div>
          </label>
        ))}
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar showAdminButton={false} />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <i className="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
            <p className="text-gray-600">Loading evaluation form...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!enrollment) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar showAdminButton={false} />
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <i className="fas fa-exclamation-triangle text-5xl text-red-500 mb-4"></i>
            <h2 className="text-2xl font-bold text-red-800 mb-2">Error</h2>
            <p className="text-red-700">{error || 'Enrollment not found'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar showAdminButton={false} />

      {/* Progress Bar */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">Evaluation Progress</h3>
            <span className="text-sm font-bold text-blue-600">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-2.5 rounded-full transition-all duration-300 progress-bar"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          {draftSaved && (
            <div className="mt-2 text-sm text-green-600 flex items-center">
              <i className="fas fa-check-circle mr-2"></i>
              Draft saved ✓
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Header Card */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg shadow-lg p-6 mb-8 fade-in">
          <h1 className="text-2xl font-bold mb-2">Faculty Evaluation Form</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-blue-200 text-sm mb-1">Course</p>
              <p className="font-semibold">{enrollment.course?.name}</p>
              <p className="text-blue-100 text-sm">{enrollment.course?.code}</p>
            </div>
            <div>
              <p className="text-blue-200 text-sm mb-1">Instructor</p>
              <p className="font-semibold">{enrollment.teacher?.full_name}</p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <i className="fas fa-exclamation-circle mr-2"></i>
            {error}
          </div>
        )}

        {/* Evaluation Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: The Teacher */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenSection(openSection === 'teacher' ? '' : 'teacher')}
              className={`w-full px-6 py-4 text-left font-bold text-lg flex justify-between items-center transition-colors ${
                openSection === 'teacher'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              <span>
                <i className="fas fa-chalkboard-teacher mr-3"></i>
                Section 1: The Teacher
              </span>
              <i className={`fas fa-chevron-${openSection === 'teacher' ? 'up' : 'down'}`}></i>
            </button>
            {openSection === 'teacher' && (
              <div className="p-6 space-y-6">
                <RatingQuestion name="teacher_care" label="1. Shows care and consideration to students" />
                <RatingQuestion name="teacher_respect" label="2. Respects students' ideas and opinions" />
                <RatingQuestion name="teacher_patience" label="3. Exhibits patience in dealing with students" />
                <RatingQuestion name="teacher_shows_mastery" label="4. Shows mastery of the subject matter" />
                <RatingQuestion name="teacher_updated_informed" label="5. Is updated and well-informed on current trends" />
                <RatingQuestion name="teacher_demonstrates_competence" label="6. Demonstrates professional competence" />
              </div>
            )}
          </div>

          {/* Section 2: The Learning Process */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenSection(openSection === 'learning' ? '' : 'learning')}
              className={`w-full px-6 py-4 text-left font-bold text-lg flex justify-between items-center transition-colors ${
                openSection === 'learning'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              <span>
                <i className="fas fa-book-reader mr-3"></i>
                Section 2: The Learning Process
              </span>
              <i className={`fas fa-chevron-${openSection === 'learning' ? 'up' : 'down'}`}></i>
            </button>
            {openSection === 'learning' && (
              <div className="p-6 space-y-6">
                <RatingQuestion name="learning_clear_objectives" label="7. Explains learning objectives clearly" />
                <RatingQuestion name="learning_syllabus_followed" label="8. Follows the prescribed syllabus/course outline" />
                <RatingQuestion name="learning_starts_ends_on_time" label="9. Starts and ends classes on time" />
                <RatingQuestion name="learning_concepts_understood" label="10. Ensures concepts are clearly understood" />
                <RatingQuestion name="learning_materials_appropriate" label="11. Uses appropriate and relevant teaching materials" />
                <RatingQuestion name="learning_allows_questions" label="12. Allows students to ask questions" />
                <RatingQuestion name="learning_encourages_participation" label="13. Encourages active student participation" />
                <RatingQuestion name="learning_provides_relevant_examples" label="14. Provides relevant and practical examples" />
                <RatingQuestion name="learning_provides_activities" label="15. Provides meaningful learning activities" />
                <RatingQuestion name="learning_relates_to_life" label="16. Relates lessons to real-life situations" />
                <RatingQuestion name="learning_relates_to_other_subjects" label="17. Relates subject matter to other courses" />
                <RatingQuestion name="learning_fair_grading" label="18. Applies fair and objective grading system" />
                <RatingQuestion name="learning_returns_outputs_on_time" label="19. Returns checked outputs on time with feedback" />
              </div>
            )}
          </div>

          {/* Section 3: Classroom Management */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenSection(openSection === 'classroom' ? '' : 'classroom')}
              className={`w-full px-6 py-4 text-left font-bold text-lg flex justify-between items-center transition-colors ${
                openSection === 'classroom'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              <span>
                <i className="fas fa-door-open mr-3"></i>
                Section 3: Classroom Management
              </span>
              <i className={`fas fa-chevron-${openSection === 'classroom' ? 'up' : 'down'}`}></i>
            </button>
            {openSection === 'classroom' && (
              <div className="p-6 space-y-6">
                <RatingQuestion name="classroom_starts_on_time" label="20. Comes to class on time and prepared" />
                <RatingQuestion name="classroom_time_managed_effectively" label="21. Manages time effectively during class" />
                <RatingQuestion name="classroom_student_behavior" label="22. Manages student behavior appropriately" />
                <RatingQuestion name="classroom_conducive_environment" label="23. Creates a conducive learning environment" />
                <RatingQuestion name="classroom_appropriate_strategies" label="24. Uses appropriate classroom management strategies" />
                <RatingQuestion name="classroom_communication_channels" label="25. Establishes clear communication channels" />
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-bold text-lg mb-4 text-gray-800">
              <i className="fas fa-comments mr-2 text-blue-600"></i>
              Additional Comments (Optional)
            </h3>
            <textarea
              name="comments"
              value={formData.comments}
              onChange={handleInputChange}
              rows="5"
              placeholder="Share any additional feedback, suggestions, or comments about this course or instructor..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            ></textarea>
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={clearDraft}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-colors duration-200"
              >
                <i className="fas fa-trash-alt mr-2"></i>
                Clear Draft
              </button>
              <button
                type="button"
                onClick={() => saveDraft(true)}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors duration-200"
              >
                <i className="fas fa-save mr-2"></i>
                Save Draft (Ctrl+S)
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Submitting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane mr-2"></i>
                    Submit Evaluation
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md mx-4 fade-in">
            <div className="text-center">
              <div className="inline-block bg-green-100 rounded-full p-4 mb-4">
                <i className="fas fa-check-circle text-5xl text-green-600"></i>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Evaluation Submitted!</h2>
              <p className="text-gray-600 mb-4">
                Thank you for your feedback. Your evaluation has been successfully submitted.
              </p>
              <p className="text-sm text-gray-500">
                Redirecting to subjects page...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentEvaluate
