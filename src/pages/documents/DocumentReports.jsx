import { useMemo } from 'react'
import { FolderOpen, Tags, ScanText, AlertTriangle, Users, BadgeCheck, Clock, Percent } from 'lucide-react'
import PageHeader from '../../components/common/PageHeader'
import { FilterInput, FilterSelect } from '../../components/common/FilterToolbar'
import ReportWorkspace from '../../components/phase5/ReportWorkspace'
import { DocumentStatusBadge, ExpiryBadge, OcrProviderBadge } from '../../components/phase5/Badges'
import { usePhase5Data } from '../../hooks/usePhase5Data'
import { useAuth } from '../../hooks/useAuth'
import { useTableQuery } from '../../hooks/useTableQuery'
import { canViewDocument, effectiveStatus, expiryState, searchDocuments } from '../../services/documentService'
import { DOCUMENT_ENTITIES, DOCUMENT_STATUS_META, ENTITY_LABEL, QUEUE_STATUSES } from '../../config/documentConfig'
import { EXPIRY_META } from '../../config/vmsConfig'
import { formatDate, formatPercent } from '../../utils/formatters'

export default function DocumentReports() {
  const d = usePhase5Data()
  const { user } = useAuth()
  const t = useTableQuery({ filters: ['typeId', 'entityType', 'status', 'from', 'to'] })
  const docs = useMemo(() => searchDocuments(t.q, t.filters, d.documents.filter((x) => canViewDocument(user, x, d)), { types: d.documentTypes }), [d, user, t.q, t.filters])
  const typeName = (x) => d.lk.types[x.typeId]?.name || x.typeCode
  const register = [...docs].sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1))
  const byType = Object.values(docs.reduce((m, x) => {
    const k = x.typeId
    m[k] ||= { id: k, type: typeName(x), total: 0, verified: 0, queue: 0, rejected: 0, expired: 0 }
    m[k].total += 1
    const s = effectiveStatus(x)
    if (s === 'VERIFIED') m[k].verified += 1
    if (QUEUE_STATUSES.includes(s)) m[k].queue += 1
    if (s === 'REJECTED') m[k].rejected += 1
    if (s === 'EXPIRED') m[k].expired += 1
    return m
  }, {})).sort((a, b) => b.total - a.total)
  const byEntity = DOCUMENT_ENTITIES.map((e) => {
    const list = docs.filter((x) => x.entityType === e.value)
    return { id: e.value, entity: e.label, total: list.length, verified: list.filter((x) => effectiveStatus(x) === 'VERIFIED').length, pending: list.filter((x) => QUEUE_STATUSES.includes(x.status)).length }
  }).filter((r) => r.total)
  const expiring = docs.filter((x) => x.expiryDate && ['EXPIRED', 'TODAY', 'WEEK', 'MONTH'].includes(expiryState(x.expiryDate).state)).sort((a, b) => (a.expiryDate < b.expiryDate ? -1 : 1))
  const ocr = docs.filter((x) => x.ocrProvider)
  const edited = ocr.filter((x) => Object.keys(x.ocrOriginal || {}).some((k) => String(x.ocrOriginal[k] ?? '') !== String(x.ocrFields?.[k] ?? '')))
  const verifiedRows = docs.filter((x) => x.verifiedAt || x.rejectedAt)
  const turnaround = verifiedRows.map((x) => (new Date(x.verifiedAt || x.rejectedAt) - new Date(x.uploadedAt)) / 36e5).filter((h) => h >= 0)

  const reports = [
    { id: 'register', label: 'Document register', icon: FolderOpen, rows: register, open: (x) => `/documents/${x.id}`,
      kpis: [['Documents', docs.length, FolderOpen, 'brand'], ['Verified', docs.filter((x) => effectiveStatus(x) === 'VERIFIED').length, BadgeCheck, 'success'], ['In queue', docs.filter((x) => QUEUE_STATUSES.includes(x.status)).length, Clock, 'warning'], ['Rejected', docs.filter((x) => x.status === 'REJECTED').length, AlertTriangle, 'danger']],
      columns: [
        { key: 'n', header: 'Document', render: (x) => (<div><p className="font-medium text-ink">{typeName(x)}</p><p className="text-xs text-muted tabular">{x.documentNumber || '—'}</p></div>) },
        { key: 'e', header: 'Related to', hideBelow: 'md', render: (x) => `${x.entityLabel} (${ENTITY_LABEL[x.entityType]})` },
        { key: 'x', header: 'Expiry', hideBelow: 'lg', render: (x) => (x.expiryDate ? formatDate(x.expiryDate) : '—') },
        { key: 's', header: 'Status', render: (x) => <DocumentStatusBadge status={effectiveStatus(x)} /> },
        { key: 'u', header: 'Uploaded', hideBelow: 'sm', render: (x) => formatDate(x.uploadedAt) },
      ],
      csv: [['Reference', (x) => x.documentNumberRef], ['Type', typeName], ['Document Number', (x) => x.documentNumber], ['Entity', (x) => ENTITY_LABEL[x.entityType]], ['Related To', (x) => x.entityLabel], ['Expiry', (x) => x.expiryDate], ['Status', (x) => DOCUMENT_STATUS_META[effectiveStatus(x)].label], ['Uploaded', (x) => x.uploadedAt]] },
    { id: 'type', label: 'By document type', icon: Tags, rows: byType, open: (r) => `/documents?typeId=${r.id}`,
      columns: [{ key: 't', header: 'Type', render: (r) => <span className="font-medium">{r.type}</span> }, { key: 'n', header: 'Total', align: 'right', render: (r) => r.total }, { key: 'v', header: 'Verified', align: 'right', render: (r) => r.verified }, { key: 'q', header: 'In queue', align: 'right', render: (r) => r.queue }, { key: 'r', header: 'Rejected', align: 'right', hideBelow: 'sm', render: (r) => r.rejected }, { key: 'x', header: 'Expired', align: 'right', hideBelow: 'sm', render: (r) => r.expired }],
      csv: [['Type', (r) => r.type], ['Total', (r) => r.total], ['Verified', (r) => r.verified], ['In Queue', (r) => r.queue], ['Rejected', (r) => r.rejected], ['Expired', (r) => r.expired]] },
    { id: 'entity', label: 'By entity', icon: Users, rows: byEntity, open: (r) => `/documents?entityType=${r.id}`,
      columns: [{ key: 'e', header: 'Entity', render: (r) => <span className="font-medium">{r.entity}</span> }, { key: 'n', header: 'Documents', align: 'right', render: (r) => r.total }, { key: 'v', header: 'Verified', align: 'right', render: (r) => r.verified }, { key: 'p', header: 'Pending', align: 'right', render: (r) => r.pending }],
      csv: [['Entity', (r) => r.entity], ['Documents', (r) => r.total], ['Verified', (r) => r.verified], ['Pending', (r) => r.pending]] },
    { id: 'expiry', label: 'Expiry', icon: AlertTriangle, rows: expiring, open: (x) => `/documents/${x.id}`,
      kpis: Object.entries(EXPIRY_META).filter(([k]) => ['EXPIRED', 'TODAY', 'WEEK', 'MONTH'].includes(k)).map(([k, m]) => [m.label, expiring.filter((x) => expiryState(x.expiryDate).state === k).length, AlertTriangle, m.tone]),
      columns: [{ key: 'n', header: 'Document', render: (x) => (<div><p className="font-medium">{typeName(x)}</p><p className="text-xs text-muted">{x.entityLabel}</p></div>) }, { key: 'd', header: 'Expiry date', render: (x) => formatDate(x.expiryDate) }, { key: 'b', header: 'State', render: (x) => <ExpiryBadge date={x.expiryDate} /> }],
      csv: [['Type', typeName], ['Related To', (x) => x.entityLabel], ['Expiry', (x) => x.expiryDate], ['State', (x) => EXPIRY_META[expiryState(x.expiryDate).state].label], ['Days', (x) => expiryState(x.expiryDate).days]] },
    { id: 'ocr', label: 'OCR & review', icon: ScanText, rows: ocr, open: (x) => `/documents/${x.id}/review`,
      kpis: [['Processed by OCR', ocr.length, ScanText, 'info'], ['Values edited in review', edited.length, Percent, 'warning'], ['Edit rate', formatPercent(ocr.length ? (edited.length / ocr.length) * 100 : 0), Percent, 'neutral'], ['Avg. review time', turnaround.length ? `${(turnaround.reduce((s, h) => s + h, 0) / turnaround.length).toFixed(1)} h` : '—', Clock, 'brand']],
      columns: [{ key: 'n', header: 'Document', render: (x) => typeName(x) }, { key: 'p', header: 'Provider', render: (x) => <OcrProviderBadge provider={x.ocrProvider} /> }, { key: 'e', header: 'Edited fields', align: 'right', render: (x) => Object.keys(x.ocrOriginal || {}).filter((k) => String(x.ocrOriginal[k] ?? '') !== String(x.ocrFields?.[k] ?? '')).length }, { key: 's', header: 'Status', render: (x) => <DocumentStatusBadge status={effectiveStatus(x)} /> }],
      csv: [['Type', typeName], ['Provider', (x) => x.ocrProvider], ['Simulated', (x) => (x.ocrProvider === 'MOCK' ? 'Yes' : 'No')], ['Processed At', (x) => x.ocrProcessedAt], ['Status', (x) => effectiveStatus(x)]] },
  ]
  return (
    <>
      <PageHeader title="Document reports" description="Registers and summaries of the document repository, expiry and OCR review — exportable to CSV." />
      <ReportWorkspace name="documents" reports={reports} query={t.q} onQuery={t.setQuery} activeCount={t.activeFilterCount} onReset={t.reset} placeholder="Search documents…" note="Simulated OCR runs are labelled MOCK — they pre-fill values from records and do not read images.">
        <FilterSelect label="Document type" allLabel="All types" value={t.filters.typeId} onChange={(v) => t.setFilter('typeId', v)} options={d.documentTypes.map((x) => ({ value: x.id, label: x.name }))} />
        <FilterSelect label="Entity" allLabel="All entities" value={t.filters.entityType} onChange={(v) => t.setFilter('entityType', v)} options={DOCUMENT_ENTITIES.map((x) => ({ value: x.value, label: x.label }))} />
        <FilterSelect label="Status" allLabel="All statuses" value={t.filters.status} onChange={(v) => t.setFilter('status', v)} options={Object.entries(DOCUMENT_STATUS_META).map(([value, m]) => ({ value, label: m.label }))} />
        <FilterInput label="Uploaded from" type="date" value={t.filters.from} onChange={(e) => t.setFilter('from', e.target.value)} title="Uploaded from" />
        <FilterInput label="Uploaded to" type="date" value={t.filters.to} onChange={(e) => t.setFilter('to', e.target.value)} title="Uploaded to" />
      </ReportWorkspace>
    </>
  )
}
