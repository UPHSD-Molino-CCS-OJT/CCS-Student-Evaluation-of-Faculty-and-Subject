import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { BookPlus, ChevronLeft, Presentation, BookOpen, Users, CalendarDays, Layers, AlertCircle, Loader, CheckCircle2, ChevronRight } from 'lucide-react'
import Navbar from '../../components/Navbar'
import { useModal } from '../../components/ModalContext'

interface SectionItem {
  _id: string
  section_code: string
  school_year: string
  semester: string
  teacher: { _id: string; full_name: string; department?: string }
}

interface CourseGroup {
  course: { _id: string; name: string; code: string }
  sections: SectionItem[]
}

const StudentEnroll: React.FC = () => {
  const [courseGroups, setCourseGroups] = useState<CourseGroup[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  // Step 1: selected course group; Step 2: selected section
  const [selectedCourse, setSelectedCourse] = useState<CourseGroup | null>(null)
  const [selectedSection, setSelectedSection] = useState<SectionItem | null>(null)

  const navigate = useNavigate()
  const { showAlert } = useModal()

  useEffect(() => { fetchAvailable() }, [])

  // Auto-select single section when course is chosen
  useEffect(() => {
    if (selectedCourse) {
      if (selectedCourse.sections.length === 1) {
        setSelectedSection(selectedCourse.sections[0])
      } else {
        setSelectedSection(null)
      }
    }
  }, [selectedCourse])

  const fetchAvailable = async (): Promise<void> => {
    try {
      const response = await axios.get('/api/student/subjects/available', { withCredentials: true })
      if (!response.data.success) {
        navigate('/student/login')
        return
      }
      setCourseGroups(response.data.courseGroups || [])
    } catch {
      setError('Failed to load available courses. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleEnroll = async (): Promise<void> => {
    if (!selectedSection) return
    try {
      setSubmitting(true)
      setError('')
      const response = await axios.post(
        '/api/student/subjects/enroll',
        { section_id: selectedSection._id },
        { withCredentials: true }
      )
      if (response.data.success) {
        await showAlert('You have successfully enrolled!', { title: 'Enrollment Successful', variant: 'success' })
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
        <Link to="/student/subjects" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6 font-medium">
          <ChevronLeft size={20} className="mr-1" />
          Back to My Subjects
        </Link>

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl text-white p-6 mb-6 shadow-md">
          <div className="flex items-center">
            <BookPlus size={32} className="mr-3" />
            <div>
              <h1 className="text-2xl font-bold">Enroll in a Course</h1>
              <p className="text-blue-100 text-sm mt-1">Select a course, then pick your section</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 flex items-start gap-2 mb-4">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl shadow-md p-10 flex justify-center items-center">
            <Loader className="animate-spin text-blue-600 mr-3" size={24} />
            <span className="text-gray-500">Loading available courses&hellip;</span>
          </div>
        ) : courseGroups.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-10 text-center text-gray-500">
            No course sections are available for enrollment at this time.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Step 1: Course selection */}
            <div className="bg-white rounded-xl shadow-md p-5">
              <h2 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <BookOpen size={18} className="text-blue-600" /> Step 1 &mdash; Select a Course
              </h2>
              <div className="space-y-2">
                {courseGroups.map(group => (
                  <button
                    key={group.course._id}
                    onClick={() => setSelectedCourse(group)}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors flex items-center justify-between ${
                      selectedCourse?.course._id === group.course._id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <span>
                      <span className="font-semibold text-gray-800">{group.course.code}</span>
                      <span className="text-gray-500 ml-2 text-sm">{group.course.name}</span>
                    </span>
                    <span className="text-xs text-gray-400 shrink-0 ml-2">
                      {group.sections.length} section{group.sections.length !== 1 ? 's' : ''}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Section selection */}
            {selectedCourse && (
              <div className="bg-white rounded-xl shadow-md p-5">
                <h2 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Users size={18} className="text-blue-600" /> Step 2 &mdash; Select Your Section
                </h2>
                {selectedCourse.sections.length === 1 ? (
                  <p className="text-sm text-gray-500 mb-3">Only one section is available &mdash; selected automatically.</p>
                ) : (
                  <p className="text-sm text-gray-500 mb-3">Multiple sections available &mdash; choose the one you belong to.</p>
                )}
                <div className="space-y-2">
                  {selectedCourse.sections.map(section => (
                    <button
                      key={section._id}
                      onClick={() => setSelectedSection(section)}
                      className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                        selectedSection?._id === section._id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-gray-800">{section.section_code}</span>
                        {selectedSection?._id === section._id && (
                          <CheckCircle2 size={18} className="text-blue-500" />
                        )}
                      </div>
                      <div className="mt-1 grid grid-cols-2 gap-x-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Presentation size={12} /> {section.teacher.full_name}</span>
                        <span className="flex items-center gap-1"><CalendarDays size={12} /> {section.school_year}</span>
                        <span className="flex items-center gap-1 col-span-2"><Layers size={12} /> {section.semester}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Confirmation panel */}
            {selectedSection && (
              <div className="bg-white rounded-xl shadow-md p-5">
                <h2 className="font-semibold text-gray-700 mb-3">Enrollment Summary</h2>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-5">
                  <dt className="text-gray-500">Course</dt>
                  <dd className="font-semibold">{selectedCourse!.course.code} &mdash; {selectedCourse!.course.name}</dd>
                  <dt className="text-gray-500">Section</dt>
                  <dd className="font-mono font-bold">{selectedSection.section_code}</dd>
                  <dt className="text-gray-500">Instructor</dt>
                  <dd>{selectedSection.teacher.full_name}</dd>
                  <dt className="text-gray-500">School Year</dt>
                  <dd>{selectedSection.school_year}</dd>
                  <dt className="text-gray-500">Semester</dt>
                  <dd>{selectedSection.semester}</dd>
                </dl>
                <button
                  onClick={handleEnroll}
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center"
                >
                  {submitting ? (
                    <><Loader className="animate-spin mr-2" size={18} /> Enrolling&hellip;</>
                  ) : (
                    <><BookPlus className="mr-2" size={18} /> Confirm Enrollment <ChevronRight size={16} className="ml-1" /></>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default StudentEnroll
