/** Independent, additive top-left control. shell.leading and sidebar.brand.name
 * are single seats; shell.overlay is a documented list seat and preserves them. */
window.__ModuleLoader__.load({
  id: '@local/dsh-restart',
  factory: (require) => {
    const React = require('react')
    const h = React.createElement
    function RestartButton() {
      const [pending, setPending] = React.useState(false)
      const [error, setError] = React.useState('')
      const busy = React.useRef(false)
      const restart = async () => {
        if (busy.current) return
        busy.current = true
        setPending(true)
        setError('')
        try {
          if (typeof window.dshDesktop?.restart !== 'function') {
            throw new Error('需要安装配套桌面补丁后才能重启整个应用和 Host。请按 README 安装补丁，再启动桌面版。')
          }
          await window.dshDesktop.restart()
          // A successful request is committed to quitting. Keep disabled until exit.
        } catch (cause) {
          setError(`重启失败：${cause?.message || String(cause)}。请重试。`)
          busy.current = false
          setPending(false)
        }
      }
      return h('div', { style: { position: 'fixed', top: '6px', left: '180px', zIndex: 1101, WebkitAppRegion: 'no-drag' } },
        h('button', { type: 'button', title: '重启', 'aria-label': '重启', 'aria-busy': pending,
          disabled: pending, onClick: restart,
          style: { WebkitAppRegion: 'no-drag', height: '28px', border: '1px solid var(--dsw-alias-border-tertiary, #8885)',
            borderRadius: '6px', padding: '0 10px', font: 'inherit', fontSize: '13px',
            background: 'var(--dsw-specific-sidebar-fill, #fff)', color: 'var(--dsw-alias-label-primary, #333)', cursor: 'pointer' },
        }, pending ? '重启中…' : '重启'),
        error ? h('span', { role: 'alert', style: { position: 'absolute', top: '34px', left: 0, width: 'min(360px, calc(100vw - 200px))',
          whiteSpace: 'normal', padding: '8px', borderRadius: '6px', fontSize: '13px',
          background: 'var(--dsw-specific-sidebar-fill, #fff)', color: 'var(--dsw-alias-label-primary, #333)', boxShadow: '0 2px 10px #0003' } }, error) : null)
    }
    const plugin = {
      inject: ['slots'],
      apply(ctx) {
        const slots = ctx.get('slots')
        if (!slots) return
        // Cordis scopes the inject disposer and the nested registration to this plugin.
        slots.inject('shell.overlay', () => slots.register({ name: 'shell.overlay', id: 'local-restart', order: 10 }, RestartButton))
      },
    }
    return { default: plugin, apply: plugin.apply, inject: plugin.inject }
  },
})
