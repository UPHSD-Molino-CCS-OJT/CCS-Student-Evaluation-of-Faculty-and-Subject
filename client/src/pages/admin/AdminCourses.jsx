import { useState, useEffect } from 'react'
import axios from 'axios'
import AdminNavbar from '../../components/AdminNavbar'

const AdminCourses = () => {
  const [courses, setCourses] = useState([])
  const [programs, setPrograms] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)
  const [formData, setFormData] = useState({ name: '', code: '', program_id: '' })

  useEffect(() => {
    fetchCourses()
    fetchPrograms()
  }, [])

  const fetchCourses = async () => {
    try {
      const response = await axios.get('/api/admin/courses', { withCredentials: true })
      setCourses(response.data.courses || [])
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  const fetchPrograms = async () => {
    try {
      const response = await axios.get('/api/admin/programs', { withCredentials: true })
      setPrograms(response.data.programs || [])
    } catch (error) {
      console.error('Error fetching programs:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingCourse) {
        await axios.put(`/api/admin/courses/${editingCourse._id}`, formData, { withCredentials: true })
      } else {
        await axios.post('/api/admin/courses', formData, { withCredentials: true })
      }
      setShowModal(false)
      resetForm()
      fetchCourses()
    } catch (error) {
      alert(error.response?.data?.message || 'Error saving course')
    }
  }

  const handleEdit = (course) => {
    setEditingCourse(course)
    setFormData({ name: course.name, code: course.code, program_id: course.program_id?._id || '' })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      try {
        await axios.delete(`/api/admin/courses/${id}`, { withCredentials: true })
        fetchCourses()
      } catch (error) {
        alert(error.response?.data?.message || 'Error deleting course')
      }
    }
  }

  const resetForm = () => {
    setFormData({ name: '', code: '', program_id: '' })
    setEditingCourse(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Courses</h1>
            <p className="text-gray-600">Manage course offerings</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowModal(true) }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center"
          >
            <i className="fas fa-plus mr-2"></i>Add Course
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Program</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {courses.map((course) => (
                <tr key={course._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{course.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{course.code}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{course.program_id?.name}</td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button onClick={() => handleEdit(course)} className="text-blue-600 hover:text-blue-900">
                      <i className="fas fa-edit"></i>
                    </button>
                    <button onClick={() => handleDelete(course._id)} className="text-red-600 hover:text-red-900">
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold mb-6">{editingCourse ? 'Edit Course' : 'Add New Course'}</h2>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-gray-700 font-semibold mb-2">Course Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 font-semibold mb-2">Course Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-6">
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
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); resetForm() }}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg">
                    {editingCourse ? 'Update' : 'Create'}
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

export default AdminCourses
