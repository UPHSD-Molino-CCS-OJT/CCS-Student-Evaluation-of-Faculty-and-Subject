import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { BookPlus, ChevronLeft, Presentation, BookOpen, Users, CalendarDays, Layers, AlertCircle, Loader } from 'lucide-react'
import Navbar from '../../components/Navbar'
import { useModal } from '../../components/ModalContext'

interface AvailableCourse {
  _id: string
  name: string
  code: string
}

interface AvailableTeacher {
  _id: string
  full_name: string
  employee_id?: string
  department?: string
}

const SEMESTERS = ['1st Semester', '2nd Semester', 'Summer']

const currentYear = new Date().getFullYear()
const SCHOOL_YEARS = Array.from({ length: 5 }, (_, i) => {
  const y = currentYear - 1 + i
  return `${y}-${y + 1}`
})

const StudentEnroll: React.FC = () => {
  const [courses, setCourses] = useState<AvailableCourse[]>([])
  const [teachers, setTeachers] = useState<AvailableTeacher[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  const [courseId, setCourseId] = useState<string>('')
  const [teacherId, setTeacherId] = useState<string>('')
  const [sectionCode, setSectionCode] = useState<string>('')
  const [schoolYear, setSchoolYear] = useState<string>(SCHOOL_YEARS[1])
  const [semester, setSemester] = useState<string>(SEMESTERS[0])

  const navigate = useNavigate()
  const { showAlert } = useModal()

  useEffect(() => {
    fetchAvailable()
  }, [])

  const fetchAvailable = async (): Promise<void> => {
    try {
      const response = await axios.get('/api/student/subjects/available', { withCredentials: true })
      if (!response.data.success) {
        navigate('/student/login')
        return
      }
      setCourses(response.data.courses)
      setTeachers(response.data.teachers)
    } catch {
      setError('Failed to load courses. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()

    if (!courseId || !teacherId || !sectionCode.trim() || !schoolYear || !semester) {
      setError('Please fill in all fields.')
      return
    }

    try {
      setSubmitting(true)
      setError('')

      const response = await axios.post(
        '/api/student/subjects/enroll',
        { course_id: courseId, teacher_id: teacherId, section_code: sectionCode.trim(), school_year: schoolYear, semester },
        { withCredentials: true }
      )

      if (response.data.success) {
        await showAlert('You have successfully enrolled in the course!', { title: 'Enrollment Successful', variant: 'success' })
        navigate('/student/subjects')
      } else {
        setError(response.data.message || 'Enrollment failed.')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Enrollment failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          to="/student/subjects"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6 font-medium"
        >
          <ChevronLeft size={20} className="mr-1" />
          Back to My Subjects
        </Link>

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl text-white p-6 mb-6 shadow-md">
          <div className="flex items-center">
            <BookPlus size={32} className="mr-3" />
            <div>
              <h1 className="text-2xl font-bold">Enroll in a Course</h1>
              <p className="text-blue-100 text-sm mt-1">Add a new subject to your enrolled courses</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-md p-10 flex justify-center items-center">
            <Loader className="animate-spin text-blue-600 mr-3" size={24} />
            <span className="text-gray-500">Loading available courses…</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6 space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 flex items-start gap-2">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Course */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                <BookOpen size={16} className="inline mr-1 text-blue-600" />
                Course / Subject
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={courseId}
                onChange={e => setCourseId(e.target.value)}
                required
              >
                <option value="">-- Select a course --</option>
                {courses.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
              {courses.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">No courses found for your program.</p>
              )}
            </div>

            {/* Teacher */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                <Presentation size={16} className="inline mr-1 text-blue-600" />
                Instructor
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={teacherId}
                onChange={e => setTeacherId(e.target.value)}
                required
              >
                <option value="">-- Select an instructor --</option>
                {teachers.map(t => (
                  <option key={t._id} value={t._id}>
                    {t.full_name}{t.department ? ` (${t.department})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Section Code */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                <Users size={16} className="inline mr-1 text-blue-600" />
                Section Code
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. CS3A, BSIT-2B"
                value={sectionCode}
                onChange={e => setSectionCode(e.target.value)}
                required
              />
            </div>

            {/* School Year */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                <CalendarDays size={16} className="inline mr-1 text-blue-600" />
                School Year
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={schoolYear}
                onChange={e => setSchoolYear(e.target.value)}
                required
              >
                {SCHOOL_YEARS.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Semester */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                <Layers size={16} className="inline mr-1 text-blue-600" />
                Semester
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={semester}
                onChange={e => setSemester(e.target.value)}
                required
              >
                {SEMESTERS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              {submitting ? (
                <>
                  <Loader className="animate-spin mr-2" size={18} />
                  Enrolling…
                </>
              ) : (
                <>
                  <BookPlus className="mr-2" size={18} />
                  Enroll Now
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default StudentEnroll
