export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || ''
export const apiVersion = '2024-10-01'
export const isConfigured = projectId.length > 0
