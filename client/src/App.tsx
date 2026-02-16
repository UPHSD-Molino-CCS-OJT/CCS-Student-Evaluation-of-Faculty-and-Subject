import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import StudentLogin from './pages/student/StudentLogin'
import StudentSubjects from './pages/student/StudentSubjects'
import StudentEvaluate from './pages/student/StudentEvaluate'
import StaffLogin from './pages/staff/StaffLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminEvaluations from './pages/admin/AdminEvaluations'
import AdminEvaluationDetail from './pages/admin/AdminEvaluationDetail'
import AdminTeachers from './pages/admin/AdminTeachers'
import AdminPrograms from './pages/admin/AdminPrograms'
import AdminCourses from './pages/admin/AdminCourses'
import AdminStudents from './pages/admin/AdminStudents'
import AdminPrivacyAudit from './pages/admin/AdminPrivacyAudit'
import AdminEvaluationPeriods from './pages/admin/AdminEvaluationPeriods'
import TeacherDashboard from './pages/teacher/TeacherDashboard'
import TeacherCourseDetail from './pages/teacher/TeacherCourseDetail'
import SecurityPrivacy from './pages/SecurityPrivacy'
import Unauthorized from './pages/Unauthorized'
import ProtectedRoute from './components/ProtectedRoute'
import StudentProtectedRoute from './components/StudentProtectedRoute'
import TeacherProtectedRoute from './components/TeacherProtectedRoute'
import { ModalProvider } from './components/ModalContext'

const App: React.FC = () => {
  return (
    <ModalProvider>
      <Router>
        <Routes>
          {/* Redirect root to student login */}
          <Route path="/" element={<Navigate to="/student/login" replace />} />
        
        {/* Public Pages */}
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/security-privacy" element={<SecurityPrivacy />} />
        
        {/* Staff Login (Unified for Admin & Teacher) */}
        <Route path="/staff/login" element={<StaffLogin />} />
        
        {/* Redirect old login pages to unified staff login */}
        <Route path="/admin/login" element={<Navigate to="/staff/login" replace />} />
        <Route path="/teacher/login" element={<Navigate to="/staff/login" replace />} />
        
        {/* Student Routes */}
        <Route path="/student/login" element={<StudentLogin />} />
        <Route 
          path="/student/subjects" 
          element={
            <StudentProtectedRoute>
              <StudentSubjects />
            </StudentProtectedRoute>
          } 
        />
        <Route 
          path="/student/evaluate/:enrollmentId" 
          element={
            <StudentProtectedRoute>
              <StudentEvaluate />
            </StudentProtectedRoute>
          } 
        />
        
        {/* Teacher Routes */}
        <Route 
          path="/teacher/dashboard" 
          element={
            <TeacherProtectedRoute>
              <TeacherDashboard />
            </TeacherProtectedRoute>
          } 
        />
        <Route 
          path="/teacher/course/:courseId" 
          element={
            <TeacherProtectedRoute>
              <TeacherCourseDetail />
            </TeacherProtectedRoute>
          } 
        />
        
        {/* Admin Routes */}
        <Route 
          path="/admin/dashboard" 
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/evaluations" 
          element={
            <ProtectedRoute>
              <AdminEvaluations />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/evaluations/:id" 
          element={
            <ProtectedRoute>
              <AdminEvaluationDetail />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/teachers" 
          element={
            <ProtectedRoute>
              <AdminTeachers />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/programs" 
          element={
            <ProtectedRoute>
              <AdminPrograms />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/courses" 
          element={
            <ProtectedRoute>
              <AdminCourses />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/students" 
          element={
            <ProtectedRoute>
              <AdminStudents />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/privacy-audit" 
          element={
            <ProtectedRoute>
              <AdminPrivacyAudit />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/evaluation-periods" 
          element={
            <ProtectedRoute>
              <AdminEvaluationPeriods />
            </ProtectedRoute>
          } 
        />
      </Routes>
      </Router>
    </ModalProvider>
  )
}

export default App
