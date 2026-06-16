const REQUIRED_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
] as const

export function validateEnv(): void {
  let hasError = false

  for (const v of REQUIRED_VARS) {
    if (!process.env[v]) {
      process.stderr.write(`[Env] Variable d'environnement manquante : ${v}\n`)
      hasError = true
    }
  }

  if (hasError) {
    process.exit(1)
  }
}
