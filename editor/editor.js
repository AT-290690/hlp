import { CodeMirror } from './hlp.editor.bundle.js'
import { runFromInterpreted } from '../dist/misc/utils.js'
import { decodeBase64, encodeBase64 } from '../dist/misc/compression.js'
import { pretty } from '../dist/misc/prettier.js'

const consoleElement = document.getElementById('console')
const editorContainer = document.getElementById('editor-container')
const droneButton = document.getElementById('drone')
const errorIcon = document.getElementById('error-drone-icon')
const execIcon = document.getElementById('exec-drone-icon')
const toggleAppMode = document.getElementById('toggle-app-mode')
const toggleLogMode = document.getElementById('toggle-log-mode')
const togglePrettyMode = document.getElementById('toggle-pretty-mode')
const toggleShareMode = document.getElementById('toggle-share-mode')
const combine = ([head, ...[headTail, ...tailTail]]) => {
  if (!headTail) return head
  const combined = headTail.reduce(
    (acc, x) => acc.concat(head.map((h) => `${h}; ${x}`)),
    []
  )
  return combine([combined, ...tailTail])
}
const consoleEditor = CodeMirror(consoleElement)
let RATIO_Y = 1
const droneIntel = (icon) => {
  icon.style.visibility = 'visible'
  setTimeout(() => (icon.style.visibility = 'hidden'), 500)
}
const extensions = {
  log: (msg) => {
    const current = consoleEditor.getValue()
    consoleEditor.setValue(
      `${current ? `${current}; ` : ''}${
        msg !== undefined
          ? typeof msg === 'string'
            ? `"${msg}"`
            : typeof msg === 'function'
            ? '-> []'
            : (msg.constructor.name === 'Set'
                ? JSON.stringify([...msg]).replaceAll('[', ':. [')
                : JSON.stringify(
                    msg.constructor.name === 'Inventory'
                      ? msg.items
                      : msg.constructor.name === 'Map'
                      ? Object.fromEntries(msg)
                      : msg,
                    null
                  )
                    .replaceAll('[', '.: [')
                    .replaceAll('{', ':: [')
              )

                .replaceAll('}', ']')
                .replaceAll(',', '; ')
                .replaceAll('":', '"; ')
                .replaceAll('null', 'void')
                .replaceAll('undefined', 'void')
          : 'void'
      }`
    )
    return msg
  },
}

console.error = (error) => {
  consoleElement.classList.add('error_line')
  consoleEditor.setValue(error + ' ')
  droneButton.classList.remove('shake')
  droneButton.classList.add('shake')
  execIcon.style.visibility = 'hidden'
  droneIntel(errorIcon)
}

const originalFetch = fetch
window.fetch = async (...[resource, config]) =>
  await originalFetch(resource, config).catch((err) => console.error(err))

const execute = async (source) => {
  try {
    consoleElement.classList.remove('error_line')
    const result = runFromInterpreted(source, extensions)
    droneButton.classList.remove('shake')
    errorIcon.style.visibility = 'hidden'
    droneIntel(execIcon)
    return result
  } catch (err) {
    console.error(err)
  }
}

const editor = CodeMirror(editorContainer, {})
droneButton.addEventListener('click', () => {
  return document.dispatchEvent(
    new KeyboardEvent('keydown', {
      ctrlKey: true,
      key: 's',
    })
  )
})

const cmds = {
  open: ';; open',
  share: ';; share',
  link: ';; link',
  window: ';; window',
  log: ';; log',
  exe: ';; exe',
  app: ';; app',
  focus: ';; focus',
  pretty: ';; pretty',
}
let lastCmds = []
const withCommand = (command) => {
  const value = editor.getValue()
  switch (command.trim()) {
    case cmds.pretty:
      editor.setValue(pretty(value))
      break
    case cmds.open:
      {
        const encoded = encodeURIComponent(encodeBase64(value))
        window.open(
          `https://at-290690.github.io/hlp/?l=` + encoded,
          'Bit',
          `menubar=no,directories=no,toolbar=no,status=no,scrollbars=no,resize=no,width=600,height=600,left=600,top=150`
        )
      }
      break
    case cmds.share:
      {
        const link = `https://at-290690.github.io/hlp/?l=${encodeURIComponent(
          encodeBase64(value)
        )}`
        consoleEditor.setValue(link)
        consoleEditor.focus()
        consoleEditor.setSelection(0, link.length)
      }

      break
    case cmds.link:
      {
        navigator.clipboard.writeText(
          `https://at-290690.github.io/hlp/?l=${encodeURIComponent(
            encodeBase64(value)
          )}`
        )
      }
      break
    case cmds.window:
      {
        const encoded = encodeURIComponent(encodeBase64(value))
        window.open(
          `${
            window.location.href.split('/editor/')[0]
          }/index.html?l=${encoded}`,
          'Bit',
          `menubar=no,directories=no,toolbar=no,status=no,scrollbars=no,resize=no,width=600,height=600,left=600,top=150`
        )
      }
      break
    case cmds.focus:
      {
        const application = document.getElementById('application')
        application.style.display = 'none'
        application.src = `${
          window.location.href.split('/editor/')[0]
        }/index.html`
        const bouds = document.body.getBoundingClientRect()
        const width = bouds.width
        const height = bouds.height
        RATIO_Y = 1
        editor.setSize(width, (height - 60) * RATIO_Y)
      }
      break
    case cmds.app:
      {
        const encoded = encodeURIComponent(encodeBase64(value))
        const application = document.getElementById('application')
        application.src = `${
          window.location.href.split('/editor/')[0]
        }/index.html?l=${encoded}`
        application.style.display = 'block'
        const bouds = document.body.getBoundingClientRect()
        const width = bouds.width
        const height = bouds.height
        RATIO_Y = 0.35
        editor.setSize(width, (height - 60) * RATIO_Y)
      }
      break
    case cmds.log:
      {
        const selection = editor.getSelection().trim()
        if (selection) {
          const isEndingWithSemi = selection[selection.length - 1] === ';'
          // if (selection[0] === ';' && selection[1] === ';') {
          //   const val = selection.split(';;')[1]
          //   const functionName = val.split('[')[0]
          //   const argsRaw = val.split(functionName)[1]
          //   const argsPristine = argsRaw
          //     .substring(1, argsRaw.length - 1)
          //     .split("'")
          //     .map((x) => x.trim())
          //   const args = argsPristine.map((x) =>
          //     x.split(',').map((x) => x.trim())
          //   )
          //   editor.replaceSelection(
          //     `void:[${combine(args)
          //       .map((x, i) => `!throw[===[${functionName}[${x}];0];${i}];`)
          //       .join('\n')}];\n`
          //   )
          // } else {
          const out = `log[${
            isEndingWithSemi
              ? selection.substring(0, selection.length - 1)
              : selection
          }]${isEndingWithSemi ? ';' : ''}`
          editor.replaceSelection(out)

          execute(`${editor.getValue().trim()}`)
          editor.setValue(value)
          // }
        } else execute(`log[:[${value}]]`)
      }
      break
    case cmds.exe:
    default:
      execute(value)
      break
  }
}
const knownCmds = (cmd) => cmd.trim() in cmds
document.addEventListener('keydown', (e) => {
  if (e.key && e.key.toLowerCase() === 's' && (e.ctrlKey || e.metaKey)) {
    e = e || window.event
    e.preventDefault()
    e.stopPropagation()
    consoleEditor.setValue('')
    const cmds = lastCmds.join(' ').split(';; ').filter(knownCmds)
    if (!cmds.length) cmds.push(';; exe')
    cmds.map((x) => `;; ${x.trim()}`).forEach((cmd) => withCommand(cmd))
  } else if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
  }
})
toggleAppMode.addEventListener('click', (e) => {
  const state = +e.target.getAttribute('toggled')
  e.target.setAttribute('toggled', state ^ 1)
  lastCmds[0] = state ? ';; focus' : ';; app'
  e.target.style.opacity = state ? 0.25 : 1
})

toggleLogMode.addEventListener('click', (e) => {
  const state = +e.target.getAttribute('toggled')
  e.target.setAttribute('toggled', state ^ 1)
  lastCmds[1] = !state ? ';; log' : ''
  e.target.style.opacity = state ? 0.25 : 1
})
togglePrettyMode.addEventListener('click', (e) => {
  const state = +e.target.getAttribute('toggled')
  e.target.setAttribute('toggled', state ^ 1)
  lastCmds[2] = !state ? ';; pretty' : ''
  e.target.style.opacity = state ? 0.25 : 1
})
toggleShareMode.addEventListener('click', (e) => {
  const state = +e.target.getAttribute('toggled')
  e.target.setAttribute('toggled', state ^ 1)
  lastCmds[3] = !state ? ';; link' : ''
  e.target.style.opacity = state ? 0.25 : 1
})
editor.focus()
window.addEventListener('resize', () => {
  const bouds = document.body.getBoundingClientRect()
  const width = bouds.width
  const height = bouds.height
  editor.setSize(width, (height - 60) * RATIO_Y)
  consoleEditor.setSize(width - 80, 40)
})
const bounds = document.body.getBoundingClientRect()
editor.setSize(bounds.width, (bounds.height - 60) * RATIO_Y)
consoleEditor.setSize(bounds.width - 80, 40)

const registerSW = async () => {
  if ('serviceWorker' in navigator)
    try {
      await navigator.serviceWorker.register('../sw.js')
    } catch (e) {
      console.log(`SW registration failed`)
    }
}

window.addEventListener('load', registerSW)
editor.setValue(
  pretty(
    decodeBase64(
      decodeURIComponent(new URLSearchParams(location.search).get('l') ?? '')
    )
  ) || ''
)
