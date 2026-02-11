import React, { useState, useEffect } from 'react'
import axios from 'axios'
import AdminNavbar from '../../components/AdminNavbar'
import { Student, Program } from '../../types'

interface StudentFormData {
  student_number: string;
  full_name: string;
  email: string;
  program_id: string;
  year_level: string;
  school_year: string;
  semester: string;
  status: string;
}

interface PopulatedStudent extends Omit<Student, 'program_id'> {
  program_id?: Program;
  email?: string;
}

const AdminStudents: React.FC = () => {
  const [students, setStudents] = useState<PopulatedStudent[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [showModal, setShowModal] = useState<boolean>(false)
  const [editingStudent, setEditingStudent] = useState<PopulatedStudent | null>(null)
  const [formData, setFormData] = useState<StudentFormData>({
    student_number: '',
    full_name: '',
    email: '',
    program_id: '',
    year_level: '',
    school_year: '',
    semester: '',
    status: 'Regular'
  })

  useEffect(() => {
    fetchStudents()
    fetchPrograms()
  }, [])

  const fetchStudents = async (): Promise<void> => {
    try {
      const response = await axios.get('/api/admin/students', { withCredentials: true })
      setStudents(response.data.students || [])
    } catch (error: unknown) {
      console.error('Error fetching students:', error)
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
      full_name: student.full_name,
      email: student.email || '',
      program_id: student.program_id?._id || '',
      year_level: student.year_level,
      school_year: student.school_year,
      semester: student.semester,
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
      full_name: '',
      email: '',
      program_id: '',
      year_level: '',
      school_year: '',
      semester: '',
      status: 'Regular'
    })
    setEditingStudent(null)
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Program</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.student_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.full_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{student.program_id?.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.year_level}</td>
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
                    <label className="block text-gray-700 font-semibold mb-2">Full Name *</label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 font-semibold mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 font-semibold mb-2">School Year *</label>
                    <input
                      type="text"
                      value={formData.school_year}
                      onChange={(e) => setFormData({...formData, school_year: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="2023-2024"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 font-semibold mb-2">Semester *</label>
                    <select
                      value={formData.semester}
                      onChange={(e) => setFormData({...formData, semester: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Semester</option>
                      <option value="1st Semester">1st Semester</option>
                      <option value="2nd Semester">2nd Semester</option>
                      <option value="Summer">Summer</option>
                    </select>
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
