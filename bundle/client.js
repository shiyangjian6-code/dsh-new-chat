/**
 * 「新聊天」— browser half.
 *
 * Adds a left-sidebar panel entry (`sidebar.panellist` + `main` keyed slots)
 * that opens the official DeepSeek web chat inside Harness.
 *
 * Why an Electron <webview> instead of an iframe: chat.deepseek.com answers
 * with `content-security-policy: frame-ancestors 'none'`, so it can never be
 * embedded in an iframe. The Desktop Harness already has a sandboxed browser
 * guest facility (the right-sidebar Browser uses the same one); this panel
 * reuses that desktop capability through the page's public `dshDesktop`
 * bridge. The guest runs with node integration off, context isolation on,
 * a per-plugin storage partition, permissions denied and downloads blocked —
 * the same isolation policy the shipped Browser applies.
 *
 * No credentials are read or stored here. Signing in happens inside the
 * embedded page. The companion desktop patch persists this workspace's cookies
 * and local storage across app restarts; the site may still expire a session.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-new-chat',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const h = React.createElement

    const PANEL_ID = 'new-chat'
    const CHAT_URL = 'https://chat.deepseek.com/'
    const NS = 'newChat'
    /** Stable guest identity: the companion desktop patch persists only this workspace. */
    const WORKSPACE_KEY = 'dsh-new-chat-v2'
    /** Give up showing the "loading" veil after this long, keeping the guest alive. */
    const LOAD_TIMEOUT_MS = 30000
    /** Risk-control pages the site may return (rate limit, abnormal environment). */
    const RISK_PATTERN = /Rate Limit|环境异常|登录限制|访问异常|访问受限|请稍后再试|unusual traffic|verify (?:that )?you are (?:a )?human/i

    const zh = {
      panel: '新聊天',
      subtitle: 'DeepSeek 网页版',
      reload: '刷新',
      external: '在系统浏览器打开',
      loading: '正在加载 DeepSeek 网页版…',
      loadingHint: '首次打开可能需要几秒。登录、发送消息都在网页内由你完成，本插件不读取也不保存你的账号密码。',
      errorTitle: '网页加载失败',
      errorBody: '请检查网络后重试，或改用系统浏览器打开。',
      unsupportedTitle: '当前环境无法在 Harness 内嵌此网页',
      unsupportedBody:
        'DeepSeek 官网通过 CSP（frame-ancestors \'none\'）拒绝被 iframe 嵌入，所以浏览器网页版 Harness 无法直接内嵌它；桌面版 Harness 使用独立的 Electron WebView 访问。请改用桌面版 Harness，或在系统浏览器中打开。',
      retry: '重试',
      riskText: 'DeepSeek 官网对本次访问做了限流或风险控制（不是插件故障）。请稍等几分钟后点「刷新」，或改用系统浏览器打开。',
      dismiss: '知道了',
      note: '本插件不读取、不保存你的账号密码，也不使用任何付费 API。',
    }

    const en = {
      panel: 'New Chat',
      subtitle: 'DeepSeek Web',
      reload: 'Reload',
      external: 'Open in system browser',
      loading: 'Loading DeepSeek Web…',
      loadingHint:
        'The first load may take a few seconds. Sign-in and messages happen in the page; this plugin never reads or stores your credentials.',
      errorTitle: 'Could not load the page',
      errorBody: 'Check your network and retry, or open it in your system browser.',
      unsupportedTitle: 'This page cannot be embedded here',
      unsupportedBody:
        'chat.deepseek.com refuses iframe embedding (CSP frame-ancestors \'none\'), so the browser-based Harness cannot embed it; the Desktop Harness uses an isolated Electron WebView instead. Use the Desktop Harness or open it in your system browser.',
      retry: 'Retry',
      riskText:
        'DeepSeek is rate-limiting this visit or applying risk control (not a plugin fault). Wait a few minutes and press Reload, or open it in your system browser.',
      dismiss: 'Dismiss',
      note: 'This plugin never reads or stores credentials and uses no paid APIs.',
    }

    const CSS = [
      '.nc-root{box-sizing:border-box;height:100%;min-height:0;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px}',
      '[data-platform=darwin] .nc-root{padding-top:var(--dsh-frame-top-clearance,0px)}',
      '.nc-bar{box-sizing:border-box;flex:none;display:flex;align-items:center;gap:10px;height:40px;padding:0 10px 0 14px;border-bottom:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base)}',
      '.nc-brand{display:flex;align-items:center;gap:8px;min-width:0}',
      '.nc-mark{display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-brand-primary);flex:none}',
      '.nc-title{font-size:13px;font-weight:500;line-height:20px;color:var(--dsw-alias-label-primary);white-space:nowrap}',
      '.nc-sub{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.nc-actions{display:flex;align-items:center;gap:2px;margin-left:auto;flex:none}',
      '.nc-action{border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:20px;padding:4px 8px;border-radius:6px;cursor:pointer;white-space:nowrap}',
      '.nc-action:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}',
      '.nc-action:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}',
      '.nc-body{position:relative;flex:1;min-height:0;display:flex}',
      '.nc-notice{box-sizing:border-box;flex:none;display:flex;align-items:center;gap:10px;padding:6px 10px 6px 14px;border-bottom:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}',
      '.nc-notice-mark{flex:none;color:var(--dsw-alias-state-warn-primary);display:inline-flex;align-items:center}',
      '.nc-notice-text{flex:1;min-width:0;overflow-wrap:anywhere}',
      '.nc-notice-actions{display:flex;align-items:center;gap:2px;flex:none}',
      '.nc-host{flex:1;min-width:0;min-height:0;display:flex}',
      '.nc-frame{flex:1;min-width:0;min-height:0;width:100%;height:100%;border:0;display:flex;background:var(--dsw-alias-bg-base)}',
      '.nc-cover{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--dsw-alias-bg-base);z-index:1}',
      '.nc-card{box-sizing:border-box;width:min(560px,100%);display:flex;flex-direction:column;align-items:flex-start;gap:10px;border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:16px;padding:20px 22px}',
      '.nc-card-title{margin:0;font-size:15px;font-weight:600;line-height:22px;color:var(--dsw-alias-label-primary)}',
      '.nc-card-body{margin:0;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary);white-space:pre-wrap}',
      '.nc-card-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}',
      '.nc-btn{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:20px;height:32px;padding:0 14px;border-radius:10px;cursor:pointer}',
      '.nc-btn:hover{background:var(--dsw-alias-bg-layer-2)}',
      '.nc-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}',
      '.nc-btn-primary{border-color:transparent;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-foreground,#fff)}',
      '.nc-btn-primary:hover{background:var(--dsw-alias-brand-primary);opacity:.9}',
      '.nc-hint{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}',
      '.nc-loading{display:flex;align-items:flex-start;gap:12px;width:min(560px,100%)}',
      '.nc-spinner{width:18px;height:18px;flex:none;margin-top:1px;border-radius:50%;border:2px solid var(--dsw-alias-border-l1);border-top-color:var(--dsw-alias-brand-primary);animation:nc-spin .9s linear infinite}',
      '.nc-loading-col{display:flex;flex-direction:column;gap:6px;min-width:0}',
      '@keyframes nc-spin{to{transform:rotate(360deg)}}',
      '@media (prefers-reduced-motion: reduce){.nc-spinner{animation:none}}',
    ].join('\n')

    /** Resolve the Desktop page bridge that owns sandboxed browser guests. */
    function desktopBrowserBridge() {
      try {
        const desktop = globalThis.dshDesktop
        if (!desktop || desktop.protocolVersion !== 1 || !desktop.browser) return undefined
        const bridge = desktop.browser
        if (typeof bridge.acquire !== 'function' || typeof bridge.release !== 'function') return undefined
        return bridge
      } catch (error) {
        return undefined
      }
    }

    /** Open a URL in the system browser (Desktop routes http(s) through the OS). */
    function openExternal(url) {
      try {
        window.open(url, '_blank', 'noopener,noreferrer')
        return true
      } catch (error) {
        return false
      }
    }

    /** Left-sidebar glyph for the panel row; inherits the row's current color. */
    function NewChatIcon(props) {
      const size = (props && props.size) || 16
      const active = Boolean(props && props.active)
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: size,
          height: size,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: active ? 1.9 : 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          style: { display: 'block' },
        },
        h('path', {
          d: 'M20.5 11.7c0 3.9-3.8 7.1-8.5 7.1-1 0-2-.15-2.9-.42L4 20.5l1.35-4.1C4.15 15.1 3.5 13.5 3.5 11.7c0-3.9 3.8-7.1 8.5-7.1s8.5 3.2 8.5 7.1Z',
        }),
        h('path', { d: 'M12 8.4v6.6M8.7 11.7h6.6' }),
      )
    }

    /**
     * The「新聊天」page: a slim host bar plus the sandboxed DeepSeek guest.
     * Falls back to an explanation and a system-browser button when the
     * Desktop guest bridge is unavailable (for example in the browser build).
     */
    function NewChatPage() {
      const [phase, setPhase] = React.useState('loading')
      const [failure, setFailure] = React.useState('')
      const [attempt, setAttempt] = React.useState(0)
      const [blocked, setBlocked] = React.useState(false)
      const hostRef = React.useRef(null)
      const frameRef = React.useRef(null)
      const t = exports.__t

      React.useEffect(() => {
        const host = hostRef.current
        const bridge = desktopBrowserBridge()
        if (!host) return undefined
        if (!bridge) {
          setPhase('unsupported')
          return undefined
        }

        let disposed = false
        let element = null
        let lease = null
        let released = false
        let detachOpen = null
        let timer = null
        let teardown = null

        const fail = (message) => {
          if (disposed) return
          setFailure(typeof message === 'string' ? message : '')
          setPhase('error')
        }
        const releaseLease = () => {
          if (released || lease === null) return
          released = true
          Promise.resolve(bridge.release(lease)).catch(() => {})
        }

        setPhase('loading')
        setFailure('')
        setBlocked(false)
        ;(async () => {
          let reservation
          try {
            reservation = await bridge.acquire(WORKSPACE_KEY)
          } catch (error) {
            fail(String((error && error.message) || error || ''))
            return
          }
          if (disposed) {
            Promise.resolve(bridge.release(reservation.lease)).catch(() => {})
            return
          }
          lease = reservation.lease

          let view
          try {
            view = document.createElement('webview')
            view.setAttribute('name', reservation.lease)
            view.setAttribute('partition', reservation.partition)
            view.setAttribute('allowpopups', '')
            view.setAttribute('src', 'about:blank#' + reservation.lease)
            view.setAttribute('data-newchat-frame', 'webview')
            view.setAttribute('data-sidebar-browser-frame', 'webview')
            view.setAttribute('class', 'nc-frame')
            view.style.cssText =
              'flex:1 1 auto;width:100%;height:100%;min-width:0;min-height:0;border:0;display:flex;background:var(--dsw-alias-bg-base)'
          } catch (error) {
            releaseLease()
            fail(String((error && error.message) || error || ''))
            return
          }

          const isTarget = (value) => {
            try {
              return typeof value === 'string' && /^https?:\/\//i.test(value)
            } catch (error) {
              return false
            }
          }
          const markReady = () => {
            if (disposed) return
            if (timer !== null) {
              clearTimeout(timer)
              timer = null
            }
            setPhase('ready')
          }
          // Load the target exactly once. `dom-ready` fires again for every
          // document the guest navigates to; reloading the target on each of
          // those events would fight the site's own redirect chain and produce
          // an endless reload loop.
          let started = false
          const onReady = () => {
            if (disposed || started) return
            started = true
            // Present a standard Chromium user agent to the page: the raw
            // Electron UA advertises "Electron/…" and the site's risk control
            // treats that as an abnormal environment.
            try {
              const match = /Chrome\/([\d.]+)/.exec(navigator.userAgent)
              if (match && typeof view.setUserAgent === 'function') {
                const ua = navigator.userAgent
                const platform = ua.includes('Windows')
                  ? 'Windows NT 10.0; Win64; x64'
                  : ua.includes('Mac')
                    ? 'Macintosh; Intel Mac OS X 10_15_7'
                    : 'X11; Linux x86_64'
                view.setUserAgent(
                  'Mozilla/5.0 (' + platform + ') AppleWebKit/537.36 (KHTML, like Gecko) Chrome/' + match[1] + ' Safari/537.36',
                )
              }
            } catch (error) {}
            try {
              const loading = view.loadURL(CHAT_URL)
              if (loading && typeof loading.catch === 'function') loading.catch(() => {})
            } catch (error) {
              fail(String((error && error.message) || error || ''))
            }
          }
          const onNavigate = (event) => {
            if (disposed) return
            if (event && event.isMainFrame === false) return
            try {
              if (isTarget(view.getURL())) markReady()
            } catch (error) {}
          }
          const onStop = () => {
            if (disposed) return
            try {
              if (isTarget(view.getURL())) {
                markReady()
                probePage()
                scheduleProbe()
              }
            } catch (error) {}
          }
          const onFailLoad = (event) => {
            if (disposed) return
            if (event && event.isMainFrame === false) return
            if (event && event.errorCode === -3) return
            fail((event && event.errorDescription) || '')
          }
          const onGone = () => {
            if (!disposed) fail('')
          }

          let probeTimer = null
          const probePage = () => {
            if (disposed || typeof view.executeJavaScript !== 'function') return
            try {
              const running = view.executeJavaScript(
                "(function(){try{return String(document.title||'')+'\\n'+(document.body?document.body.innerText.slice(0,4000):'')}catch(e){return ''}})()",
              )
              if (running && typeof running.then === 'function') {
                running
                  .then((text) => {
                    if (!disposed && RISK_PATTERN.test(String(text))) setBlocked(true)
                  })
                  .catch(() => {})
              }
            } catch (error) {}
          }
          const scheduleProbe = () => {
            if (probeTimer !== null) {
              clearTimeout(probeTimer)
              probeTimer = null
            }
            probeTimer = setTimeout(probePage, 2500)
          }

          view.addEventListener('dom-ready', onReady)
          view.addEventListener('did-navigate', onNavigate)
          view.addEventListener('did-stop-loading', onStop)
          view.addEventListener('did-fail-load', onFailLoad)
          view.addEventListener('destroyed', onGone)

          if (typeof bridge.onOpenRequested === 'function') {
            try {
              detachOpen = bridge.onOpenRequested(reservation.lease, (url) => openExternal(url))
            } catch (error) {
              detachOpen = null
            }
          }

          element = view
          host.appendChild(view)
          frameRef.current = view
          timer = setTimeout(() => {
            if (disposed) return
            setPhase((current) => (current === 'loading' ? 'ready' : current))
          }, LOAD_TIMEOUT_MS)

          teardown = () => {
            if (timer !== null) {
              clearTimeout(timer)
              timer = null
            }
            if (probeTimer !== null) {
              clearTimeout(probeTimer)
              probeTimer = null
            }
            try {
              view.removeEventListener('dom-ready', onReady)
              view.removeEventListener('did-navigate', onNavigate)
              view.removeEventListener('did-stop-loading', onStop)
              view.removeEventListener('did-fail-load', onFailLoad)
              view.removeEventListener('destroyed', onGone)
            } catch (error) {}
            try {
              if (detachOpen) detachOpen()
            } catch (error) {}
            try {
              view.remove()
            } catch (error) {}
            releaseLease()
            if (frameRef.current === view) frameRef.current = null
          }
        })()

        return () => {
          disposed = true
          if (teardown) teardown()
          else releaseLease()
          if (element === null && lease !== null) releaseLease()
        }
      }, [attempt])

      const openInBrowser = () => {
        openExternal(CHAT_URL)
      }
      const retry = () => {
        setAttempt((value) => value + 1)
      }
      const reload = () => {
        setBlocked(false)
        const view = frameRef.current
        if (phase === 'ready' && view && typeof view.reload === 'function') {
          try {
            view.reload()
            return
          } catch (error) {}
        }
        retry()
      }

      const loadingVeil =
        phase === 'loading'
          ? h(
              'div',
              { className: 'nc-cover' },
              h(
                'div',
                { className: 'nc-loading' },
                h('span', { className: 'nc-spinner', 'aria-hidden': 'true' }),
                h(
                  'div',
                  { className: 'nc-loading-col' },
                  h('span', { style: { color: 'var(--dsw-alias-label-primary)' } }, t('loading')),
                  h('span', { className: 'nc-hint' }, t('loadingHint')),
                ),
              ),
            )
          : null

      const failureVeil =
        phase === 'error'
          ? h(
              'div',
              { className: 'nc-cover' },
              h(
                'div',
                { className: 'nc-card', role: 'alert' },
                h('h2', { className: 'nc-card-title' }, t('errorTitle')),
                h('p', { className: 'nc-card-body' }, failure || t('errorBody')),
                h(
                  'div',
                  { className: 'nc-card-actions' },
                  h('button', { type: 'button', className: 'nc-btn nc-btn-primary', onClick: openInBrowser }, t('external')),
                  h('button', { type: 'button', className: 'nc-btn', onClick: retry }, t('retry')),
                ),
                h('p', { className: 'nc-hint' }, t('note')),
              ),
            )
          : null

      const unsupportedVeil =
        phase === 'unsupported'
          ? h(
              'div',
              { className: 'nc-cover' },
              h(
                'div',
                { className: 'nc-card' },
                h('h2', { className: 'nc-card-title' }, t('unsupportedTitle')),
                h('p', { className: 'nc-card-body' }, t('unsupportedBody')),
                h(
                  'div',
                  { className: 'nc-card-actions' },
                  h('button', { type: 'button', className: 'nc-btn nc-btn-primary', onClick: openInBrowser }, t('external')),
                ),
                h('p', { className: 'nc-hint' }, t('note')),
              ),
            )
          : null

      const riskNotice =
        blocked && phase === 'ready'
          ? h(
              'div',
              { className: 'nc-notice', role: 'status' },
              h('span', { className: 'nc-notice-mark', 'aria-hidden': 'true' }, h(NewChatIcon, { size: 14 })),
              h('span', { className: 'nc-notice-text' }, t('riskText')),
              h(
                'div',
                { className: 'nc-notice-actions' },
                h('button', { type: 'button', className: 'nc-action', onClick: reload }, t('reload')),
                h('button', { type: 'button', className: 'nc-action', onClick: openInBrowser }, t('external')),
                h('button', { type: 'button', className: 'nc-action', onClick: () => setBlocked(false) }, t('dismiss')),
              ),
            )
          : null

      return h(
        'div',
        { className: 'nc-root' },
        h('style', { key: 'nc-css' }, CSS),
        h(
          'div',
          { className: 'nc-bar' },
          h(
            'div',
            { className: 'nc-brand' },
            h('span', { className: 'nc-mark' }, h(NewChatIcon, { size: 15 })),
            h('span', { className: 'nc-title' }, t('panel')),
            h('span', { className: 'nc-sub' }, t('subtitle')),
          ),
          h(
            'div',
            { className: 'nc-actions' },
            h('button', { type: 'button', className: 'nc-action', onClick: reload }, t('reload')),
            h('button', { type: 'button', className: 'nc-action', onClick: openInBrowser }, t('external')),
          ),
        ),
        riskNotice,
        h('div', { className: 'nc-body' }, h('div', { className: 'nc-host', ref: hostRef }), loadingVeil, failureVeil, unsupportedVeil),
      )
    }

    /** Fallback translation used when the locale service is unavailable. */
    function fallbackTranslate(key) {
      return zh[key] !== undefined ? zh[key] : en[key] !== undefined ? en[key] : key
    }

    const plugin = {
      inject: ['slots'],
      apply(ctx) {
        const slots = ctx.get('slots')
        if (!slots) return

        const locale = ctx.get('locale')
        let t = fallbackTranslate
        if (locale && typeof locale.register === 'function' && typeof locale.bind === 'function') {
          ctx.effect(() => locale.register(NS, { zh, en }), 'new-chat: dictionaries')
          t = locale.bind(NS)
        }
        exports.__t = t

        slots.inject('main', () =>
          slots.register(
            {
              name: 'main',
              key: PANEL_ID,
              locale: NS,
            },
            NewChatPage,
          ),
        )

        slots.inject('sidebar.panellist', () =>
          slots.register(
            {
              name: 'sidebar.panellist',
              id: PANEL_ID,
              order: 2,
              locale: NS,
              label: () => t('panel'),
            },
            NewChatIcon,
          ),
        )
      },
    }

    exports.default = plugin
    exports.apply = plugin.apply
    exports.inject = plugin.inject
    return module.exports
  },
})
