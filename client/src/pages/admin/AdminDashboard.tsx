import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import AdminNavbar from '../../components/AdminNavbar'
import { DashboardSkeleton } from '../../components/Skeleton'
import { TopTeacher, PopulatedEvaluation } from '../../types'

interface DashboardStats {
  totalEvaluations: number;
  totalTeachers: number;
  totalPrograms: number;
  averageRatings: {
    teacher: number;
    learning: number;
    classroom: number;
    overall: number;
  };
}

interface StatCardProps {
  icon: string;
  title: string;
  value: number;
  color: string;
}

interface RatingCardProps {
  title: string;
  value: number;
  icon: string;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalEvaluations: 0,
    totalTeachers: 0,
    totalPrograms: 0,
    averageRatings: {
      teacher: 0,
      learning: 0,
      classroom: 0,
      overall: 0
    }
  })
  const [topTeachers, setTopTeachers] = useState<TopTeacher[]>([])
  const [recentEvaluations, setRecentEvaluations] = useState<PopulatedEvaluation[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [privacyNotice, setPrivacyNotice] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async (): Promise<void> => {
    try {
      const response = await axios.get('/api/admin/dashboard', { withCredentials: true })
      const data = response.data

      setStats({
        totalEvaluations: data.totalEvaluations,
        totalTeachers: data.totalTeachers,
        totalPrograms: data.totalPrograms,
        averageRatings: data.averageRatings
      })
      setTopTeachers(data.topTeachers || [])
      setRecentEvaluations(data.recentEvaluations || [])
      setPrivacyNotice(data.privacyNotice || null)
    } catch (error: unknown) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const StatCard: React.FC<StatCardProps> = ({ icon, title, value, color }) => (
    <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
        <div className={`text-4xl ${color.replace('border-', 'text-')}`}>
          <i className={icon}></i>
        </div>
      </div>
    </div>
  )

  const RatingCard: React.FC<RatingCardProps> = ({ title, value, icon }) => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-gray-700 font-semibold">{title}</h3>
        <i className={`${icon} text-blue-600`}></i>
      </div>
      <div className="flex items-end">
        <span className="text-3xl font-bold text-gray-800">{(value || 0).toFixed(2)}</span>
        <span className="text-gray-500 ml-2 mb-1">/5.0</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
        <div
          className={`h-2 rounded-full ${
            value >= 4 ? 'bg-green-500' : value >= 3 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${(value / 5) * 100}%` }}
        ></div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <DashboardSkeleton />
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
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
          <p className="text-gray-600">Overview of evaluation statistics and recent activity</p>
        </div>

        {/* K-Anonymity Privacy Notice */}
        {privacyNotice && (
          <div className="mb-8 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg shadow-md">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <i className="fas fa-shield-alt text-yellow-600 text-2xl"></i>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-yellow-800">
                  Privacy Protection Active
                </h3>
                <p className="text-yellow-700 mt-1">
                  {privacyNotice}
                </p>
                <p className="text-sm text-yellow-600 mt-2">
                  This ensures individual student responses cannot be identified. Statistics will display once sufficient data is available.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            icon="fas fa-file-alt"
            title="Total Evaluations"
            value={stats.totalEvaluations}
            color="border-blue-500"
          />
          <StatCard
            icon="fas fa-chalkboard-teacher"
            title="Active Teachers"
            value={stats.totalTeachers}
            color="border-green-500"
          />
          <StatCard
            icon="fas fa-book"
            title="Programs"
            value={stats.totalPrograms}
            color="border-purple-500"
          />
        </div>

        {/* Average Ratings */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Average Ratings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <RatingCard
              title="Teacher"
              value={stats.averageRatings.teacher}
              icon="fas fa-user-tie"
            />
            <RatingCard
              title="Learning Process"
              value={stats.averageRatings.learning}
              icon="fas fa-book-reader"
            />
            <RatingCard
              title="Classroom Mgmt"
              value={stats.averageRatings.classroom}
              icon="fas fa-door-open"
            />
            <RatingCard
              title="Overall Average"
              value={stats.averageRatings.overall}
              icon="fas fa-star"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Teachers */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <i className="fas fa-trophy text-yellow-500 mr-2"></i>
              Top Performing Teachers
            </h2>
            {topTeachers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No data available</p>
            ) : (
              <div className="space-y-4">
                {topTeachers.map((teacher, index) => (
                  <div key={teacher._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{teacher.full_name}</p>
                        <p className="text-sm text-gray-500">{teacher.evaluation_count} evaluations</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-blue-600">{(teacher.average_rating || 0).toFixed(2)}</p>
                      <p className="text-xs text-gray-500">avg rating</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Evaluations */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <i className="fas fa-clock text-blue-600 mr-2"></i>
                Recent Evaluations
              </h2>
              <Link
                to="/admin/evaluations"
                className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
              >
                View All →
              </Link>
            </div>
            {recentEvaluations.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No evaluations yet</p>
            ) : (
              <div className="space-y-3">
                {recentEvaluations.map((evaluation) => (
                  <Link
                    key={evaluation._id}
                    to={`/admin/evaluations/${evaluation._id}`}
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-gray-800">{evaluation.teacher?.full_name}</p>
                      <span className="text-xs text-gray-500">
                        {evaluation.createdAt && new Date(evaluation.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{evaluation.course?.name}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
