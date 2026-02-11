import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import AdminNavbar from '../../components/AdminNavbar'
import { TableSkeleton } from '../../components/Skeleton'
import { PopulatedEvaluation } from '../../types'

const AdminEvaluations: React.FC = () => {
  const [evaluations, setEvaluations] = useState<PopulatedEvaluation[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    fetchEvaluations()
  }, [])

  const fetchEvaluations = async (): Promise<void> => {
    try {
      const response = await axios.get('/api/admin/evaluations', { withCredentials: true })
      setEvaluations(response.data.evaluations || [])
    } catch (error: unknown) {
      console.error('Error fetching evaluations:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <TableSkeleton rows={10} cols={6} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Evaluations</h1>
          <p className="text-gray-600">View all submitted faculty evaluations</p>
        </div>

        {/* Evaluations Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teacher
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Program
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Overall Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {evaluations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <i className="fas fa-inbox text-5xl text-gray-300 mb-4 block"></i>
                      No evaluations submitted yet
                    </td>
                  </tr>
                ) : (
                  evaluations.map((evaluation) => {
                    const overallRating = evaluation.overall_average || 0
                    const ratingColor = overallRating >= 4 ? 'text-green-600' : overallRating >= 3 ? 'text-yellow-600' : 'text-red-600'
                    
                    return (
                      <tr key={evaluation._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {evaluation.createdAt && new Date(evaluation.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {evaluation.teacher?.full_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {evaluation.course?.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {evaluation.program?.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-lg font-bold ${ratingColor}`}>
                            {overallRating.toFixed(2)}
                          </span>
                          <span className="text-sm text-gray-500">/5.0</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Link
                            to={`/admin/evaluations/${evaluation._id}`}
                            className="text-blue-600 hover:text-blue-900 font-semibold"
                          >
                            <i className="fas fa-eye mr-1"></i>
                            View Details
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminEvaluations
