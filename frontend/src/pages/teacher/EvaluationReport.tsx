import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import JSZip from 'jszip'
import { Loader, ArrowLeft, Printer, FileText, Upload, X } from 'lucide-react'
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

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Auto-generate action plan from lowest-scoring areas
const generateActionPlan = (qa: QuestionAverages): string[] => {
  if (Object.keys(qa).length === 0) return []

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

// ─────────────────────────────────────────────────────────────────────────────
// OOXML → HTML converter
// ─────────────────────────────────────────────────────────────────────────────
function wa(el: Element, localAttr: string): string {
  return (
    el.getAttributeNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', localAttr) ||
    el.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', localAttr) ||
    el.getAttribute(`w:${localAttr}`) ||
    el.getAttribute(`r:${localAttr}`) ||
    el.getAttribute(localAttr) ||
    ''
  )
}

function processChildren(parent: Element, imageMap: Record<string, string>): string {
  return Array.from(parent.children).map(c => convertNode(c, imageMap)).join('')
}

function convertNode(node: Element, imageMap: Record<string, string>): string {
  const n = node.localName
  if (n === 'tbl') {
    const rows = Array.from(node.children).filter(c => c.localName === 'tr').map(tr => {
      const cells = Array.from(tr.children).filter(c => c.localName === 'tc').map(tc => {
        let wStyle = ''
        const tcPr = Array.from(tc.children).find(c => c.localName === 'tcPr')
        if (tcPr) {
          const tcW = Array.from(tcPr.children).find(c => c.localName === 'tcW')
          if (tcW) { const v = wa(tcW,'w'); const t = wa(tcW,'type'); if (v && t==='pct') wStyle=`width:${(parseInt(v)/5000*100).toFixed(1)}%;` }
        }
        return `<td style="vertical-align:top;padding:0 3px;${wStyle}">${processChildren(tc, imageMap)}</td>`
      }).join('')
      return `<tr>${cells}</tr>`
    }).join('')
    return `<table style="width:100%;border-collapse:collapse;table-layout:fixed">${rows}</table>`
  }
  if (n === 'p') {
    let align = 'left'
    const pPr = Array.from(node.children).find(c => c.localName === 'pPr')
    if (pPr) {
      const jc = Array.from(pPr.children).find(c => c.localName === 'jc')
      if (jc) { const v = wa(jc,'val'); if (v==='center') align='center'; else if (v==='right') align='right'; else if (v==='both'||v==='distribute') align='justify' }
    }
    const inner = processChildren(node, imageMap)
    return `<p style="margin:0;line-height:1.35;text-align:${align}">${inner||'&nbsp;'}</p>`
  }
  if (n === 'r') {
    let bold=false, italic=false, color='', fontSize=''
    const rPr = Array.from(node.children).find(c => c.localName === 'rPr')
    if (rPr) {
      bold   = Array.from(rPr.children).some(c => c.localName==='b')
      italic = Array.from(rPr.children).some(c => c.localName==='i')
      const ce = Array.from(rPr.children).find(c => c.localName==='color')
      if (ce) { const v=wa(ce,'val'); if (v&&v!=='auto') color=`color:#${v};` }
      const se = Array.from(rPr.children).find(c => c.localName==='sz'||c.localName==='szCs')
      if (se) { const v=wa(se,'val'); if (v) fontSize=`font-size:${parseInt(v)/2}pt;` }
    }
    const styles=`${color}${fontSize}${bold?'font-weight:bold;':''}${italic?'font-style:italic;':''}`
    const content = Array.from(node.children).map(c => convertNode(c, imageMap)).join('')
    if (!content) return ''
    return styles ? `<span style="${styles}">${content}</span>` : content
  }
  if (n === 't')   return escapeHtml(node.textContent || '')
  if (n === 'br')  return '<br/>'
  if (n === 'tab') return '&nbsp;&nbsp;&nbsp;&nbsp;'
  if (n === 'drawing') return processDrawing(node, imageMap)
  if (n === 'pict')    return processPict(node, imageMap)
  if (n === 'hyperlink') return processChildren(node, imageMap)
  return processChildren(node, imageMap)
}

// 1 inch = 914400 EMU = 96 CSS-px (at 96 dpi)
const EMU_PX = 96 / 914400

function processDrawing(node: Element, imageMap: Record<string, string>): string {
  const allEls = node.getElementsByTagName('*')
  let rId = ''
  let cx = 0, cy = 0
  let posHOff = 0, posVOff = 0
  let isAnchor = false

  for (let i = 0; i < allEls.length; i++) {
    const el = allEls[i]
    const ln = el.localName
    if (ln === 'anchor') isAnchor = true
    if (ln === 'extent') {
      cx = parseInt(el.getAttribute('cx') || '0', 10) || 0
      cy = parseInt(el.getAttribute('cy') || '0', 10) || 0
    }
    if (ln === 'posOffset') {
      const parent = el.parentElement?.localName
      const val = parseInt(el.textContent || '0', 10) || 0
      if (parent === 'positionH') posHOff = val
      if (parent === 'positionV') posVOff = val
    }
    if (ln === 'blip') {
      rId =
        el.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed') ||
        el.getAttribute('r:embed') ||
        ''
    }
  }

  if (!rId || !imageMap[rId]) return ''

  const w = cx ? Math.round(cx * EMU_PX) : 0
  const h = cy ? Math.round(cy * EMU_PX) : 0
  const sizeStyle = w && h ? `width:${w}px;height:${h}px;` : w ? `width:${w}px;` : h ? `height:${h}px;` : 'max-width:100%;'

  if (isAnchor && (posHOff || posVOff)) {
    const left = Math.round(posHOff * EMU_PX)
    const top  = Math.round(posVOff * EMU_PX)
    return `<img src="${imageMap[rId]}" style="position:absolute;left:${left}px;top:${top}px;${sizeStyle}"/>`
  }

  return `<img src="${imageMap[rId]}" style="${sizeStyle}display:inline-block;vertical-align:middle"/>`
}

function processPict(node: Element, imageMap: Record<string, string>): string {
  const allEls = node.getElementsByTagName('*')
  // VML shape carries size/position in its style attribute
  let shapeStyle = ''
  let shapeLeft = '', shapeTop = '', shapePos = ''
  for (let i = 0; i < allEls.length; i++) {
    if (allEls[i].localName === 'shape' || allEls[i].localName === 'rect') {
      shapeStyle = allEls[i].getAttribute('style') || ''
      const mPos  = shapeStyle.match(/position\s*:\s*([^;]+)/i)
      const mLeft = shapeStyle.match(/left\s*:\s*([^;]+)/i)
      const mTop  = shapeStyle.match(/top\s*:\s*([^;]+)/i)
      if (mPos)  shapePos  = mPos[1].trim()
      if (mLeft) shapeLeft = mLeft[1].trim()
      if (mTop)  shapeTop  = mTop[1].trim()
    }
  }
  for (let i = 0; i < allEls.length; i++) {
    if (allEls[i].localName === 'imagedata') {
      const rId =
        allEls[i].getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') ||
        allEls[i].getAttribute('r:id') ||
        ''
      if (rId && imageMap[rId]) {
        // Extract width / height from VML shape style (values may be in pt, cm, in, px)
        const mW = shapeStyle.match(/width\s*:\s*([^;]+)/i)
        const mH = shapeStyle.match(/height\s*:\s*([^;]+)/i)
        const wVal = mW ? mW[1].trim() : ''
        const hVal = mH ? mH[1].trim() : ''
        const sizeStyle = (wVal || hVal)
          ? `${wVal ? `width:${wVal};` : ''}${hVal ? `height:${hVal};` : ''}`
          : 'max-width:100%;'
        const posStyle =
          shapePos === 'absolute' && (shapeLeft || shapeTop)
            ? `position:absolute;${shapeLeft ? `left:${shapeLeft};` : ''}${shapeTop ? `top:${shapeTop};` : ''}`
            : 'display:inline-block;vertical-align:middle;'
        return `<img src="${imageMap[rId]}" style="${posStyle}${sizeStyle}"/>`
      }
    }
  }
  return ''
}

const IMAGE_EXTS = ['png','jpg','jpeg','gif','bmp','webp','svg','emf','wmf']
const MIME: Record<string,string> = { png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',bmp:'image/bmp',webp:'image/webp',svg:'image/svg+xml',emf:'image/x-emf',wmf:'image/x-wmf' }

// 1 twip = 1/1440 inch; rounded to 1 decimal mm
const TWIP_MM = 25.4 / 1440
const twipToMm = (v: number) => Math.round(v * TWIP_MM * 10) / 10

function readWVal(el: Element, attr: string): number {
  const WNS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
  const raw =
    el.getAttributeNS(WNS, attr) ||
    el.getAttribute(`w:${attr}`) ||
    el.getAttribute(attr) ||
    '0'
  return parseInt(raw, 10) || 0
}

interface DocxPageLayout {
  pageWidthMm:   number
  pageHeightMm:  number
  marginTopMm:   number
  marginRightMm: number
  marginBottomMm:number
  marginLeftMm:  number
}

async function parseDocxTemplate(file: File): Promise<{ headerHtml: string; footerHtml: string } & DocxPageLayout> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer())

  // Extract media as base64 data URLs
  const mediaDataUrls: Record<string,string> = {}
  await Promise.all(
    Object.keys(zip.files)
      .filter(p => p.startsWith('word/media/') && !zip.files[p].dir)
      .map(async path => {
        const ext = (path.split('.').pop()||'').toLowerCase()
        if (!IMAGE_EXTS.includes(ext)) return
        const data = await zip.files[path].async('base64')
        mediaDataUrls[path.split('/').pop()!] = `data:${MIME[ext]??'application/octet-stream'};base64,${data}`
      })
  )

  async function parseRels(relsPath: string): Promise<Record<string,string>> {
    const rf = zip.file(relsPath); if (!rf) return {}
    const doc = new DOMParser().parseFromString(await rf.async('text'), 'text/xml')
    const map: Record<string,string> = {}
    Array.from(doc.getElementsByTagName('Relationship')).forEach(r => {
      const id = r.getAttribute('Id')||''; const fn = (r.getAttribute('Target')||'').split('/').pop()||''
      if (id && fn && mediaDataUrls[fn]) map[id] = mediaDataUrls[fn]
    })
    return map
  }

  async function partToHtml(xmlPath: string, relsPath: string): Promise<string> {
    const xf = zip.file(xmlPath); if (!xf) return ''
    const imageMap = await parseRels(relsPath)
    const doc = new DOMParser().parseFromString(await xf.async('text'), 'application/xml')
    return processChildren(doc.documentElement, imageMap)
  }

  const docRelsFile = zip.file('word/_rels/document.xml.rels')
  let headerHtml = '', footerHtml = ''
  const HTYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/header'
  const FTYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer'

  if (docRelsFile) {
    const rels = Array.from(new DOMParser().parseFromString(await docRelsFile.async('text'),'text/xml').getElementsByTagName('Relationship'))
    const pick = (arr: Element[]) => arr.find(r=>r.getAttribute('Id')==='rId1') ?? arr[0]
    const hRels = rels.filter(r=>r.getAttribute('Type')===HTYPE)
    const fRels = rels.filter(r=>r.getAttribute('Type')===FTYPE)
    if (hRels.length) { const t=pick(hRels).getAttribute('Target')||''; const p=t.startsWith('word/')?t:`word/${t}`; const fn=p.split('/').pop()!; headerHtml=await partToHtml(p,`word/_rels/${fn}.rels`) }
    if (fRels.length) { const t=pick(fRels).getAttribute('Target')||''; const p=t.startsWith('word/')?t:`word/${t}`; const fn=p.split('/').pop()!; footerHtml=await partToHtml(p,`word/_rels/${fn}.rels`) }
  }
  if (!headerHtml) {
    const p = Object.keys(zip.files).filter(p=>/^word\/header\d+\.xml$/i.test(p)).sort()[0]
    if (p) { const fn=p.split('/').pop()!; headerHtml=await partToHtml(p,`word/_rels/${fn}.rels`) }
  }
  if (!footerHtml) {
    const p = Object.keys(zip.files).filter(p=>/^word\/footer\d+\.xml$/i.test(p)).sort()[0]
    if (p) { const fn=p.split('/').pop()!; footerHtml=await partToHtml(p,`word/_rels/${fn}.rels`) }
  }
  // ── Page layout from document.xml ──────────────────────────────────────
  let pageWidthMm = 0, pageHeightMm = 0
  let marginTopMm = 0, marginRightMm = 0, marginBottomMm = 0, marginLeftMm = 0
  const docFile = zip.file('word/document.xml')
  if (docFile) {
    const docDom = new DOMParser().parseFromString(await docFile.async('text'), 'application/xml')
    const allDocEls = docDom.getElementsByTagName('*')
    for (let i = 0; i < allDocEls.length; i++) {
      const ln = allDocEls[i].localName
      if (ln === 'pgSz') {
        const w = readWVal(allDocEls[i], 'w')
        const h = readWVal(allDocEls[i], 'h')
        if (w) pageWidthMm  = twipToMm(w)
        if (h) pageHeightMm = twipToMm(h)
      }
      if (ln === 'pgMar') {
        const t = readWVal(allDocEls[i], 'top')
        const r = readWVal(allDocEls[i], 'right')
        const b = readWVal(allDocEls[i], 'bottom')
        const l = readWVal(allDocEls[i], 'left')
        if (t) marginTopMm    = twipToMm(t)
        if (r) marginRightMm  = twipToMm(r)
        if (b) marginBottomMm = twipToMm(b)
        if (l) marginLeftMm   = twipToMm(l)
        break // first sectPr wins
      }
    }
  }

  return { headerHtml, footerHtml, pageWidthMm, pageHeightMm, marginTopMm, marginRightMm, marginBottomMm, marginLeftMm }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hardcoded fallback header
// ─────────────────────────────────────────────────────────────────────────────
const FallbackHeader: React.FC = () => (
  <table style={{ width:'100%', marginBottom:'6px', borderCollapse:'collapse' }}>
    <tbody><tr>
      <td style={{ width:'60%', verticalAlign:'top', paddingRight:'8px' }}>
        <div style={{ fontSize:'8pt', fontWeight:'bold', color:'#7b0000', letterSpacing:'0.5px' }}>
          UNIVERSITY OF<br/><span style={{ fontSize:'11pt' }}>PERPETUAL HELP</span>
        </div>
        <div style={{ fontSize:'7.5pt', fontWeight:'bold', letterSpacing:'0.3px' }}>SYSTEM DALTA - MOLINO CAMPUS</div>
        <div style={{ fontSize:'6.5pt', color:'#333', marginTop:'2px', lineHeight:'1.4' }}>
          Salawag-Zapote Road, Molino 3, City of Bacoor, 4102 Philippines<br/>
          www.perpetualdalta.edu.ph; (046) 477-0602; (02) 8584-4377
        </div>
      </td>
      <td style={{ width:'40%', verticalAlign:'top', textAlign:'right' }}>
        <div style={{ fontSize:'7pt', fontWeight:'bold', letterSpacing:'0.5px', lineHeight:'1.4' }}>C E R T I F I E D<br/>ISO 9001<br/>ISO 21001</div>
        <div style={{ fontSize:'8pt', fontWeight:'bold', marginTop:'4px' }}>College of Computer<br/>Studies</div>
      </td>
    </tr></tbody>
  </table>
)

const STORAGE_HEADER = 'evalReport_headerHtml'
const STORAGE_FOOTER = 'evalReport_footerHtml'
const STORAGE_FNAME  = 'evalReport_docxName'
const STORAGE_PAGE   = 'evalReport_pageLayout'

const EvaluationReport: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [data, setData]         = useState<CourseDetailData | null>(null)
  const [conformeName, setConformeName] = useState('')

  // Template state (persisted in localStorage)
  const [headerHtml, setHeaderHtml] = useState<string>(() => localStorage.getItem(STORAGE_HEADER) ?? '')
  const [footerHtml, setFooterHtml] = useState<string>(() => localStorage.getItem(STORAGE_FOOTER) ?? '')
  const [docxName, setDocxName]     = useState<string>(() => localStorage.getItem(STORAGE_FNAME) ?? '')
  const [pageLayout, setPageLayout] = useState<DocxPageLayout>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_PAGE) ?? 'null') ?? { pageWidthMm:0, pageHeightMm:0, marginTopMm:0, marginRightMm:0, marginBottomMm:0, marginLeftMm:0 } }
    catch { return { pageWidthMm:0, pageHeightMm:0, marginTopMm:0, marginRightMm:0, marginBottomMm:0, marginLeftMm:0 } }
  })
  const [docxParsing, setDocxParsing] = useState(false)
  const [docxError, setDocxError]     = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleDocxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.docx')) { setDocxError('Please upload a .docx file.'); return }
    setDocxParsing(true); setDocxError('')
    try {
      const { headerHtml: h, footerHtml: f, ...layout } = await parseDocxTemplate(file)
      setHeaderHtml(h); setFooterHtml(f); setDocxName(file.name); setPageLayout(layout)
      localStorage.setItem(STORAGE_HEADER, h)
      localStorage.setItem(STORAGE_FOOTER, f)
      localStorage.setItem(STORAGE_FNAME, file.name)
      localStorage.setItem(STORAGE_PAGE, JSON.stringify(layout))
    } catch (err) {
      console.error('Failed to parse .docx:', err)
      setDocxError('Failed to parse the Word document. Make sure it is a valid .docx file.')
    } finally { setDocxParsing(false) }
  }

  const clearTemplate = () => {
    setHeaderHtml(''); setFooterHtml(''); setDocxName('')
    setPageLayout({ pageWidthMm:0, pageHeightMm:0, marginTopMm:0, marginRightMm:0, marginBottomMm:0, marginLeftMm:0 })
    localStorage.removeItem(STORAGE_HEADER)
    localStorage.removeItem(STORAGE_FOOTER)
    localStorage.removeItem(STORAGE_FNAME)
    localStorage.removeItem(STORAGE_PAGE)
  }

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

  const { course, teacher: _teacher, statistics, comments } = data
  const qa = statistics.question_averages
  const actionPlan = generateActionPlan(qa)
  const hasEvals = course.evaluated_students > 0
  const useCustomHeader = headerHtml.trim().length > 0
  const useCustomFooter = footerHtml.trim().length > 0

  const hasPageLayout = pageLayout.pageWidthMm > 0 && pageLayout.pageHeightMm > 0
  const pageLayoutStyle: React.CSSProperties = hasPageLayout ? {
    width:     `${pageLayout.pageWidthMm}mm`,
    minHeight: `${pageLayout.pageHeightMm}mm`,
    ...(pageLayout.marginTopMm    ? { paddingTop:    `${pageLayout.marginTopMm}mm`    } : {}),
    ...(pageLayout.marginRightMm  ? { paddingRight:  `${pageLayout.marginRightMm}mm`  } : {}),
    ...(pageLayout.marginBottomMm ? { paddingBottom: `${pageLayout.marginBottomMm}mm` } : {}),
    ...(pageLayout.marginLeftMm   ? { paddingLeft:   `${pageLayout.marginLeftMm}mm`   } : {}),
  } : {}

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
            ${!hasPageLayout ? 'padding: 18mm 16mm !important; width: 210mm !important; min-height: 297mm;' : ''}
          }
          .page-break { page-break-before: always; }
          input { border: none !important; outline: none !important; background: transparent !important; }
          ${hasPageLayout ? `@page { size: ${pageLayout.pageWidthMm}mm ${pageLayout.pageHeightMm}mm; margin: ${pageLayout.marginTopMm || 18}mm ${pageLayout.marginRightMm || 16}mm ${pageLayout.marginBottomMm || 18}mm ${pageLayout.marginLeftMm || 16}mm; }` : '@page { size: A4 portrait; }'}
        }
        @media screen {
          .report-page {
            background: white;
            ${!hasPageLayout ? 'width: 210mm; min-height: 297mm; padding: 18mm 16mm;' : ''}
            margin: 0 auto;
            box-shadow: 0 4px 24px rgba(0,0,0,0.12);
          }
        }
      `}</style>

      {/* ── Screen toolbar (hidden on print) ─────────────────────────── */}
      <div className="no-print bg-gray-50 min-h-screen">
        <TeacherNavbar />
        <div className="container mx-auto px-4 py-4 space-y-2">
          {/* Row 1: navigation + print */}
          <div className="flex items-center justify-between">
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

          {/* Row 2: Word template loader */}
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2.5 shadow-sm">
            <FileText size={18} className="text-blue-600 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700">Header / Footer template:</span>
            {docxName ? (
              <span className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-2 py-0.5">
                <span className="truncate max-w-xs">{docxName}</span>
                <button onClick={clearTemplate} title="Clear template" className="text-gray-400 hover:text-red-500 transition-colors">
                  <X size={14} />
                </button>
              </span>
            ) : (
              <span className="text-sm text-gray-400 italic">No template loaded — using default</span>
            )}
            <input ref={fileInputRef} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={handleDocxUpload} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={docxParsing}
              className="ml-1 flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-300 hover:border-blue-500 rounded px-3 py-1 transition disabled:opacity-50"
            >
              {docxParsing ? <><Loader size={14} className="animate-spin" /> Parsing…</> : <><Upload size={14} /> Upload .docx</>}
            </button>
            {docxError && <span className="text-sm text-red-600">{docxError}</span>}
          </div>
        </div>

        {/* ── REPORT DOCUMENT ─────────────────────────────────────────── */}
        <div className="pb-16 px-4 pt-2">
          <div className="report-page" style={pageLayoutStyle}>
            {/* ── Header (custom from .docx or built-in fallback) ────── */}
            {useCustomHeader
              ? <div style={{ position: 'relative' }} dangerouslySetInnerHTML={{ __html: headerHtml }} />
              : <FallbackHeader />
            }

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

            {/* ── Page 2 ────────────────────────────────────────────── */}
            <div className="page-break" />

            {/* Word footer rendered at top of page 2 */}
            {useCustomFooter && (
              <>
                <div style={{ position: 'relative' }} dangerouslySetInnerHTML={{ __html: footerHtml }} />
                <hr style={{ borderTop: '1px solid #ccc', margin: '4px 0 8px' }} />
              </>
            )}

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
