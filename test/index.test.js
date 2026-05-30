// Run with: npm test  (uses node's built-in test runner; no extra deps)
//
// These tests cover the retry/timeout/error-mapping logic added during the
// axios migration. They deliberately do NOT hit workflowy.com: the integration
// tests spin a local HTTP server we fully control, so we can simulate transient
// socket failures (the real-world ETIMEDOUT/ECONNRESET) deterministically.
const test = require('node:test')
const assert = require('node:assert')
const http = require('node:http')

const Workflowy = require('../index.js')
const utils = Workflowy._utils

// ---------------------------------------------------------------------------
// isTransientNetworkError
// ---------------------------------------------------------------------------
test('isTransientNetworkError: recognizes transient codes on err.code', () => {
  for (const code of ['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN']) {
    assert.equal(utils.isTransientNetworkError({ code }), true, code)
  }
})

test('isTransientNetworkError: recognizes transient codes nested on err.cause', () => {
  assert.equal(utils.isTransientNetworkError({ cause: { code: 'ETIMEDOUT' } }), true)
})

test('isTransientNetworkError: rejects HTTP-status errors and unknown codes', () => {
  assert.equal(utils.isTransientNetworkError({ status: 403, message: 'Incorrect login info' }), false)
  assert.equal(utils.isTransientNetworkError({ code: 'SOMETHING_ELSE' }), false)
  assert.equal(utils.isTransientNetworkError(null), false)
  assert.equal(utils.isTransientNetworkError(new Error('plain')), false)
})

// ---------------------------------------------------------------------------
// withRetry
// ---------------------------------------------------------------------------
test('withRetry: returns immediately on success, no retries', async () => {
  let calls = 0
  const result = await utils.withRetry(async () => { calls++; return 'ok' }, { baseDelayMs: 1 })
  assert.equal(result, 'ok')
  assert.equal(calls, 1)
})

test('withRetry: retries transient failures then succeeds', async () => {
  let calls = 0
  const result = await utils.withRetry(async () => {
    calls++
    if (calls < 3) { const e = new Error('boom'); e.code = 'ECONNRESET'; throw e }
    return 'recovered'
  }, { retries: 3, baseDelayMs: 1 })
  assert.equal(result, 'recovered')
  assert.equal(calls, 3)
})

test('withRetry: gives up after `retries` extra attempts and rethrows', async () => {
  let calls = 0
  await assert.rejects(
    utils.withRetry(async () => { calls++; const e = new Error('boom'); e.code = 'ETIMEDOUT'; throw e },
      { retries: 2, baseDelayMs: 1 }),
    /boom/
  )
  assert.equal(calls, 3) // 1 initial + 2 retries
})

test('withRetry: does NOT retry non-transient errors', async () => {
  let calls = 0
  await assert.rejects(
    utils.withRetry(async () => { calls++; const e = new Error('nope'); e.status = 403; throw e },
      { retries: 5, baseDelayMs: 1 }),
    /nope/
  )
  assert.equal(calls, 1) // failed once, not retried
})

// ---------------------------------------------------------------------------
// httpAbove299toError
// ---------------------------------------------------------------------------
test('httpAbove299toError: passes through 2xx', () => {
  const resp = { status: 200, data: { ok: true }, config: { url: 'x' }, headers: {} }
  assert.equal(utils.httpAbove299toError(resp), resp)
})

test('httpAbove299toError: rejects 4xx/5xx', async () => {
  await assert.rejects(
    Promise.resolve(utils.httpAbove299toError({ status: 500, data: '', config: { url: 'http://wf/x' }, headers: {} })),
    err => { assert.equal(err.status, 500); assert.match(err.message, /Error with request/); return true }
  )
})

test('httpAbove299toError: treats 302 to workflowy.com as success', () => {
  const resp = { status: 302, data: '', config: { url: 'x' }, headers: { location: 'https://workflowy.com/' } }
  assert.equal(utils.httpAbove299toError(resp), resp)
})

test('httpAbove299toError: rejects when body.error present', async () => {
  // Q.reject yields a plain object (not an Error), so match via a predicate.
  await assert.rejects(
    Promise.resolve(utils.httpAbove299toError({ status: 200, data: { error: 'bad' }, config: { url: 'http://wf/x' }, headers: {} })),
    err => { assert.match(err.message, /bad/); return true }
  )
})

// ---------------------------------------------------------------------------
// Integration: refresh() against a local server, simulating a transient socket
// failure on the first attempt and a clean JSON response on the retry.
// ---------------------------------------------------------------------------
function metaPayload () {
  return {
    projectTreeData: {
      mainProjectTreeInfo: {
        initialMostRecentOperationTransactionId: 'tx-1',
        rootProjectChildren: [
          { id: 'aaaaaaaa', nm: 'Top node', ch: [{ id: 'bbbbbbbb', nm: 'Child node' }] },
        ],
      },
    },
  }
}

function startServer (handler) {
  return new Promise(resolve => {
    const server = http.createServer(handler)
    server.listen(0, '127.0.0.1', () => resolve(server))
  })
}

test('refresh(): retries a transient socket error then parses the tree', async (t) => {
  let hits = 0
  const server = await startServer((req, res) => {
    hits++
    if (hits === 1) { req.socket.destroy(); return } // -> ECONNRESET on the client
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(metaPayload()))
  })
  const port = server.address().port
  const origMeta = Workflowy.urls.meta
  Workflowy.urls.meta = `http://127.0.0.1:${port}/get_initialization_data`
  t.after(() => { Workflowy.urls.meta = origMeta; server.close() })

  const wf = new Workflowy({ sessionid: 'fake-session', maxRetries: 2 })
  await wf.refresh()
  const nodes = await wf.nodes
  const outline = await wf.outline

  assert.equal(hits, 2, 'should have hit the server twice (1 failure + 1 retry)')
  assert.equal(outline.length, 1)
  assert.equal(nodes.length, 2) // flattened: top + child
  assert.equal(nodes[0].nm, 'Top node')
  assert.equal(wf._lastTransactionId, 'tx-1')
})

test('refresh(): gives up after exhausting retries, surfaces friendly-wrapped error', async (t) => {
  let hits = 0
  const server = await startServer((req) => { hits++; req.socket.destroy() }) // always fail
  const port = server.address().port
  const origMeta = Workflowy.urls.meta
  Workflowy.urls.meta = `http://127.0.0.1:${port}/get_initialization_data`
  t.after(() => { Workflowy.urls.meta = origMeta; server.close() })

  const wf = new Workflowy({ sessionid: 'fake-session', maxRetries: 1 })
  await assert.rejects(wf.refresh(), err => {
    assert.match(err.message, /Error fetching document root/)
    return true
  })
  assert.equal(hits, 2, 'should have tried twice (1 initial + 1 retry) before giving up')
})
