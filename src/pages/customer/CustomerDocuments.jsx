import { Link, useParams } from 'react-router-dom'
import { FileText, ReceiptText, Wallet, ArrowLeft, Printer, ChevronRight, Info, CreditCard } from 'lucide-react'
import Card, { CardHeader } from '../../components/common/Card'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import EmptyState from '../../components/common/EmptyState'
import NotFoundRecord from '../../components/common/NotFoundRecord'
import InvoiceDocument from '../../components/phase5/InvoiceDocument'
import { ProgressBar } from '../../components/driver/DriverUi'
import { useCustomerWorkspace } from '../../hooks/useCustomerWorkspace'
import { formatCurrency, formatDate, formatNumber, formatPercent } from '../../utils/formatters'
import { NoCustomerLink } from './CustomerUi'

const Row = ({ to, title, sub, right }) => (
  <li><Link to={to} className="flex items-center justify-between gap-3 py-3 hover:text-brand">
    <div className="min-w-0"><p className="text-sm font-medium text-ink tabular">{title}</p><p className="text-xs text-muted truncate">{sub}</p></div>
    <span className="flex shrink-0 items-center gap-1.5">{right}<ChevronRight size={16} className="text-muted" aria-hidden /></span>
  </Link></li>
)

export function CustomerNotes() {
  const w = useCustomerWorkspace()
  if (!w.customer) return <NoCustomerLink />
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-ink">Delivery notes</h1>
      <Card>
        {w.notes.length ? (
          <ul className="divide-y divide-line">{w.notes.map((n) => {
            const pod = w.pods.find((p) => p.deliveryId === n.deliveryId)
            const qty = (n.items || []).reduce((s, i) => s + (Number(i.deliveredQuantity) || 0), 0)
            return <Row key={n.id} to={`/customer/delivery-notes/${n.id}`} title={n.noteNumber} sub={`${n.orderNumber} · ${formatDate(n.deliveryDate)} · ${formatNumber(qty)} units · ${n.vehicleNumber || ''}`} right={pod?.signature ? <Badge tone="success">Signed</Badge> : null} />
          })}</ul>
        ) : <EmptyState compact icon={FileText} title="No delivery notes yet" description="A delivery note is issued when the driver verifies your OTP at delivery." />}
      </Card>
    </div>
  )
}

export function CustomerInvoices() {
  const w = useCustomerWorkspace()
  if (!w.customer) return <NoCustomerLink />
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-ink">Invoices</h1>
      <Card>
        {w.invoices.length ? (
          <ul className="divide-y divide-line">{w.invoices.map((i) => (
            <Row key={i.id} to={`/customer/invoices/${i.id}`} title={i.invoiceNumber} sub={`${formatDate(i.invoiceDate)} · ${i.orderNumber}`}
              right={<><span className="text-sm font-semibold text-ink tabular">{formatCurrency(i.totals?.grandTotal)}</span>{i.status === 'CANCELLED' && <Badge tone="neutral">Cancelled</Badge>}</>} />
          ))}</ul>
        ) : <EmptyState compact icon={ReceiptText} title="No invoices yet" description="Invoices are issued by our finance team after delivery." />}
      </Card>
    </div>
  )
}

export function CustomerInvoice() {
  const { id } = useParams()
  const w = useCustomerWorkspace()
  if (!w.customer) return <NoCustomerLink />
  const inv = w.invoices.find((i) => i.id === id)
  if (!inv) return <NotFoundRecord entity="invoice" backTo="/customer/invoices" backLabel="Invoices" />
  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Button variant="secondary" icon={ArrowLeft} to="/customer/invoices">Invoices</Button>
        <Button icon={Printer} onClick={() => window.print()}>Print / Save as PDF</Button>
      </div>
      <div className="overflow-x-auto"><InvoiceDocument invoice={inv} /></div>
    </div>
  )
}

export function CustomerPayments() {
  const w = useCustomerWorkspace()
  if (!w.customer) return <NoCustomerLink />
  const c = w.customer
  const used = c.creditLimit ? Math.min(100, Math.round(((c.creditBalance || 0) / c.creditLimit) * 100)) : 0
  const invoiced = w.invoices.filter((i) => i.status !== 'CANCELLED').reduce((s, i) => s + (i.totals?.grandTotal || 0), 0)
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-ink">Payments & balance</h1>
      <Card>
        <CardHeader title="Account balance" icon={Wallet} />
        <div className="grid grid-cols-2 gap-3">
          <div><p className="text-xs text-muted">Outstanding</p><p className="text-2xl font-semibold text-ink tabular">{formatCurrency(c.creditBalance || 0)}</p></div>
          <div><p className="text-xs text-muted">Credit limit</p><p className="text-2xl font-semibold text-ink tabular">{c.creditEnabled ? formatCurrency(c.creditLimit) : 'No credit'}</p></div>
        </div>
        {c.creditEnabled && <ProgressBar className="mt-3" value={used} label={`Credit used · ${formatPercent(used)} · ${formatCurrency(Math.max(0, c.creditLimit - (c.creditBalance || 0)))} available`} />}
        <p className="mt-3 text-xs text-muted">Terms: {c.creditEnabled ? `${c.creditDays} days credit` : 'Cash on delivery'} · Invoiced to date: {formatCurrency(invoiced)}</p>
      </Card>
      <Card>
        <CardHeader title="Payment history" icon={CreditCard} />
        <EmptyState compact icon={Info} title="No payments recorded in this prototype" description="Payment receipts are not captured yet. Your outstanding balance is maintained by our finance team; contact them for a statement." />
      </Card>
    </div>
  )
}
