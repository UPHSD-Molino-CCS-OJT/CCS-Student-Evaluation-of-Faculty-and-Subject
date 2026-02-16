import React, { useState } from 'react'
import axios from 'axios'
import AdminNavbar from '../../components/AdminNavbar'
import { DetailedAuditResults } from '../../types'
import { CheckCircle, AlertTriangle, Shield, Loader, PlayCircle, Lightbulb, ArrowRight, ClipboardCheck } from 'lucide-react'
import { useModal } from '../../components/ModalContext'

const AdminPrivacyAudit: React.FC = () => {
  const [auditResults, setAuditResults] = useState<DetailedAuditResults | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const { showAlert } = useModal()

  const runAudit = async (): Promise<void> => {
    setLoading(true)
    try {
      const response = await axios.post('/api/admin/privacy-audit/run', {}, { withCredentials: true })
      setAuditResults(response.data.results)
    } catch (error: unknown) {
      console.error('Error running audit:', error)
      showAlert('Error running privacy audit. Please try again.', {
        title: 'Audit Error',
        variant: 'danger'
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (passed: boolean): JSX.Element => {
    return passed ? (
      <CheckCircle size={24} className="text-green-600" />
    ) : (
      <AlertTriangle size={24} className="text-red-600" />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Privacy Audit</h1>
          <p className="text-gray-600">Run comprehensive privacy compliance checks</p>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="font-bold text-lg text-blue-800 mb-3 flex items-center">
            <Shield size={20} className="mr-2" />
            12-Layer Privacy Protection System
          </h2>
          <p className="text-blue-700 mb-4">
            This system implements comprehensive privacy protection measures including:
          </p>
          <ul className="text-sm text-blue-700 space-y-1 ml-6">
            <li>✓ Cryptographic anonymization (SHA-512)</li>
            <li>✓ Temporal decorrelation (random delays)</li>
            <li>✓ Network privacy (IP anonymization)</li>
            <li>✓ Cryptographic receipt model (no reversible links)</li>
            <li>✓ Differential privacy in statistics</li>
            <li>✓ K-anonymity thresholds</li>
            <li>✓ Session security</li>
            <li>✓ Data minimization</li>
            <li>✓ Audit logging</li>
            <li>✓ Field-level encryption (AES-256-GCM)</li>
            <li>✓ Stylometric protection (writing style sanitization)</li>
            <li>✓ Compliance with FERPA and GDPR principles</li>
          </ul>
        </div>

        {/* Run Audit Button */}
        <div className="mb-8">
          <button
            onClick={runAudit}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold flex items-center text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader size={24} className="mr-3 animate-spin" />
                Running Audit...
              </>
            ) : (
              <>
                <PlayCircle size={24} className="mr-3" />
                Run Privacy Audit
              </>
            )}
          </button>
        </div>

        {/* Audit Results */}
        {auditResults && (
          <div className="space-y-6">
            {/* Summary Card */}
            <div className={`rounded-lg shadow-lg p-8 ${
              auditResults.overall_compliance ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Audit Summary</h2>
                {auditResults.overall_compliance ? (
                  <Shield size={48} className="text-green-600" />
                ) : (
                  <AlertTriangle size={48} className="text-red-600" />
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Total Checks</p>
                  <p className="text-3xl font-bold text-gray-800">{auditResults.total_checks}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm mb-1">Passed</p>
                  <p className="text-3xl font-bold text-green-600">{auditResults.passed_checks}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm mb-1">Failed</p>
                  <p className="text-3xl font-bold text-red-600">{auditResults.failed_checks}</p>
                </div>
              </div>
              <div className="text-lg font-semibold">
                {auditResults.overall_compliance ? (
                  <span className="text-green-700">✓ System is privacy compliant</span>
                ) : (
                  <span className="text-red-700">⚠ Privacy issues detected</span>
                )}
              </div>
            </div>

            {/* Detailed Results */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-6">Detailed Results</h3>
              <div className="space-y-4">
                {auditResults.checks && auditResults.checks.map((check, index) => (
                  <div key={index} className="border-l-4 border-gray-200 pl-4 py-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          {getStatusIcon(check.passed)}
                          <h4 className="font-semibold text-gray-800 ml-3">{check.name}</h4>
                        </div>
                        <p className="text-gray-600 text-sm ml-11">{check.description}</p>
                        {check.details && (
                          <p className="text-gray-500 text-xs ml-11 mt-1">{check.details}</p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        check.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {check.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            {auditResults.recommendations && auditResults.recommendations.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <Lightbulb size={24} className="text-yellow-600 mr-2" />
                  Recommendations
                </h3>
                <ul className="space-y-2">
                  {auditResults.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start text-gray-700">
                      <ArrowRight size={16} className="text-yellow-600 mt-1 mr-2 flex-shrink-0" />
                      <span>{rec.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Timestamp */}
            <div className="text-center text-sm text-gray-500">
              Audit completed at: {new Date(auditResults.timestamp).toLocaleString()}
            </div>
          </div>
        )}

        {/* Placeholder when no results */}
        {!auditResults && !loading && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <ClipboardCheck size={72} className="text-gray-300 mb-4 mx-auto" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Audit Results</h3>
            <p className="text-gray-500">Click "Run Privacy Audit" to start a comprehensive privacy check</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminPrivacyAudit
