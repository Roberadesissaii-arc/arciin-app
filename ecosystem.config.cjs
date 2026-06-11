/**
 * PM2 — Arciin Mobile PWA (production)
 *
 *   pm2 start ecosystem.config.cjs
 *   pm2 logs arciin-mobile
 *   pm2 restart arciin-mobile
 */

const fs = require("node:fs")
const path = require("node:path")

const ROOT = __dirname
const LOG_DIR = path.join(ROOT, "logs")

function parseEnvFile(filePath) {
  const env = { NODE_ENV: "production" }
  if (!fs.existsSync(filePath)) return env
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    env[key] = val
  }
  return env
}

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

const dotenv = parseEnvFile(path.join(ROOT, ".env.local"))
const port = String(dotenv.PORT || dotenv.ARCIIN_WEB_PORT || dotenv.ARCIIN_MOBILE_PORT || "3002")
const bindHost = dotenv.ARCIIN_BIND_HOST || dotenv.ARCIIN_MOBILE_BIND_HOST || "0.0.0.0"
const runScript = path.join(ROOT, "scripts/run-mobile-prod.sh")

module.exports = {
  apps: [
    {
      name: "arciin-mobile",
      script: runScript,
      cwd: ROOT,
      interpreter: "bash",
      env: {
        ...dotenv,
        NODE_ENV: "production",
        ARCIIN_MOBILE_PORT: port,
        ARCIIN_MOBILE_BIND_HOST: bindHost,
      },
      error_file: path.join(LOG_DIR, "arciin-mobile-err.log"),
      out_file: path.join(LOG_DIR, "arciin-mobile-out.log"),
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
    },
  ],
}
