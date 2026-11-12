import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { FileBarChart } from 'lucide-react'
import Card from '../common/Card'
import Tabs from '../common/Tabs'
import DataTable from '../common/DataTable'
import EmptyState from '../common/EmptyState'
import FilterToolbar from '../common/FilterToolbar'
import StatCard, { StatGrid } from '../dashboard/StatCard'
import { csvFilename, downloadCsv } from '../../services/csvService'

/**
 * Tabbed report runner. reports: [{ id, label, icon, rows, columns, csv: [[header, fn]], kpis?: [[label, value, icon, tone]], open?: row => path }]
 * The caller filters rows with its own useTableQuery; this renders tabs, KPIs, the toolbar (children = filters) and CSV export.
 */
export default function ReportWorkspace({ name, reports, query, onQuery, activeCount, onReset, children, placeholder = 'Search…', note }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const report = reports.find((r) => r.id === params.get('report')) || reports[0]
  const onExport = () => {
    const n = downloadCsv(csvFilename(`${name}-${report.id}`), report.rows, report.csv.map(([header, value]) => ({ header, value })))
    toast.success(`Exported ${n} rows`)
  }
  return (
    <>
      <Card className="mb-6"><Tabs value={report.id} onChange={(id) => { const p = new URLSearchParams(params); p.set('report', id); p.delete('page'); setParams(p, { replace: true }) }} tabs={reports.map(({ id, label, icon }) => ({ id, label, icon }))} /></Card>
      {report.kpis?.length > 0 && (
        <StatGrid cols={report.kpis.length >= 5 ? 5 : report.kpis.length === 3 ? 3 : 4}>
          {report.kpis.map(([label, value, icon, tone]) => <StatCard key={label} label={label} value={value} icon={icon} tone={tone} />)}
        </StatGrid>
      )}
      <Card className="mt-6">
        <FilterToolbar query={query} onQuery={onQuery} placeholder={placeholder} total={report.total ?? report.rows.length} filteredCount={report.rows.length} activeCount={activeCount} onReset={onReset} onExport={onExport}>{children}</FilterToolbar>
        {note && <p className="-mt-2 mb-3 text-xs text-muted">{note}</p>}
        <DataTable caption={report.label} rows={report.rows} columns={report.columns} pageSize={12} onRowClick={report.open ? (r) => { const to = report.open(r); if (to) navigate(to) } : undefined}
          empty={<EmptyState icon={FileBarChart} title="No data for these filters" />} />
      </Card>
    </>
  )
}
