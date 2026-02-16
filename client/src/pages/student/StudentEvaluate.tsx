import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import Navbar from '../../components/Navbar'
import { EvaluationFormSkeleton } from '../../components/Skeleton'
import { EvaluationFormData, RatingQuestionProps } from '../../types'
import { CheckCircle, AlertTriangle, AlertCircle, Presentation, BookOpen, DoorOpen, MessageSquare, Shield, Trash2, Save, Loader, Send, ArrowLeft } from 'lucide-react'

interface PopulatedEnrollment {
  _id: string;
  course?: { _id: string; name: string; code: string };
  teacher?: { _id: string; full_name: string };
  has_evaluated: boolean;
}

const StudentEvaluate: React.FC = () => {
  const { enrollmentId } = useParams<{ enrollmentId: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState<boolean>(true)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [enrollment, setEnrollment] = useState<PopulatedEnrollment | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [draftSaved, setDraftSaved] = useState<boolean>(false)

  // Form data
  const [formData, setFormData] = useState<EvaluationFormData>({
    // Teacher ratings (6 criteria)
    teacher_diction: '',
    teacher_grammar: '',
    teacher_personality: '',
    teacher_disposition: '',
    teacher_dynamic: '',
    teacher_fairness: '',
    // Learning Process ratings (13 criteria)
    learning_motivation: '',
    learning_critical_thinking: '',
    learning_organization: '',
    learning_interest: '',
    learning_explanation: '',
    learning_clarity: '',
    learning_integration: '',
    learning_mastery: '',
    learning_methodology: '',
    learning_values: '',
    learning_grading: '',
    learning_synthesis: '',
    learning_reasonableness: '',
    // Classroom Management ratings (6 criteria)
    classroom_attendance: '',
    classroom_policies: '',
    classroom_discipline: '',
    classroom_authority: '',
    classroom_prayers: '',
    classroom_punctuality: '',
    // Comments (optional)
    comments: ''
  })
  
  // Progress tracking
  const [progress, setProgress] = useState<number>(0)

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
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        saveDraft(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [formData])

  const loadEnrollment = async (): Promise<void> => {
    try {
      const response = await axios.get(`/api/student/enrollment/${enrollmentId}`, {
        withCredentials: true
      })

      if (!response.data.success) {
        setError(response.data.message || 'Failed to load enrollment')
        return
      }

      setEnrollment(response.data.enrollment)
    } catch (err: unknown) {
      setError('Failed to load enrollment data')
      console.error('Error loading enrollment:', err)
    } finally {
      setLoading(false)
    }
  }

  const calculateProgress = (): void => {
    const requiredFields = Object.keys(formData).filter(key => key !== 'comments')
    const filledFields = requiredFields.filter(key => formData[key as keyof EvaluationFormData] !== '')
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
        teacher_diction: '', teacher_grammar: '', teacher_personality: '',
        teacher_disposition: '', teacher_dynamic: '', teacher_fairness: '',
        learning_motivation: '', learning_critical_thinking: '', learning_organization: '',
        learning_interest: '', learning_explanation: '', learning_clarity: '',
        learning_integration: '', learning_mastery: '', learning_methodology: '',
        learning_values: '', learning_grading: '', learning_synthesis: '',
        learning_reasonableness: '', classroom_attendance: '', classroom_policies: '',
        classroom_discipline: '', classroom_authority: '', classroom_prayers: '',
        classroom_punctuality: '', comments: ''
      })
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const validateForm = (): boolean => {
    const requiredFields = Object.keys(formData).filter(key => key !== 'comments') as (keyof EvaluationFormData)[]
    const emptyFields = requiredFields.filter(key => formData[key] === '')
    
    if (emptyFields.length > 0) {
      // Find first empty field and scroll to it
      const firstEmpty = document.querySelector(`[name="${emptyFields[0]}"]`)
      if (firstEmpty) {
        setTimeout(() => {
          firstEmpty.scrollIntoView({ behavior: 'smooth', block: 'center' })
          ;(firstEmpty as HTMLElement).focus()
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
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
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Failed to submit evaluation')
      } else {
        setError('Failed to submit evaluation')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const RatingQuestion: React.FC<RatingQuestionProps> = ({ name, label }) => (
    <div className="mb-6">
      <label className="block text-gray-700 font-medium mb-3">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="flex flex-wrap gap-3">
        {[
          { value: '5', label: 'Outstanding', color: 'bg-green-500' },
          { value: '4', label: 'High Satisfactory', color: 'bg-blue-500' },
          { value: '3', label: 'Satisfactory', color: 'bg-yellow-500' },
          { value: '2', label: 'Fairly Satisfactory', color: 'bg-orange-500' },
          { value: '1', label: 'Needs Improvement', color: 'bg-red-500' }
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
        <div className="container mx-auto px-4 py-8">
          <EvaluationFormSkeleton />
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
            <AlertTriangle size={64} className="text-red-500 mb-4 mx-auto" />
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
              <CheckCircle size={16} className="mr-2" />
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
            <AlertCircle size={20} className="mr-2" />
            {error}
          </div>
        )}

        {/* Evaluation Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: The Teacher */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="w-full px-6 py-4 text-left font-bold text-lg flex items-center bg-blue-600 text-white">
              <Presentation size={24} className="mr-3" />
              Section 1: The Teacher
            </div>
            <div className="p-6 space-y-6">
              <RatingQuestion name="teacher_diction" label="1. Clarity's of diction (voice projection)" />
              <RatingQuestion name="teacher_grammar" label="2. Use of correct grammar (and appropriate words)" />
              <RatingQuestion name="teacher_personality" label="3. Personality (Grooming and attire)" />
              <RatingQuestion name="teacher_disposition" label="4. Disposition (Composure and sense of humor)" />
              <RatingQuestion name="teacher_dynamic" label="5. Dynamic and interesting in sharing of ideas" />
              <RatingQuestion name="teacher_fairness" label="6. Just and fair in dealings with students (No favoritism)" />
            </div>
          </div>

          {/* Section 2: The Learning Process */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="w-full px-6 py-4 text-left font-bold text-lg flex items-center bg-blue-600 text-white">
              <BookOpen size={24} className="mr-3" />
              Section 2: The Learning Process
            </div>
            <div className="p-6 space-y-6">
              <RatingQuestion name="learning_motivation" label="7. Motivation (Ability to sustain students' interest)" />
              <RatingQuestion name="learning_critical_thinking" label="8. Encouragement given to students to develop critical thinking" />
              <RatingQuestion name="learning_organization" label="9. Organization of lessons / lectures" />
              <RatingQuestion name="learning_interest" label="10. Interest on ensuring that students are learning the lessons" />
              <RatingQuestion name="learning_explanation" label="11. The teacher can very well explain words and concepts." />
              <RatingQuestion name="learning_clarity" label="12. Clarity in the Formulation of questions" />
              <RatingQuestion name="learning_integration" label="13. Integration of subject matter to life situations" />
              <RatingQuestion name="learning_mastery" label="14. Mastery of teaching the subject (not bookish)" />
              <RatingQuestion name="learning_methodology" label="15. Teaching methodology is dynamic and interesting" />
              <RatingQuestion name="learning_values" label="16. Integration of perpetualite values to the lessons" />
              <RatingQuestion name="learning_grading" label="17. Fair and just in giving grades in Exams, assignments and recitations" />
              <RatingQuestion name="learning_synthesis" label="18. Ability to synthesize learning activities" />
              <RatingQuestion name="learning_reasonableness" label="19. Reasonableness of quizzes and examinations" />
            </div>
          </div>

          {/* Section 3: Classroom Management */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="w-full px-6 py-4 text-left font-bold text-lg flex items-center bg-blue-600 text-white">
              <DoorOpen size={24} className="mr-3" />
              Section 3: Classroom Management
            </div>
            <div className="p-6 space-y-6">
              <RatingQuestion name="classroom_attendance" label="20. Regularity of checking students' attendance" />
              <RatingQuestion name="classroom_policies" label="21. Ability to convey classroom policies to students" />
              <RatingQuestion name="classroom_discipline" label="22. Maintenance of classroom discipline" />
              <RatingQuestion name="classroom_authority" label="23. Exercise of Reasonable authority in the classroom (hindi nananakot)" />
              <RatingQuestion name="classroom_prayers" label="24. Recitation of opening and / or closing prayers" />
              <RatingQuestion name="classroom_punctuality" label="25. Punctuality in Starting and Ending of class" />
            </div>
          </div>

          {/* Comments Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-bold text-lg mb-4 text-gray-800">
              <MessageSquare size={20} className="mr-2 text-blue-600 inline" />
              Additional Comments (Optional)
            </h3>
            
            <div className="mb-4 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <div className="flex items-start">
                <Shield size={20} className="text-blue-600 mt-1 mr-3 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Guidelines for Comments</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Keep comments professional and constructive</li>
                    <li>Focus on course content and teaching methods</li>
                    <li>Do not include personal identifying information</li>
                    <li>Comments must be 20-500 characters if provided</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <textarea
              name="comments"
              value={formData.comments}
              onChange={handleInputChange}
              rows={5}
              minLength={20}
              maxLength={500}
              placeholder="Share any additional feedback, suggestions, or comments about this course or instructor..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            ></textarea>
            <p className="text-xs text-gray-500 mt-2">
              {formData.comments.length > 0 && (
                <span className={formData.comments.length < 20 ? 'text-red-600' : formData.comments.length > 500 ? 'text-red-600' : 'text-gray-600'}>
                  {formData.comments.length} / 500 characters
                  {formData.comments.length > 0 && formData.comments.length < 20 && ' (minimum 20 characters required)'}
                </span>
              )}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={() => navigate('/student/subjects')}
                className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-3 rounded-lg transition-colors duration-200"
              >
                <ArrowLeft size={20} className="mr-2 inline" />
                Back to Subjects
              </button>
              <button
                type="button"
                onClick={clearDraft}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-colors duration-200"
              >
                <Trash2 size={20} className="mr-2 inline" />
                Clear Draft
              </button>
              <button
                type="button"
                onClick={() => saveDraft(true)}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors duration-200"
              >
                <Save size={20} className="mr-2 inline" />
                Save Draft (Ctrl+S)
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader size={20} className="mr-2 inline animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={20} className="mr-2 inline" />
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md mx-4 fade-in">
            <div className="text-center">
              <div className="inline-block bg-green-100 rounded-full p-4 mb-4">
                <CheckCircle size={64} className="text-green-600" />
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
