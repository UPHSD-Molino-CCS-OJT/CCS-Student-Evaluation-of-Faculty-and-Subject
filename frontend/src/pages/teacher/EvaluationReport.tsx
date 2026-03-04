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
// OOXML → HTML converter  (comprehensive — mirrors MS Word layout)
// ─────────────────────────────────────────────────────────────────────────────

// Read a w:-namespaced (or plain) attribute from an element
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

// Find first direct child with the given localName
function gc(el: Element, name: string): Element | undefined {
  return Array.from(el.children).find(c => c.localName === name)
}

// 20ths-of-a-point (a.k.a. half-twips for spacing) → pt
const twipToPt = (v: number) => v / 20

// Convert OOXML border element to a CSS border shorthand, e.g. "1px solid #000"
function parseBorderEl(bEl: Element | undefined): string {
  if (!bEl) return ''
  const val = wa(bEl, 'val')
  if (!val || val === 'none' || val === 'nil') return 'none'
  const sz    = parseInt(wa(bEl, 'sz') || '4', 10)
  const pxW   = Math.max(1, Math.round(sz / 8))
  const color = wa(bEl, 'color')
  const cssColor = (color && color !== 'auto') ? `#${color}` : '#000'
  const styleMap: Record<string, string> = {
    single: 'solid', thick: 'solid', double: 'double',
    dashed: 'dashed', dotted: 'dotted', dashDot: 'dashed',
    dashDotDot: 'dashed', wave: 'solid', thinThickSmallGap: 'solid',
  }
  return `${pxW}px ${styleMap[val] ?? 'solid'} ${cssColor}`
}

// Extract border styles from a container that has top/left/bottom/right/insideH/insideV children
function getBordersStyle(container: Element | undefined): string {
  if (!container) return ''
  const top    = parseBorderEl(gc(container, 'top'))
  const right  = parseBorderEl(gc(container, 'right') ?? gc(container, 'end'))
  const bottom = parseBorderEl(gc(container, 'bottom'))
  const left   = parseBorderEl(gc(container, 'left') ?? gc(container, 'start'))
  let s = ''
  if (top)    s += `border-top:${top};`
  if (right)  s += `border-right:${right};`
  if (bottom) s += `border-bottom:${bottom};`
  if (left)   s += `border-left:${left};`
  return s
}

// Resolve OOXML color attribute (hex, auto, theme) → CSS color string or ''
function resolveColor(el: Element | undefined): string {
  if (!el) return ''
  const val = wa(el, 'val')
  if (!val || val === 'auto') return ''
  // themeColor → approximate
  const themeMap: Record<string, string> = {
    accent1: '#4472C4', accent2: '#ED7D31', accent3: '#A9D18E',
    accent4: '#FFC000', accent5: '#5B9BD5', accent6: '#70AD47',
    dark1: '#000000', dark2: '#44546A', light1: '#FFFFFF', light2: '#E7E6E6',
    text1: '#000000', text2: '#44546A', background1: '#FFFFFF', background2: '#E7E6E6',
    hyperlink: '#0563C1',
  }
  if (themeMap[val]) return themeMap[val]
  return `#${val}`
}

// Highlight name → CSS color
const HIGHLIGHT: Record<string, string> = {
  yellow: '#FFFF00', green: '#00FF00', cyan: '#00FFFF', magenta: '#FF00FF',
  blue: '#0000FF', red: '#FF0000', darkBlue: '#00008B', darkCyan: '#008B8B',
  darkGreen: '#006400', darkMagenta: '#8B008B', darkRed: '#8B0000',
  darkYellow: '#808000', darkGray: '#A9A9A9', lightGray: '#D3D3D3',
  black: '#000000', white: '#FFFFFF',
}

function processChildren(parent: Element, imageMap: Record<string, string>): string {
  return Array.from(parent.children).map(c => convertNode(c, imageMap)).join('')
}

function convertNode(node: Element, imageMap: Record<string, string>): string {
  const n = node.localName

  // ── Skip / transparent elements ──────────────────────────────────────────
  if (n === 'bookmarkStart' || n === 'bookmarkEnd' || n === 'proofErr' ||
      n === 'rPrChange' || n === 'pPrChange' || n === 'del' ||
      n === 'fldChar' || n === 'instrText' || n === 'lastRenderedPageBreak' ||
      n === 'sectPr' || n === 'permStart' || n === 'permEnd') return ''

  // ── Recurse-only containers ───────────────────────────────────────────────
  if (n === 'hyperlink' || n === 'smartTag' || n === 'ins' || n === 'bdo') {
    return processChildren(node, imageMap)
  }
  // DrawingML / VML textbox wrappers — just render their w:p / w:tbl children
  if (n === 'txbxContent' || n === 'wsp' || n === 'txbx' || n === 'textbox' ||
      n === 'graphicData' || n === 'graphic' || n === 'inline' || n === 'anchor') {
    return processChildren(node, imageMap)
  }
  // Structured document tag — render its content
  if (n === 'sdt') {
    const content = gc(node, 'sdtContent')
    return content ? processChildren(content, imageMap) : ''
  }

  // ── TABLE ─────────────────────────────────────────────────────────────────
  if (n === 'tbl') {
    const tblPr = gc(node, 'tblPr')
    // Table-level border / alignment / spacing
    const tblBdr  = tblPr ? gc(tblPr, 'tblBorders') : undefined
    const tblBdrStyle = getBordersStyle(tblBdr)
    const tblJc   = tblPr ? gc(tblPr, 'jc') : undefined
    const tblShd  = tblPr ? gc(tblPr, 'shd') : undefined
    const tblShdFill = tblShd ? (wa(tblShd, 'fill') !== 'auto' ? wa(tblShd, 'fill') : '') : ''
    const tblAlign = tblJc ? (wa(tblJc, 'val') === 'right' ? 'margin-left:auto;' : wa(tblJc, 'val') === 'center' ? 'margin-left:auto;margin-right:auto;' : '') : ''

    // Compute inside-border (used as default for cells)
    const insideHBdr = parseBorderEl(tblBdr ? gc(tblBdr, 'insideH') : undefined)
    const insideVBdr = parseBorderEl(tblBdr ? gc(tblBdr, 'insideV') : undefined)

    // Full child scan to handle tblPr/tblGrid mixed in
    const trEls = Array.from(node.children).filter(c => c.localName === 'tr')

    const rowsHtml = trEls.map(tr => {
      const trPr = gc(tr, 'trPr')
      let rowStyle = ''
      if (trPr) {
        const trH = gc(trPr, 'trHeight')
        if (trH) {
          const hVal = wa(trH, 'val')
          const hRule = wa(trH, 'hRule')
          if (hVal) {
            const hPt = twipToPt(parseInt(hVal, 10))
            rowStyle += hRule === 'exact' ? `height:${hPt}pt;` : `min-height:${hPt}pt;`
          }
        }
      }
      const cells = Array.from(tr.children).filter(c => c.localName === 'tc').map(tc => {
        const tcPr = gc(tc, 'tcPr')
        let cellStyle = 'vertical-align:top;'
        let colspan = 1

        if (tcPr) {
          // Width
          const tcW = gc(tcPr, 'tcW')
          if (tcW) {
            const wv = wa(tcW, 'w'); const wt = wa(tcW, 'type')
            if (wv && wt === 'pct')  cellStyle += `width:${(parseInt(wv) / 5000 * 100).toFixed(1)}%;`
            else if (wv && wt === 'dxa') cellStyle += `width:${twipToPt(parseInt(wv))}pt;`
          }
          // Colspan (gridSpan)
          const gs = gc(tcPr, 'gridSpan')
          if (gs) { const g = parseInt(wa(gs, 'val') || '1', 10); if (g > 1) colspan = g }
          // Vertical alignment
          const vAlign = gc(tcPr, 'vAlign')
          if (vAlign) {
            const v = wa(vAlign, 'val')
            cellStyle += v === 'center' ? 'vertical-align:middle;'
              : v === 'bottom' ? 'vertical-align:bottom;'
              : 'vertical-align:top;'
          }
          // Cell shading
          const shd = gc(tcPr, 'shd')
          if (shd) {
            const fill = wa(shd, 'fill'); const color = wa(shd, 'color')
            if (fill && fill !== 'auto') cellStyle += `background-color:#${fill};`
            else if (color && color !== 'auto') cellStyle += `background-color:#${color};`
          }
          // Cell padding
          const tcMar = gc(tcPr, 'tcMar')
          if (tcMar) {
            const sides: Array<[string, string]> = [['top','padding-top'],['right','padding-right'],['bottom','padding-bottom'],['left','padding-left']]
            for (const [side, cssProp] of sides) {
              const mEl = gc(tcMar, side)
              if (mEl) { const v = wa(mEl,'w'); if (v) cellStyle += `${cssProp}:${twipToPt(parseInt(v))}pt;` }
            }
          } else {
            // Fallback padding
            cellStyle += 'padding:2px 4px;'
          }
          // Cell borders (override table-level)
          const tcBdr = gc(tcPr, 'tcBorders')
          if (tcBdr) {
            cellStyle += getBordersStyle(tcBdr)
          } else {
            // Use table inside borders as default
            if (insideHBdr && insideHBdr !== 'none') cellStyle += `border-top:${insideHBdr};border-bottom:${insideHBdr};`
            if (insideVBdr && insideVBdr !== 'none') cellStyle += `border-left:${insideVBdr};border-right:${insideVBdr};`
          }
        } else {
          cellStyle += 'padding:2px 4px;'
          if (insideHBdr && insideHBdr !== 'none') cellStyle += `border-top:${insideHBdr};border-bottom:${insideHBdr};`
          if (insideVBdr && insideVBdr !== 'none') cellStyle += `border-left:${insideVBdr};border-right:${insideVBdr};`
        }
        const colspanAttr = colspan > 1 ? ` colspan="${colspan}"` : ''
        return `<td${colspanAttr} style="${cellStyle}">${processChildren(tc, imageMap)}</td>`
      }).join('')
      return `<tr style="${rowStyle}">${cells}</tr>`
    }).join('')

    return `<table style="width:100%;border-collapse:collapse;table-layout:fixed;${tblBdrStyle}${tblAlign}${tblShdFill ? `background-color:#${tblShdFill};` : ''}">${rowsHtml}</table>`
  }

  // ── PARAGRAPH ─────────────────────────────────────────────────────────────
  if (n === 'p') {
    const pPr = gc(node, 'pPr')
    let align = 'left'
    let marginTop = '0', marginBottom = '0'
    let lineHeight = '1.15'
    let paddingLeft = '', textIndent = '', paddingRight = ''
    let pStyle = '', pBgColor = ''
    let pBorderStyle = ''
    let numBullet = ''  // list prefix
    let isRtl = false

    if (pPr) {
      // Alignment
      const jc = gc(pPr, 'jc')
      if (jc) {
        const v = wa(jc, 'val')
        if (v === 'center') align = 'center'
        else if (v === 'right') align = 'right'
        else if (v === 'both' || v === 'distribute') align = 'justify'
      }
      // RTL
      const bidi = gc(pPr, 'bidi')
      if (bidi) { const v = wa(bidi, 'val'); if (v !== '0' && v !== 'false') isRtl = true }

      // Spacing before/after and line height
      const spacing = gc(pPr, 'spacing')
      if (spacing) {
        const before = wa(spacing, 'before'); const after = wa(spacing, 'after')
        const line = wa(spacing, 'line'); const lineRule = wa(spacing, 'lineRule')
        if (before) marginTop = `${twipToPt(parseInt(before))}pt`
        if (after)  marginBottom = `${twipToPt(parseInt(after))}pt`
        if (line) {
          const lv = parseInt(line)
          if (lineRule === 'exact') lineHeight = `${twipToPt(lv)}pt`
          else if (lineRule === 'atLeast') lineHeight = `${twipToPt(lv)}pt`
          else lineHeight = (lv / 240).toFixed(3) // auto: fraction of normal
        }
      }

      // Indentation
      const ind = gc(pPr, 'ind')
      if (ind) {
        const left = wa(ind, 'left') || wa(ind, 'start')
        const right = wa(ind, 'right') || wa(ind, 'end')
        const firstLine = wa(ind, 'firstLine')
        const hanging = wa(ind, 'hanging')
        if (left)      paddingLeft = `${twipToPt(parseInt(left))}pt`
        if (right)     paddingRight = `${twipToPt(parseInt(right))}pt`
        if (firstLine) textIndent = `${twipToPt(parseInt(firstLine))}pt`
        if (hanging)   { textIndent = `-${twipToPt(parseInt(hanging))}pt`; paddingLeft = `${twipToPt((parseInt(left||'0') || 0))}pt` }
      }

      // Paragraph shading
      const shd = gc(pPr, 'shd')
      if (shd) {
        const fill = wa(shd, 'fill')
        if (fill && fill !== 'auto') pBgColor = `#${fill}`
      }

      // Paragraph borders
      const pBdr = gc(pPr, 'pBdr')
      if (pBdr) pBorderStyle = getBordersStyle(pBdr)

      // Numbered / bulleted list (basic: show bullet or number using numPr data-hint)
      const numPr = gc(pPr, 'numPr')
      if (numPr) {
        const ilvl = gc(numPr, 'ilvl'); const numId = gc(numPr, 'numId')
        const level = ilvl ? parseInt(wa(ilvl, 'val') || '0') : 0
        if (numId && wa(numId, 'val') !== '0') {
          const bullets = ['•', '◦', '▪', '–', '·']
          numBullet = `<span style="display:inline-block;min-width:${(level+1)*13}px">${bullets[level % bullets.length]}</span>`
        }
      }

      // Style ID hint (for future extension; currently not fully resolved)
      const pStyleEl = gc(pPr, 'pStyle')
      if (pStyleEl) pStyle = wa(pStyleEl, 'val')
    }

    const inner = processChildren(node, imageMap)
    const style = [
      `margin-top:${marginTop}`,
      `margin-bottom:${marginBottom}`,
      `line-height:${lineHeight}`,
      `text-align:${align}`,
      paddingLeft  ? `padding-left:${paddingLeft}`  : '',
      paddingRight ? `padding-right:${paddingRight}` : '',
      textIndent   ? `text-indent:${textIndent}`    : '',
      pBgColor     ? `background-color:${pBgColor}` : '',
      pBorderStyle,
      isRtl        ? 'direction:rtl'               : '',
      // Heading style heuristics
      pStyle === 'Heading1' ? 'font-size:16pt;font-weight:bold;' :
      pStyle === 'Heading2' ? 'font-size:13pt;font-weight:bold;' :
      pStyle === 'Heading3' ? 'font-size:12pt;font-weight:bold;' : '',
    ].filter(Boolean).join(';')

    return `<p style="${style}">${numBullet}${inner || '&nbsp;'}</p>`
  }

  // ── RUN ───────────────────────────────────────────────────────────────────
  if (n === 'r') {
    const rPr = gc(node, 'rPr')
    let bold = false, italic = false, underline = false, strikethrough = false
    let color = '', fontSize = '', fontFamily = '', bgColor = ''
    let vertAlign = '', letterSpacing = '', textTransform = '', fontVariant = ''

    if (rPr) {
      const bEl = gc(rPr, 'b'); if (bEl) { const v = wa(bEl, 'val'); bold   = (v !== '0' && v !== 'false') }
      const iEl = gc(rPr, 'i'); if (iEl) { const v = wa(iEl, 'val'); italic = (v !== '0' && v !== 'false') }

      // Underline
      const uEl = gc(rPr, 'u')
      if (uEl) { const v = wa(uEl, 'val'); underline = v !== 'none' && v !== '' }

      // Strikethrough
      const stEl = gc(rPr, 'strike') ?? gc(rPr, 'dstrike')
      if (stEl) { const v = wa(stEl, 'val'); strikethrough = v !== '0' && v !== 'false' }

      // Color
      const ce = gc(rPr, 'color')
      if (ce) { const c = resolveColor(ce); if (c) color = `color:${c};` }

      // Font size (sz in half-points)
      const se = gc(rPr, 'sz') ?? gc(rPr, 'szCs')
      if (se) { const v = wa(se, 'val'); if (v) fontSize = `font-size:${parseInt(v) / 2}pt;` }

      // Font family (rFonts: ascii, hAnsi, eastAsia, cs)
      const ff = gc(rPr, 'rFonts')
      if (ff) {
        const f = wa(ff, 'ascii') || wa(ff, 'hAnsi') || wa(ff, 'cs') || wa(ff, 'eastAsia')
        if (f) fontFamily = `font-family:'${f}',sans-serif;`
      }

      // Highlight
      const hi = gc(rPr, 'highlight')
      if (hi) { const v = wa(hi, 'val'); if (v && HIGHLIGHT[v]) bgColor = `background-color:${HIGHLIGHT[v]};` }

      // Run shading
      if (!bgColor) {
        const shd = gc(rPr, 'shd')
        if (shd) { const fill = wa(shd, 'fill'); if (fill && fill !== 'auto') bgColor = `background-color:#${fill};` }
      }

      // Superscript / subscript
      const va = gc(rPr, 'vertAlign')
      if (va) { const v = wa(va, 'val'); if (v === 'superscript') vertAlign = 'vertical-align:super;font-size:0.75em;'; else if (v === 'subscript') vertAlign = 'vertical-align:sub;font-size:0.75em;' }

      // Letter spacing (spacing in twips)
      const spc = gc(rPr, 'spacing')
      if (spc) { const v = wa(spc, 'val'); if (v) letterSpacing = `letter-spacing:${twipToPt(parseInt(v))}pt;` }

      // All caps / small caps
      const caps = gc(rPr, 'caps')
      if (caps) { const v = wa(caps, 'val'); if (v !== '0' && v !== 'false') textTransform = 'text-transform:uppercase;' }
      const smCaps = gc(rPr, 'smallCaps')
      if (smCaps) { const v = wa(smCaps, 'val'); if (v !== '0' && v !== 'false') fontVariant = 'font-variant:small-caps;' }
    }

    const decor = [underline && 'underline', strikethrough && 'line-through'].filter(Boolean).join(' ')
    const styles = [
      color, fontSize, fontFamily, bgColor, vertAlign, letterSpacing, textTransform, fontVariant,
      bold        ? 'font-weight:bold;'   : '',
      italic      ? 'font-style:italic;'  : '',
      decor       ? `text-decoration:${decor};` : '',
    ].filter(Boolean).join('')

    // Collect run content — recurse children (t, br, cr, tab, drawing, pict, sym, etc.)
    const content = Array.from(node.children).map(c => convertNode(c, imageMap)).join('')
    if (!content) return ''
    return styles ? `<span style="${styles}">${content}</span>` : content
  }

  // ── INLINE TEXT / SPECIAL ─────────────────────────────────────────────────
  if (n === 't')   return escapeHtml(node.textContent || '')
  if (n === 'br' || n === 'cr') return '<br/>'
  if (n === 'tab') return '<span style="display:inline-block;width:2em">&nbsp;</span>'

  // Symbol (w:sym w:char="F0B7" w:font="Symbol")
  if (n === 'sym') {
    const charCode = parseInt(wa(node, 'char') || '0', 16)
    const font = wa(node, 'font')
    if (charCode) {
      // Wingdings/Symbol → display as Unicode (best-effort)
      return `<span style="font-family:'${font}',Symbol,sans-serif">${String.fromCharCode(charCode)}</span>`
    }
    return ''
  }

  // ── IMAGES ────────────────────────────────────────────────────────────────
  if (n === 'drawing') return processDrawing(node, imageMap)
  if (n === 'pict')    return processPict(node, imageMap)

  // Default: recurse children for anything unrecognised
  return processChildren(node, imageMap)
}

// 1 inch = 914400 EMU = 96 CSS-px (at 96 dpi)
const EMU_PX = 96 / 914400

// Parse a VML / CSS length string ("469.35pt", "6.5in", "100%", "200px") → px number (0 = unknown / %)
function vmlLenToPx(s: string): number {
  if (!s) return 0
  const m = s.match(/([\d.]+)\s*(pt|in|cm|mm|px|%)?/i)
  if (!m) return 0
  const v = parseFloat(m[1])
  switch ((m[2] || 'pt').toLowerCase()) {
    case 'pt' : return v * 96 / 72
    case 'in' : return v * 96
    case 'cm' : return v * 96 / 2.54
    case 'mm' : return v * 96 / 25.4
    case 'px' : return v
    default   : return 0  // % — let CSS handle it
  }
}

function processDrawing(node: Element, imageMap: Record<string, string>): string {
  const allEls = node.getElementsByTagName('*')
  let rId = ''
  let cx = 0, cy = 0
  let posHOff = 0, posVOff = 0
  let isAnchor = false

  // DrawingML line / connector shape detection
  let isLineShape = false
  let lineColorHex = '000000'
  let lineWidthEmu = 12700  // 1 pt default

  // Textbox content nodes found inside this drawing
  const txbxContentEls: Element[] = []

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
    // Detect preset geometry that represents a line / straight connector
    if (ln === 'prstGeom') {
      const prst = el.getAttribute('prst') || ''
      if (/^(line|straightConnector\d*|bentConnector\d*|curvedConnector\d*)$/i.test(prst)) isLineShape = true
    }
    // cxnSp = connection shape (always a line-like element)
    if (ln === 'cxnSp') isLineShape = true
    // Outline width (EMUs; 12700 EMU = 1 pt)
    if (ln === 'ln') {
      const w = parseInt(el.getAttribute('w') || '0', 10)
      if (w) lineWidthEmu = w
    }
    // Solid fill colour on the outline
    if (ln === 'srgbClr') {
      const val = el.getAttribute('val') || ''
      if (val && el.parentElement?.localName === 'solidFill') lineColorHex = val
    }
    if (ln === 'sysClr') {
      const lastClr = el.getAttribute('lastClr') || ''
      if (lastClr && el.parentElement?.localName === 'solidFill') lineColorHex = lastClr
    }
    // Collect textbox content nodes (wps:txbxContent or w:txbxContent)
    if (ln === 'txbxContent') {
      txbxContentEls.push(el)
    }
  }

  // ── Render a DrawingML line shape ──────────────────────────────────────
  if (isLineShape && !rId) {
    const widthPx = cx ? Math.round(cx * EMU_PX) : 0
    const strokePx = Math.max(1, Math.round(lineWidthEmu / 12700))
    const wStyle   = widthPx ? `width:${widthPx}px;` : 'width:100%;'
    if (isAnchor && (posHOff || posVOff)) {
      const left = Math.round(posHOff * EMU_PX)
      const top  = Math.round(posVOff * EMU_PX)
      return `<div style="position:absolute;left:${left}px;top:${top}px;${wStyle}border-top:${strokePx}px solid #${lineColorHex};"></div>`
    }
    return `<div style="display:block;${wStyle}border-top:${strokePx}px solid #${lineColorHex};margin:2px 0;"></div>`
  }

  // ── Render textbox content (DrawingML wps:wsp shape with text) ─────────
  if (txbxContentEls.length > 0 && !rId) {
    return txbxContentEls.map(el => processChildren(el, imageMap)).join('')
  }

  // ── Image ──────────────────────────────────────────────────────────────
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
  let shapeStyle = ''
  let shapeLeft = '', shapeTop = '', shapePos = ''

  // ── VML line shapes (v:line, or v:shape acting as a line) ─────────────
  for (let i = 0; i < allEls.length; i++) {
    const el  = allEls[i]
    const ln  = el.localName

    if (ln === 'line') {
      // v:line from="0,Ypt" to="Xpt,Ypt"
      const toAttr   = el.getAttribute('to')   || ''
      const fromAttr = el.getAttribute('from') || ''
      // Horizontal extent = to.x − from.x
      const toX   = vmlLenToPx((toAttr.split(',')[0]   || '').trim())
      const fromX = vmlLenToPx((fromAttr.split(',')[0] || '').trim())
      const widthPx = Math.max(0, toX - fromX)

      // Stroke colour & weight
      let strokeColor = el.getAttribute('strokecolor') || '#000000'
      if (!strokeColor.startsWith('#')) strokeColor = `#${strokeColor}`
      const strokeWeight = el.getAttribute('strokeweight') || '1pt'
      // Also check child v:stroke
      for (let j = 0; j < allEls.length; j++) {
        if (allEls[j].localName === 'stroke') {
          const c = allEls[j].getAttribute('color'); if (c) strokeColor = c.startsWith('#') ? c : `#${c}`
          const w = allEls[j].getAttribute('weight'); if (w) { /* override weight below */ }
        }
      }
      const strokePx = Math.max(1, Math.round(vmlLenToPx(strokeWeight) || 1))

      // Position flags
      const elStyle  = el.getAttribute('style') || ''
      const mPos     = elStyle.match(/position\s*:\s*([^;]+)/i)
      const mLeft    = elStyle.match(/left\s*:\s*([^;]+)/i)
      const mTop     = elStyle.match(/top\s*:\s*([^;]+)/i)
      const isAbs    = mPos && mPos[1].trim() === 'absolute'
      const leftVal  = mLeft ? vmlLenToPx(mLeft[1].trim()) : 0
      const topVal   = mTop  ? vmlLenToPx(mTop[1].trim())  : 0

      const wStyle = widthPx ? `width:${widthPx}px;` : 'width:100%;'
      if (isAbs && (leftVal || topVal)) {
        return `<div style="position:absolute;left:${leftVal}px;top:${topVal}px;${wStyle}border-top:${strokePx}px solid ${strokeColor};"></div>`
      }
      return `<div style="display:block;${wStyle}border-top:${strokePx}px solid ${strokeColor};margin:2px 0;"></div>`
    }

    // v:shape that acts as a line: type="#_x0000_t32" or height 0 in style
    if (ln === 'shape') {
      const typeAttr = el.getAttribute('type') || ''
      const sStyle   = el.getAttribute('style') || ''
      const mH       = sStyle.match(/height\s*:\s*([\d.]+)(pt|px|in|cm|mm)?/i)
      const heightPx = mH ? vmlLenToPx(`${mH[1]}${mH[2] || 'pt'}`) : -1
      const isLineTy = typeAttr.includes('t32') || typeAttr.includes('line')
      if (isLineTy || heightPx === 0) {
        const mW2  = sStyle.match(/width\s*:\s*([^;]+)/i)
        const widthPx2 = mW2 ? vmlLenToPx(mW2[1].trim()) : 0
        let sColor = el.getAttribute('strokecolor') || '#000000'
        if (!sColor.startsWith('#')) sColor = `#${sColor}`
        const sWeight = el.getAttribute('strokeweight') || '1pt'
        const sPx = Math.max(1, Math.round(vmlLenToPx(sWeight) || 1))
        const wStyle2 = widthPx2 ? `width:${widthPx2}px;` : 'width:100%;'
        return `<div style="display:block;${wStyle2}border-top:${sPx}px solid ${sColor};margin:2px 0;"></div>`
      }
    }
  }

  // ── Image shapes ─────────────────────────────────────────────────────
  for (let i = 0; i < allEls.length; i++) {
    const el = allEls[i]
    const ln = el.localName
    if (ln === 'shape' || ln === 'rect' || ln === 'oval') {
      shapeStyle = el.getAttribute('style') || ''
      const mPos  = shapeStyle.match(/position\s*:\s*([^;]+)/i)
      const mLeft = shapeStyle.match(/left\s*:\s*([^;]+)/i)
      const mTop  = shapeStyle.match(/top\s*:\s*([^;]+)/i)
      if (mPos)  shapePos  = mPos[1].trim()
      if (mLeft) shapeLeft = mLeft[1].trim()
      if (mTop)  shapeTop  = mTop[1].trim()
    }
  }

  // ── VML textbox text (v:textbox > w:txbxContent) ─────────────────────
  for (let i = 0; i < allEls.length; i++) {
    if (allEls[i].localName === 'textbox') {
      const txbxContent = Array.from(allEls[i].getElementsByTagName('*')).find(e => e.localName === 'txbxContent')
        ?? (allEls[i].children.length ? allEls[i] : undefined)
      if (txbxContent) {
        const textHtml = processChildren(txbxContent, imageMap)
        if (textHtml.trim()) {
          // Try to size/position using the parent shape's style
          const shEl = allEls[i].parentElement
          const shS  = shEl?.getAttribute('style') || ''
          const mW   = shS.match(/width\s*:\s*([^;]+)/i)
          const mH   = shS.match(/height\s*:\s*([^;]+)/i)
          const mP   = shS.match(/position\s*:\s*([^;]+)/i)
          const mL   = shS.match(/left\s*:\s*([^;]+)/i)
          const mT   = shS.match(/top\s*:\s*([^;]+)/i)
          const isAbs = mP && mP[1].trim() === 'absolute'
          const posS = isAbs
            ? `position:absolute;${mL ? `left:${mL[1].trim()};` : ''}${mT ? `top:${mT[1].trim()};` : ''}`
            : 'display:block;'
          const dimS = `${mW ? `width:${mW[1].trim()};` : ''}${mH ? `height:${mH[1].trim()};` : ''}`
          return `<div style="${posS}${dimS}overflow:hidden;">${textHtml}</div>`
        }
      }
    }
  }

  for (let i = 0; i < allEls.length; i++) {
    if (allEls[i].localName === 'imagedata') {
      const rId =
        allEls[i].getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') ||
        allEls[i].getAttribute('r:id') ||
        ''
      if (rId && imageMap[rId]) {
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
  pageWidthMm:      number
  pageHeightMm:     number
  marginTopMm:      number
  marginRightMm:    number
  marginBottomMm:   number
  marginLeftMm:     number
  headerDistanceMm: number  // w:header — page-edge to header-content top
  footerDistanceMm: number  // w:footer — page-edge to footer-content top
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
  let headerDistanceMm = 0, footerDistanceMm = 0
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
        const t  = readWVal(allDocEls[i], 'top')
        const r  = readWVal(allDocEls[i], 'right')
        const b  = readWVal(allDocEls[i], 'bottom')
        const l  = readWVal(allDocEls[i], 'left')
        const hd = readWVal(allDocEls[i], 'header')
        const fd = readWVal(allDocEls[i], 'footer')
        if (t)  marginTopMm      = twipToMm(t)
        if (r)  marginRightMm    = twipToMm(r)
        if (b)  marginBottomMm   = twipToMm(b)
        if (l)  marginLeftMm     = twipToMm(l)
        if (hd) headerDistanceMm = twipToMm(hd)
        if (fd) footerDistanceMm = twipToMm(fd)
        break // first sectPr wins
      }
    }
  }
  // Fall back to sensible Word defaults when not specified
  if (!headerDistanceMm) headerDistanceMm = 12.7  // 1.27 cm
  if (!footerDistanceMm) footerDistanceMm = 12.7

  return { headerHtml, footerHtml, pageWidthMm, pageHeightMm, marginTopMm, marginRightMm, marginBottomMm, marginLeftMm, headerDistanceMm, footerDistanceMm }
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
    const blank: DocxPageLayout = { pageWidthMm:0, pageHeightMm:0, marginTopMm:0, marginRightMm:0, marginBottomMm:0, marginLeftMm:0, headerDistanceMm:0, footerDistanceMm:0 }
    try { return { ...blank, ...(JSON.parse(localStorage.getItem(STORAGE_PAGE) ?? 'null') ?? {}) } }
    catch { return blank }
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
    setPageLayout({ pageWidthMm:0, pageHeightMm:0, marginTopMm:0, marginRightMm:0, marginBottomMm:0, marginLeftMm:0, headerDistanceMm:0, footerDistanceMm:0 })
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

  // headerDistanceMm: distance from page top to where header content starts (w:header)
  // footerDistanceMm: distance from page bottom to where footer content starts (w:footer)
  // marginTopMm: distance from page top to where body content starts (w:top)
  // The body top gap fills the space between the header zone bottom and the body start.
  const hDist = hasPageLayout ? (pageLayout.headerDistanceMm || 12.7) : 12.7
  const fDist = hasPageLayout ? (pageLayout.footerDistanceMm || 12.7) : 12.7
  const bodyTopGapMm = hasPageLayout ? Math.max(0, pageLayout.marginTopMm - hDist) : 0

  // The page container itself has only left/right padding; top/bottom are handled per-section.
  const pageContainerStyle: React.CSSProperties = hasPageLayout ? {
    width:     `${pageLayout.pageWidthMm}mm`,
    minHeight: `${pageLayout.pageHeightMm}mm`,
    paddingRight: `${pageLayout.marginRightMm}mm`,
    paddingLeft:  `${pageLayout.marginLeftMm}mm`,
  } : {}

  // Section-level styles
  const headerSectionStyle: React.CSSProperties = hasPageLayout
    ? { paddingTop: `${hDist}mm`, marginLeft: `-${pageLayout.marginLeftMm}mm`, marginRight: `-${pageLayout.marginRightMm}mm`, paddingLeft: `${pageLayout.marginLeftMm}mm`, paddingRight: `${pageLayout.marginRightMm}mm` }
    : {}

  const bodySectionStyle: React.CSSProperties = hasPageLayout
    ? { paddingTop: `${bodyTopGapMm}mm` }
    : {}

  const footerSectionStyle: React.CSSProperties = hasPageLayout
    ? { marginLeft: `-${pageLayout.marginLeftMm}mm`, marginRight: `-${pageLayout.marginRightMm}mm`, paddingLeft: `${pageLayout.marginLeftMm}mm`, paddingRight: `${pageLayout.marginRightMm}mm`, paddingBottom: `${fDist}mm` }
    : {}

  // Legacy alias kept for the @page CSS rule
  const pageWidthStyle = pageContainerStyle

  return (
    <>
      {/* ── Global styles ────────────────────────────────────────────── */}
      <style>{`
        /* ── Screen: Word-like workspace ── */
        @media screen {
          .word-workspace {
            background: #525659;
            min-height: calc(100vh - 7rem);
            padding: 28px 0 56px;
            overflow-y: auto;
          }
          .report-page {
            display: flex;
            flex-direction: column;
            background: #fff;
            ${!hasPageLayout
              ? 'width: 210mm; min-height: 297mm; padding: 18mm 16mm;'
              : ''}
            margin: 0 auto;
            box-shadow: 0 1px 3px rgba(0,0,0,.35), 0 6px 18px rgba(0,0,0,.35);
            font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
            font-size: 10pt;
            color: #000;
            position: relative;
            box-sizing: border-box;
          }
          .report-page-body {
            flex: 1;
          }
          .report-page-footer {
            margin-top: auto;
          }
          .page-gap {
            height: 20px;
          }
          .page-label {
            text-align: center;
            color: #c8c8c8;
            font-size: 11px;
            letter-spacing: .5px;
            padding: 6px 0 4px;
            user-select: none;
          }
        }

        /* ── Print ── */
        @media print {
          /* Force background colours / images to print */
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .no-print { display: none !important; }
          body { margin: 0 !important; background: white !important; }

          .word-workspace {
            display: block !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .page-gap, .page-label { display: none !important; }

          /* Inline styles set mm widths for screen — override them all for print */
          .report-page {
            display: flex !important;
            flex-direction: column !important;
            /* @page margin is already the whitespace — fill the printable area */
            width: 100% !important;
            min-height: unset !important;
            max-width: unset !important;
            /* Remove all padding — @page margin handles it */
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            /* Page break between page 1 and page 2 */
            page-break-after: always;
            break-after: page;
            font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
            font-size: 10pt;
            color: #000;
            box-sizing: border-box;
          }
          .report-page-body {
            flex: 1;
          }
          .report-page-footer {
            margin-top: auto;
          }

          .report-page:last-of-type {
            page-break-after: auto;
            break-after: auto;
          }

          input { border: none !important; outline: none !important; background: transparent !important; }

          ${hasPageLayout
            ? `@page { size: ${pageLayout.pageWidthMm}mm ${pageLayout.pageHeightMm}mm; margin: ${hDist}mm ${pageLayout.marginRightMm || 16}mm ${fDist}mm ${pageLayout.marginLeftMm || 16}mm; }`
            : '@page { size: A4 portrait; margin: 12.7mm 16mm; }'}
        }
      `}</style>

      {/* ── Toolbar (screen only) ────────────────────────────────────── */}
      <div className="no-print">
        <TeacherNavbar />
        <div className="bg-white border-b border-gray-200 shadow-sm px-4 py-2.5 space-y-2">
          {/* Row 1: navigation + conforme + print */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <button
              onClick={() => navigate(`/teacher/course/${courseId}`)}
              className="flex items-center text-green-600 hover:text-green-700 font-semibold text-sm"
            >
              <ArrowLeft size={18} className="mr-1.5" /> Back to Course Detail
            </button>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Conforme</label>
                <input
                  type="text"
                  value={conformeName}
                  onChange={e => setConformeName(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm w-52 focus:outline-none focus:border-blue-400"
                  placeholder="Name on Conforme line"
                />
              </div>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-1.5 rounded shadow-sm transition text-sm"
              >
                <Printer size={15} /> Print / Save PDF
              </button>
            </div>
          </div>

          {/* Row 2: template loader */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <FileText size={15} className="text-gray-400 flex-shrink-0" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Template</span>
            {docxName ? (
              <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-0.5">
                <span className="truncate max-w-xs">{docxName}</span>
                <button onClick={clearTemplate} title="Remove template" className="text-gray-400 hover:text-red-500 ml-0.5">
                  <X size={12} />
                </button>
              </span>
            ) : (
              <span className="text-xs text-gray-400 italic">No template — using built-in header</span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={handleDocxUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={docxParsing}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 border border-blue-300 hover:border-blue-500 rounded px-2.5 py-1 transition disabled:opacity-50"
            >
              {docxParsing
                ? <><Loader size={12} className="animate-spin" /> Parsing…</>
                : <><Upload size={12} /> Upload .docx</>}
            </button>
            {hasPageLayout && (
              <span className="text-xs text-gray-400 border border-gray-200 rounded px-2 py-0.5 bg-gray-50">
                {pageLayout.pageWidthMm} × {pageLayout.pageHeightMm} mm
              </span>
            )}
            {docxError && <span className="text-xs text-red-600">{docxError}</span>}
          </div>
        </div>
      </div>

      {/* ── Word workspace ───────────────────────────────────────────── */}
      <div className="word-workspace">

        {/* ═══ PAGE 1 — Header + Criteria table + Footer ══════════════ */}
        <div className="page-label no-print">Page 1</div>
        <div className="report-page" style={pageWidthStyle}>

          {/* Header — sits at headerDistanceMm from page top */}
          <div style={headerSectionStyle}>
            {useCustomHeader
              ? <div style={{ position: 'relative' }} dangerouslySetInnerHTML={{ __html: headerHtml }} />
              : <>
                  <FallbackHeader />
                  <hr style={{ borderTop: '1.5px solid #222', margin: '4px 0 10px' }} />
                </>
            }
          </div>

          {/* ── Main content — starts at marginTopMm from page top ── */}
          <div className="report-page-body" style={bodySectionStyle}>

          {/* Meta info row */}
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

          {/* Section title */}
          <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '11pt', marginBottom: '10px', letterSpacing: '1px' }}>
            STUDENT EVALUATION
          </div>

          {/* Evaluation table */}
          {!hasEvals ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#666', fontSize: '10pt' }}>
              No evaluations have been submitted for this course yet.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt', border: '1px solid #333' }}>
              <thead>
                <tr style={{ backgroundColor: '#e8e8e8' }}>
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
                    <tr key={c.key} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f7f7f7' }}>
                      <td style={{ border: '1px solid #ccc', padding: '4px 7px' }}>{c.label}</td>
                      <td style={{ border: '1px solid #ccc', padding: '4px 7px', textAlign: 'center', fontWeight: 'bold' }}>
                        {score.toFixed(2)}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '4px 7px', textAlign: 'center' }}>
                        {remark}
                      </td>
                    </tr>
                  )
                })}
                {/* Average row */}
                <tr style={{ backgroundColor: '#e8e8e8', fontWeight: 'bold' }}>
                  <td style={{ border: '1px solid #333', padding: '6px 7px' }}>AVERAGE</td>
                  <td style={{ border: '1px solid #333', padding: '6px 7px', textAlign: 'center' }}>
                    {statistics.average_rating.toFixed(2)}
                  </td>
                  <td style={{ border: '1px solid #333', padding: '6px 7px', textAlign: 'center' }}>
                    {getRemark(statistics.average_rating)}
                  </td>
                </tr>
              </tbody>
            </table>
          )}

          </div>{/* end report-page-body */}

          {/* Footer (bottom of page 1) */}
          {useCustomFooter && (
            <div className="report-page-footer" style={footerSectionStyle}>
              <div style={{ position: 'relative' }} dangerouslySetInnerHTML={{ __html: footerHtml }} />
            </div>
          )}

        </div>

        {/* ── Gap between pages (screen only) ─────────────────────── */}
        <div className="page-gap" />

        {/* ═══ PAGE 2 — Header + Comments + Action Plan + Footer ════════ */}
        <div className="page-label no-print">Page 2</div>
        <div className="report-page" style={pageWidthStyle}>

          {/* Header (repeated) — sits at headerDistanceMm from page top */}
          <div style={headerSectionStyle}>
            {useCustomHeader
              ? <div style={{ position: 'relative' }} dangerouslySetInnerHTML={{ __html: headerHtml }} />
              : <>
                  <FallbackHeader />
                  <hr style={{ borderTop: '1.5px solid #222', margin: '4px 0 10px' }} />
                </>
            }
          </div>

          {/* ── Main content — starts at marginTopMm from page top ── */}
          <div className="report-page-body" style={bodySectionStyle}>

          {/* Comments table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt', border: '1px solid #333' }}>
            <thead>
              <tr style={{ backgroundColor: '#e8e8e8' }}>
                <th style={{ border: '1px solid #333', padding: '5px 7px', textAlign: 'left', fontWeight: 'bold' }}>
                  COMMENTS
                </th>
              </tr>
            </thead>
            <tbody>
              {comments.length === 0 ? (
                <tr>
                  <td style={{ border: '1px solid #ccc', padding: '6px 7px', color: '#888', fontStyle: 'italic' }}>
                    No comments submitted.
                  </td>
                </tr>
              ) : (
                comments.map((c, i) => (
                  <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f7f7f7' }}>
                    <td style={{ border: '1px solid #ccc', padding: '4px 7px' }}>{c.comment}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Action Plan */}
          {hasEvals && actionPlan.length > 0 && (
            <div style={{ marginTop: '20px', fontSize: '9pt' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>Teachers Action Plan :</div>
              <ol style={{ paddingLeft: '20px', lineHeight: '2', margin: 0 }}>
                {actionPlan.map((item, i) => (
                  <li key={i} style={{ marginBottom: '2px' }}>{item}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Conforme / Sign / Date */}
          <div style={{ marginTop: '40px', fontSize: '9pt' }}>
            <div style={{ marginBottom: '4px' }}>
              <span style={{ fontWeight: 'bold' }}>Conforme : </span>
            </div>
            <div style={{ marginTop: '32px', display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
              <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Sign / Date</span>
              <span style={{ flex: '0 0 200px', borderBottom: '1px solid #333', display: 'inline-block' }} />
            </div>
            <div style={{ marginTop: '4px', fontSize: '8.5pt', paddingLeft: '74px' }}>
              {conformeName}
            </div>
          </div>

          </div>{/* end report-page-body */}

          {/* Footer (bottom of page 2) */}
          {useCustomFooter && (
            <div className="report-page-footer" style={footerSectionStyle}>
              <div style={{ position: 'relative' }} dangerouslySetInnerHTML={{ __html: footerHtml }} />
            </div>
          )}

        </div>

      </div>{/* end word-workspace */}
    </>
  )
}

export default EvaluationReport
