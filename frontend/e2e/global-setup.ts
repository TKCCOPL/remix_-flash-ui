import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function globalSetup() {
  const seedScript = path.join(__dirname, 'seed-test-data.py')
  execSync(`python3 ${seedScript}`, { cwd: path.resolve(__dirname, '../..') })
}

export default globalSetup