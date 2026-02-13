import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import AdminNavbar from '../../components/AdminNavbar'
import { TableSkeleton } from '../../components/Skeleton'
import Pagination from '../../components/Pagination'
import { Program } from '../../types'

interface ProgramFormData {
  name: string;
  code: string;
}

interface PaginationData {
  page: number
  limit: number
  totalPages: number
  totalCount: number
  hasMore: boolean
}

const AdminPrograms: React.FC = () => {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [showModal, setShowModal] = useState<boolean>(false)
  const [editingProgram, setEditingProgram] = useState<Program | null>(null)
  const [formData, setFormData] = useState<ProgramFormData>({ name: '', code: '' })
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalCount: 0,
    hasMore: false
  })

  useEffect(() => {
    fetchPrograms()
  }, [pagination.page])

  const fetchPrograms = async (): Promise<void> => {
    try {
      setLoading(true)
      const response = await axios.get('/api/admin/programs', { 
        params: { page: pagination.page, limit: pagination.limit },
        withCredentials: true 
      })
      setPrograms(response.data.programs || [])
      if (response.data.pagination) {
        setPagination(response.data.pagination)
      }
    } catch (error: unknown) {
      console.error('Error fetching programs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    try {
      if (editingProgram) {
        await axios.put(`/api/admin/programs/${editingProgram._id}`, formData, { withCredentials: true })
      } else {
        await axios.post('/api/admin/programs', formData, { withCredentials: true })
      }
      setShowModal(false)
      resetForm()
      fetchPrograms()
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.message || 'Error saving program')
      } else {
        alert('Error saving program')
      }
    }
  }

  const handleEdit = (program: Program): void => {
    setEditingProgram(program)
    setFormData({ name: program.name, code: program.code })
    setShowModal(true)
  }

  const handleDelete = async (id: string): Promise<void> => {
    if (window.confirm('Are you sure you want to delete this program?')) {
      try {
        await axios.delete(`/api/admin/programs/${id}`, { withCredentials: true })
        fetchPrograms()
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          alert(error.response?.data?.message || 'Error deleting program')
        } else {
          alert('Error deleting program')
        }
      }
    }
  }

  const resetForm = () => {
    setFormData({ name: '', code: '' })
    setEditingProgram(null)
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
          <TableSkeleton rows={6} cols={3} />
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
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Programs</h1>
            <p className="text-gray-600">Manage academic programs</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowModal(true) }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center"
          >
            <Plus className="mr-2" size={20} />Add Program
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Program Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {programs.map((program) => (
                <tr key={program._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{program.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{program.code}</td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button onClick={() => handleEdit(program)} className="text-blue-600 hover:text-blue-900">
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => handleDelete(program._id)} className="text-red-600 hover:text-red-900">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold mb-6">{editingProgram ? 'Edit Program' : 'Add New Program'}</h2>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-gray-700 font-semibold mb-2">Program Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-gray-700 font-semibold mb-2">Program Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
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
                    {editingProgram ? 'Update' : 'Create'}
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

export default AdminPrograms
