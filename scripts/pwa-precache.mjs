// Writes dist/precache-manifest.json (the app shell the service worker
// precaches) and stamps dist/sw.js with a build id so every release installs
// a new worker. Used by vite.config.js (closeBundle) and the sandbox build.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const INCLUDE = /\.(js|css|woff2|html|svg|ico|png|webmanifest)$/i
const EXCLUDE = [/^sw\.js$/, /^precache-manifest\.json$/, /^screenshots\//, /\.map$/, /^shortcuts\//, /^dist-sandbox\//]

function walk(dir, base = dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, base, out)
    else out.push(path.relative(base, p).split(path.sep).join('/'))
  }
  return out
}

export function writePrecache(outdir, { version = '0.0.0' } = {}) {
  const all = walk(outdir).sort()
  const files = all.filter((f) => INCLUDE.test(f) && !EXCLUDE.some((re) => re.test(f)))
  const h = crypto.createHash('sha256')
  for (const f of files) {
    h.update(f)
    h.update(fs.readFileSync(path.join(outdir, f)))
  }
  const swPath = path.join(outdir, 'sw.js')
  if (fs.existsSync(swPath)) h.update(fs.readFileSync(swPath))
  const build = `${version}-${h.digest('hex').slice(0, 12)}`
  const urls = files.map((f) => '/' + f).map((u) => (u === '/index.html' ? '/index.html' : u))
  fs.writeFileSync(path.join(outdir, 'precache-manifest.json'), JSON.stringify({ version, build, generated: new Date().toISOString(), files: urls }, null, 0))
  if (fs.existsSync(swPath)) {
    const sw = fs.readFileSync(swPath, 'utf8').replace(/__BUILD_ID__/g, build)
    fs.writeFileSync(swPath, sw)
  }
  return { build, count: urls.length }
}

export default writePrecache
