import fs from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

interface GoogleServicesJson {
  client?: Array<{
    oauth_client?: Array<{
      client_id?: string
      client_type?: number
    }>
  }>
}

function readWebClientIdFromGoogleServices(): string {
  const googleServicesPath = path.resolve(import.meta.dirname, 'android/app/google-services.json')
  if (!fs.existsSync(googleServicesPath)) return ''

  try {
    const parsed = JSON.parse(fs.readFileSync(googleServicesPath, 'utf-8')) as GoogleServicesJson
    for (const client of parsed.client ?? []) {
      const webClient = client.oauth_client?.find((oauth) => oauth.client_type === 3 && oauth.client_id)
      if (webClient?.client_id) {
        return webClient.client_id
      }
    }
  } catch {
    // Ignore malformed google-services.json and fall back to env var
  }
  return ''
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const googleWebClientId = env.VITE_GOOGLE_WEB_CLIENT_ID || readWebClientIdFromGoogleServices()

  return {
    plugins: [react()],
    define: {
      __GOOGLE_WEB_CLIENT_ID__: JSON.stringify(googleWebClientId),
    },
  }
})
