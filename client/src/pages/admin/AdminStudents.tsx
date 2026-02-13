import React, { useState, useEffect } from 'react'
import axios from 'axios'
import AdminNavbar from '../../components/AdminNavbar'
import { TableSkeleton } from '../../components/Skeleton'
import Pagination from '../../components/Pagination'
import { Student, Program } from '../../types'

interface StudentFormData {
  student_number: string;
  program_id: string;
  year_level: string;
  section?: string;
  status: string;
}

interface PopulatedStudent extends Omit<Student, 'program_id'> {
  program_id?: Program;
}

interface PaginationData {
  page: number
  limit: number
  totalPages: number
  totalCount: number
  hasMore: boolean
}

const AdminStudents: React.FC = () => {
  const [students, setStudents] = useState<PopulatedStudent[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [showModal, setShowModal] = useState<boolean>(false)
  const [editingStudent, setEditingStudent] = useState<PopulatedStudent | null>(null)
  const [formData, setFormData] = useState<StudentFormData>({
    student_number: '',
    program_id: '',
    year_level: '',
    section: '',
    status: 'Regular'
  })
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalCount: 0,
    hasMore: false
  })

  useEffect(() => {
    fetchStudents()
    fetchPrograms()
  }, [pagination.page])

  const fetchStudents = async (): Promise<void> => {
    try {
      setLoading(true)
      const response = await axios.get('/api/admin/students', { 
        params: { page: pagination.page, limit: pagination.limit },
        withCredentials: true 
      })
      setStudents(response.data.students || [])
      if (response.data.pagination) {
        setPagination(response.data.pagination)
      }
    } catch (error: unknown) {
      console.error('Error fetching students:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPrograms = async (): Promise<void> => {
    try {
      const response = await axios.get('/api/admin/programs', { withCredentials: true })
      setPrograms(response.data.programs || [])
    } catch (error: unknown) {
      console.error('Error fetching programs:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    try {
      if (editingStudent) {
        await axios.put(`/api/admin/students/${editingStudent._id}`, formData, { withCredentials: true })
      } else {
        await axios.post('/api/admin/students', formData, { withCredentials: true })
      }
      setShowModal(false)
      resetForm()
      fetchStudents()
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.message || 'Error saving student')
      } else {
        alert('Error saving student')
      }
    }
  }

  const handleEdit = (student: PopulatedStudent): void => {
    setEditingStudent(student)
    setFormData({
      student_number: student.student_number,
      program_id: student.program_id?._id || '',
      year_level: student.year_level,
      section: student.section || '',
      status: student.status
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string): Promise<void> => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await axios.delete(`/api/admin/students/${id}`, { withCredentials: true })
        fetchStudents()
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          alert(error.response?.data?.message || 'Error deleting student')
        } else {
          alert('Error deleting student')
        }
      }
    }
  }

  const resetForm = () => {
    setFormData({
      student_number: '',
      program_id: '',
      year_level: '',
      section: '',
      status: 'Regular'
    })
    setEditingStudent(null)
  }

  const handlePageChange = (page: number): void => {
    setPagination(prev => ({ ...prev, page }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
          <TableSkeleton rows={10} cols={8} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Students</h1>
            <p className="text-gray-600">Manage student records</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowModal(true) }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center"
          >
            <i className="fas fa-plus mr-2"></i>Add Student
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Program</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Section</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.student_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{student.program_id?.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.year_level}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.section || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button onClick={() => handleEdit(student)} className="text-blue-600 hover:text-blue-900">
                        <i className="fas fa-edit"></i>
                      </button>
                      <button onClick={() => handleDelete(student._id)} className="text-red-600 hover:text-red-900">
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalCount={pagination.totalCount}
            limit={pagination.limit}
            onPageChange={handlePageChange}
          />
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-auto">
            <div className="bg-white rounded-lg shadow-2xl p-8 max-w-2xl w-full mx-4 my-8">
              <h2 className="text-2xl font-bold mb-6">{editingStudent ? 'Edit Student' : 'Add New Student'}</h2>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="mb-4">
                    <label className="block text-gray-700 font-semibold mb-2">Student Number *</label>
                    <input
                      type="text"
                      value={formData.student_number}
                      onChange={(e) => setFormData({...formData, student_number: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="00-0000-000"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 font-semibold mb-2">Program *</label>
                    <select
                      value={formData.program_id}
                      onChange={(e) => setFormData({...formData, program_id: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Program</option>
                      {programs.map(program => (
                        <option key={program._id} value={program._id}>{program.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 font-semibold mb-2">Year Level *</label>
                    <select
                      value={formData.year_level}
                      onChange={(e) => setFormData({...formData, year_level: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Year</option>
                      <option value="1st">1st Year</option>
                      <option value="2nd">2nd Year</option>
                      <option value="3rd">3rd Year</option>
                      <option value="4th">4th Year</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 font-semibold mb-2">Section</label>
                    <input
                      type="text"
                      value={formData.section}
                      onChange={(e) => setFormData({...formData, section: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., CS-3A"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 font-semibold mb-2">Status *</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="Regular">Regular</option>
                      <option value="Irregular">Irregular</option>
                    </select>
                  </div>
                </div>
                <div className="flex space-x-4 mt-6">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); resetForm() }}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg">
                    {editingStudent ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminStudents
