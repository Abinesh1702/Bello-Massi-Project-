/**
 * Vehicle documents (VMS) — a view over the central document repository (entityType 'vehicle'),
 * so a vehicle's RC / insurance / PUC / fitness / permit are the same records the OCR queue shows.
 */
import { getDocuments, uploadDocument } from './documentService'
import { getDocumentTypes, typesForEntity } from './documentTypeService'
import { vehicleCompliance } from './complianceService'

export const getVehicleDocuments = (vehicleId, all = getDocuments()) => all.filter((d) => d.entityType === 'vehicle' && d.entityId === vehicleId).sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1))
export const getVehicleDocumentTypes = (types = getDocumentTypes()) => typesForEntity('vehicle', types).filter((t) => t.entity === 'vehicle')
export const uploadVehicleDocument = (vehicle, input) => uploadDocument({ ...input, entityType: 'vehicle', entityId: vehicle.id })
/** Latest document per type (the one that counts for compliance). */
export const currentVehicleDocuments = (vehicleId, all = getDocuments()) => {
  const latest = {}
  getVehicleDocuments(vehicleId, all).forEach((d) => { if (!latest[d.typeCode] || d.uploadedAt > latest[d.typeCode].uploadedAt) latest[d.typeCode] = d })
  return latest
}
export { vehicleCompliance }
export default { getVehicleDocuments, getVehicleDocumentTypes, uploadVehicleDocument, currentVehicleDocuments, vehicleCompliance }
