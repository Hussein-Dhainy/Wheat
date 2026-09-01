// Loads the running experience in headless Chrome and fails on any console
// error, uncaught exception, or failed network request.
//
// This exists because the build and the unit tests cannot see this class of
// bug. Both passed while PredictionGround threw a TypeError on mount: the
// code was valid syntax, and no unit test mounts a React Three Fiber scene.
// Anything that only breaks once a real WebGL context and the real assets are
// involved -- a missing decoder, a 404 asset, a shader that fails to compile,
// a scene component that throws -- shows up here and nowhere else.
//
// Chrome is driven over the DevTools protocol using Node's built-in WebSocket,
// so this adds no dependency.
//
// Usage: node scripts/smoke-test.mjs [url]
//   defaults to http://localhost:5173/

import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const URL_UNDER_TEST = process.argv[2] ?? 'http://localhost:5173/'
const DEBUG_PORT = 9333
// The experience gates on downloading ~14MB of models and a warm-up render
// pass, so it needs noticeably longer than a typical page before its console
// output is meaningful.
const SETTLE_MS = 25_000

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
]

// Noise that says nothing about whether the experience works.
const IGNORED = [
  /favicon/i,
  /DevTools/i,
  /Download the React DevTools/i,
]

function findChrome() {
  const found = CHROME_CANDIDATES.find((path) => existsSync(path))
  if (!found) {
    console.error('Chrome not found. Checked:\n  ' + CHROME_CANDIDATES.join('\n  '))
    process.exit(1)
  }
  return found
}

async function waitForJSON(url, attempts = 40) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url)
      if (response.ok) return await response.json()
    } catch {
      // Chrome has not opened the port yet.
    }
    await new Promise((resolve) => { setTimeout(resolve, 250) })
  }
  throw new Error(`Timed out waiting for ${url}`)
}

async function main() {
  // Fail early and clearly if the dev server is not up, rather than reporting
  // its absence as a page error.
  try {
    const response = await fetch(URL_UNDER_TEST)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
  } catch (error) {
    console.error(`No server at ${URL_UNDER_TEST} (${error.message}).`)
    console.error('Start one with `npm run dev`, then re-run this.')
    process.exit(1)
  }

  const profileDir = mkdtempSync(join(tmpdir(), 'wheat-smoke-'))
  const chrome = spawn(findChrome(), [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profileDir}`,
    // Headless Chrome falls back to SwiftShader without these; the experience
    // needs a working WebGL context to exercise anything worth testing.
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--mute-audio',
    '--window-size=1440,900',
    'about:blank',
  ], { stdio: 'ignore' })

  const problems = []
  let socket = null

  const cleanup = () => {
    try { socket?.close() } catch { /* already closed */ }
    chrome.kill('SIGKILL')
    // The profile is disposable; losing the race to delete it is not a failure.
    try { rmSync(profileDir, { force: true, recursive: true }) } catch { /* ignore */ }
  }

  try {
    const targets = await waitForJSON(`http://127.0.0.1:${DEBUG_PORT}/json/list`)
    const page = targets.find((target) => target.type === 'page')
    if (!page) throw new Error('No page target exposed by Chrome')

    socket = new WebSocket(page.webSocketDebuggerUrl)
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true })
      socket.addEventListener('error', reject, { once: true })
    })

    let messageId = 0
    const send = (method, params = {}) => {
      messageId += 1
      socket.send(JSON.stringify({ id: messageId, method, params }))
    }

    const record = (kind, text) => {
      if (!text || IGNORED.some((pattern) => pattern.test(text))) return
      problems.push(`[${kind}] ${text}`)
    }

    socket.addEventListener('message', (event) => {
      const { method, params } = JSON.parse(event.data)

      if (method === 'Runtime.exceptionThrown') {
        const details = params.exceptionDetails
        record('exception', details.exception?.description ?? details.text)
      } else if (method === 'Runtime.consoleAPICalled' && params.type === 'error') {
        record('console.error', params.args
          .map((arg) => arg.description ?? arg.value ?? arg.type)
          .join(' '))
      } else if (method === 'Log.entryAdded' && params.entry.level === 'error') {
        record('log', `${params.entry.text} ${params.entry.url ?? ''}`.trim())
      } else if (method === 'Network.loadingFailed' && !params.canceled) {
        record('network', `${params.errorText} ${params.type}`)
      }
    })

    send('Runtime.enable')
    send('Log.enable')
    send('Network.enable')
    send('Page.enable')
    send('Page.navigate', { url: URL_UNDER_TEST })

    process.stdout.write(`loading ${URL_UNDER_TEST} `)
    const started = Date.now()
    while (Date.now() - started < SETTLE_MS) {
      await new Promise((resolve) => { setTimeout(resolve, 2500) })
      process.stdout.write('.')
    }
    console.log('')
  } finally {
    cleanup()
  }

  if (problems.length > 0) {
    console.error(`\nFAIL — ${problems.length} problem(s):\n`)
    problems.forEach((problem) => console.error(`  ${problem}\n`))
    process.exit(1)
  }

  console.log('\nPASS — no console errors, exceptions, or failed requests.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
