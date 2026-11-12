import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FileBarChart, ClipboardList, UserRoundCheck, Navigation, Gauge, AlertTriangle, PackageSearch, FileText, Warehouse, MapPinned, Route, Boxes, IndianRupee, CheckCircle2, Percent } from 'lucide-react'
import { toast } from 'sonner'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Tabs from '../../components/common/Tabs'
import DataTable from '../../components/common/DataTable'
import EmptyState from '../../components/common/EmptyState'
import FilterToolbar, { FilterInput, FilterSelect } from '../../components/common/FilterToolbar'
import StatCard, { StatGrid } from '../../components/dashboard/StatCard'
import { DeliveryStatusBadge, DispatchStatusBadge } from '../../components/dispatch/DispatchBadges'
import { useDispatchData } from '../../hooks/useDispatchData'
import { useTableQuery } from '../../hooks/useTableQuery'
import { csvFilename, downloadCsv } from '../../services/csvService'
import { DELIVERY_STATUS_META, DISPATCH_OPTIONS, DISPATCH_STATUS_META } from '../../config/dispatchConfig'
import { formatCompactCurrency, formatDate, formatDateTime, formatMoney, formatNumber, formatPercent } from '../../utils/formatters'

const REPORTS = [
  { id: 'register', label: 'Dispatch register', icon: ClipboardList, kind: 'dispatch' },
  { id: 'assignment', label: 'Driver assignment', icon: UserRoundCheck, kind: 'dispatch' },
  { id: 'status', label: 'Delivery status', icon: Navigation, kind: 'delivery' },
  { id: 'driver', label: 'Driver performance', icon: Gauge, kind: 'delivery' },
  { id: 'failed', label: 'Failed deliveries', icon: AlertTriangle, kind: 'delivery' },
  { id: 'partial', label: 'Partial deliveries', icon: PackageSearch, kind: 'delivery' },
  { id: 'notes', label: 'Delivery note register', icon: FileText, kind: 'note' },
  { id: 'hub', label: 'Hub dispatch', icon: Warehouse, kind: 'dispatch' },
  { id: 'zone', label: 'Zone delivery', icon: MapPinned, kind: 'delivery' },
]
const sum = (list, f) => list.reduce((s, x) => s + (Number(f(x)) || 0), 0)
const rate = (good, total) => (total ? (good / total) * 100 : 0)
const qty = (d, f) => d.items.reduce((s, i) => s + (Number(i[f]) || 0), 0)

export default function DispatchReports() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const report = REPORTS.find((r) => r.id === params.get('report')) || REPORTS[0]
  const { dispatches, deliveries, notes, hubs, zones, drivers, lk } = useDispatchData()
  const t = useTableQuery({ filters: ['from', 'to', 'hubId', 'driverId', 'zoneId', 'status'] })
  const f = t.filters
  const q = t.q.trim().toLowerCase()
  const has = (...vals) => !q || vals.some((v) => String(v || '').toLowerCase().includes(q))
  const inDate = (d) => (!f.from || d >= f.from) && (!f.to || d <= f.to)

  const dsRows = useMemo(() => dispatches.filter((d) => inDate(d.dispatchDate) && (!f.hubId || d.hubId === f.hubId) && (!f.driverId || d.driverId === f.driverId) && (!f.zoneId || d.zoneId === f.zoneId)
    && (report.kind !== 'dispatch' || !f.status || d.status === f.status) && has(d.dispatchNumber, d.driverName, d.vehicleNumber)), [dispatches, f, q, report.kind]) // eslint-disable-line react-hooks/exhaustive-deps
  const dlRows = useMemo(() => deliveries.filter((d) => {
    const ds = lk.dispatches[d.dispatchId]
    return d.status !== 'CANCELLED' && ds && inDate(ds.dispatchDate) && (!f.hubId || d.hubId === f.hubId) && (!f.driverId || d.driverId === f.driverId) && (!f.zoneId || ds.zoneId === f.zoneId)
      && (report.kind !== 'delivery' || !f.status || d.status === f.status) && has(d.orderNumber, d.customerName, d.dispatchNumber, ds.driverName, d.deliveryNoteNumber)
  }), [deliveries, lk, f, q, report.kind]) // eslint-disable-line react-hooks/exhaustive-deps
  const noteRows = useMemo(() => notes.filter((n) => inDate(String(n.deliveryDate).slice(0, 10)) && (!f.hubId || n.hubId === f.hubId) && (!f.driverId || n.driverId === f.driverId)
    && (!f.zoneId || lk.dispatches[n.dispatchId]?.zoneId === f.zoneId) && (!f.status || n.deliveryStatus === f.status) && has(n.noteNumber, n.orderNumber, n.customerName, n.driverName)), [notes, lk, f, q]) // eslint-disable-line react-hooks/exhaustive-deps

  const group = (list, keyOf, labelOf, extra) => {
    const g = {}
    list.forEach((x) => { const k = keyOf(x); if (!k) return; (g[k] ||= { id: k, name: labelOf(k), items: [] }).items.push(x) })
    return Object.values(g).map((r) => ({ ...r, ...extra(r.items) })).sort((a, b) => b.count - a.count)
  }
  const outcome = (items) => {
    const closed = items.filter((d) => ['DELIVERED', 'PARTIALLY_DELIVERED', 'FAILED', 'RETURNED'].includes(d.status))
    const delivered = items.filter((d) => d.status === 'DELIVERED').length
    const partial = items.filter((d) => d.status === 'PARTIALLY_DELIVERED').length
    const failed = items.filter((d) => ['FAILED', 'RETURNED'].includes(d.status)).length
    const onTime = items.filter((d) => d.completedAt && lk.dispatches[d.dispatchId] && d.completedAt.slice(0, 10) <= lk.dispatches[d.dispatchId].dispatchDate).length
    return {
      count: items.length, delivered, partial, failed, pending: items.length - closed.length, dispatches: new Set(items.map((d) => d.dispatchId)).size,
      units: sum(items, (d) => qty(d, 'deliveredQuantity')), successRate: rate(delivered + partial, closed.length), onTimeRate: rate(onTime, delivered + partial),
    }
  }

  const data = (() => {
    switch (report.id) {
      case 'register':
      case 'assignment': return report.id === 'assignment' ? dsRows.filter((d) => d.driverId) : dsRows
      case 'status': return dlRows
      case 'failed': return dlRows.filter((d) => ['FAILED', 'RETURNED'].includes(d.status))
      case 'partial': return dlRows.filter((d) => d.status === 'PARTIALLY_DELIVERED')
      case 'notes': return noteRows
      case 'driver': return group(dlRows, (d) => d.driverId, (id) => lk.drivers[id]?.name || 'Former driver', outcome)
      case 'zone': return group(dlRows, (d) => lk.dispatches[d.dispatchId]?.zoneId, (id) => lk.zones[id]?.name || 'No zone', outcome)
      case 'hub': return group(dsRows, (d) => d.hubId, (id) => lk.hubs[id]?.name || '—', (items) => ({
        count: items.length, stops: sum(items, (d) => d.totalDeliveries), units: sum(items, (d) => d.totalQuantity), value: sum(items, (d) => d.totalValue),
        closed: items.filter((d) => ['COMPLETED', 'PARTIALLY_DELIVERED'].includes(d.status)).length, live: items.filter((d) => ['CONFIRMED', 'IN_TRANSIT'].includes(d.status)).length,
        cancelled: items.filter((d) => d.status === 'CANCELLED').length,
      }))
      default: return []
    }
  })()

  const kpis = (() => {
    if (report.kind === 'dispatch' && report.id !== 'hub') {
      return [['Dispatches', data.length, Route, 'brand'], ['Stops', formatNumber(sum(data, (d) => d.totalDeliveries)), ClipboardList, 'info'], ['Units', formatNumber(sum(data, (d) => d.totalQuantity)), Boxes, 'accent'], ['Value', formatCompactCurrency(sum(data, (d) => d.totalValue)), IndianRupee, 'success']]
    }
    if (report.id === 'hub') return [['Hubs', data.length, Warehouse, 'brand'], ['Dispatches', sum(data, (r) => r.count), Route, 'info'], ['Units', formatNumber(sum(data, (r) => r.units)), Boxes, 'accent'], ['Value', formatCompactCurrency(sum(data, (r) => r.value)), IndianRupee, 'success']]
    if (report.id === 'notes') return [['Delivery notes', data.length, FileText, 'brand'], ['Units delivered', formatNumber(sum(data, (n) => n.totalDelivered)), CheckCircle2, 'success'], ['Units remaining', formatNumber(sum(data, (n) => n.totalRemaining)), PackageSearch, 'warning'], ['Units damaged', formatNumber(sum(data, (n) => n.totalDamaged)), AlertTriangle, 'danger']]
    const base = dlRows
    const closed = base.filter((d) => ['DELIVERED', 'PARTIALLY_DELIVERED', 'FAILED', 'RETURNED'].includes(d.status))
    return [
      ['Stops', base.length, Navigation, 'brand'], ['Delivered', base.filter((d) => d.status === 'DELIVERED').length, CheckCircle2, 'success'],
      ['Partial / failed', `${base.filter((d) => d.status === 'PARTIALLY_DELIVERED').length} / ${base.filter((d) => ['FAILED', 'RETURNED'].includes(d.status)).length}`, AlertTriangle, 'danger'],
      ['Success rate', formatPercent(rate(closed.filter((d) => ['DELIVERED', 'PARTIALLY_DELIVERED'].includes(d.status)).length, closed.length)), Percent, 'info'],
    ]
  })()

  const ds = (d) => lk.dispatches[d.dispatchId]
  const views = {
    register: {
      columns: [
        { key: 'n', header: 'Dispatch', render: (d) => (<div><p className="font-medium tabular whitespace-nowrap">{d.dispatchNumber}</p><p className="text-xs text-muted">{formatDate(d.dispatchDate)}</p></div>) },
        { key: 'h', header: 'Hub / zone', hideBelow: 'md', render: (d) => (<div><p>{lk.hubs[d.hubId]?.name}</p><p className="text-xs text-muted">{lk.zones[d.zoneId]?.name || '—'}</p></div>) },
        { key: 'dr', header: 'Driver', hideBelow: 'lg', render: (d) => d.driverName || '—' },
        { key: 's', header: 'Stops', align: 'right', render: (d) => d.totalDeliveries },
        { key: 'u', header: 'Units', align: 'right', hideBelow: 'sm', render: (d) => formatNumber(d.totalQuantity) },
        { key: 'v', header: 'Value', align: 'right', hideBelow: 'xl', render: (d) => <span className="whitespace-nowrap">{formatMoney(d.totalValue)}</span> },
        { key: 'st', header: 'Status', render: (d) => <DispatchStatusBadge status={d.status} /> },
      ],
      csv: [['Dispatch Number', (d) => d.dispatchNumber], ['Dispatch Date', (d) => d.dispatchDate], ['Hub', (d) => lk.hubs[d.hubId]?.name], ['Zone', (d) => lk.zones[d.zoneId]?.name || ''], ['Driver', (d) => d.driverName || ''], ['Vehicle', (d) => d.vehicleNumber || ''], ['Deliveries', (d) => d.totalDeliveries], ['Products', (d) => d.totalProducts], ['Total Quantity', (d) => d.totalQuantity], ['Total Value', (d) => Number(d.totalValue).toFixed(2)], ['Status', (d) => DISPATCH_STATUS_META[d.status]?.label], ['Created By', (d) => d.createdByName || d.createdBy], ['Created At', (d) => d.createdAt], ['Confirmed At', (d) => d.confirmedAt || ''], ['Completed At', (d) => d.completedAt || ''], ['Cancel Reason', (d) => d.cancelReason || '']],
      open: (d) => `/dispatch/${d.id}`,
    },
    assignment: {
      columns: [
        { key: 'n', header: 'Dispatch', render: (d) => (<div><p className="font-medium tabular whitespace-nowrap">{d.dispatchNumber}</p><p className="text-xs text-muted">{formatDate(d.dispatchDate)}</p></div>) },
        { key: 'dr', header: 'Driver', render: (d) => d.driverName },
        { key: 'v', header: 'Vehicle', hideBelow: 'sm', render: (d) => <span className="tabular whitespace-nowrap">{d.vehicleNumber}</span> },
        { key: 'l', header: 'Load', align: 'right', hideBelow: 'md', render: (d) => `${formatNumber(d.totalQuantity)} / ${formatNumber(lk.vehicles[d.vehicleId]?.capacity || 0)}` },
        { key: 'a', header: 'Assigned', hideBelow: 'lg', render: (d) => <span className="text-xs whitespace-nowrap">{formatDateTime(d.assignedAt)}</span> },
        { key: 'c', header: 'Confirmed', hideBelow: 'xl', render: (d) => <span className="text-xs whitespace-nowrap">{formatDateTime(d.confirmedAt)}</span> },
        { key: 'st', header: 'Status', render: (d) => <DispatchStatusBadge status={d.status} /> },
      ],
      csv: [['Dispatch Number', (d) => d.dispatchNumber], ['Dispatch Date', (d) => d.dispatchDate], ['Driver', (d) => d.driverName], ['Driver Code', (d) => lk.drivers[d.driverId]?.code || ''], ['Vehicle', (d) => d.vehicleNumber], ['Vehicle Capacity', (d) => lk.vehicles[d.vehicleId]?.capacity || ''], ['Load', (d) => d.totalQuantity], ['Assigned At', (d) => d.assignedAt || ''], ['Confirmed At', (d) => d.confirmedAt || ''], ['Status', (d) => DISPATCH_STATUS_META[d.status]?.label]],
      open: (d) => `/dispatch/${d.id}`,
    },
    status: {
      columns: [
        { key: 'o', header: 'Order', render: (d) => (<div><p className="font-medium tabular whitespace-nowrap">{d.orderNumber}</p><p className="text-xs text-muted truncate max-w-[180px]">{d.customerName}</p></div>) },
        { key: 'd', header: 'Dispatch', hideBelow: 'md', render: (d) => <span className="text-xs tabular whitespace-nowrap">{d.dispatchNumber} · {formatDate(ds(d)?.dispatchDate)}</span> },
        { key: 'dr', header: 'Driver', hideBelow: 'lg', render: (d) => ds(d)?.driverName },
        { key: 'q', header: 'Delivered / dispatched', align: 'right', hideBelow: 'sm', render: (d) => <span className="tabular">{formatNumber(qty(d, 'deliveredQuantity'))} / {formatNumber(qty(d, 'dispatchedQuantity'))}</span> },
        { key: 'st', header: 'Status', render: (d) => <DeliveryStatusBadge status={d.status} /> },
      ],
      csv: [['Order Number', (d) => d.orderNumber], ['Customer', (d) => d.customerName], ['Dispatch Number', (d) => d.dispatchNumber], ['Dispatch Date', (d) => ds(d)?.dispatchDate], ['Driver', (d) => ds(d)?.driverName], ['Stop', (d) => d.sequence], ['Status', (d) => DELIVERY_STATUS_META[d.status]?.label], ['Dispatched Qty', (d) => qty(d, 'dispatchedQuantity')], ['Delivered Qty', (d) => qty(d, 'deliveredQuantity')], ['OTP', (d) => d.otpStatus], ['Delivery Note', (d) => d.deliveryNoteNumber || ''], ['Started At', (d) => d.startedAt || ''], ['Closed At', (d) => d.completedAt || d.failedAt || '']],
      open: (d) => `/dispatch/deliveries/${d.id}`,
    },
    failed: {
      columns: [
        { key: 'o', header: 'Order', render: (d) => (<div><p className="font-medium tabular whitespace-nowrap">{d.orderNumber}</p><p className="text-xs text-muted truncate max-w-[180px]">{d.customerName}</p></div>) },
        { key: 'r', header: 'Reason', render: (d) => d.failureReason },
        { key: 'm', header: 'Remarks', hideBelow: 'lg', render: (d) => <span className="block max-w-xs truncate text-muted">{d.failureRemarks}</span> },
        { key: 'dr', header: 'Driver', hideBelow: 'md', render: (d) => ds(d)?.driverName },
        { key: 'w', header: 'Failed', hideBelow: 'sm', render: (d) => <span className="text-xs whitespace-nowrap">{formatDateTime(d.failedAt)}</span> },
        { key: 'rv', header: 'Review', render: (d) => (d.reviewStatus === 'PENDING' ? <span className="text-xs font-medium text-danger">Pending</span> : <DeliveryStatusBadge status={d.status} />) },
      ],
      csv: [['Order Number', (d) => d.orderNumber], ['Customer', (d) => d.customerName], ['Dispatch Number', (d) => d.dispatchNumber], ['Driver', (d) => ds(d)?.driverName], ['Failure Reason', (d) => d.failureReason], ['Remarks', (d) => d.failureRemarks], ['Failed At', (d) => d.failedAt], ['Attempt', (d) => d.attempt || 1], ['Review Status', (d) => d.reviewStatus || ''], ['Review Remarks', (d) => d.reviewRemarks || ''], ['Returned To Hub', (d) => (d.returnedToHub ? 'Yes' : 'No')]],
      open: (d) => `/dispatch/deliveries/${d.id}`,
    },
    partial: {
      columns: [
        { key: 'o', header: 'Order', render: (d) => (<div><p className="font-medium tabular whitespace-nowrap">{d.orderNumber}</p><p className="text-xs text-muted truncate max-w-[180px]">{d.customerName}</p></div>) },
        { key: 'dv', header: 'Delivered', align: 'right', render: (d) => formatNumber(qty(d, 'deliveredQuantity')) },
        { key: 'rm', header: 'Remaining', align: 'right', render: (d) => formatNumber(qty(d, 'remainingQuantity')) },
        { key: 'dm', header: 'Damaged', align: 'right', hideBelow: 'sm', render: (d) => formatNumber(qty(d, 'damagedQuantity')) },
        { key: 'n', header: 'Note', hideBelow: 'md', render: (d) => <span className="text-xs tabular">{d.deliveryNoteNumber}</span> },
        { key: 'rv', header: 'Review', hideBelow: 'lg', render: (d) => (d.reviewStatus === 'PENDING' ? <span className="text-xs font-medium text-danger">Pending</span> : <span className="text-xs text-muted">Reviewed{d.returnedToHub ? ' · returned' : ''}</span>) },
      ],
      csv: [['Order Number', (d) => d.orderNumber], ['Customer', (d) => d.customerName], ['Dispatch Number', (d) => d.dispatchNumber], ['Driver', (d) => ds(d)?.driverName], ['Dispatched Qty', (d) => qty(d, 'dispatchedQuantity')], ['Delivered Qty', (d) => qty(d, 'deliveredQuantity')], ['Remaining Qty', (d) => qty(d, 'remainingQuantity')], ['Damaged Qty', (d) => qty(d, 'damagedQuantity')], ['Delivery Note', (d) => d.deliveryNoteNumber], ['Remarks', (d) => d.remarks], ['Review Status', (d) => d.reviewStatus || ''], ['Returned To Hub', (d) => (d.returnedToHub ? 'Yes' : 'No')]],
      open: (d) => `/dispatch/deliveries/${d.id}`,
    },
    notes: {
      columns: [
        { key: 'n', header: 'Delivery note', render: (n) => (<div><p className="font-medium tabular whitespace-nowrap">{n.noteNumber}</p><p className="text-xs text-muted tabular">{n.orderNumber}</p></div>) },
        { key: 'c', header: 'Customer', render: (n) => <span className="block max-w-[200px] truncate">{n.customerName}</span> },
        { key: 'dr', header: 'Driver', hideBelow: 'lg', render: (n) => n.driverName },
        { key: 'q', header: 'Delivered', align: 'right', hideBelow: 'sm', render: (n) => formatNumber(n.totalDelivered) },
        { key: 'dt', header: 'Date', hideBelow: 'md', render: (n) => <span className="text-xs whitespace-nowrap">{formatDateTime(n.deliveryDate)}</span> },
        { key: 'st', header: 'Status', render: (n) => <DeliveryStatusBadge status={n.deliveryStatus} /> },
      ],
      csv: [['Delivery Note Number', (n) => n.noteNumber], ['Order Number', (n) => n.orderNumber], ['Dispatch Number', (n) => n.dispatchNumber], ['Customer', (n) => n.customerName], ['Customer Mobile', (n) => n.customerMobile], ['Delivery Date', (n) => n.deliveryDate], ['Driver', (n) => n.driverName], ['Vehicle', (n) => n.vehicleNumber], ['Hub', (n) => n.hubName], ['Delivered Qty', (n) => n.totalDelivered], ['Remaining Qty', (n) => n.totalRemaining], ['Damaged Qty', (n) => n.totalDamaged], ['Delivery Status', (n) => DELIVERY_STATUS_META[n.deliveryStatus]?.label], ['OTP', (n) => n.otpStatus], ['Received By', (n) => n.customerAcknowledgement], ['Generated At', (n) => n.generatedAt]],
      open: (n) => `/dispatch/delivery-notes/${n.id}`,
    },
  }
  const outcomeView = (label) => ({
    columns: [
      { key: 'n', header: label, render: (r) => <span className="font-medium">{r.name}</span> },
      { key: 'c', header: 'Stops', align: 'right', render: (r) => r.count },
      { key: 'd', header: 'Delivered', align: 'right', render: (r) => r.delivered },
      { key: 'p', header: 'Partial', align: 'right', hideBelow: 'sm', render: (r) => r.partial },
      { key: 'f', header: 'Failed', align: 'right', hideBelow: 'sm', render: (r) => r.failed },
      { key: 'pe', header: 'Pending', align: 'right', hideBelow: 'md', render: (r) => r.pending },
      { key: 's', header: 'Success', align: 'right', render: (r) => formatPercent(r.successRate) },
      { key: 'o', header: 'On time', align: 'right', hideBelow: 'lg', render: (r) => formatPercent(r.onTimeRate) },
    ],
    csv: [[label, (r) => r.name], ['Dispatches', (r) => r.dispatches], ['Stops', (r) => r.count], ['Delivered', (r) => r.delivered], ['Partial', (r) => r.partial], ['Failed', (r) => r.failed], ['Pending', (r) => r.pending], ['Units Delivered', (r) => r.units], ['Success Rate %', (r) => r.successRate.toFixed(1)], ['On Time %', (r) => r.onTimeRate.toFixed(1)]],
    open: (r) => (label === 'Driver' ? (lk.drivers[r.id] ? `/dispatch/drivers/${r.id}` : null) : `/dispatch/delivery-tracking?zoneId=${r.id}`),
  })
  views.driver = outcomeView('Driver')
  views.zone = outcomeView('Zone')
  views.hub = {
    columns: [
      { key: 'n', header: 'Hub', render: (r) => <span className="font-medium">{r.name}</span> },
      { key: 'c', header: 'Dispatches', align: 'right', render: (r) => r.count },
      { key: 's', header: 'Stops', align: 'right', hideBelow: 'sm', render: (r) => r.stops },
      { key: 'u', header: 'Units', align: 'right', render: (r) => formatNumber(r.units) },
      { key: 'v', header: 'Value', align: 'right', hideBelow: 'md', render: (r) => <span className="whitespace-nowrap">{formatMoney(r.value)}</span> },
      { key: 'cl', header: 'Closed', align: 'right', hideBelow: 'lg', render: (r) => r.closed },
      { key: 'l', header: 'On the road', align: 'right', hideBelow: 'lg', render: (r) => r.live },
      { key: 'x', header: 'Cancelled', align: 'right', hideBelow: 'xl', render: (r) => r.cancelled },
    ],
    csv: [['Hub', (r) => r.name], ['Dispatches', (r) => r.count], ['Stops', (r) => r.stops], ['Units', (r) => r.units], ['Value', (r) => r.value.toFixed(2)], ['Closed', (r) => r.closed], ['On The Road', (r) => r.live], ['Cancelled', (r) => r.cancelled]],
    open: (r) => `/dispatch/planning?view=list&hubId=${r.id}`,
  }
  const view = views[report.id]
  const statusOptions = report.kind === 'dispatch' ? DISPATCH_OPTIONS.dispatchStatuses : DISPATCH_OPTIONS.deliveryStatuses.filter((o) => o.value !== 'CANCELLED')
  const onExport = () => {
    const n = downloadCsv(csvFilename(`dispatch-report-${report.id}`), data, view.csv.map(([header, value]) => ({ header, value })))
    toast.success(`Exported ${n} rows`)
  }
  const total = report.kind === 'note' ? notes.length : report.kind === 'dispatch' ? dispatches.length : deliveries.length
  return (
    <>
      <PageHeader title="Delivery reports" description="Dispatch, driver, delivery and delivery-note reports with filters and CSV export." />
      <Card className="mb-6">
        <Tabs value={report.id} onChange={(id) => { const p = new URLSearchParams(params); p.set('report', id); p.delete('page'); p.delete('status'); setParams(p, { replace: true }) }} tabs={REPORTS} />
      </Card>
      <StatGrid cols={4}>{kpis.map(([label, value, icon, tone]) => <StatCard key={label} label={label} value={value} icon={icon} tone={tone} />)}</StatGrid>
      <Card className="mt-6">
        <FilterToolbar query={t.q} onQuery={t.setQuery} placeholder="Search dispatch, order, customer, driver…" total={total} filteredCount={data.length} activeCount={t.activeFilterCount} onReset={t.reset} onExport={onExport}>
          <FilterInput label="From" type="date" value={f.from} onChange={(e) => t.setFilter('from', e.target.value)} title={report.kind === 'note' ? 'Delivery date from' : 'Dispatch date from'} />
          <FilterInput label="To" type="date" value={f.to} onChange={(e) => t.setFilter('to', e.target.value)} title={report.kind === 'note' ? 'Delivery date to' : 'Dispatch date to'} />
          <FilterSelect label="Hub" allLabel="All hubs" value={f.hubId} onChange={(v) => t.setFilter('hubId', v)} options={hubs.map((h) => ({ value: h.id, label: h.name }))} />
          <FilterSelect label="Driver" allLabel="All drivers" value={f.driverId} onChange={(v) => t.setFilter('driverId', v)} options={drivers.map((d) => ({ value: d.id, label: d.name }))} />
          <FilterSelect label="Zone" allLabel="All zones" value={f.zoneId} onChange={(v) => t.setFilter('zoneId', v)} options={zones.map((z) => ({ value: z.id, label: z.name }))} />
          <FilterSelect label="Status" allLabel="Any status" value={f.status} onChange={(v) => t.setFilter('status', v)} options={statusOptions} />
        </FilterToolbar>
        <p className="-mt-2 mb-3 text-xs text-muted">Dates filter on the {report.kind === 'note' ? 'delivery date' : 'dispatch date'}. Status filters {report.kind === 'dispatch' ? 'dispatches' : 'deliveries'}.</p>
        <DataTable caption={report.label} rows={data} columns={view.columns} pageSize={12} page={t.page} onPageChange={t.setPage}
          onRowClick={(r) => { const to = view.open(r); if (to) navigate(to) }} empty={<EmptyState icon={FileBarChart} title="No data for these filters" />} />
      </Card>
    </>
  )
}
