import React, { useState, useEffect } from 'react'
import axios from 'axios'
import AdminNavbar from '../../components/AdminNavbar'
import Pagination from '../../components/Pagination'
import { TableSkeleton } from '../../components/Skeleton'
import { EvaluationPeriod } from '../../types'
import { Plus, Pencil, Trash2, Calendar, CheckCircle, XCircle, AlertCircle, Power } from 'lucide-react'

interface PaginationData {
  page: number
  limit: number
  totalPages: number
  totalCount: number
  hasMore: boolean
}

const AdminEvaluationPeriods: React.FC = () => {
  const [periods, setPeriods] = useState<EvaluationPeriod[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [showModal, setShowModal] = useState<boolean>(false)
  const [editingPeriod, setEditingPeriod] = useState<EvaluationPeriod | null>(null)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalCount: 0,
    hasMore: false
  })

  const [formData, setFormData] = useState({
    academic_year: '',
    semester: '1st Semester' as '1st Semester' | '2nd Semester' | 'Summer',
    is_active: false,
    start_date: '',
    end_date: '',
    description: ''
  })

  useEffect(() => {
    fetchPeriods()
  }, [pagination.page])

  const fetchPeriods = async (): Promise<void> => {
    setLoading(true)
    try {
      const response = await axios.get('/api/admin/evaluation-periods', {
        params: {
          page: pagination.page,
          limit: pagination.limit
        },
        withCredentials: true
      })

      if (response.data.success) {
        setPeriods(response.data.periods)
        setPagination(response.data.pagination)
      }
    } catch (err) {
      console.error('Error fetching periods:', err)
      setError('Failed to load evaluation periods')
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (newPage: number): void => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const openModal = (period: EvaluationPeriod | null = null): void => {
    if (period) {
      setEditingPeriod(period)
      setFormData({
        academic_year: period.academic_year,
        semester: period.semester,
        is_active: period.is_active,
        start_date: new Date(period.start_date).toISOString().split('T')[0],
        end_date: new Date(period.end_date).toISOString().split('T')[0],
        description: period.description || ''
      })
    } else {
      setEditingPeriod(null)
      setFormData({
        academic_year: '',
        semester: '1st Semester',
        is_active: false,
        start_date: '',
        end_date: '',
        description: ''
      })
    }
    setShowModal(true)
    setError('')
    setSuccess('')
  }

  const closeModal = (): void => {
    setShowModal(false)
    setEditingPeriod(null)
    setError('')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validate dates
    const startDate = new Date(formData.start_date)
    const endDate = new Date(formData.end_date)

    if (startDate >= endDate) {
      setError('End date must be after start date')
      return
    }

    try {
      if (editingPeriod) {
        // Update existing period
        const response = await axios.put(
          `/api/admin/evaluation-periods/${editingPeriod._id}`,
          formData,
          { withCredentials: true }
        )

        if (response.data.success) {
          setSuccess('Evaluation period updated successfully')
          fetchPeriods()
          setTimeout(() => {
            closeModal()
            setSuccess('')
          }, 1500)
        }
      } else {
        // Create new period
        const response = await axios.post(
          '/api/admin/evaluation-periods',
          formData,
          { withCredentials: true }
        )

        if (response.data.success) {
          setSuccess('Evaluation period created successfully')
          fetchPeriods()
          setTimeout(() => {
            closeModal()
            setSuccess('')
          }, 1500)
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed')
    }
  }

  const handleDelete = async (id: string): Promise<void> => {
    if (!window.confirm('Are you sure you want to delete this evaluation period? This action cannot be undone.')) {
      return
    }

    try {
      const response = await axios.delete(`/api/admin/evaluation-periods/${id}`, {
        withCredentials: true
      })

      if (response.data.success) {
        setSuccess('Evaluation period deleted successfully')
        fetchPeriods()
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete evaluation period')
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleToggleActive = async (id: string): Promise<void> => {
    try {
      const response = await axios.patch(
        `/api/admin/evaluation-periods/${id}/toggle`,
        {},
        { withCredentials: true }
      )

      if (response.data.success) {
        setSuccess(response.data.message)
        fetchPeriods()
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to toggle period status')
      setTimeout(() => setError(''), 3000)
    }
  }

  const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const isPeriodActive = (period: EvaluationPeriod): boolean => {
    const now = new Date()
    const start = new Date(period.start_date)
    const end = new Date(period.end_date)
    return period.is_active && now >= start && now <= end
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Evaluation Periods</h1>
              <p className="text-gray-600">Manage when students can submit evaluations</p>
            </div>
            <button
              onClick={() => openModal()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors duration-200 flex items-center space-x-2 shadow-md"
            >
              <Plus size={20} />
              <span>New Period</span>
            </button>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4 flex items-center">
              <CheckCircle size={20} className="mr-2" />
              {success}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4 flex items-center">
              <AlertCircle size={20} className="mr-2" />
              {error}
            </div>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <TableSkeleton />
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Academic Year
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Semester
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Period
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {periods.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                          <Calendar size={48} className="mx-auto mb-4 text-gray-400" />
                          <p className="text-lg font-semibold mb-2">No evaluation periods found</p>
                          <p className="text-sm">Create your first evaluation period to get started</p>
                        </td>
                      </tr>
                    ) : (
                      periods.map((period) => (
                        <tr key={period._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{period.academic_year}</div>
                            {period.description && (
                              <div className="text-xs text-gray-500">{period.description}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900">{period.semester}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatDate(period.start_date)}</div>
                            <div className="text-xs text-gray-500">to {formatDate(period.end_date)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              {isPeriodActive(period) ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle size={14} className="mr-1" />
                                  Active
                                </span>
                              ) : period.is_active ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  <AlertCircle size={14} className="mr-1" />
                                  Scheduled
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  <XCircle size={14} className="mr-1" />
                                  Inactive
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleToggleActive(period._id)}
                                className={`${
                                  period.is_active
                                    ? 'text-yellow-600 hover:text-yellow-900'
                                    : 'text-green-600 hover:text-green-900'
                                } transition-colors`}
                                title={period.is_active ? 'Deactivate' : 'Activate'}
                              >
                                <Power size={18} />
                              </button>
                              <button
                                onClick={() => openModal(period)}
                                className="text-blue-600 hover:text-blue-900 transition-colors"
                                title="Edit"
                              >
                                <Pencil size={18} />
                              </button>
                              <button
                                onClick={() => handleDelete(period._id)}
                                className="text-red-600 hover:text-red-900 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                  totalCount={pagination.totalCount}
                  limit={pagination.limit}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                {editingPeriod ? 'Edit Evaluation Period' : 'Create Evaluation Period'}
              </h2>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4 flex items-center">
                  <AlertCircle size={20} className="mr-2" />
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4 flex items-center">
                  <CheckCircle size={20} className="mr-2" />
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  {/* Academic Year */}
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">
                      Academic Year <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="academic_year"
                      value={formData.academic_year}
                      onChange={handleInputChange}
                      placeholder="e.g., 2023-2024"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Semester */}
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">
                      Semester <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="semester"
                      value={formData.semester}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="1st Semester">1st Semester</option>
                      <option value="2nd Semester">2nd Semester</option>
                      <option value="Summer">Summer</option>
                    </select>
                  </div>

                  {/* Date Range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 font-semibold mb-2">
                        Start Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="start_date"
                        value={formData.start_date}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-semibold mb-2">
                        End Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="end_date"
                        value={formData.end_date}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Optional description..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Active Status */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label className="ml-2 text-gray-700 font-semibold">
                      Activate this period immediately
                    </label>
                  </div>
                  <p className="text-sm text-gray-600 ml-6">
                    Note: Only one period can be active at a time. Activating this period will deactivate others.
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    {editingPeriod ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminEvaluationPeriods
