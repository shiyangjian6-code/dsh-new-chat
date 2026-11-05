#!/usr/bin/env node
/**
 * Repository checks for the dsh-new-chat project.
 *
 * Usage: npm run verify
 *
 * The script is deliberately read-only: it never installs, patches, or modifies
 * anything. It validates manifests, syntax, patch provenance/markers, icons,
 * Markdown links and Git-tracked content so CI can catch packaging mistakes.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, resolve, dirname } from 'node:path'
import { spawnSync } from 'node:child_process'
import { parse as parseJs } from 'acorn'
import { parse as parseYaml } from 'yaml'

const ROOT = resolve(import.meta.dirname, '..')
const IGNORED_DIRS = new Set(['.git', 'node_modules', '备份', '历史方案'])
const MAX_ICON_BYTES = 256 * 1024

const failures = []
const passes = []

function ok(message) {
  passes.push(message)
}

function fail(message) {
  failures.push(message)
}

function check(condition, message) {
  if (condition) ok(message)
  else fail(message)
}

function readText(rel) {
  return readFileSync(join(ROOT, rel), 'utf8')
}

function readJson(rel) {
  return JSON.parse(readText(rel))
}

function fileExists(rel) {
  return existsSync(join(ROOT, rel))
}

function sha256(rel) {
  return createHash('sha256').update(readFileSync(join(ROOT, rel))).digest('hex')
}

function walk(rel = '', out = []) {
  const abs = rel ? join(ROOT, rel) : ROOT
  for (const name of readdirSync(abs)) {
    if (IGNORED_DIRS.has(name)) continue
    const childRel = rel ? `${rel}/${name}` : name
    const childAbs = join(ROOT, childRel)
    const info = statSync(childAbs)
    if (info.isDirectory()) walk(childRel, out)
    else out.push(childRel)
  }
  return out
}

/** Resolve a package-relative export/file target that may be a file or a simple glob. */
function globMatches(pattern, baseDir = '') {
  const joined = baseDir ? `${baseDir}/${pattern}` : pattern
  const parts = joined.split('/')
  const base = parts[parts.length - 1]
  if (!base.includes('*')) return fileExists(joined) ? [joined] : []
  const dir = parts.slice(0, -1).join('/') || '.'
  if (!fileExists(dir)) return []
  const prefix = base.split('*')[0]
  const suffix = base.split('*').pop()
  return readdirSync(join(ROOT, dir))
    .filter((name) => name.startsWith(prefix) && name.endsWith(suffix))
    .map((name) => (dir === '.' ? name : `${dir}/${name}`))
}

/** Parse JavaScript with Acorn (no child process needed, works offline). */
function syntaxCheck(rel, sourceType = 'module') {
  try {
    parseJs(readText(rel), { ecmaVersion: 'latest', sourceType, allowHashBang: true })
    return true
  } catch (error) {
    fail(`syntax error: ${rel}: ${error.message}`)
    return false
  }
}

/* ------------------------------------------------------------------ JSON */

const files = walk()
const jsonFiles = files.filter((name) => name.endsWith('.json'))
for (const rel of jsonFiles) {
  try {
    readJson(rel)
    ok(`JSON parses: ${rel}`)
  } catch (error) {
    fail(`JSON invalid: ${rel} (${error.message})`)
  }
}

/* ------------------------------------------------------------------ YAML */

const yamlFiles = files.filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
for (const rel of yamlFiles) {
  try {
    parseYaml(readText(rel))
    ok(`YAML parses: ${rel}`)
  } catch (error) {
    fail(`YAML invalid: ${rel} (${error.message})`)
  }
}

/* --------------------------------------------------------- plugin packages */

function checkPlugin(dir, expectedName, markers) {
  const pkgRel = `${dir}/package.json`
  check(fileExists(pkgRel), `${dir}: package.json exists`)
  if (!fileExists(pkgRel)) return
  const pkg = readJson(pkgRel)

  check(pkg.name === expectedName, `${dir}: package name is ${expectedName}`)
  check(/^\d+\.\d+\.\d+$/.test(pkg.version || ''), `${dir}: version is semver (${pkg.version})`)
  check(pkg.license === 'MIT', `${dir}: license is MIT`)
  check(pkg.private === true, `${dir}: package is private (not npm-published)`)
  check(pkg.dsh?.bundle?.patch === './cordis.patch.yml', `${dir}: declares a bundle patch`)
  check(pkg.dsh?.client?.platform === 'web', `${dir}: client platform is web`)

  for (const [key, target] of Object.entries(pkg.exports || {})) {
    const matches = globMatches(String(target), dir)
    check(matches.length > 0, `${dir}: export ${key} resolves (${target})`)
  }
  for (const pattern of pkg.files || []) {
    const matches = globMatches(String(pattern), dir)
    check(matches.length > 0, `${dir}: files entry resolves (${pattern})`)
  }

  check(fileExists(`${dir}/index.js`), `${dir}: host half exists`)
  check(fileExists(`${dir}/client.js`), `${dir}: client half exists`)
  check(fileExists(`${dir}/icon.svg`), `${dir}: icon exists`)
  if (fileExists(`${dir}/icon.svg`)) {
    const icon = readText(`${dir}/icon.svg`)
    const bytes = Buffer.byteLength(icon)
    check(icon.trimStart().startsWith('<svg'), `${dir}: icon is SVG`)
    check(bytes <= MAX_ICON_BYTES, `${dir}: icon is < ${MAX_ICON_BYTES} bytes`)
  }

  for (const locale of ['zh', 'en']) {
    const rel = `${dir}/locale/${locale}.json`
    if (!fileExists(rel)) {
      fail(`${dir}: locale ${locale}.json exists`)
      continue
    }
    const dict = readJson(rel)
    check(
      typeof dict.meta?.title === 'string' && dict.meta.title.length > 0,
      `${dir}: locale ${locale} has meta.title`,
    )
    check(
      typeof dict.meta?.description === 'string' && dict.meta.description.length > 0,
      `${dir}: locale ${locale} has meta.description`,
    )
  }

  const patchRel = `${dir}/cordis.patch.yml`
  if (fileExists(patchRel)) {
    const patch = parseYaml(readText(patchRel))
    const row = Array.isArray(patch) ? patch[0]?.insert?.[0] : undefined
    check(Array.isArray(patch) && patch.length === 1, `${dir}: patch has exactly one layer`)
    check(typeof row?.id === 'string' && row.id.length > 0, `${dir}: patch row has an id`)
    check(row?.name === expectedName, `${dir}: patch row targets ${expectedName}`)
  }

  for (const jsRel of files.filter((name) => name.startsWith(`${dir}/`) && name.endsWith('.js'))) {
    syntaxCheck(jsRel)
    ok(`syntax ok: ${jsRel}`)
  }

  const clientRel = `${dir}/client.js`
  if (fileExists(clientRel)) {
    const client = readText(clientRel)
    check(client.includes('window.__ModuleLoader__.load('), `${dir}: client uses the module loader`)
    check(
      !/require\s*\(\s*['"]@deepseek-ai\/dsh-client-ui-/.test(client),
      `${dir}: client does not import Harness Client packages`,
    )
    check(!/require\s*\(\s*['"]electron['"]/.test(client), `${dir}: client does not require electron`)
    for (const marker of markers) {
      check(client.includes(marker), `${dir}: client contains expected marker "${marker}"`)
    }
  }
}

checkPlugin('bundle', '@local/dsh-new-chat', ['dsh-new-chat-v2', 'dshDesktop', 'sidebar.panellist', 'main'])
checkPlugin('restart-bundle', '@local/dsh-restart', ['dshDesktop', 'shell.overlay', 'restart'])

/* ------------------------------------------------------------ desktop patch */

const manifestRel = 'desktop-support/desktop/patch-manifest.json'
const desktopMainRel = 'desktop-support/desktop/main.js'
const preloadRel = 'desktop-support/desktop/preload-app.cjs'
const resultRel = 'desktop-support/verification-result.json'
const builderRel = 'desktop-support/tools/patch_asar.py'

if (fileExists(manifestRel)) {
  const manifest = readJson(manifestRel)
  check(manifest.desktop_version === '0.2.1-rc.5', 'patch: target desktop version is pinned')
  check(typeof manifest.patch_version === 'string' && manifest.patch_version.length > 0, 'patch: has an id')
  const hashes = manifest.original_entry_sha256 || {}
  check(Object.keys(hashes).length === 2, 'patch: pins two original files')
  for (const [file, hash] of Object.entries(hashes)) {
    check(/^[0-9a-f]{64}$/.test(String(hash)), `patch: ${file} original hash is SHA256`)
  }
} else {
  fail('patch: manifest is missing')
}

for (const rel of [desktopMainRel, preloadRel, builderRel]) {
  check(fileExists(rel), `patch: file exists ${rel}`)
  if (fileExists(rel)) {
    const bytes = statSync(join(ROOT, rel)).size
    const minBytes = rel === builderRel ? 5 * 1024 : 10 * 1024
    check(bytes > minBytes, `patch: file is plausibly complete ${rel} (${bytes} bytes)`)
  }
}

if (fileExists(desktopMainRel)) {
  const main = readText(desktopMainRel)
  for (const marker of [
    'persist:dsh-new-chat-v2',
    'flushPersistentStorage',
    'dsh-desktop:restart',
    'app.relaunch',
  ]) {
    check(main.includes(marker), `patch: main.js contains "${marker}"`)
  }
  syntaxCheck(desktopMainRel)
  ok('syntax ok: desktop-support/desktop/main.js')
}

if (fileExists(preloadRel)) {
  const preload = readText(preloadRel)
  check(preload.includes('dsh-desktop:restart'), 'patch: preload calls the restart IPC')
  check(/restart\s*:\s*\(/.test(preload) || preload.includes('restart:'), 'patch: preload exposes restart')
  syntaxCheck(preloadRel, 'script')
  ok('syntax ok: desktop-support/desktop/preload-app.cjs')
}

if (fileExists(resultRel)) {
  const result = readJson(resultRel)
  check(result.behavior_scenarios_passed === 14, 'verification: 14 behavior scenarios recorded')
  check(result.archive_unchanged_entries === 16649, 'verification: 16,649 archive entries verified')
  check(result.chat_live_smoke?.partition === 'persist:dsh-new-chat-v2', 'verification: chat partition recorded')
  check(result.real_wechat_login_performed === false, 'verification: no real login performed by maintainer')
  check(result.messages_sent === 0, 'verification: no messages sent by maintainer')
  check(result.desktop_version === '0.2.1-rc.5', 'verification: desktop version recorded')
  check(result.patch_version === 'two-plugin-1', 'verification: patch version recorded')
  const provenance = fileExists(manifestRel) ? readJson(manifestRel) : {}
  const sourceHashes = result.source_entry_sha256 || {}
  for (const [file, hash] of Object.entries(sourceHashes)) {
    check(
      provenance.original_entry_sha256?.[file] === hash,
      `verification: ${file} original SHA256 matches manifest`,
    )
  }
  const patchedFiles = {
    'lib/main.js': desktopMainRel,
    'lib/preload-app.cjs': preloadRel,
  }
  for (const [file, hash] of Object.entries(result.patched_entry_sha256 || {})) {
    const rel = patchedFiles[file]
    check(
      Boolean(rel) && /^[0-9a-f]{64}$/.test(String(hash)) && sha256(rel) === hash,
      `verification: ${file} patched SHA256 matches the repository file`,
    )
  }
} else {
  fail('verification: desktop-support/verification-result.json is missing')
}

/* ----------------------------------------------------------- markdown links */

const markdownFiles = files.filter((name) => name.endsWith('.md'))
const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g
for (const rel of markdownFiles) {
  const text = readText(rel)
  const baseDir = dirname(join(ROOT, rel))
  for (const match of text.matchAll(linkPattern)) {
    let target = match[1].trim().replace(/^<|>$/g, '')
    if (!target || target.startsWith('#') || target.startsWith('mailto:')) continue
    if (/^(?:https?:)?\/\//i.test(target)) continue
    target = target.split('#')[0]
    if (!target) continue
    let decoded = target
    try {
      decoded = decodeURIComponent(target)
    } catch {}
    if (!existsSync(resolve(baseDir, decoded))) {
      fail(`Markdown link target missing in ${rel}: ${target}`)
    }
  }
  ok(`Markdown links checked: ${rel}`)
}

/* ------------------------------------------------------- repository metadata */

check(fileExists('LICENSE'), 'repository: LICENSE exists')
if (fileExists('LICENSE')) {
  check(readText('LICENSE').includes('MIT License'), 'repository: LICENSE is MIT')
}
check(fileExists('README.md'), 'repository: README.md exists')
check(fileExists('README.en.md'), 'repository: README.en.md exists')
check(fileExists('CHANGELOG.md'), 'repository: CHANGELOG.md exists')
check(fileExists('CONTRIBUTING.md'), 'repository: CONTRIBUTING.md exists')
check(fileExists('SECURITY.md'), 'repository: SECURITY.md exists')
check(fileExists('THIRD_PARTY_NOTICES.md'), 'repository: third-party notices exist')
check(fileExists('docs/releasing.md'), 'repository: publishing checklist exists')
check(fileExists('docs/assets/ui-overview.svg'), 'repository: UI overview illustration exists')
check(fileExists('docs/assets/README.md'), 'repository: asset/screenshot guidance exists')
if (fileExists('docs/assets/ui-overview.svg')) {
  const ui = readText('docs/assets/ui-overview.svg')
  check(ui.trimStart().startsWith('<svg'), 'repository: UI overview is an SVG illustration')
  check(Buffer.byteLength(ui) <= MAX_ICON_BYTES * 4, 'repository: UI overview is a reasonable size')
}
check(fileExists('.gitignore'), 'repository: .gitignore exists')
check(fileExists('package-lock.json'), 'repository: package-lock.json exists (npm ci needs it)')

if (fileExists('package.json')) {
  const pkg = readJson('package.json')
  check(pkg.name === 'dsh-new-chat', 'repository: root package name is dsh-new-chat')
  check(pkg.license === 'MIT', 'repository: root license is MIT')
  check(
    String(pkg.repository?.url || '').includes('github.com/shiyangjian6-code/dsh-new-chat'),
    'repository: root repository URL is set',
  )
  check(pkg.devDependencies?.yaml !== undefined, 'repository: yaml dev dependency is declared')
}

if (fileExists('.gitignore')) {
  const ignore = readText('.gitignore')
  for (const entry of ['备份/', '历史方案/', 'node_modules/', '*.asar', '*.zip', '__pycache__/']) {
    check(ignore.includes(entry), `repository: .gitignore covers ${entry}`)
  }
}

if (fileExists('README.md')) {
  check(
    readText('README.md').includes('github.com/shiyangjian6-code/dsh-new-chat'),
    'repository: README.md references the GitHub repository',
  )
  check(!readText('README.md').includes('YOUR_GITHUB_USER'), 'repository: no placeholder owner left in README')
  check(
    readText('README.md').includes('docs/assets/ui-overview.svg'),
    'repository: README.md shows the UI overview illustration',
  )
}

if (fileExists('CHANGELOG.md')) {
  check(readText('CHANGELOG.md').includes('## [1.1.0]'), 'repository: changelog has 1.1.0 entry')
}

/* ---------------------------------------------------------- git-tracked files */

if (fileExists('.git')) {
  const tracked = spawnSync('git', ['-C', ROOT, 'ls-files'], { encoding: 'utf8' })
  if (tracked.status === 0) {
    const list = tracked.stdout.split('\n').filter(Boolean)
    for (const path of list) {
      if (/^(备份|历史方案)\//.test(path) || /\.asar$/.test(path) || /\.zip$/.test(path)) {
        fail(`git: ignored material is tracked: ${path}`)
      }
    }
    check(
      list.every((path) => !path.startsWith('node_modules/')),
      'git: no node_modules tracked',
    )
    check(list.includes('bundle/client.js'), 'git: bundle sources are tracked')
    check(list.includes('desktop-support/desktop/main.js'), 'git: desktop patch sources are tracked')
    const oversized = list.filter((path) => {
      const info = statSync(join(ROOT, path))
      return info.size > 2 * 1024 * 1024
    })
    check(oversized.length === 0, `git: no tracked file above 2 MiB${oversized.length ? ` (${oversized.join(', ')})` : ''}`)
    ok(`git: inspected ${list.length} tracked files`)
  } else if (tracked.error) {
    ok('git: command could not be spawned here, tracked-file checks skipped')
  } else {
    fail(`git: could not list tracked files (${(tracked.stderr || '').trim()})`)
  }
} else {
  ok('git: repository not initialised yet, tracked-file checks skipped')
}

/* ------------------------------------------------------------------ summary */

console.log('')
for (const message of passes) console.log(`ok    ${message}`)
console.log('')
if (failures.length > 0) {
  for (const message of failures) console.error(`FAIL  ${message}`)
  console.error(`\n${failures.length} check(s) failed, ${passes.length} passed.`)
  process.exit(1)
}
console.log(`${passes.length} checks passed.`)
