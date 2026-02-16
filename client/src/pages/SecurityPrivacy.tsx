import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Lock, Database, Eye, Clock, FileCheck, Server, Key, ArrowLeft } from 'lucide-react'

const SecurityPrivacy: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="text-blue-600" size={32} />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Security & Privacy</h1>
                <p className="text-gray-600 mt-2">
                  Technical overview of security measures implemented in this evaluation system
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
            >
              <ArrowLeft size={20} />
              <span className="hidden sm:inline">Back</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Introduction */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Overview</h2>
          <p className="text-gray-700 leading-relaxed">
            This document describes the security and privacy measures implemented in the CCS Student 
            Evaluation System. These measures are designed to protect user data, ensure evaluation 
            integrity, and maintain appropriate confidentiality of student feedback.
          </p>
        </div>

        {/* Authentication & Access Control */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Key className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-800">Authentication & Access Control</h2>
          </div>
          <div className="space-y-3 text-gray-700">
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <h3 className="font-semibold text-gray-800 mb-1">Role-Based Access</h3>
              <p className="text-sm">
                Three distinct authentication systems (Admin, Student, Teacher) with separate session 
                management. Each role has access only to functions appropriate to their responsibilities.
              </p>
            </div>
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <h3 className="font-semibold text-gray-800 mb-1">Password Security</h3>
              <p className="text-sm">
                Administrative passwords are hashed using bcrypt with automatic salt generation. 
                Student and teacher authentication uses institutional identifiers without stored passwords.
              </p>
            </div>
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <h3 className="font-semibold text-gray-800 mb-1">Session Management</h3>
              <p className="text-sm">
                Server-side sessions with MongoDB persistence. Sessions expire after 24 hours and use 
                HTTP-only cookies to prevent client-side script access. Session secrets are environment-configured.
              </p>
            </div>
          </div>
        </div>

        {/* Data Encryption */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="text-green-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-800">Data Encryption</h2>
          </div>
          <div className="space-y-3 text-gray-700">
            <div className="border-l-4 border-green-500 pl-4 py-2">
              <h3 className="font-semibold text-gray-800 mb-1">Encryption at Rest</h3>
              <p className="text-sm">
                Sensitive fields (student numbers, employee IDs, names, emails, comments) are encrypted 
                using AES-256-GCM with authenticated encryption. Each record uses a unique Data Encryption 
                Key (DEK) which is itself encrypted with a master Key Encryption Key (KEK).
              </p>
            </div>
            <div className="border-l-4 border-green-500 pl-4 py-2">
              <h3 className="font-semibold text-gray-800 mb-1">Encryption in Transit</h3>
              <p className="text-sm">
                All data transmission between client and server uses HTTPS in production environments. 
                API communications include credentials set to withCredentials: true for proper session handling.
              </p>
            </div>
            <div className="border-l-4 border-green-500 pl-4 py-2">
              <h3 className="font-semibold text-gray-800 mb-1">Key Management</h3>
              <p className="text-sm">
                Encryption keys are stored in environment variables, separate from the application code 
                and database. The master key is a 256-bit (64 hexadecimal character) key required for 
                decryption operations.
              </p>
            </div>
          </div>
        </div>

        {/* Evaluation Anonymization */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Eye className="text-purple-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-800">Evaluation Anonymization</h2>
          </div>
          <div className="space-y-3 text-gray-700">
            <div className="border-l-4 border-purple-500 pl-4 py-2">
              <h3 className="font-semibold text-gray-800 mb-1">Identity Separation</h3>
              <p className="text-sm">
                Evaluation records do not store direct references to student identity. Each submission 
                receives a cryptographically generated anonymous token using SHA-512 hashing with multiple 
                entropy sources, making it computationally infeasible to reverse-engineer the source.
              </p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4 py-2">
              <h3 className="font-semibold text-gray-800 mb-1">IP Address Anonymization</h3>
              <p className="text-sm">
                When evaluation submissions include IP addresses, the last octet (IPv4) or last 80 bits 
                (IPv6) are removed before storage, preventing precise identification while maintaining 
                general location data for fraud detection.
              </p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4 py-2">
              <h3 className="font-semibold text-gray-800 mb-1">Timestamp Obfuscation</h3>
              <p className="text-sm">
                Submission timestamps are rounded to 15-minute intervals to prevent correlation attacks 
                based on precise timing patterns. This reduces the ability to identify evaluators through 
                timing analysis while maintaining sufficient data for temporal analytics.
              </p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4 py-2">
              <h3 className="font-semibold text-gray-800 mb-1">Comment Sanitization</h3>
              <p className="text-sm">
                Submitted comments are processed to remove potential identifying information including 
                student numbers, email patterns, phone numbers, and social media handles before storage.
              </p>
            </div>
          </div>
        </div>

        {/* Input Validation & Security */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <FileCheck className="text-orange-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-800">Input Validation & Security</h2>
          </div>
          <div className="space-y-3 text-gray-700">
            <div className="border-l-4 border-orange-500 pl-4 py-2">
              <h3 className="font-semibold text-gray-800 mb-1">Data Validation</h3>
              <p className="text-sm">
                All evaluation submissions undergo validation checks for required fields, rating ranges 
                (1-5 scale), comment length constraints (20-500 characters when provided), and data type verification.
              </p>
            </div>
            <div className="border-l-4 border-orange-500 pl-4 py-2">
              <h3 className="font-semibold text-gray-800 mb-1">Enrollment Verification</h3>
              <p className="text-sm">
                The system verifies that students can only evaluate courses in which they are enrolled 
                and prevents duplicate evaluations. Each enrollment can be evaluated exactly once per 
                evaluation period.
              </p>
            </div>
            <div className="border-l-4 border-orange-500 pl-4 py-2">
              <h3 className="font-semibold text-gray-800 mb-1">SQL Injection Prevention</h3>
              <p className="text-sm">
                Using Mongoose ORM with parameterized queries provides protection against SQL injection 
                attacks. All database operations use the ORM's built-in sanitization mechanisms.
              </p>
            </div>
          </div>
        </div>

        {/* Timing Attack Prevention */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="text-indigo-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-800">Timing Attack Prevention</h2>
          </div>
          <div className="space-y-3 text-gray-700">
            <div className="border-l-4 border-indigo-500 pl-4 py-2">
              <h3 className="font-semibold text-gray-800 mb-1">Random Submission Delays</h3>
              <p className="text-sm">
                A random delay (2-8 seconds) is introduced during evaluation submission to prevent 
                timing-based correlation attacks. This makes it more difficult to identify patterns 
                based on submission response times.
              </p>
            </div>
            <div className="border-l-4 border-indigo-500 pl-4 py-2">
              <h3 className="font-semibold text-gray-800 mb-1">Session Data Clearing</h3>
              <p className="text-sm">
                Sensitive session data is cleared after evaluation submission, reducing the window of 
                potential exposure if session storage is compromised.
              </p>
            </div>
          </div>
        </div>

        {/* Database Security */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="text-teal-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-800">Database Security</h2>
          </div>
          <div className="space-y-3 text-gray-700">
            <div className="border-l-4 border-teal-500 pl-4 py-2">
              <h3 className="font-semibold text-gray-800 mb-1">Credential Management</h3>
              <p className="text-sm">
                Database credentials are stored in environment variables, never in source code. 
                Connection strings use authentication and are configured per environment.
              </p>
            </div>
            <div className="border-l-4 border-teal-500 pl-4 py-2">
              <h3 className="font-semibold text-gray-800 mb-1">Field-Level Separation</h3>
              <p className="text-sm">
                Sensitive fields (anonymous tokens, IP addresses) are excluded from standard queries 
                and API responses to minimize exposure even if unauthorized access occurs at the 
                application layer.
              </p>
            </div>
            <div className="border-l-4 border-teal-500 pl-4 py-2">
              <h3 className="font-semibold text-gray-800 mb-1">Data Minimization</h3>
              <p className="text-sm">
                Only necessary data is collected and retained. Pagination limits prevent bulk data 
                extraction, and API responses include only fields required for the specific function.
              </p>
            </div>
          </div>
        </div>

        {/* System Administration */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Server className="text-gray-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-800">System Administration</h2>
          </div>
          <div className="space-y-3 text-gray-700">
            <div className="border-l-4 border-gray-500 pl-4 py-2">
              <h3 className="font-semibold text-gray-800 mb-1">Evaluation Period Control</h3>
              <p className="text-sm">
                Administrators control when evaluations are open through the evaluation period management 
                system. Students can only submit evaluations during active periods, preventing unauthorized 
                or retroactive submissions.
              </p>
            </div>
            <div className="border-l-4 border-gray-500 pl-4 py-2">
              <h3 className="font-semibold text-gray-800 mb-1">Audit Capabilities</h3>
              <p className="text-sm">
                System includes privacy audit functionality to verify compliance with data protection 
                measures. Administrators can run compliance checks to identify potential configuration issues.
              </p>
            </div>
            <div className="border-l-4 border-gray-500 pl-4 py-2">
              <h3 className="font-semibold text-gray-800 mb-1">Error Handling</h3>
              <p className="text-sm">
                Error messages are sanitized to avoid leaking sensitive system information. Generic error 
                messages are shown to users while detailed logs are available to administrators through 
                server logs.
              </p>
            </div>
          </div>
        </div>

        {/* Limitations */}
        <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span>⚠️</span>
            <span>Known Limitations</span>
          </h2>
          <div className="space-y-2 text-gray-700">
            <p className="text-sm">
              <strong>Metadata Analysis:</strong> While direct identification is prevented through technical 
              measures, indirect identification may be possible through analysis of metadata patterns, writing 
              style analysis, or correlation with external data sources.
            </p>
            <p className="text-sm">
              <strong>Administrative Access:</strong> System administrators with database and server access 
              can potentially decrypt data if they have access to both the database and encryption keys. 
              This is an inherent limitation of server-side encryption.
            </p>
            <p className="text-sm">
              <strong>Small Sample Sizes:</strong> In courses with very few students, even anonymized data 
              may allow identification through process of elimination. The system does not currently 
              implement statistical thresholds for minimum group sizes.
            </p>
            <p className="text-sm">
              <strong>Client-Side Security:</strong> Security measures assume the client environment 
              (student's device) is not compromised. Keyloggers, network monitoring, or device-level 
              surveillance are outside the system's control.
            </p>
          </div>
        </div>

        {/* Best Practices */}
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Recommended Practices</h2>
          <div className="space-y-2 text-gray-700">
            <div className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <p className="text-sm">
                <strong>Students:</strong> Avoid including identifying information in comments. Focus on 
                constructive, course-related feedback rather than personal details.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <p className="text-sm">
                <strong>Teachers:</strong> View evaluation results as aggregate feedback. Avoid attempting 
                to identify individual students based on comments or response patterns.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <p className="text-sm">
                <strong>Administrators:</strong> Maintain separation of duties. Regular administrators 
                should not have direct database access. Implement key rotation policies for encryption keys.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 rounded-lg p-6 text-center text-sm text-gray-600">
          <p>
            This document provides a technical overview of security implementations. For questions about 
            specific security concerns or to report potential security issues, please contact the system 
            administrator.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Last Updated: February 2026
          </p>
        </div>

      </div>
    </div>
  )
}

export default SecurityPrivacy
