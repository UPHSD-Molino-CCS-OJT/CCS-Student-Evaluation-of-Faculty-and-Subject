import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Loader, ArrowLeft, Printer } from 'lucide-react'
import TeacherNavbar from '../../components/TeacherNavbar'

interface QuestionAverages {
  [key: string]: number
}

interface CourseDetailData {
  success: boolean
  course: {
    course_id: string
    course_name: string
    course_code: string
    section_code: string
    school_year: string
    semester: string
    total_students: number
    evaluated_students: number
  }
  teacher: {
    full_name: string
    employee_id: string
  }
  statistics: {
    average_rating: number
    question_averages: QuestionAverages
    remarks: string
  }
  comments: { comment: string; submitted_at: string }[]
}

const CRITERIA: { key: string; label: string }[] = [
  { key: 'teacher_diction',            label: "Clarity's of diction (voice projection)" },
  { key: 'teacher_grammar',            label: 'Use of correct grammar (and appropriate words)' },
  { key: 'teacher_personality',        label: 'Personality (Grooming and attire)' },
  { key: 'teacher_disposition',        label: 'Disposition (Composure and sense of humor)' },
  { key: 'teacher_dynamic',            label: 'Dynamic and interesting in sharing of ideas' },
  { key: 'teacher_fairness',           label: 'Just and fair in dealings with students (No favoritism)' },
  { key: 'learning_motivation',        label: "Motivation (Ability to sustain students' interest)" },
  { key: 'learning_critical_thinking', label: 'Encouragement given to students to develop critical thinking' },
  { key: 'learning_organization',      label: 'Organization of lessons / lectures' },
  { key: 'learning_interest',          label: 'Interest on ensuring that students are learning the lessons' },
  { key: 'learning_explanation',       label: 'The teacher can very well explain words and concepts.' },
  { key: 'learning_clarity',           label: 'Clarity in the Formulation of questions' },
  { key: 'learning_integration',       label: 'Integration of subject matter to life situations' },
  { key: 'learning_mastery',           label: 'Mastery of teaching the subject (not bookish)' },
  { key: 'learning_methodology',       label: 'Teaching methodology is dynamic and interesting' },
  { key: 'learning_values',            label: 'Integration of perpetualite values to the lessons' },
  { key: 'learning_grading',           label: 'Fair and just in giving grades in Exams, assignments and recitations' },
  { key: 'learning_synthesis',         label: 'Ability to synthesize learning activities' },
  { key: 'learning_reasonableness',    label: 'Reasonableness of quizzes and examinations' },
  { key: 'classroom_attendance',       label: "Regularity of checking students' attendance" },
  { key: 'classroom_policies',         label: 'Ability to convey classroom policies to students' },
  { key: 'classroom_discipline',       label: 'Maintenance of classroom discipline' },
  { key: 'classroom_authority',        label: 'Exercise of Reasonable authority in the classroom (hindi nananakot)' },
  { key: 'classroom_prayers',          label: 'Recitation of opening and / or closing prayers' },
  { key: 'classroom_punctuality',      label: 'Punctuality in Starting and Ending of class' },
]

const getRemark = (rating: number): string => {
  if (rating >= 4.5)  return 'OUTSTANDING'
  if (rating >= 4.0)  return 'VERY SATISFACTORY'
  if (rating >= 3.5)  return 'SATISFACTORY'
  if (rating >= 3.0)  return 'FAIRLY SATISFACTORY'
  return 'NEEDS IMPROVEMENT'
}

// Auto-generate action plan from lowest-scoring areas
const generateActionPlan = (qa: QuestionAverages): string[] => {
  if (Object.keys(qa).length === 0) return []

  const sorted = CRITERIA
    .map(c => ({ label: c.label, score: qa[c.key] ?? 0 }))
    .sort((a, b) => a.score - b.score)

  const avg = Object.values(qa).reduce((a, b) => a + b, 0) / Object.values(qa).length

  const plans: string[] = []

  // Check weakest group
  const lowestKey = CRITERIA.reduce((a, b) =>
    (qa[a.key] ?? 0) < (qa[b.key] ?? 0) ? a : b
  ).key

  if (lowestKey.startsWith('learning_methodology') || lowestKey.startsWith('learning_')) {
    plans.push('Enhance Practical Application and Instructional Variety in Learning Activities')
  } else if (lowestKey.startsWith('classroom_')) {
    plans.push('Strengthen Classroom Management and Student Engagement Practices')
  } else {
    plans.push('Improve Communication Clarity and Professional Teaching Delivery')
  }

  if ((qa['learning_values'] ?? 5) < 4.5 || (qa['learning_integration'] ?? 5) < 4.5) {
    plans.push('Deepen Integration of Values and Real-World Application in Lessons')
  } else {
    plans.push('Sustain Excellence in Teaching Delivery and Student Engagement')
  }

  if (avg >= 4.5) {
    plans.push('Maintain Outstanding Performance and Serve as Mentor to Colleagues')
  } else if (avg >= 4.0) {
    plans.push('Pursue Continuous Professional Development to Achieve Outstanding Rating')
  } else {
    plans.push('Participate in Faculty Development Programs and Seek Instructional Coaching')
  }

  // Ensure exactly 3 unique items
  return [...new Set(plans)].slice(0, 3)
}

const EvaluationReport: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState<CourseDetailData | null>(null)
  const [conformeName, setConformeName] = useState('')

  useEffect(() => {
    axios
      .get(`/api/teacher/course/${courseId}`, { withCredentials: true })
      .then(res => {
        if (res.data.success) {
          setData(res.data)
          setConformeName(res.data.teacher.full_name)
        } else {
          setError(res.data.message || 'Failed to load report data')
        }
      })
      .catch(err => {
        setError(axios.isAxiosError(err) ? (err.response?.data?.message ?? 'Failed to load report data') : 'Failed to load report data')
      })
      .finally(() => setLoading(false))
  }, [courseId])

  const handlePrint = () => window.print()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TeacherNavbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <Loader className="mx-auto text-green-600 mb-4 animate-spin" size={48} />
            <p className="text-gray-600">Preparing evaluation report...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TeacherNavbar />
        <div className="container mx-auto px-4 py-12">
          <button onClick={() => navigate(-1)} className="mb-6 flex items-center text-green-600 hover:text-green-700 font-semibold">
            <ArrowLeft size={20} className="mr-2" /> Back
          </button>
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
            <p className="font-semibold">Error</p>
            <p>{error || 'No data available'}</p>
          </div>
        </div>
      </div>
    )
  }

  const { course, teacher, statistics, comments } = data
  const qa = statistics.question_averages
  const actionPlan = generateActionPlan(qa)
  const hasEvals = course.evaluated_students > 0

  return (
    <>
      {/* ── Print-only global styles ─────────────────────────────────── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: white; }
          .report-page {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 18mm 16mm !important;
            width: 210mm !important;
            min-height: 297mm;
          }
          .page-break { page-break-before: always; }
          input { border: none !important; outline: none !important; background: transparent !important; }
        }
        @media screen {
          .report-page {
            background: white;
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 18mm 16mm;
            box-shadow: 0 4px 24px rgba(0,0,0,0.12);
          }
        }
      `}</style>

      {/* ── Screen toolbar (hidden on print) ─────────────────────────── */}
      <div className="no-print bg-gray-50 min-h-screen">
        <TeacherNavbar />
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(`/teacher/course/${courseId}`)}
            className="flex items-center text-green-600 hover:text-green-700 font-semibold"
          >
            <ArrowLeft size={20} className="mr-2" /> Back to Course Detail
          </button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Conforme name:</label>
              <input
                type="text"
                value={conformeName}
                onChange={e => setConformeName(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm w-56"
                placeholder="Enter name for Conforme line"
              />
            </div>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2 rounded-lg shadow transition"
            >
              <Printer size={18} /> Print / Save as PDF
            </button>
          </div>
        </div>

        {/* ── REPORT DOCUMENT ─────────────────────────────────────────── */}
        <div className="pb-16 px-4">
          <div className="report-page">
            {/* ── Document Header ───────────────────────────────────── */}
            <table style={{ width: '100%', marginBottom: '6px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ width: '60%', verticalAlign: 'top', paddingRight: '8px' }}>
                    <div style={{ fontSize: '8pt', fontWeight: 'bold', color: '#7b0000', letterSpacing: '0.5px' }}>
                      UNIVERSITY OF<br />
                      <span style={{ fontSize: '11pt' }}>PERPETUAL HELP</span>
                    </div>
                    <div style={{ fontSize: '7.5pt', fontWeight: 'bold', letterSpacing: '0.3px' }}>
                      SYSTEM DALTA - MOLINO CAMPUS
                    </div>
                    <div style={{ fontSize: '6.5pt', color: '#333', marginTop: '2px', lineHeight: '1.4' }}>
                      Salawag-Zapote Road, Molino 3, City of Bacoor, 4102 Philippines<br />
                      www.perpetualdalta.edu.ph; (046) 477-0602; (02) 8584-4377
                    </div>
                  </td>
                  <td style={{ width: '40%', verticalAlign: 'top', textAlign: 'right' }}>
                    <div style={{ fontSize: '7pt', fontWeight: 'bold', letterSpacing: '0.5px', lineHeight: '1.4' }}>
                      C E R T I F I E D<br />
                      ISO 9001<br />
                      ISO 21001
                    </div>
                    <div style={{ fontSize: '8pt', fontWeight: 'bold', marginTop: '4px' }}>
                      College of Computer<br />Studies
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <hr style={{ borderTop: '1.5px solid #333', margin: '4px 0 8px' }} />

            {/* ── Meta info row ──────────────────────────────────────── */}
            <table style={{ width: '100%', marginBottom: '10px', fontSize: '9pt', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ width: '30%' }}>
                    <span style={{ fontWeight: 'bold' }}>NAME : </span>
                  </td>
                  <td style={{ width: '35%', textAlign: 'center' }}>
                    <span style={{ fontWeight: 'bold' }}>PERIOD : </span>
                    {course.semester.toUpperCase().replace('SEMESTER', 'SEM')} {course.school_year}
                  </td>
                  <td style={{ width: '35%', textAlign: 'right' }}>
                    <span style={{ fontWeight: 'bold' }}>SUBJECT/S : </span>
                    {course.course_code}
                  </td>
                </tr>
                <tr>
                  <td />
                  <td />
                  <td style={{ textAlign: 'right', fontSize: '8.5pt' }}>
                    <span style={{ fontWeight: 'bold' }}>EVALUATORS : </span>
                    {course.evaluated_students} STUDENTS
                  </td>
                </tr>
              </tbody>
            </table>

            {/* ── Section title ─────────────────────────────────────── */}
            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '11pt', marginBottom: '8px', letterSpacing: '1px' }}>
              STUDENT EVALUATION
            </div>

            {/* ── Evaluation table ──────────────────────────────────── */}
            {!hasEvals ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#666', fontSize: '10pt' }}>
                No evaluations have been submitted for this course yet.
              </div>
            ) : (
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '8.5pt',
                border: '1px solid #333'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f0f0f0' }}>
                    <th style={{ border: '1px solid #333', padding: '5px 7px', textAlign: 'left', width: '58%', fontWeight: 'bold' }}>
                      CRITERIA
                    </th>
                    <th style={{ border: '1px solid #333', padding: '5px 7px', textAlign: 'center', width: '14%', fontWeight: 'bold', lineHeight: '1.3' }}>
                      QUESTION AVERAGE
                    </th>
                    <th style={{ border: '1px solid #333', padding: '5px 7px', textAlign: 'center', width: '28%', fontWeight: 'bold' }}>
                      REMARK
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {CRITERIA.map((c, idx) => {
                    const score = qa[c.key] ?? 0
                    const remark = getRemark(score)
                    return (
                      <tr key={c.key} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ border: '1px solid #ddd', padding: '4px 7px' }}>{c.label}</td>
                        <td style={{ border: '1px solid #ddd', padding: '4px 7px', textAlign: 'center', fontWeight: 'bold' }}>
                          {score.toFixed(2)}
                        </td>
                        <td style={{ border: '1px solid #ddd', padding: '4px 7px', textAlign: 'center' }}>
                          {remark}
                        </td>
                      </tr>
                    )
                  })}
                  {/* Average row */}
                  <tr style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>
                    <td style={{ border: '1px solid #333', padding: '5px 7px' }}>AVERAGE</td>
                    <td style={{ border: '1px solid #333', padding: '5px 7px', textAlign: 'center' }}>
                      {statistics.average_rating.toFixed(2)}
                    </td>
                    <td style={{ border: '1px solid #333', padding: '5px 7px', textAlign: 'center' }}>
                      {getRemark(statistics.average_rating)}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}

            {/* ── Page 2: Comments + Action Plan ────────────────────── */}
            <div className="page-break" />

            {/* Comments */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt', border: '1px solid #333', marginTop: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f0f0f0' }}>
                  <th style={{ border: '1px solid #333', padding: '5px 7px', textAlign: 'left', fontWeight: 'bold' }}>
                    COMMENTS
                  </th>
                </tr>
              </thead>
              <tbody>
                {comments.length === 0 ? (
                  <tr>
                    <td style={{ border: '1px solid #ddd', padding: '5px 7px', color: '#888', fontStyle: 'italic' }}>
                      No comments submitted.
                    </td>
                  </tr>
                ) : (
                  comments.map((c, i) => (
                    <tr key={i}>
                      <td style={{ border: '1px solid #ddd', padding: '4px 7px' }}>{c.comment}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Action Plan */}
            {hasEvals && actionPlan.length > 0 && (
              <div style={{ marginTop: '24px', fontSize: '9pt' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Teachers Action Plan :</div>
                <ol style={{ paddingLeft: '20px', lineHeight: '1.8', margin: 0 }}>
                  {actionPlan.map((item, i) => (
                    <li key={i} style={{ marginBottom: '4px' }}>{item}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Conforme / Sign / Date */}
            <div style={{ marginTop: '36px', fontSize: '9pt' }}>
              <div style={{ marginBottom: '6px' }}>
                <span style={{ fontWeight: 'bold' }}>Conforme : </span>
              </div>
              <div style={{ marginTop: '28px' }}>
                <span style={{ fontWeight: 'bold' }}>Sign / Date </span>
                <span style={{ display: 'inline-block', width: '200px', borderBottom: '1px solid #333', marginLeft: '8px', verticalAlign: 'bottom' }} />
              </div>
              <div style={{ marginTop: '6px', fontSize: '8.5pt', paddingLeft: '72px' }}>
                {conformeName}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default EvaluationReport
