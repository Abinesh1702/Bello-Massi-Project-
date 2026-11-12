import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CalendarClock, Truck, UserRound, AlertTriangle, Settings2, Save, ShieldCheck, Gauge, Bell, FileBarChart, CalendarX } from 'lucide-react'
import PageHeader from '../../components/common/PageHeader'
import Card, { CardHeader } from '../../components/common/Card'
import Button from '../../components/common/Button'
import Tabs from '../../components/common/Tabs'
import DataTable from '../../components/common/DataTable'
import EmptyState from '../../components/common/EmptyState'
import Input from '../../components/common/Input'
import Checkbox from '../../components/common/Checkbox'
import Toggle from '../../components/common/Toggle'
import FormSection, { FormActions } from '../../components/common/FormSection'
import FilterToolbar, { FilterSelect } from '../../components/common/FilterToolbar'
import StatCard, { StatGrid } from '../../components/dashboard/StatCard'
import ReportWorkspace from '../../components/phase5/ReportWorkspace'
import { ExpiryBadge } from '../../components/phase5/Badges'
import { VehicleStatusBadge } from '../../components/dispatch/DispatchBadges'
import { usePhase5Data } from '../../hooks/usePhase5Data'
import { usePermission } from '../../hooks/usePermission'
import { useTableQuery } from '../../hooks/useTableQuery'
import { countByState, expiryRegister, saveVmsSettings, vehicleCompliance, worstState } from '../../services/complianceService'
import { scanDocumentExpiries } from '../../services/automationService'
import { csvFilename, downloadCsv } from '../../services/csvService'
import { EXPIRY_META, VEHICLE_EXPIRY_FIELDS, DRIVER_EXPIRY_FIELDS, VMS_OPTIONS } from '../../config/vmsConfig'
import { formatDate } from '../../utils/formatters'

const ownerPath = (r) => (r.ownerType === 'vehicle' ? `/vms/vehicles/${r.ownerId}/documents` : `/vms/drivers/${r.ownerId}/documents`)

/** Vehicle and driver expiry dashboard with alerts. */
export function DocumentExpiry() {
  const navigate = useNavigate()
  const d = usePhase5Data()
  const [params] = useSearchParams()
  const [alerting, setAlerting] = useState(false)
  const t = useTableQuery({ filters: ['owner', 'state', 'hubId', 'required'] })
  const owner = t.filters.owner || params.get('owner') || 'vehicle'
  useEffect(() => { scanDocumentExpiries() }, [])
  const all = useMemo(() => expiryRegister({ vehicles: d.vehicles, drivers: d.drivers, settings: d.vmsSettings }), [d.vehicles, d.drivers, d.vmsSettings])
  const scoped = all.filter((r) => r.ownerType === owner)
  const rows = scoped
    .filter((r) => (!t.filters.state || r.state === t.filters.state) && (!t.filters.hubId || r.hubId === t.filters.hubId) && (t.filters.required !== 'yes' || r.required)
      && (!t.q || r.ownerName.toLowerCase().includes(t.q.toLowerCase()) || r.label.toLowerCase().includes(t.q.toLowerCase())))
    .sort((a, b) => EXPIRY_META[a.state].rank - EXPIRY_META[b.state].rank || String(a.date).localeCompare(String(b.date)))
    .map((r) => ({ ...r, key: `${r.ownerId}-${r.field}` }))
  const c = countByState(scoped)
  const sendAlerts = async () => {
    setAlerting(true)
    const r = await scanDocumentExpiries()
    setAlerting(false)
    if (r.fired.length) toast.success(`${r.fired.length} new expiry alert${r.fired.length === 1 ? '' : 's'} processed`, { description: 'Per-channel results (demo or provider status) are in Automated Notifications history.' })
    else toast.info('No new alerts — every expiry was already notified once')
  }
  const onExport = () => toast.success(`Exported ${downloadCsv(csvFilename(`expiry-${owner}`), rows, [
    { header: owner === 'vehicle' ? 'Vehicle' : 'Driver', value: (r) => r.ownerName }, { header: 'Document', value: (r) => r.label }, { header: 'Required', value: (r) => (r.required ? 'Yes' : 'No') },
    { header: 'Expiry Date', value: (r) => r.date }, { header: 'State', value: (r) => EXPIRY_META[r.state].label }, { header: 'Days', value: (r) => (r.days ?? '') }, { header: 'Hub', value: (r) => d.lk.hubs[r.hubId]?.name },
  ])} rows`)
  return (
    <>
      <PageHeader title="Document expiry" description={`Expiry dates of vehicle and driver documents. Expired required documents block dispatch assignment${d.vmsSettings.blockOnWarning ? `; documents expiring within ${d.vmsSettings.warningDays} days also block` : ''}.`}
        actions={<Button variant="secondary" icon={Bell} loading={alerting} onClick={sendAlerts}>Send expiry alerts</Button>} />
      <Card className="mb-6"><Tabs value={owner} onChange={(id) => t.setFilter('owner', id)} tabs={[{ id: 'vehicle', label: 'Vehicle documents', icon: Truck }, { id: 'driver', label: 'Driver documents', icon: UserRound }]} /></Card>
      <StatGrid cols={5}>
        <StatCard label="Expired" value={c.EXPIRED} icon={CalendarX} tone="danger" />
        <StatCard label="Expires today" value={c.TODAY} icon={AlertTriangle} tone="danger" />
        <StatCard label="Within 7 days" value={c.WEEK} icon={CalendarClock} tone="warning" />
        <StatCard label="Within 30 days" value={c.MONTH} icon={CalendarClock} tone="accent" />
        <StatCard label="Valid" value={c.VALID} icon={ShieldCheck} tone="success" hint={c.MISSING ? `${c.MISSING} not on record` : undefined} />
      </StatGrid>
      <Card className="mt-6">
        <FilterToolbar query={t.q} onQuery={t.setQuery} placeholder={`Search ${owner}s or documents…`} total={scoped.length} filteredCount={rows.length} activeCount={t.activeFilterCount} onReset={t.reset} onExport={onExport}>
          <FilterSelect label="Expiry state" allLabel="All states" value={t.filters.state} onChange={(v) => t.setFilter('state', v)} options={VMS_OPTIONS.expiryStates} />
          <FilterSelect label="Hub" allLabel="All hubs" value={t.filters.hubId} onChange={(v) => t.setFilter('hubId', v)} options={d.hubs.map((h) => ({ value: h.id, label: h.name }))} />
          <FilterSelect label="Required" allLabel="All documents" value={t.filters.required} onChange={(v) => t.setFilter('required', v)} options={[{ value: 'yes', label: 'Required for dispatch' }]} />
        </FilterToolbar>
        <DataTable caption="Expiry register" rows={rows} rowKey="key" pageSize={15} page={t.page} onPageChange={t.setPage} onRowClick={(r) => navigate(ownerPath(r))}
          empty={<EmptyState icon={ShieldCheck} title="Nothing matches" />}
          columns={[
            { key: 'o', header: owner === 'vehicle' ? 'Vehicle' : 'Driver', render: (r) => (<div><p className="font-medium text-ink">{r.ownerName}</p><p className="text-xs text-muted">{d.lk.hubs[r.hubId]?.city}</p></div>) },
            { key: 'l', header: 'Document', render: (r) => <span>{r.label}{r.required && <span className="ml-1.5 text-[11px] font-medium uppercase text-danger">required</span>}</span> },
            { key: 'd', header: 'Expiry date', render: (r) => (r.date ? formatDate(r.date) : <span className="text-muted">Not on record</span>) },
            { key: 's', header: 'State', render: (r) => <ExpiryBadge date={r.date} state={r.date ? undefined : r.state} /> },
          ]}
        />
      </Card>
    </>
  )
}

/** VMS reports. */
export function VmsReports() {
  const d = usePhase5Data()
  const t = useTableQuery({ filters: ['hubId', 'status', 'state'] })
  const vehicles = d.vehicles.filter((v) => (!t.filters.hubId || v.hubId === t.filters.hubId) && (!t.filters.status || v.status === t.filters.status) && (!t.q || [v.vehicleNumber, v.model, v.manufacturer].some((s) => String(s || '').toLowerCase().includes(t.q.toLowerCase()))))
  const reg = expiryRegister({ vehicles, drivers: d.drivers.filter((x) => !t.filters.hubId || x.hubId === t.filters.hubId), settings: d.vmsSettings }).filter((r) => !t.filters.state || r.state === t.filters.state).map((r) => ({ ...r, id: `${r.ownerId}-${r.field}` }))
  const util = vehicles.map((v) => {
    const ds = d.dispatches.filter((x) => x.vehicleId === v.id && x.status !== 'CANCELLED')
    return { ...v, trips: ds.length, completed: ds.filter((x) => ['COMPLETED', 'PARTIALLY_DELIVERED'].includes(x.status)).length, units: ds.reduce((s, x) => s + (x.totalQuantity || 0), 0), last: ds.map((x) => x.dispatchDate).sort().at(-1) || '' }
  }).sort((a, b) => b.trips - a.trips)
  const docs = vehicles.map((v) => {
    const list = d.documents.filter((x) => x.entityType === 'vehicle' && x.entityId === v.id)
    return { ...v, docs: list.length, verified: list.filter((x) => x.status === 'VERIFIED').length, pending: list.filter((x) => ['PENDING_OCR', 'OCR_COMPLETED', 'PENDING_REVIEW'].includes(x.status)).length, worst: worstState(vehicleCompliance(v, d.vmsSettings)) }
  })
  const reports = [
    { id: 'register', label: 'Vehicle register', icon: Truck, rows: vehicles, open: (v) => `/vms/vehicles/${v.id}`,
      columns: [{ key: 'n', header: 'Vehicle', render: (v) => <span className="font-medium tabular">{v.vehicleNumber}</span> }, { key: 't', header: 'Type', render: (v) => v.type }, { key: 'm', header: 'Make / model', hideBelow: 'md', render: (v) => [v.manufacturer, v.model].filter(Boolean).join(' ') }, { key: 'h', header: 'Hub', hideBelow: 'sm', render: (v) => d.lk.hubs[v.hubId]?.name }, { key: 's', header: 'Status', render: (v) => <VehicleStatusBadge status={v.status} /> }],
      csv: [['Vehicle', (v) => v.vehicleNumber], ['Type', (v) => v.type], ['Category', (v) => v.category], ['Manufacturer', (v) => v.manufacturer], ['Model', (v) => v.model], ['Year', (v) => v.manufacturingYear], ['Fuel', (v) => v.fuelType], ['Capacity', (v) => v.capacity], ['Hub', (v) => d.lk.hubs[v.hubId]?.name], ['Status', (v) => v.status]] },
    { id: 'expiry', label: 'Expiry report', icon: CalendarClock, rows: reg, open: ownerPath,
      kpis: ['EXPIRED', 'WEEK', 'MONTH', 'VALID'].map((k) => [EXPIRY_META[k].label, reg.filter((r) => r.state === k).length, CalendarClock, EXPIRY_META[k].tone]),
      columns: [{ key: 'o', header: 'Vehicle / driver', render: (r) => r.ownerName }, { key: 'l', header: 'Document', render: (r) => r.label }, { key: 'd', header: 'Expiry', render: (r) => (r.date ? formatDate(r.date) : '—') }, { key: 's', header: 'State', render: (r) => <ExpiryBadge state={r.state} showDays={false} /> }],
      csv: [['Owner Type', (r) => r.ownerType], ['Owner', (r) => r.ownerName], ['Document', (r) => r.label], ['Required', (r) => (r.required ? 'Yes' : 'No')], ['Expiry', (r) => r.date], ['State', (r) => EXPIRY_META[r.state].label], ['Days', (r) => r.days ?? '']] },
    { id: 'documents', label: 'Document status', icon: FileBarChart, rows: docs, open: (v) => `/vms/vehicles/${v.id}/documents`,
      columns: [{ key: 'n', header: 'Vehicle', render: (v) => <span className="font-medium tabular">{v.vehicleNumber}</span> }, { key: 'd', header: 'Documents', align: 'right', render: (v) => v.docs }, { key: 'v', header: 'Verified', align: 'right', render: (v) => v.verified }, { key: 'p', header: 'Pending', align: 'right', render: (v) => v.pending }, { key: 'w', header: 'Compliance', render: (v) => <ExpiryBadge state={v.worst} /> }],
      csv: [['Vehicle', (v) => v.vehicleNumber], ['Documents', (v) => v.docs], ['Verified', (v) => v.verified], ['Pending', (v) => v.pending], ['Compliance', (v) => EXPIRY_META[v.worst].label]] },
    { id: 'utilisation', label: 'Utilisation', icon: Gauge, rows: util, open: (v) => `/vms/vehicles/${v.id}?tab=availability`,
      columns: [{ key: 'n', header: 'Vehicle', render: (v) => <span className="font-medium tabular">{v.vehicleNumber}</span> }, { key: 't', header: 'Dispatches', align: 'right', render: (v) => v.trips }, { key: 'c', header: 'Completed', align: 'right', render: (v) => v.completed }, { key: 'u', header: 'Units carried', align: 'right', hideBelow: 'sm', render: (v) => v.units }, { key: 'l', header: 'Last dispatch', hideBelow: 'md', render: (v) => (v.last ? formatDate(v.last) : '—') }],
      csv: [['Vehicle', (v) => v.vehicleNumber], ['Dispatches', (v) => v.trips], ['Completed', (v) => v.completed], ['Units', (v) => v.units], ['Last Dispatch', (v) => v.last]] },
  ]
  return (
    <>
      <PageHeader title="VMS reports" description="Vehicle register, document expiry, document status and utilisation — exportable to CSV." />
      <ReportWorkspace name="vms" reports={reports} query={t.q} onQuery={t.setQuery} activeCount={t.activeFilterCount} onReset={t.reset} placeholder="Search vehicles…">
        <FilterSelect label="Hub" allLabel="All hubs" value={t.filters.hubId} onChange={(v) => t.setFilter('hubId', v)} options={d.hubs.map((h) => ({ value: h.id, label: h.name }))} />
        <FilterSelect label="Vehicle status" allLabel="All statuses" value={t.filters.status} onChange={(v) => t.setFilter('status', v)} options={['Available', 'Assigned', 'In Transit', 'Maintenance', 'Inactive'].map((s) => ({ value: s, label: s }))} />
        <FilterSelect label="Expiry state" allLabel="All states" value={t.filters.state} onChange={(v) => t.setFilter('state', v)} options={VMS_OPTIONS.expiryStates} />
      </ReportWorkspace>
    </>
  )
}

/** Admin compliance rules used by dispatch assignment validation. */
export function VmsSettings() {
  const d = usePhase5Data()
  const canEdit = usePermission('vms.settings')
  const [v, setV] = useState(() => ({ ...d.vmsSettings, warningDays: String(d.vmsSettings.warningDays) }))
  const [errors, setErrors] = useState({})
  const toggle = (k, code) => setV((x) => ({ ...x, [k]: x[k].includes(code) ? x[k].filter((c) => c !== code) : [...x[k], code] }))
  const save = (e) => {
    e.preventDefault()
    const res = saveVmsSettings(v)
    if (!res.ok) { setErrors(res.errors || {}); toast.error(res.error); return }
    toast.success('Compliance rules saved', { description: 'Dispatch assignment checks use them immediately.' })
  }
  return (
    <>
      <PageHeader title="VMS compliance rules" description="Which documents are required for dispatch, and how strictly expiry blocks assignment." />
      <form onSubmit={save} noValidate className="space-y-6">
        <FormSection title="Required vehicle documents" description="An expired required document always blocks the vehicle (critical)." icon={Truck} columns={3}>
          {VEHICLE_EXPIRY_FIELDS.map((f) => <Checkbox key={f.docCode} label={f.label} checked={v.requiredVehicleDocs.includes(f.docCode)} onChange={() => toggle('requiredVehicleDocs', f.docCode)} disabled={!canEdit} />)}
        </FormSection>
        <FormSection title="Required driver documents" icon={UserRound} columns={3}>
          {DRIVER_EXPIRY_FIELDS.map((f) => <Checkbox key={f.docCode} label={f.label} checked={v.requiredDriverDocs.includes(f.docCode)} onChange={() => toggle('requiredDriverDocs', f.docCode)} disabled={!canEdit} />)}
        </FormSection>
        <FormSection title="Blocking level" icon={Settings2} columns={2}>
          <Toggle label="Block on expired documents (critical)" description="Always on — an expired required document cannot be assigned." checked onChange={() => {}} disabled />
          <Toggle label="Block on warning-level expiry" description="Also block when a required document expires within the warning window of the dispatch date." checked={v.blockOnWarning} onChange={(x) => setV((s) => ({ ...s, blockOnWarning: x }))} disabled={!canEdit} />
          <Input label="Warning window (days)" type="number" min="1" max="90" value={v.warningDays} onChange={(e) => { setV((s) => ({ ...s, warningDays: e.target.value })); setErrors({}) }} error={errors.warningDays} disabled={!canEdit} />
          <Toggle label="Block when a required date is missing" description="Treat a missing expiry date as non-compliant." checked={v.blockOnMissing} onChange={(x) => setV((s) => ({ ...s, blockOnMissing: x }))} disabled={!canEdit} />
        </FormSection>
        {canEdit && <FormActions note="Changes apply to new assignments and to dispatch confirmation checks."><Button type="submit" icon={Save}>Save rules</Button></FormActions>}
      </form>
      <Card className="mt-6"><CardHeader title="Where these rules apply" icon={ShieldCheck} /><p className="text-sm text-muted">Dispatch planning and driver assignment hide blocked drivers and vehicles with the reason, and dispatch confirmation re-checks them. Inactive, under-maintenance and busy vehicles, and inactive drivers or drivers with an expired licence, are always blocked.</p></Card>
    </>
  )
}
