/**
 * Centralised constants shared across the prototype.
 * Storage keys are versioned through APP_DATA_VERSION (stored in bellomassi_app_version).
 */

export const APP_DATA_VERSION = 8

// Inside the Mobile App Preview device frame the session lives under its own key (see utils/devicePreview.js),
// so the emulator can sign in as a driver or customer without touching the office user's session.
const IN_DEVICE_PREVIEW = (() => {
  try { return typeof window !== 'undefined' && window.name === 'bm-device-preview' && window.self !== window.top } catch { return false }
})()

export const STORAGE_KEYS = Object.freeze({
  APP_VERSION: 'bellomassi_app_version',
  DEMO_USERS: 'bellomassi_demo_users',
  SESSION: IN_DEVICE_PREVIEW ? 'bellomassi_preview_session' : 'bellomassi_session',
  SETTINGS: 'bellomassi_settings',
  DEMO_DATA: 'bellomassi_demo_data',
  ACTIVITIES: 'bellomassi_activities',
  THEME: 'bellomassi_theme',
  NOTIFICATIONS: 'bellomassi_notifications',
  // Phase 2
  CUSTOMERS: 'bellomassi_customers',
  PRODUCTS: 'bellomassi_products',
  HUBS: 'bellomassi_hubs',
  INVENTORY: 'bellomassi_inventory',
  STOCK_RECEIPTS: 'bellomassi_stock_receipts',
  STOCK_TRANSFERS: 'bellomassi_stock_transfers',
  STOCK_ADJUSTMENTS: 'bellomassi_stock_adjustments',
  STOCK_MOVEMENTS: 'bellomassi_stock_movements',
  // Phase 3
  ORDERS: 'bellomassi_orders',
  ORDER_SEQUENCE: 'bellomassi_order_sequence',
  APPROVALS: 'bellomassi_approvals',
  CONSOLIDATIONS: 'bellomassi_consolidations',
  ORDER_TIMELINE: 'bellomassi_order_timeline',
  // Phase 4
  DISPATCHES: 'bellomassi_dispatches',
  DISPATCH_SEQUENCE: 'bellomassi_dispatch_sequence',
  DRIVERS: 'bellomassi_drivers',
  VEHICLES: 'bellomassi_vehicles',
  DISPATCH_ZONES: 'bellomassi_dispatch_zones',
  DELIVERIES: 'bellomassi_deliveries',
  DELIVERY_SEQUENCE: 'bellomassi_delivery_sequence',
  DELIVERY_OTPS: 'bellomassi_delivery_otps',
  DELIVERY_NOTES: 'bellomassi_delivery_notes',
  DISPATCH_TIMELINE: 'bellomassi_dispatch_timeline',
  // Phase 5 — VMS, documents & OCR, invoices, communication
  VMS_SETTINGS: 'bellomassi_vms_settings',
  DOCUMENT_TYPES: 'bellomassi_document_types',
  DOCUMENTS: 'bellomassi_documents',
  OCR_RESULTS: 'bellomassi_ocr_results',
  INVOICE_TEMPLATES: 'bellomassi_invoice_templates',
  INVOICES: 'bellomassi_invoices',
  INVOICE_SETTINGS: 'bellomassi_invoice_settings',
  EMAIL_TEMPLATES: 'bellomassi_email_templates',
  EMAIL_DRAFTS: 'bellomassi_email_drafts',
  EMAIL_HISTORY: 'bellomassi_email_history',
  EMAIL_INBOX: 'bellomassi_email_inbox',
  EMAIL_SETTINGS: 'bellomassi_email_settings',
  WHATSAPP_TEMPLATES: 'bellomassi_whatsapp_templates',
  WHATSAPP_MESSAGES: 'bellomassi_whatsapp_messages',
  OPENWA_SETTINGS: 'bellomassi_openwa_settings',
  COMMUNICATION_SETTINGS: 'bellomassi_communication_settings',
  NOTIFICATION_TEMPLATES: 'bellomassi_notification_templates',
  NOTIFICATION_HISTORY: 'bellomassi_notification_history',
  // Phase 6 — AI, Jarvis, forecasting, predictive inventory
  AI_SETTINGS: 'bellomassi_ai_settings',
  AI_CONVERSATIONS: 'bellomassi_ai_conversations',
  AI_MESSAGES: 'bellomassi_ai_messages',
  AI_INSIGHTS: 'bellomassi_ai_insights',
  AI_ACTIVITY: 'bellomassi_ai_activity',
  JARVIS_SETTINGS: 'bellomassi_jarvis_settings',
  JARVIS_HISTORY: 'bellomassi_jarvis_history',
  FORECASTS: 'bellomassi_forecasts',
  FORECAST_SETTINGS: 'bellomassi_forecast_settings',
  INVENTORY_PREDICTIONS: 'bellomassi_inventory_predictions',
  REORDER_RECOMMENDATIONS: 'bellomassi_reorder_recommendations',
  AI_MODELS: 'bellomassi_ai_models',
  REPLENISHMENT_DRAFTS: 'bellomassi_replenishment_drafts',
  SALES_HISTORY: 'bellomassi_sales_history',
  // Phase 1 completion — RBAC, organization, settings, audit, notifications, auth simulation
  ROLES: 'bellomassi_roles',
  PERMISSIONS: 'bellomassi_permissions',
  COMPANY: 'bellomassi_company',
  ORGANIZATION: 'bellomassi_organization',
  AUDIT_LOGS: 'bellomassi_audit_logs',
  NOTIFICATION_PREFS: 'bellomassi_notification_preferences',
  AUTH: 'bellomassi_auth', // remembered username, demo reset codes, failed-attempt counters (device-local, not exported)
  // Completion release — scrap, call history, driver tracking / POD, customer app, reports
  SCRAP_REQUESTS: 'bellomassi_scrap_requests',
  CALL_HISTORY: 'bellomassi_call_history',
  DRIVER_TRACKING: 'bellomassi_driver_tracking',
  DELIVERY_POD: 'bellomassi_delivery_pod',
  CUSTOMER_CARTS: 'bellomassi_customer_carts',
  REPORT_PREFS: 'bellomassi_report_prefs',
})

/** Keys included in backup/export, import and reset. Session is deliberately excluded. */
/** Phase 5 collections (VMS documents live in bellomassi_documents with entityType vehicle / driver). */
export const PHASE5_KEYS = [
  STORAGE_KEYS.VMS_SETTINGS, STORAGE_KEYS.DOCUMENT_TYPES, STORAGE_KEYS.DOCUMENTS, STORAGE_KEYS.OCR_RESULTS,
  STORAGE_KEYS.INVOICE_TEMPLATES, STORAGE_KEYS.INVOICES, STORAGE_KEYS.INVOICE_SETTINGS,
  STORAGE_KEYS.EMAIL_TEMPLATES, STORAGE_KEYS.EMAIL_DRAFTS, STORAGE_KEYS.EMAIL_HISTORY, STORAGE_KEYS.EMAIL_INBOX, STORAGE_KEYS.EMAIL_SETTINGS,
  STORAGE_KEYS.WHATSAPP_TEMPLATES, STORAGE_KEYS.WHATSAPP_MESSAGES, STORAGE_KEYS.OPENWA_SETTINGS,
  STORAGE_KEYS.COMMUNICATION_SETTINGS, STORAGE_KEYS.NOTIFICATION_TEMPLATES, STORAGE_KEYS.NOTIFICATION_HISTORY,
]

/** Phase 6 collections. bellomassi_sales_history is the clearly-labelled synthetic demo baseline used for forecasting. */
export const PHASE6_KEYS = [
  STORAGE_KEYS.AI_SETTINGS, STORAGE_KEYS.AI_CONVERSATIONS, STORAGE_KEYS.AI_MESSAGES, STORAGE_KEYS.AI_INSIGHTS, STORAGE_KEYS.AI_ACTIVITY,
  STORAGE_KEYS.JARVIS_SETTINGS, STORAGE_KEYS.JARVIS_HISTORY, STORAGE_KEYS.FORECASTS, STORAGE_KEYS.FORECAST_SETTINGS,
  STORAGE_KEYS.INVENTORY_PREDICTIONS, STORAGE_KEYS.REORDER_RECOMMENDATIONS, STORAGE_KEYS.AI_MODELS, STORAGE_KEYS.REPLENISHMENT_DRAFTS,
  STORAGE_KEYS.SALES_HISTORY,
]

/** Administration collections (roles, permission catalog state, company, organization, audit log, notification preferences). */
export const ADMIN_KEYS = [
  STORAGE_KEYS.ROLES, STORAGE_KEYS.PERMISSIONS, STORAGE_KEYS.COMPANY, STORAGE_KEYS.ORGANIZATION,
  STORAGE_KEYS.AUDIT_LOGS, STORAGE_KEYS.NOTIFICATION_PREFS,
]

/** Completion-release collections. */
export const COMPLETION_KEYS = [
  STORAGE_KEYS.SCRAP_REQUESTS, STORAGE_KEYS.CALL_HISTORY, STORAGE_KEYS.DRIVER_TRACKING, STORAGE_KEYS.DELIVERY_POD,
  STORAGE_KEYS.CUSTOMER_CARTS, STORAGE_KEYS.REPORT_PREFS,
]

export const DATA_KEYS = [
  STORAGE_KEYS.DEMO_USERS,
  STORAGE_KEYS.DEMO_DATA,
  STORAGE_KEYS.ACTIVITIES,
  STORAGE_KEYS.NOTIFICATIONS,
  STORAGE_KEYS.SETTINGS,
  STORAGE_KEYS.THEME,
  STORAGE_KEYS.CUSTOMERS,
  STORAGE_KEYS.PRODUCTS,
  STORAGE_KEYS.HUBS,
  STORAGE_KEYS.INVENTORY,
  STORAGE_KEYS.STOCK_RECEIPTS,
  STORAGE_KEYS.STOCK_TRANSFERS,
  STORAGE_KEYS.STOCK_ADJUSTMENTS,
  STORAGE_KEYS.STOCK_MOVEMENTS,
  STORAGE_KEYS.ORDERS,
  STORAGE_KEYS.ORDER_SEQUENCE,
  STORAGE_KEYS.APPROVALS,
  STORAGE_KEYS.CONSOLIDATIONS,
  STORAGE_KEYS.ORDER_TIMELINE,
  STORAGE_KEYS.DISPATCH_ZONES,
  STORAGE_KEYS.DRIVERS,
  STORAGE_KEYS.VEHICLES,
  STORAGE_KEYS.DISPATCHES,
  STORAGE_KEYS.DISPATCH_SEQUENCE,
  STORAGE_KEYS.DELIVERIES,
  STORAGE_KEYS.DELIVERY_SEQUENCE,
  STORAGE_KEYS.DELIVERY_OTPS,
  STORAGE_KEYS.DELIVERY_NOTES,
  STORAGE_KEYS.DISPATCH_TIMELINE,
  ...PHASE5_KEYS,
  ...PHASE6_KEYS,
  ...ADMIN_KEYS,
  ...COMPLETION_KEYS,
]

export const EXPORT_SIGNATURE = 'bellomassi-prototype-backup'

/**
 * Order lifecycle. Phase 3: DRAFT → SUBMITTED → APPROVED → CONSOLIDATED → READY_FOR_DISPATCH
 * (with REJECTED / RETURNED branches). Phase 4: READY_FOR_DISPATCH → DISPATCHED (stock deducted when
 * the dispatch is confirmed) → OUT_FOR_DELIVERY → DELIVERED / PARTIALLY_DELIVERED / DELIVERY_FAILED,
 * and RETURNED_TO_HUB once undelivered goods are taken back into stock.
 * An order sitting in an unconfirmed dispatch plan stays READY_FOR_DISPATCH (order.dispatchId is set).
 */
export const ORDER_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  RETURNED: 'RETURNED',
  REJECTED: 'REJECTED',
  APPROVED: 'APPROVED',
  CONSOLIDATED: 'CONSOLIDATED',
  READY_FOR_DISPATCH: 'READY_FOR_DISPATCH',
  DISPATCHED: 'DISPATCHED',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  PARTIALLY_DELIVERED: 'PARTIALLY_DELIVERED',
  DELIVERED: 'DELIVERED',
  DELIVERY_FAILED: 'DELIVERY_FAILED',
  RETURNED_TO_HUB: 'RETURNED_TO_HUB',
})

export const ORDER_STATUS_META = {
  DRAFT: { label: 'Draft', tone: 'neutral', step: 1 },
  SUBMITTED: { label: 'Submitted', tone: 'warning', step: 2 },
  RETURNED: { label: 'Returned for correction', tone: 'warning', step: 2 },
  REJECTED: { label: 'Rejected', tone: 'danger', step: 0 },
  APPROVED: { label: 'Approved', tone: 'info', step: 3 },
  CONSOLIDATED: { label: 'Consolidated', tone: 'brand', step: 4 },
  READY_FOR_DISPATCH: { label: 'Ready for dispatch', tone: 'accent', step: 5 },
  DISPATCHED: { label: 'Dispatched', tone: 'brand', step: 6 },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', tone: 'accent', step: 7 },
  PARTIALLY_DELIVERED: { label: 'Partially delivered', tone: 'warning', step: 8 },
  DELIVERED: { label: 'Delivered', tone: 'success', step: 8 },
  DELIVERY_FAILED: { label: 'Delivery failed', tone: 'danger', step: 7 },
  RETURNED_TO_HUB: { label: 'Returned to hub', tone: 'neutral', step: 7 },
}

export const APPROVAL_STATUS = Object.freeze({
  NOT_SUBMITTED: 'NOT_SUBMITTED',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  RETURNED: 'RETURNED',
})

export const APPROVAL_STATUS_META = {
  NOT_SUBMITTED: { label: 'Not submitted', tone: 'neutral' },
  PENDING: { label: 'Pending', tone: 'warning' },
  APPROVED: { label: 'Approved', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
  RETURNED: { label: 'Returned', tone: 'warning' },
}

export const CONSOLIDATION_STATUS = Object.freeze({ NOT_STARTED: 'NOT_STARTED', PENDING: 'PENDING', COMPLETED: 'COMPLETED' })
export const CONSOLIDATION_STATUS_META = {
  NOT_STARTED: { label: 'Not started', tone: 'neutral' },
  PENDING: { label: 'Pending', tone: 'warning' },
  COMPLETED: { label: 'Completed', tone: 'success' },
}

/** Statuses at or after approval (approved and moving towards delivery). */
export const POST_APPROVAL_STATUSES = ['APPROVED', 'CONSOLIDATED', 'READY_FOR_DISPATCH', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'PARTIALLY_DELIVERED', 'DELIVERED', 'DELIVERY_FAILED', 'RETURNED_TO_HUB']
/** Statuses after the dispatch was confirmed (stock has left the hub). */
export const DISPATCHED_STATUSES = ['DISPATCHED', 'OUT_FOR_DELIVERY', 'PARTIALLY_DELIVERED', 'DELIVERED', 'DELIVERY_FAILED', 'RETURNED_TO_HUB']

export const SIMULATED_LOGIN_DELAY_MS = 650
export const MAX_ACTIVITIES = 300
export const MAX_AUDIT_LOGS = 3000
export const MAX_IMPORT_BYTES = 4 * 1024 * 1024
