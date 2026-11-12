import { useMemo, useState } from 'react'
import { Truck, CheckCircle2, Wrench, Route, Plus, Eye, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import EmptyState from '../../components/common/EmptyState'
import RowActions from '../../components/common/RowActions'
import Modal from '../../components/common/Modal'
import InfoList from '../../components/common/InfoList'
import FilterToolbar, { FilterSelect } from '../../components/common/FilterToolbar'
import StatCard, { StatGrid } from '../../components/dashboard/StatCard'
import { DispatchStatusBadge, VehicleStatusBadge } from '../../components/dispatch/DispatchBadges'
import { useDispatchData } from '../../hooks/useDispatchData'
import { useTableQuery, sortRows } from '../../hooks/useTableQuery'
import { usePermission } from '../../hooks/usePermission'
import { useDeleteFlow } from '../../hooks/useDeleteFlow'
import { deleteVehicle, getVehicleDeleteBlockers, searchVehicles, updateVehicle } from '../../services/vehicleService'
import { csvFilename, downloadCsv } from '../../services/csvService'
import { DISPATCH_OPTIONS, RESOURCE_DISPATCH_STATUSES } from '../../config/dispatchConfig'
import { formatDate, formatNumber } from '../../utils/formatters'

export default function VehicleList() {
  const { vehicles, hubs, drivers, dispatches, lk } = useDispatchData()
  const canManage = usePermission('fleet.manage')
  const t = useTableQuery({ filters: ['hubId', 'status', 'type'], sort: 'vehicleNumber' })
  const [viewing, setViewing] = useState(null)

  const current = useMemo(() => Object.fromEntries(vehicles.map((v) => [v.id, dispatches.find((d) => d.vehicleId === v.id && RESOURCE_DISPATCH_STATUSES.includes(d.status)) || null])), [vehicles, dispatches])
  const regular = useMemo(() => Object.fromEntries(vehicles.map((v) => [v.id, drivers.find((d) => d.vehicleId === v.id) || null])), [vehicles, drivers])
  const filtered = useMemo(() => searchVehicles(t.q, t.filters, vehicles), [vehicles, t.q, t.filters])
  const rows = useMemo(() => sortRows(filtered, t.sort, t.dir, { hub: (v) => lk.hubs[v.hubId]?.name }), [filtered, t.sort, t.dir, lk])

  const del = useDeleteFlow({
    entity: 'vehicle', getBlockers: getVehicleDeleteBlockers, remove: deleteVehicle, formatReason: (r) => `This vehicle ${r}.`,
    alternative: canManage && {
      label: 'Mark as Inactive', suggestion: 'Inactive vehicles keep their history but cannot be assigned.',
      run: (v) => {
        const res = updateVehicle(v.id, { ...v, capacity: String(v.capacity), status: 'Inactive' })
        if (res.ok) toast.success(`${v.vehicleNumber} marked Inactive`)
        else toast.error(Object.values(res.errors)[0])
      },
    },
  })
  const delWithName = { ...del, request: (v) => del.request({ ...v, name: v.vehicleNumber }) }

  const onExport = () => {
    const n = downloadCsv(csvFilename('vehicles'), rows, [
      { header: 'Vehicle ID', value: (v) => v.id }, { header: 'Vehicle Number', value: (v) => v.vehicleNumber }, { header: 'Vehicle Type', value: (v) => v.type },
      { header: 'Vehicle Model', value: (v) => v.model }, { header: 'Capacity', value: (v) => v.capacity }, { header: 'Capacity Unit', value: (v) => v.capacityUnit },
      { header: 'Assigned Hub', value: (v) => lk.hubs[v.hubId]?.name }, { header: 'Status', value: (v) => v.status }, { header: 'Regular Driver', value: (v) => regular[v.id]?.name || '' },
      { header: 'Current Dispatch', value: (v) => current[v.id]?.dispatchNumber || '' }, { header: 'Notes', value: (v) => v.notes },
    ])
    toast.success(`Exported ${n} vehicle${n === 1 ? '' : 's'}`)
  }

  const columns = [
    { key: 'vehicleNumber', header: 'Vehicle', sortable: true, render: (v) => (<div><p className="font-medium text-ink tabular whitespace-nowrap">{v.vehicleNumber}</p><p className="text-xs text-muted">{v.type} · {v.model}</p></div>) },
    { key: 'hub', header: 'Hub', sortable: true, hideBelow: 'md', render: (v) => lk.hubs[v.hubId]?.name || '—' },
    { key: 'capacity', header: 'Capacity', align: 'right', sortable: true, hideBelow: 'sm', render: (v) => <span className="whitespace-nowrap">{formatNumber(v.capacity)} {v.capacityUnit.toLowerCase()}</span> },
    { key: 'driver', header: 'Regular driver', hideBelow: 'lg', render: (v) => regular[v.id]?.name || <span className="text-muted">Pool</span> },
    { key: 'dispatch', header: 'Current dispatch', hideBelow: 'xl', render: (v) => (current[v.id] ? <span className="tabular text-xs">{current[v.id].dispatchNumber}</span> : <span className="text-muted">—</span>) },
    { key: 'status', header: 'Status', sortable: true, render: (v) => <VehicleStatusBadge status={v.status} /> },
    {
      key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right',
      render: (v) => (
        <RowActions label={`Actions for ${v.vehicleNumber}`} items={[
          { label: 'View', icon: Eye, onClick: () => setViewing(v) },
          { label: 'Edit', icon: Pencil, to: `/dispatch/vehicles/${v.id}/edit`, hidden: !canManage },
          { label: 'Delete', icon: Trash2, danger: true, onClick: () => delWithName.request(v), hidden: !canManage },
        ]} />
      ),
    },
  ]
  const viewV = viewing && vehicles.find((v) => v.id === viewing.id)
  const history = viewV ? dispatches.filter((d) => d.vehicleId === viewV.id).sort((a, b) => (a.dispatchDate < b.dispatchDate ? 1 : -1)).slice(0, 6) : []
  return (
    <>
      <PageHeader title="Vehicles" description="Fleet per hub with capacity and status. Vehicles under maintenance or inactive cannot be assigned." actions={canManage && <Button icon={Plus} to="/dispatch/vehicles/create">Add vehicle</Button>} />
      <StatGrid cols={4}>
        <StatCard label="Vehicles" value={vehicles.length} icon={Truck} tone="brand" hint={`${formatNumber(vehicles.reduce((s, v) => s + v.capacity, 0))} units total capacity`} />
        <StatCard label="Available" value={vehicles.filter((v) => v.status === 'Available').length} icon={CheckCircle2} tone="success" to="/dispatch/vehicles?status=Available" />
        <StatCard label="On a dispatch" value={vehicles.filter((v) => ['Assigned', 'In Transit'].includes(v.status)).length} icon={Route} tone="accent" to="/dispatch/vehicles?status=Assigned" />
        <StatCard label="Maintenance / inactive" value={vehicles.filter((v) => ['Maintenance', 'Inactive'].includes(v.status)).length} icon={Wrench} tone="warning" to="/dispatch/vehicles?status=Maintenance" />
      </StatGrid>
      <Card className="mt-6">
        <FilterToolbar query={t.q} onQuery={t.setQuery} placeholder="Search number, model, type…" total={vehicles.length} filteredCount={rows.length} activeCount={t.activeFilterCount} onReset={t.reset} onExport={onExport}>
          <FilterSelect label="Hub" allLabel="All hubs" value={t.filters.hubId} onChange={(x) => t.setFilter('hubId', x)} options={hubs.map((h) => ({ value: h.id, label: h.name }))} />
          <FilterSelect label="Status" allLabel="All statuses" value={t.filters.status} onChange={(x) => t.setFilter('status', x)} options={DISPATCH_OPTIONS.vehicleStatuses} />
          <FilterSelect label="Type" allLabel="All types" value={t.filters.type} onChange={(x) => t.setFilter('type', x)} options={DISPATCH_OPTIONS.vehicleTypes} />
        </FilterToolbar>
        <DataTable caption="Vehicles" columns={columns} rows={rows} pageSize={10} page={t.page} onPageChange={t.setPage} sort={t.sort} dir={t.dir} onSort={t.setSort} onRowClick={(v) => setViewing(v)}
          empty={<EmptyState icon={Truck} title={vehicles.length ? 'No vehicles match these filters' : 'No vehicles yet'} action={vehicles.length ? <Button variant="secondary" onClick={t.reset}>Clear filters</Button> : canManage && <Button icon={Plus} to="/dispatch/vehicles/create">Add vehicle</Button>} />} />
      </Card>
      <Modal open={Boolean(viewV)} onClose={() => setViewing(null)} size="lg" icon={Truck} title={viewV?.vehicleNumber} description={viewV && `${viewV.type} · ${viewV.model}`}
        footer={<><Button variant="secondary" onClick={() => setViewing(null)}>Close</Button>{canManage && viewV && <Button icon={Pencil} to={`/dispatch/vehicles/${viewV.id}/edit`}>Edit vehicle</Button>}</>}>
        {viewV && (
          <div className="space-y-5">
            <InfoList columns={2} items={[
              { label: 'Status', value: <VehicleStatusBadge status={viewV.status} /> },
              { label: 'Hub', value: lk.hubs[viewV.hubId]?.name },
              { label: 'Capacity', value: `${formatNumber(viewV.capacity)} ${viewV.capacityUnit.toLowerCase()}` },
              { label: 'Regular driver', value: regular[viewV.id] ? <Button variant="link" to={`/dispatch/drivers/${regular[viewV.id].id}`}>{regular[viewV.id].name}</Button> : 'Pool vehicle' },
              { label: 'Current dispatch', value: current[viewV.id] ? <Button variant="link" to={`/dispatch/${current[viewV.id].id}`}>{current[viewV.id].dispatchNumber}</Button> : 'None' },
              { label: 'Notes', value: viewV.notes, span: 2 },
            ]} />
            <div>
              <p className="mb-2 text-sm font-semibold text-ink">Recent dispatches</p>
              {history.length ? <ul className="space-y-1.5">{history.map((d) => <li key={d.id} className="flex items-center justify-between gap-2 text-sm"><span><Button variant="link" to={`/dispatch/${d.id}`}>{d.dispatchNumber}</Button> <span className="text-muted">· {formatDate(d.dispatchDate)} · {d.driverName || 'no driver'}</span></span><DispatchStatusBadge status={d.status} /></li>)}</ul> : <p className="text-sm text-muted">No dispatches yet.</p>}
            </div>
          </div>
        )}
      </Modal>
      {del.dialogs}
    </>
  )
}
