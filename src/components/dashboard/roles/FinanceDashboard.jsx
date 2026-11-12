import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Wallet, AlertTriangle, ReceiptText, CreditCard, FileBarChart, Banknote, BadgeCheck, HandCoins } from 'lucide-react'
import StatCard, { StatGrid } from '../StatCard'
import CreditTable from '../widgets/CreditTable'
import PlaceholderPanel from '../widgets/PlaceholderPanel'
import SingleBarChart from '../charts/SingleBarChart'
import { getCreditOverview, inStatus, sumValue } from '../../../services/dashboardService'
import { ORDER_STATUS as S, POST_APPROVAL_STATUSES } from '../../../utils/constants'
import { formatCompactCurrency, formatMoney } from '../../../utils/formatters'
import Card, { CardHeader } from '../../common/Card'
import Badge from '../../common/Badge'
import { useStoredValue } from '../../../hooks/useLocalStorage'
import { STORAGE_KEYS } from '../../../utils/constants'
import { CREDIT_NEAR_THRESHOLD, CREDIT_STATUS } from '../../../config/masterData'
import { useDashboardPeriod } from '../../../hooks/useDashboardPeriod'
import { filterByPeriod } from '../../../utils/dashboardFilter'

const NONE = []

function InvoiceCollections() {
  const all = useStoredValue(STORAGE_KEYS.INVOICES, NONE)
  const period = useDashboardPeriod()
  // Invoices are selected on their invoice date.
  const invoices = useMemo(() => filterByPeriod('invoices', all, period?.range), [all, period])
  const issued = invoices.filter((i) => i.status === 'ISSUED')
  const value = issued.reduce((a, i) => a + (Number(i.totals?.grandTotal) || 0), 0)
  const recent = [...issued].sort((a, b) => ((b.invoiceDate || b.createdAt) > (a.invoiceDate || a.createdAt) ? 1 : -1)).slice(0, 5)
  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader title="Invoices" subtitle={`${issued.length} issued · ${formatCompactCurrency(value)}`} icon={ReceiptText} action={<Link to="/invoices" className="text-xs font-medium text-brand hover:underline">All invoices</Link>} />
        {recent.length === 0 ? <p className="text-sm text-muted">No invoices issued yet.</p> : (
          <ul className="divide-y divide-line text-sm">
            {recent.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-2">
                <Link to={`/invoices/${i.id}`} className="min-w-0 truncate font-medium text-ink hover:underline">{i.invoiceNumber} <span className="font-normal text-muted">· {i.customerName || i.snapshot?.customer?.name || ''}</span></Link>
                <span className="tabular text-ink">{formatMoney(i.totals?.grandTotal)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader title="Collections" icon={HandCoins} action={<Badge tone="neutral">Not tracked</Badge>} />
        <p className="text-sm text-muted">Payments and receipts are not recorded in this prototype, so no collection figures or ageing are shown. Customer balances above are the demo credit balances kept on each customer; collections would come from the ERP / accounting integration.</p>
      </Card>
    </div>
  )
}

export default function FinanceDashboard({ data, orders, previous }) {
  const credit = useMemo(() => getCreditOverview(data.customers), [data.customers])
  const exposure = credit.reduce((s, c) => s + c.outstanding, 0)
  const totalLimit = credit.reduce((s, c) => s + c.limit, 0)
  const over = credit.filter((c) => c.status === CREDIT_STATUS.EXCEEDED)
  const near = credit.filter((c) => c.status === CREDIT_STATUS.NEAR)
  const delivered = inStatus(orders, S.DELIVERED, S.PARTIALLY_DELIVERED)
  const live = orders.filter((o) => o.status !== S.DRAFT)
  const approved = inStatus(live, ...POST_APPROVAL_STATUSES)
  const pending = inStatus(live, S.SUBMITTED)
  const flagged = live.filter((o) => o.creditWarning && [S.SUBMITTED, S.APPROVED, S.CONSOLIDATED].includes(o.status))
  const pl = previous ? previous.orders.filter((o) => o.status !== S.DRAFT) : null
  const cmpV = (fn) => (pl ? { previous: fn(pl), format: formatCompactCurrency } : undefined)
  const valueByStage = [
    { name: 'Pending approval', value: Math.round(sumValue(pending)) },
    { name: 'Approved', value: Math.round(sumValue(inStatus(live, S.APPROVED))) },
    { name: 'Consolidated', value: Math.round(sumValue(inStatus(live, S.CONSOLIDATED))) },
    { name: 'Ready for dispatch', value: Math.round(sumValue(inStatus(live, S.READY_FOR_DISPATCH))) },
    { name: 'In delivery', value: Math.round(sumValue(inStatus(live, S.DISPATCHED, S.OUT_FOR_DELIVERY))) },
    { name: 'Delivered', value: Math.round(sumValue(delivered)) },
    { name: 'Failed / returned', value: Math.round(sumValue(inStatus(live, S.DELIVERY_FAILED, S.RETURNED_TO_HUB))) },
  ]

  return (
    <div className="space-y-6">
      <StatGrid cols={6}>
        <StatCard label="Order value (submitted)" value={formatCompactCurrency(sumValue(live))} compare={cmpV((x) => sumValue(x)) && { ...cmpV((x) => sumValue(x)), current: sumValue(live) }} icon={Banknote} tone="info" hint={`${live.length} orders · ${formatCompactCurrency(sumValue(pending))} pending`} to="/orders" />
        <StatCard label="Approved order value" value={formatCompactCurrency(sumValue(approved))} compare={cmpV((x) => sumValue(inStatus(x, ...POST_APPROVAL_STATUSES))) && { ...cmpV((x) => sumValue(inStatus(x, ...POST_APPROVAL_STATUSES))), current: sumValue(approved) }} icon={BadgeCheck} tone="success" hint={`${approved.length} approved orders`} to="/orders?approval=APPROVED" />
        <StatCard label="Credit exposure" live value={formatCompactCurrency(exposure)} icon={Wallet} tone="brand" hint={`of ${formatCompactCurrency(totalLimit)} total limits`} to="/customers/credit" />
        <StatCard label="Over credit limit" live value={over.length} icon={AlertTriangle} tone="danger" hint={`${near.length} near limit (${CREDIT_NEAR_THRESHOLD}%+)`} to="/customers/credit" />
        <StatCard label="Delivered, to invoice" value={formatCompactCurrency(sumValue(delivered))} icon={ReceiptText} tone="success" hint={`${delivered.length} delivered orders`} to="/reports/invoices" />
        <StatCard label="Outstanding (customer balances)" live value={formatCompactCurrency(exposure)} icon={HandCoins} tone="warning" hint={`${credit.filter((c) => c.outstanding > 0).length} customers with a balance`} to="/customers/credit" />
      </StatGrid>

      <InvoiceCollections />

      <SingleBarChart
        title="Order value overview"
        subtitle="Value of submitted orders by stage (incl. tax)"
        data={valueByStage}
        valueFormatter={formatCompactCurrency}
        seriesName="Order value"
        height={260}
        action={<Link to="/orders/reports" className="text-xs font-medium text-brand hover:underline">Order reports</Link>}
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3"><CreditTable rows={credit} linkTo="/customers/credit" /></div>
        <div className="lg:col-span-2">
          <SingleBarChart
            title="Credit utilisation"
            subtitle="Outstanding as % of limit"
            data={credit.slice(0, 8).map((c) => ({ name: c.name.length > 16 ? `${c.name.slice(0, 15)}…` : c.name, value: Math.round(c.utilisation) }))}
            valueFormatter={(v) => `${v}%`}
            seriesName="Utilisation"
            height={300}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <PlaceholderPanel title="Credit limits" icon={CreditCard} to="/customers/credit" actionLabel="Open customer credit"
          description={`${flagged.length} open order${flagged.length === 1 ? '' : 's'} flagged for credit-limit exceptions. Credit limits are configured per customer in Customer Credit; credit transactions arrive with invoicing.`} />
        <PlaceholderPanel title="Invoices" icon={ReceiptText} to="/invoices" actionLabel="Open invoices"
          description="Issue prototype invoices from approved orders with a customizable template. Tax is demo-only — statutory GST/e-invoicing and SAP integration remain out of scope." />
        <PlaceholderPanel title="Order reports" icon={FileBarChart} to="/orders/reports" actionLabel="Open order reports"
          description="Order register, approval and rejection reports with CSV export. Delivery-to-invoice ageing arrives with invoicing." />
      </div>
    </div>
  )
}
