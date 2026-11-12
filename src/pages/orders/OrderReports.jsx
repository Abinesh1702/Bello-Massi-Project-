import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { FileBarChart, Users, Building2, PieChart, Gavel, XCircle, Layers, ClipboardList, IndianRupee, Percent, Clock, Boxes } from 'lucide-react'
import { toast } from 'sonner'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Tabs from '../../components/common/Tabs'
import DataTable from '../../components/common/DataTable'
import EmptyState from '../../components/common/EmptyState'
import FilterToolbar, { FilterInput, FilterSelect } from '../../components/common/FilterToolbar'
import StatCard, { StatGrid } from '../../components/dashboard/StatCard'
import SingleBarChart from '../../components/dashboard/charts/SingleBarChart'
import { ApprovalStatusBadge, OrderStatusBadge } from '../../components/orders/OrderBadges'
import { CreditBadge } from '../../components/masterdata/Badges'
import { useMasterData } from '../../hooks/useMasterData'
import { useStoredValue } from '../../hooks/useLocalStorage'
import { useAuth } from '../../hooks/useAuth'
import { useTableQuery } from '../../hooks/useTableQuery'
import { canViewOrder } from '../../services/orderService'
import { getCreditInfo } from '../../services/customerService'
import { csvFilename, downloadCsv } from '../../services/csvService'
import { STORAGE_KEYS, ORDER_STATUS as S, ORDER_STATUS_META, POST_APPROVAL_STATUSES } from '../../utils/constants'
import { formatCompactCurrency, formatDate, formatDateTime, formatMoney, formatNumber, formatPercent } from '../../utils/formatters'

const REPORTS = [
  { id: 'register', label: 'Order register', icon: ClipboardList, dateLabel: 'order date' },
  { id: 'salesman', label: 'Salesman', icon: Users, dateLabel: 'order date' },
  { id: 'customer', label: 'Customer', icon: Building2, dateLabel: 'order date' },
  { id: 'status', label: 'Order status', icon: PieChart, dateLabel: 'order date' },
  { id: 'approval', label: 'Approvals', icon: Gavel, dateLabel: 'decision date' },
  { id: 'rejection', label: 'Rejections', icon: XCircle, dateLabel: 'rejection date' },
  { id: 'consolidation', label: 'Consolidation', icon: Layers, dateLabel: 'consolidation date' },
]

const sum = (list, f = (o) => o.totalAmount) => list.reduce((s, o) => s + (Number(f(o)) || 0), 0)
const inRange = (iso, from, to) => {
  if (!iso) return false
  const d = String(iso).slice(0, 10)
  return (!from || d >= from) && (!to || d <= to)
}
const hours = (a, b) => (a && b ? dayjs(b).diff(dayjs(a), 'minute') / 60 : null)
const avg = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0)
const fmtHours = (h) => (h >= 24 ? `${(h / 24).toFixed(1)} days` : `${h.toFixed(1)} h`)

export default function OrderReports() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const report = REPORTS.find((r) => r.id === params.get('report')) || REPORTS[0]
  const { user } = useAuth()
  const { orders, customers, hubs, salesReps } = useMasterData()
  const approvals = useStoredValue(STORAGE_KEYS.APPROVALS, [])
  const consolidations = useStoredValue(STORAGE_KEYS.CONSOLIDATIONS, [])
  const t = useTableQuery({ filters: ['from', 'to', 'customerId', 'salesmanId', 'hubId', 'status'] })
  const f = t.filters

  // Reports cover submitted orders the role can see (drafts are private work-in-progress)
  const scoped = useMemo(() => orders.filter((o) => o.orderStatus !== S.DRAFT && canViewOrder(user, o)), [orders, user])
  const byId = useMemo(() => Object.fromEntries(scoped.map((o) => [o.id, o])), [scoped])
  const matchesOrder = (o) => o
    && (!f.customerId || o.customerId === f.customerId) && (!f.salesmanId || o.salesmanId === f.salesmanId)
    && (!f.hubId || o.hubId === f.hubId) && (!f.status || o.orderStatus === f.status)
    && (!t.q || [o.orderNumber, o.customerName, o.salesmanName].some((v) => String(v || '').toLowerCase().includes(t.q.trim().toLowerCase())))
  const base = useMemo(() => scoped.filter((o) => matchesOrder(o) && inRange(o.orderDate, f.from, f.to)), [scoped, f, t.q]) // eslint-disable-line react-hooks/exhaustive-deps

  const data = useMemo(() => {
    switch (report.id) {
      case 'salesman': {
        const g = {}
        base.forEach((o) => {
          const k = o.salesmanId
          g[k] ||= { id: k, salesman: o.salesmanName, orders: 0, value: 0, approved: 0, rejected: 0, returned: 0, pending: 0 }
          const r = g[k]
          r.orders += 1
          r.value += o.totalAmount
          if (POST_APPROVAL_STATUSES.includes(o.orderStatus)) r.approved += 1
          if (o.orderStatus === S.REJECTED) r.rejected += 1
          if (o.orderStatus === S.RETURNED) r.returned += 1
          if (o.orderStatus === S.SUBMITTED) r.pending += 1
        })
        return Object.values(g).map((r) => ({ ...r, avgValue: r.value / r.orders, approvalRate: r.approved + r.rejected ? (r.approved / (r.approved + r.rejected)) * 100 : 0 })).sort((a, b) => b.value - a.value)
      }
      case 'customer': {
        const g = {}
        base.forEach((o) => {
          g[o.customerId] ||= { id: o.customerId, customer: o.customerName, code: o.customerCode, orders: 0, value: 0, qty: 0, last: '' }
          const r = g[o.customerId]
          r.orders += 1
          r.value += o.totalAmount
          r.qty += o.totalQuantity
          if (o.orderDate > r.last) r.last = o.orderDate
        })
        return Object.values(g).map((r) => ({ ...r, avgValue: r.value / r.orders, credit: getCreditInfo(customers.find((c) => c.id === r.id)).status })).sort((a, b) => b.value - a.value)
      }
      case 'status': {
        const total = base.length || 1
        return Object.keys(ORDER_STATUS_META).filter((k) => k !== S.DRAFT).map((k) => {
          const list = base.filter((o) => o.orderStatus === k)
          return { id: k, status: k, count: list.length, value: sum(list), share: (list.length / total) * 100 }
        }).filter((r) => r.count > 0)
      }
      case 'approval':
        return approvals.filter((a) => inRange(a.decidedAt, f.from, f.to) && matchesOrder(byId[a.orderId]))
          .map((a) => ({ ...a, order: byId[a.orderId], turnaround: hours(byId[a.orderId]?.submittedAt, a.decidedAt) }))
          .sort((a, b) => (a.decidedAt < b.decidedAt ? 1 : -1))
      case 'rejection':
        return scoped.filter((o) => o.orderStatus === S.REJECTED && matchesOrder(o) && inRange(o.rejectedAt, f.from, f.to)).sort((a, b) => (a.rejectedAt < b.rejectedAt ? 1 : -1))
      case 'consolidation':
        return consolidations.filter((c) => inRange(c.consolidationDate, f.from, f.to) && matchesOrder(byId[c.orderId]))
          .map((c) => ({ ...c, order: byId[c.orderId], wait: hours(byId[c.orderId]?.approvedAt, c.consolidationDate) }))
          .sort((a, b) => (a.consolidationDate < b.consolidationDate ? 1 : -1))
      default:
        return [...base].sort((a, b) => (a.orderDate < b.orderDate ? 1 : a.orderDate > b.orderDate ? -1 : (a.orderNumber < b.orderNumber ? 1 : -1)))
    }
  }, [report.id, base, scoped, approvals, consolidations, byId, customers, f]) // eslint-disable-line react-hooks/exhaustive-deps

  const kpis = (() => {
    switch (report.id) {
      case 'approval': {
        const c = (d) => data.filter((a) => a.decision === d).length
        const decided = c('APPROVED') + c('REJECTED')
        return [
          ['Decisions', data.length, Gavel, 'brand'], ['Approved', c('APPROVED'), Gavel, 'success'], ['Returned', c('RETURNED'), Gavel, 'warning'],
          ['Approval rate', formatPercent(decided ? (c('APPROVED') / decided) * 100 : 0), Percent, 'info'],
          ['Avg. time to decision', data.some((a) => a.turnaround !== null) ? fmtHours(avg(data.filter((a) => a.turnaround !== null).map((a) => a.turnaround))) : '—', Clock, 'neutral'],
        ]
      }
      case 'rejection': {
        const reasons = {}
        data.forEach((o) => { reasons[o.rejectionReason] = (reasons[o.rejectionReason] || 0) + 1 })
        const top = Object.entries(reasons).sort((a, b) => b[1] - a[1])[0]
        return [['Rejected orders', data.length, XCircle, 'danger'], ['Rejected value', formatCompactCurrency(sum(data)), IndianRupee, 'accent'], ['Top reason', top ? `${top[0]} (${top[1]})` : '—', PieChart, 'neutral']]
      }
      case 'consolidation':
        return [
          ['Consolidations', data.length, Layers, 'brand'], ['Released to dispatch', data.filter((c) => c.readyForDispatchAt).length, Layers, 'success'],
          ['Consolidated value', formatCompactCurrency(sum(data, (c) => c.totalAmount)), IndianRupee, 'accent'],
          ['Avg. approval → consolidation', data.some((c) => c.wait !== null) ? fmtHours(avg(data.filter((c) => c.wait !== null).map((c) => c.wait))) : '—', Clock, 'neutral'],
        ]
      default:
        return [
          ['Orders', base.length, ClipboardList, 'brand'], ['Order value', formatCompactCurrency(sum(base)), IndianRupee, 'accent'],
          ['Avg. order value', formatCompactCurrency(base.length ? sum(base) / base.length : 0), IndianRupee, 'info'],
          ['Approved value', formatCompactCurrency(sum(base.filter((o) => POST_APPROVAL_STATUSES.includes(o.orderStatus)))), IndianRupee, 'success'],
          ['Total quantity', formatNumber(sum(base, (o) => o.totalQuantity)), Boxes, 'neutral'],
        ]
    }
  })()

  const views = {
    register: {
      columns: [
        { key: 'n', header: 'Order', render: (o) => (<div><p className="font-medium tabular whitespace-nowrap">{o.orderNumber}</p><p className="text-xs text-muted">{formatDate(o.orderDate)}</p></div>) },
        { key: 'c', header: 'Customer', render: (o) => <span className="truncate block max-w-[200px]">{o.customerName}</span> },
        { key: 's', header: 'Salesman', hideBelow: 'lg', render: (o) => o.salesmanName },
        { key: 'h', header: 'Hub', hideBelow: '2xl', render: (o) => o.hubName },
        { key: 'q', header: 'Qty', align: 'right', hideBelow: 'md', render: (o) => formatNumber(o.totalQuantity) },
        { key: 'sub', header: 'Subtotal', align: 'right', hideBelow: '2xl', render: (o) => formatMoney(o.subtotal) },
        { key: 'tax', header: 'Tax', align: 'right', hideBelow: 'xl', render: (o) => formatMoney(o.taxAmount) },
        { key: 't', header: 'Total', align: 'right', render: (o) => <span className="whitespace-nowrap">{formatMoney(o.totalAmount)}</span> },
        { key: 'st', header: 'Status', render: (o) => <OrderStatusBadge status={o.orderStatus} /> },
      ],
      csv: [
        ['Order Number', (o) => o.orderNumber], ['Order Date', (o) => o.orderDate], ['Customer', (o) => o.customerName], ['Salesman', (o) => o.salesmanName], ['Hub', (o) => o.hubName],
        ['Quantity', (o) => o.totalQuantity], ['Subtotal', (o) => o.subtotal.toFixed(2)], ['Discount', (o) => o.discountAmount.toFixed(2)], ['Tax', (o) => o.taxAmount.toFixed(2)],
        ['Total', (o) => o.totalAmount.toFixed(2)], ['Status', (o) => ORDER_STATUS_META[o.orderStatus].label], ['Approval', (o) => o.approvalStatus],
      ],
      open: (o) => `/orders/${o.id}`,
    },
    salesman: {
      columns: [
        { key: 's', header: 'Salesman', render: (r) => <span className="font-medium">{r.salesman}</span> },
        { key: 'o', header: 'Orders', align: 'right', render: (r) => r.orders },
        { key: 'v', header: 'Value', align: 'right', render: (r) => formatMoney(r.value) },
        { key: 'a', header: 'Approved', align: 'right', hideBelow: 'sm', render: (r) => r.approved },
        { key: 'p', header: 'Pending', align: 'right', hideBelow: 'md', render: (r) => r.pending },
        { key: 'ret', header: 'Returned', align: 'right', hideBelow: 'md', render: (r) => r.returned },
        { key: 'rej', header: 'Rejected', align: 'right', hideBelow: 'sm', render: (r) => r.rejected },
        { key: 'rate', header: 'Approval rate', align: 'right', hideBelow: 'lg', render: (r) => formatPercent(r.approvalRate) },
        { key: 'avg', header: 'Avg. value', align: 'right', hideBelow: 'xl', render: (r) => formatMoney(r.avgValue) },
      ],
      csv: [['Salesman', (r) => r.salesman], ['Orders', (r) => r.orders], ['Value', (r) => r.value.toFixed(2)], ['Approved', (r) => r.approved], ['Pending', (r) => r.pending], ['Returned', (r) => r.returned], ['Rejected', (r) => r.rejected], ['Approval Rate %', (r) => r.approvalRate.toFixed(1)], ['Average Value', (r) => r.avgValue.toFixed(2)]],
      open: (r) => `/orders?salesmanId=${r.id}`,
    },
    customer: {
      columns: [
        { key: 'c', header: 'Customer', render: (r) => (<div><p className="font-medium">{r.customer}</p><p className="text-xs text-muted tabular">{r.code}</p></div>) },
        { key: 'o', header: 'Orders', align: 'right', render: (r) => r.orders },
        { key: 'v', header: 'Value', align: 'right', render: (r) => formatMoney(r.value) },
        { key: 'q', header: 'Quantity', align: 'right', hideBelow: 'md', render: (r) => formatNumber(r.qty) },
        { key: 'a', header: 'Avg. value', align: 'right', hideBelow: 'lg', render: (r) => formatMoney(r.avgValue) },
        { key: 'l', header: 'Last order', hideBelow: 'sm', render: (r) => formatDate(r.last) },
        { key: 'cr', header: 'Credit now', hideBelow: 'md', render: (r) => <CreditBadge status={r.credit} /> },
      ],
      csv: [['Customer Code', (r) => r.code], ['Customer', (r) => r.customer], ['Orders', (r) => r.orders], ['Value', (r) => r.value.toFixed(2)], ['Quantity', (r) => r.qty], ['Average Value', (r) => r.avgValue.toFixed(2)], ['Last Order', (r) => r.last], ['Credit Status', (r) => r.credit]],
      open: (r) => `/orders?customerId=${r.id}`,
    },
    status: {
      columns: [
        { key: 's', header: 'Status', render: (r) => <OrderStatusBadge status={r.status} /> },
        { key: 'c', header: 'Orders', align: 'right', render: (r) => r.count },
        { key: 'sh', header: 'Share', align: 'right', render: (r) => formatPercent(r.share, 1) },
        { key: 'v', header: 'Value', align: 'right', render: (r) => formatMoney(r.value) },
      ],
      csv: [['Status', (r) => ORDER_STATUS_META[r.status].label], ['Orders', (r) => r.count], ['Share %', (r) => r.share.toFixed(1)], ['Value', (r) => r.value.toFixed(2)]],
      open: (r) => `/orders?status=${r.status}`,
    },
    approval: {
      columns: [
        { key: 'n', header: 'Order', render: (a) => <span className="font-medium tabular whitespace-nowrap">{a.orderNumber}</span> },
        { key: 'd', header: 'Decision', render: (a) => <ApprovalStatusBadge status={a.decision} /> },
        { key: 'c', header: 'Customer', hideBelow: 'md', render: (a) => a.order?.customerName },
        { key: 'r', header: 'Reason / remarks', hideBelow: 'lg', render: (a) => (<div className="max-w-xs"><p>{a.reason || '—'}</p><p className="text-xs text-muted truncate">{a.remarks}</p></div>) },
        { key: 'b', header: 'By', hideBelow: 'xl', render: (a) => a.decidedByName },
        { key: 'ta', header: 'Turnaround', align: 'right', hideBelow: 'sm', render: (a) => (a.turnaround !== null ? fmtHours(a.turnaround) : '—') },
        { key: 'v', header: 'Total', align: 'right', render: (a) => formatMoney(a.orderTotal) },
        { key: 'w', header: 'When', render: (a) => <span className="text-xs whitespace-nowrap">{formatDateTime(a.decidedAt)}</span> },
      ],
      csv: [['Order Number', (a) => a.orderNumber], ['Decision', (a) => a.decision], ['Customer', (a) => a.order?.customerName], ['Reason', (a) => a.reason], ['Remarks', (a) => a.remarks], ['Decided By', (a) => a.decidedByName], ['Decided At', (a) => a.decidedAt], ['Turnaround Hours', (a) => (a.turnaround ?? '') === '' ? '' : a.turnaround.toFixed(1)], ['Order Total', (a) => Number(a.orderTotal).toFixed(2)]],
      open: (a) => `/orders/${a.orderId}`,
    },
    rejection: {
      columns: [
        { key: 'n', header: 'Order', render: (o) => (<div><p className="font-medium tabular whitespace-nowrap">{o.orderNumber}</p><p className="text-xs text-muted">{o.customerName}</p></div>) },
        { key: 'r', header: 'Reason', render: (o) => o.rejectionReason },
        { key: 'm', header: 'Remarks', hideBelow: 'md', render: (o) => <span className="text-muted block max-w-sm truncate">{o.rejectionRemarks}</span> },
        { key: 's', header: 'Salesman', hideBelow: 'lg', render: (o) => o.salesmanName },
        { key: 'v', header: 'Total', align: 'right', render: (o) => formatMoney(o.totalAmount) },
        { key: 'w', header: 'Rejected', render: (o) => <span className="text-xs whitespace-nowrap">{formatDateTime(o.rejectedAt)}</span> },
      ],
      csv: [['Order Number', (o) => o.orderNumber], ['Customer', (o) => o.customerName], ['Salesman', (o) => o.salesmanName], ['Reason', (o) => o.rejectionReason], ['Remarks', (o) => o.rejectionRemarks], ['Rejected At', (o) => o.rejectedAt], ['Total', (o) => o.totalAmount.toFixed(2)]],
      open: (o) => `/orders/${o.id}`,
    },
    consolidation: {
      columns: [
        { key: 'n', header: 'Consolidation', render: (c) => (<div><p className="font-medium tabular">{c.consolidationNumber}</p><p className="text-xs text-muted tabular">{c.orderNumber}</p></div>) },
        { key: 'c', header: 'Customer', hideBelow: 'md', render: (c) => c.order?.customerName },
        { key: 'h', header: 'Hub', hideBelow: 'lg', render: (c) => hubs.find((h) => h.id === c.hubId)?.name },
        { key: 'b', header: 'By', hideBelow: 'xl', render: (c) => c.consolidatedByName },
        { key: 'w', header: 'Wait after approval', align: 'right', hideBelow: 'sm', render: (c) => (c.wait !== null ? fmtHours(c.wait) : '—') },
        { key: 'v', header: 'Total', align: 'right', render: (c) => formatMoney(c.totalAmount) },
        { key: 'r', header: 'Released', render: (c) => (c.readyForDispatchAt ? <span className="text-xs whitespace-nowrap">{formatDateTime(c.readyForDispatchAt)}</span> : <span className="text-xs text-muted">Not yet</span>) },
      ],
      csv: [['Consolidation Number', (c) => c.consolidationNumber], ['Order Number', (c) => c.orderNumber], ['Customer', (c) => c.order?.customerName], ['Hub', (c) => hubs.find((h) => h.id === c.hubId)?.name], ['Consolidated By', (c) => c.consolidatedByName], ['Consolidated At', (c) => c.consolidationDate], ['Hours After Approval', (c) => (c.wait === null ? '' : c.wait.toFixed(1))], ['Total Quantity', (c) => c.totalQuantity], ['Total', (c) => Number(c.totalAmount).toFixed(2)], ['Ready For Dispatch At', (c) => c.readyForDispatchAt || '']],
      open: (c) => `/orders/${c.orderId}`,
    },
  }
  const view = views[report.id]

  const onExport = () => {
    const n = downloadCsv(csvFilename(`order-report-${report.id}`), data, view.csv.map(([header, value]) => ({ header, value })))
    toast.success(`Exported ${n} rows`)
  }

  return (
    <>
      <PageHeader title="Order reports" description="Registers and summaries of submitted orders, approvals, rejections and consolidation — with CSV export." />
      <Card className="mb-6">
        <Tabs value={report.id} onChange={(id) => { const p = new URLSearchParams(params); p.set('report', id); p.delete('page'); setParams(p, { replace: true }) }} tabs={REPORTS} />
      </Card>
      <StatGrid cols={kpis.length === 5 ? 5 : kpis.length === 3 ? 3 : 4}>
        {kpis.map(([label, value, icon, tone]) => <StatCard key={label} label={label} value={value} icon={icon} tone={tone} />)}
      </StatGrid>
      {report.id === 'status' && data.length > 0 && (
        <div className="mt-6"><SingleBarChart title="Order value by status" subtitle="Incl. GST" data={data.map((r) => ({ name: ORDER_STATUS_META[r.status].label, value: Math.round(r.value) }))} valueFormatter={formatCompactCurrency} seriesName="Value" height={Math.max(200, data.length * 38)} /></div>
      )}
      <Card className="mt-6">
        <FilterToolbar query={t.q} onQuery={t.setQuery} placeholder="Search order, customer, salesman…" total={report.id === 'approval' ? approvals.length : report.id === 'consolidation' ? consolidations.length : scoped.length} filteredCount={data.length} activeCount={t.activeFilterCount} onReset={t.reset} onExport={onExport}>
          <FilterInput label={`From ${report.dateLabel}`} type="date" value={f.from} onChange={(e) => t.setFilter('from', e.target.value)} title={`From ${report.dateLabel}`} />
          <FilterInput label={`To ${report.dateLabel}`} type="date" value={f.to} onChange={(e) => t.setFilter('to', e.target.value)} title={`To ${report.dateLabel}`} />
          <FilterSelect label="Customer" allLabel="All customers" value={f.customerId} onChange={(v) => t.setFilter('customerId', v)} options={customers.map((c) => ({ value: c.id, label: c.name }))} />
          <FilterSelect label="Salesman" allLabel="All salesmen" value={f.salesmanId} onChange={(v) => t.setFilter('salesmanId', v)} options={salesReps.map((r) => ({ value: r.id, label: r.name }))} />
          <FilterSelect label="Hub" allLabel="All hubs" value={f.hubId} onChange={(v) => t.setFilter('hubId', v)} options={hubs.map((h) => ({ value: h.id, label: h.name }))} />
          <FilterSelect label="Order status" allLabel="All statuses" value={f.status} onChange={(v) => t.setFilter('status', v)} options={Object.entries(ORDER_STATUS_META).filter(([k]) => k !== S.DRAFT).map(([k, m]) => ({ value: k, label: m.label }))} />
        </FilterToolbar>
        <p className="-mt-2 mb-3 text-xs text-muted">Date range applies to the {report.dateLabel}. Drafts are excluded.</p>
        <DataTable caption={report.label} rows={data} columns={view.columns} pageSize={12} page={t.page} onPageChange={t.setPage} onRowClick={(r) => navigate(view.open(r))}
          empty={<EmptyState icon={FileBarChart} title="No data for these filters" />} />
      </Card>
    </>
  )
}
