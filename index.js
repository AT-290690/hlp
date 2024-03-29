import {
  compilePlainJs,
  exe,
  runFromCompiled,
  runFromInterpreted,
  handleHangingSemi,
  removeNoCode,
  wrapInBody,
} from './dist/misc/utils.js'
import {
  encodeBase64,
  compress,
  decodeBase64,
  decompress,
} from './dist/misc/compression.js'
import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { tokens } from './dist/core/tokeniser.js'
import { stringify } from './dist/core/stringify.js'
import { parse } from './dist/core/parser.js'
const logBoldMessage = (msg) => console.log('\x1b[1m', msg, '\x1b[0m')
const logErrorMessage = (msg) =>
  console.log('\x1b[31m', '\x1b[1m', msg, '\x1b[0m')
const logSuccessMessage = (msg) =>
  console.log('\x1b[32m', '\x1b[1m', msg, '\x1b[0m')
const logWarningMessage = (msg) =>
  console.log('\x1b[33m', '\x1b[1m', msg, '\x1b[0m')
const logResultInterpreted = (file, type = 'raw') =>
  logBoldMessage(
    type == 'items' ? runFromInterpreted(file).items : runFromInterpreted(file)
  )

const logResultCompiled = (file, type = 'raw') =>
  logBoldMessage(
    type == 'items' ? runFromCompiled(file).items : runFromCompiled(file)
  )
const encode = async (
  file,
  destination = 'https://at-290690.github.io/hlp'
) => {
  const encoded = encodeURIComponent(encodeBase64(file))
  const link = `${destination}?l=`
  logSuccessMessage(link + encoded)
}
const count = async (file) => {
  const encoded = encodeURIComponent(encodeBase64(file))
  logWarningMessage(`compressed size: ${encoded.length}`)
}
const encodeUri = async (file) => {
  const encoded = encodeURIComponent(encodeBase64(file))
  logWarningMessage(encoded)
}
const decodeUri = async (file) => {
  const dencoded = wrapInBody(decodeBase64(decodeURIComponent(file)))
  logWarningMessage(dencoded)
}
const compile = async (file) => {
  try {
    logWarningMessage(compilePlainJs(file))
  } catch (error) {
    logErrorMessage(error.message)
  }
}
const mangle = async (file) => {
  const compressed = compress(file)
  logSuccessMessage(compressed)
}
const countMangled = async (file) => {
  const compressed = compress(file)
  logWarningMessage(`mangled size: ${compressed.length}`)
}
const buildProject = (dir, arg) => {
  let cat = []
  readdirSync(dir).forEach((file) =>
    file.split('.').pop() === 'l'
      ? cat.push(handleHangingSemi(file.trim()))
      : undefined
  )
  writeFileSync(arg, cat.join(`;\n\n`))
}
const combine = ([head, ...[headTail, ...tailTail]]) => {
  if (!headTail) return head
  const combined = headTail.reduce((acc, x) => {
    return acc.concat(head.map((h) => `${h}; ${x}`))
  }, [])
  return combine([combined, ...tailTail])
}
const [, , ...argv] = process.argv
// const file = filename ? readFileSync(filename, 'utf-8') : ''
let file = '',
  type = 'raw'
while (argv.length) {
  const flag = argv.shift()?.toLowerCase()
  const value = argv.shift()
  if (!flag) throw new Error('No flag provided')
  // if (!value) throw new Error('No value provided')
  switch (flag) {
    case '-type':
      type = value
      break
    case '-trim':
      logSuccessMessage(removeNoCode(file).split('];]').join(']]'))
      break
    case '-mini':
      logSuccessMessage(decompress(compress(file)))
      break
    case '-str':
      logSuccessMessage(stringify(parse(wrapInBody(removeNoCode(file))).args))
      break
    case '-strc':
      logSuccessMessage(
        stringify(parse(wrapInBody(decompress(compress(file)))).args)
      )
      break
    case '-file':
      file = readFileSync(value, 'utf-8')
      break
    case '-types':
      {
        writeFileSync(
          `./src/core/tokens.d.ts`,
          `export type Token = ${Object.keys(tokens)
            .map((x) => `"${x}"`)
            .join('\n|')}`,
          'utf-8'
        )
        writeFileSync(
          `./dist/extensions/Inventory.js`,
          readFileSync('./src/extensions/Inventory.js'),
          'utf-8'
        )
      }

      break
    case '-build':
      buildProject(value, type)
      break
    case '-link':
    case '-l':
      encode(file, value)
      break
    case '-encode':
      encodeUri(file)
      break
    case '-decode':
      decodeUri(file)
      break
    case '-local':
      encode(file, type)
      break
    case '-mangle':
    case '-m':
      mangle(file)
      break
    case '-js':
      compile(file)
      break
    case '-mjs':
      compile(decompress(compress(file)))
      break
    case '-c':
    case '-count':
      count(file)
      break
    case '-cm':
      countMangled(file)
      break
    case '-compile':
    case '-cr':
      logResultCompiled(file, type)
      break
    case '-run':
    case '-r':
    case '-log':
      logResultInterpreted(file, type)
      break
    case '-basic':
      {
        exe(removeNoCode(file.toString().trim()), {
          utils: { log: (msg) => console.log(msg), items: (a) => a.items },
        })
      }
      break
    case '-test':
      const matches = value.match(new RegExp(/^(.*?)(?=(\[))/gm))
      if (matches == undefined) {
        console.log('\x1b[31m', 'No generation formula provided!', '\x1b[0m')
        break
      }

      const functionName = matches.pop()
      const argsRaw = value.split(functionName)[1]
      const argsPristine = argsRaw
        .substring(1, argsRaw.length - 1)
        .split("'")
        .map((x) => x.trim())
      const args = argsPristine.map((x) => x.split(',').map((x) => x.trim()))
      console.log('\x1b[30mvoid : [')
      combine(args).forEach((x, i) => {
        console.log(
          `  !throw[
    ===[\x1b[35m${functionName}[\x1b[33m${x}\x1b[35m]; \x1b[31m"?"\x1b[30m];
    \x1b[32m${i}\x1b[30m];`
        )
      })
      console.log(']\x1b[0m')

      break
    case '-help':
    default:
      console.log(`
  ------------------------------------
  | help                              |
  ------------------------------------
  | file    |   prepare a file        |
   ------------------------------------
  | encode  |   encode base64         |
  ------------------------------------
  | decode  |   decode base64         |
  ------------------------------------
  | mangle  |   compress only         |
  ------------------------------------
  | js      |   log javascript output |
  ------------------------------------
  | compile |   compile and run       |
  ------------------------------------
  | count   |   bite size             |
  ------------------------------------
  | run     |   interpret and run     |
  ------------------------------------
  | link    |   create link           |
  ------------------------------------
  | local   |   create local link     |
  ------------------------------------
  | basic   |   run no extensions     |
  ------------------------------------
        `)
  }
}
