import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import AdminNavbar from '../../components/AdminNavbar'
import { TableSkeleton } from '../../components/Skeleton'
import Pagination from '../../components/Pagination'
import { useModal } from '../../components/ModalContext'

interface SectionCourse { _id: string; name: string; code: string; program_id?: { name: string } }
interface SectionTeacher { _id: string; full_name: string; department?: string }

interface Section {
  _id: string
  course_id: SectionCourse
  teacher_id: SectionTeacher
  section_code: string
  school_year: string
  semester: string
  is_active: boolean
}

interface FormData {
  course_id: string
  teacher_id: string
  section_code: string
  school_year: string
  semester: string
  is_active: boolean
}

interface PaginationData {
  page: number; limit: number; totalPages: number; totalCount: number; hasMore: boolean
}

const SEMESTERS = ['1st Semester', '2nd Semester', 'Summer']
const currentYear = new Date().getFullYear()
const SCHOOL_YEARS = Array.from({ length: 6 }, (_, i) => {
  const y = currentYear - 1 + i
  return `${y}-${y + 1}`
})

const EMPTY_FORM: FormData = {
  course_id: '', teacher_id: '', section_code: '', school_year: SCHOOL_YEARS[1], semester: SEMESTERS[0], is_active: true
}

const AdminSections: React.FC = () => {
  const [sections, setSections] = useState<Section[]>([])
  const [courses, setCourses] = useState<SectionCourse[]>([])
  const [teachers, setTeachers] = useState<SectionTeacher[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [showModal, setShowModal] = useState<boolean>(false)
  const [editing, setEditing] = useState<Section | null>(null)
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM)
  const [pagination, setPagination] = useState<PaginationData>({ page: 1, limit: 15, totalPages: 1, totalCount: 0, hasMore: false })
  const { showAlert, showConfirm } = useModal()

  useEffect(() => { fetchSections() }, [pagination.page])
  useEffect(() => { fetchFormData() }, [])

  const fetchSections = async () => {
    try {
      setLoading(true)
      const res = await axios.get('/api/admin/sections', { params: { page: pagination.page, limit: pagination.limit }, withCredentials: true })
      setSections(res.data.sections || [])
      if (res.data.pagination) setPagination(res.data.pagination)
    } catch { /* empty */ } finally { setLoading(false) }
  }

  const fetchFormData = async () => {
    try {
      const res = await axios.get('/api/admin/sections/form-data', { withCredentials: true })
      setCourses(res.data.courses || [])
      setTeachers(res.data.teachers || [])
    } catch { /* empty */ }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editing) {
        await axios.put(`/api/admin/sections/${editing._id}`, formData, { withCredentials: true })
      } else {
        await axios.post('/api/admin/sections', formData, { withCredentials: true })
      }
      setShowModal(false)
      setEditing(null)
      setFormData(EMPTY_FORM)
      fetchSections()
    } catch (err: any) {
      showAlert(err.response?.data?.message || 'Error saving section', { title: 'Error', variant: 'danger' })
    }
  }

  const handleEdit = (s: Section) => {
    setEditing(s)
    setFormData({
      course_id: s.course_id._id,
      teacher_id: s.teacher_id._id,
      section_code: s.section_code,
      school_year: s.school_year,
      semester: s.semester,
      is_active: s.is_active
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    const ok = await showConfirm('Delete this section? Enrolled students will keep their enrollment records.', { title: 'Delete Section', variant: 'danger', confirmText: 'Delete' })
    if (!ok) return
    try {
      await axios.delete(`/api/admin/sections/${id}`, { withCredentials: true })
      fetchSections()
    } catch (err: any) {
      showAlert(err.response?.data?.message || 'Error deleting section', { title: 'Error', variant: 'danger' })
    }
  }

  const handleToggleActive = async (s: Section) => {
    try {
      await axios.put(`/api/admin/sections/${s._id}`, {
        course_id: s.course_id._id, teacher_id: s.teacher_id._id,
        section_code: s.section_code, school_year: s.school_year,
        semester: s.semester, is_active: !s.is_active
      }, { withCredentials: true })
      fetchSections()
    } catch { /* empty */ }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <div className="container mx-auto px-4 py-8">
        <TableSkeleton rows={8} cols={6} />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-1">Course Sections</h1>
            <p className="text-gray-500 text-sm">Pre-configure sections for student enrollment</p>
          </div>
          <button
            onClick={() => { setEditing(null); setFormData(EMPTY_FORM); setShowModal(true) }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center"
          >
            <Plus className="mr-2" size={20} /> Add Section
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Course</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Section</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Instructor</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">School Year</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Semester</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Active</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sections.map(s => (
                <tr key={s._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{s.course_id.code}</p>
                    <p className="text-gray-500 text-xs">{s.course_id.name}</p>
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-gray-800">{s.section_code}</td>
                  <td className="px-4 py-3 text-gray-700">{s.teacher_id.full_name}</td>
                  <td className="px-4 py-3 text-gray-700">{s.school_year}</td>
                  <td className="px-4 py-3 text-gray-700">{s.semester}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggleActive(s)} title="Toggle active">
                      {s.is_active
                        ? <ToggleRight size={24} className="text-green-500" />
                        : <ToggleLeft size={24} className="text-gray-400" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    <button onClick={() => handleEdit(s)} className="text-blue-600 hover:text-blue-900"><Pencil size={17} /></button>
                    <button onClick={() => handleDelete(s._id)} className="text-red-600 hover:text-red-900"><Trash2 size={17} /></button>
                  </td>
                </tr>
              ))}
              {sections.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">No sections yet. Click "Add Section" to create one.</td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalCount={pagination.totalCount}
            limit={pagination.limit}
            onPageChange={p => setPagination(prev => ({ ...prev, page: p }))}
          />
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-gray-800">{editing ? 'Edit Section' : 'Add Section'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  value={formData.course_id}
                  onChange={e => setFormData(p => ({ ...p, course_id: e.target.value }))}
                  required
                >
                  <option value="">-- Select course --</option>
                  {courses.map(c => <option key={c._id} value={c._id}>{c.code} — {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instructor</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  value={formData.teacher_id}
                  onChange={e => setFormData(p => ({ ...p, teacher_id: e.target.value }))}
                  required
                >
                  <option value="">-- Select instructor --</option>
                  {teachers.map(t => <option key={t._id} value={t._id}>{t.full_name}{t.department ? ` (${t.department})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section Code</label>
                <input
                  type="text" placeholder="e.g. BSCS-3A"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  value={formData.section_code}
                  onChange={e => setFormData(p => ({ ...p, section_code: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">School Year</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    value={formData.school_year}
                    onChange={e => setFormData(p => ({ ...p, school_year: e.target.value }))}
                  >
                    {SCHOOL_YEARS.map(y => <option key={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    value={formData.semester}
                    onChange={e => setFormData(p => ({ ...p, semester: e.target.value }))}
                  >
                    {SEMESTERS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox" id="is_active"
                  checked={formData.is_active}
                  onChange={e => setFormData(p => ({ ...p, is_active: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Active (visible to students)</label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminSections
