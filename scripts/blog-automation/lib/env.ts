import 'dotenv/config'

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback
}

export const env = {
  get anthropicApiKey() { return required('ANTHROPIC_API_KEY') },
  get sanityProjectId() { return required('NEXT_PUBLIC_SANITY_PROJECT_ID') },
  get sanityDataset() { return optional('NEXT_PUBLIC_SANITY_DATASET', 'production') },
  get sanityWriteToken() { return required('SANITY_API_WRITE_TOKEN') },
  get resendApiKey() { return required('RESEND_API_KEY') },
  get adminEmail() { return required('ADMIN_EMAIL') },
  get appUrl() { return optional('NEXT_PUBLIC_APP_URL', 'https://petite-moment.com') },
  get monthlyBudgetUsd() { return Number(optional('BLOG_AUTOMATION_MONTHLY_BUDGET_USD', '5')) },
  get defaultModel() { return optional('BLOG_AUTOMATION_MODEL', 'claude-opus-4-7') },
}
