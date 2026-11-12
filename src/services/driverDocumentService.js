/**
 * Driver documents (VMS) — a view over the central document repository (entityType 'driver'),
 * linked to existing Driver Master IDs.
 */
import { getDocuments, uploadDocument } from './documentService'
import { getDocumentTypes, typesForEntity } from './documentTypeService'
import { driverCompliance } from './complianceService'

export const getDriverDocuments = (driverId, all = getDocuments()) => all.filter((d) => d.entityType === 'driver' && d.entityId === driverId).sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1))
export const getDriverDocumentTypes = (types = getDocumentTypes()) => typesForEntity('driver', types).filter((t) => t.entity === 'driver')
export const uploadDriverDocument = (driver, input) => uploadDocument({ ...input, entityType: 'driver', entityId: driver.id })
export { driverCompliance }
export default { getDriverDocuments, getDriverDocumentTypes, uploadDriverDocument, driverCompliance }
