import React from 'react'

// Base skeleton component
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`}></div>
)

// Card skeleton for subject/course cards
export const CardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
    <div className="h-10 bg-gray-200 rounded w-full"></div>
  </div>
)

// Table row skeleton
export const TableRowSkeleton: React.FC<{ cols?: number }> = ({ cols = 4 }) => (
  <tr className="animate-pulse">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-6 py-4">
        <div className="h-4 bg-gray-200 rounded"></div>
      </td>
    ))}
  </tr>
)

// Stats card skeleton
export const StatsCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
    </div>
    <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
  </div>
)

// Form skeleton
export const FormSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow-md p-6 space-y-6 animate-pulse">
    <div className="space-y-4">
      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      <div className="h-10 bg-gray-200 rounded w-full"></div>
    </div>
    <div className="space-y-4">
      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      <div className="h-10 bg-gray-200 rounded w-full"></div>
    </div>
    <div className="space-y-4">
      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      <div className="h-10 bg-gray-200 rounded w-full"></div>
    </div>
    <div className="h-12 bg-gray-200 rounded w-full"></div>
  </div>
)

// Dashboard skeleton
export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    {/* Stats cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatsCardSkeleton />
      <StatsCardSkeleton />
      <StatsCardSkeleton />
      <StatsCardSkeleton />
    </div>
    
    {/* Charts section */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    </div>
    
    {/* Table section */}
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div className="space-y-3">
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
      </div>
    </div>
  </div>
)

// Evaluation detail skeleton
export const EvaluationDetailSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    {/* Header */}
    <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg p-6">
      <div className="h-8 bg-blue-500 rounded w-1/2 mb-4"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="h-4 bg-blue-500 rounded w-1/3"></div>
          <div className="h-6 bg-blue-500 rounded w-2/3"></div>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-blue-500 rounded w-1/3"></div>
          <div className="h-6 bg-blue-500 rounded w-2/3"></div>
        </div>
      </div>
    </div>

    {/* Rating sections */}
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div className="space-y-3">
        <div className="h-8 bg-gray-200 rounded"></div>
        <div className="h-8 bg-gray-200 rounded"></div>
        <div className="h-8 bg-gray-200 rounded"></div>
        <div className="h-8 bg-gray-200 rounded"></div>
      </div>
    </div>
    
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div className="space-y-3">
        <div className="h-8 bg-gray-200 rounded"></div>
        <div className="h-8 bg-gray-200 rounded"></div>
        <div className="h-8 bg-gray-200 rounded"></div>
      </div>
    </div>
  </div>
)

// Table skeleton with header
export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 4 }) => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-6 py-3">
                <div className="h-4 bg-gray-300 rounded"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

// Subject list skeleton for student view
export const SubjectListSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <CardSkeleton />
    <CardSkeleton />
    <CardSkeleton />
    <CardSkeleton />
    <CardSkeleton />
    <CardSkeleton />
  </div>
)

// Evaluation form skeleton
export const EvaluationFormSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    {/* Header card */}
    <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg p-6">
      <div className="h-8 bg-blue-500 rounded w-1/2 mb-4"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="h-4 bg-blue-500 rounded w-1/3"></div>
          <div className="h-6 bg-blue-500 rounded w-full"></div>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-blue-500 rounded w-1/3"></div>
          <div className="h-6 bg-blue-500 rounded w-full"></div>
        </div>
      </div>
    </div>

    {/* Form sections */}
    {[1, 2, 3].map((section) => (
      <div key={section} className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-blue-600">
          <div className="h-6 bg-blue-500 rounded w-1/3"></div>
        </div>
        <div className="p-6 space-y-6">
          {[1, 2, 3, 4, 5, 6].map((q) => (
            <div key={q} className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="flex gap-3">
                <div className="flex-1 h-20 bg-gray-200 rounded"></div>
                <div className="flex-1 h-20 bg-gray-200 rounded"></div>
                <div className="flex-1 h-20 bg-gray-200 rounded"></div>
                <div className="flex-1 h-20 bg-gray-200 rounded"></div>
                <div className="flex-1 h-20 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
)
