import { readFile } from 'fs/promises'
import {
  compilePlainJs,
  runFromCompiled,
  runFromInterpreted,
} from './src/misc/utils.js'
import { encodeBase64, compress, decodeBase64 } from './src/misc/compression.js'
import {
  extractComments,
  handleHangingSemi,
  removeNoCode,
} from './src/misc/helpers.js'
const logBoldMessage = (msg) => console.log('\x1b[1m', msg, '\x1b[0m')
const logErrorMessage = (msg) =>
  console.log('\x1b[31m', '\x1b[1m', msg, '\x1b[0m')
const logSuccessMessage = (msg) =>
  console.log('\x1b[32m', '\x1b[1m', msg, '\x1b[0m')
const logWarningMessage = (msg) =>
  console.log('\x1b[33m', '\x1b[1m', msg, '\x1b[0m')
const logResultInterpreted = (file, type = 'raw') =>
  readFile(`./examples/${file}`, 'utf-8')
    .then((result) =>
      logBoldMessage(
        type == 'items'
          ? runFromInterpreted(result).items
          : runFromInterpreted(result)
      )
    )
    .catch((error) => logErrorMessage(error.message))
const test = (file) =>
  readFile(`./examples/${file}`, 'utf-8')
    .then((result) => {
      extractComments(result)
        .slice(1)
        .map((x) => x.split(';; test')[1])
        .filter(Boolean)
        .forEach((x) => {
          const t = runFromInterpreted(
            `${handleHangingSemi(removeNoCode(result))};${x}`
          )
          t ? logSuccessMessage(`${t} ${x}`) : logErrorMessage(`${t} ${x}`)
        })
    })
    .catch((error) => logErrorMessage(error.message))

const logResultCompiled = (file, type = 'raw') =>
  readFile(`./examples/${file}`, 'utf-8')
    .then((result) =>
      logBoldMessage(
        type == 'items'
          ? runFromCompiled(result).items
          : runFromCompiled(result)
      )
    )
    .catch((error) => logErrorMessage(error.message))

const encode = async (
  file,
  destination = 'https://at-290690.github.io/hlp'
) => {
  const encoded = encodeURIComponent(
    encodeBase64(await readFile(`./examples/${file}`, 'utf-8'))
  )
  const link = `${destination}?l=`
  logSuccessMessage(link + encoded)
}
const count = async (file) => {
  const encoded = encodeURIComponent(
    encodeBase64(await readFile(`./examples/${file}`, 'utf-8'))
  )
  logWarningMessage(`compressed size: ${encoded.length}`)
}
const encodeUri = async (file) => {
  const encoded = encodeURIComponent(
    encodeBase64(await readFile(`./examples/${file}`, 'utf-8'))
  )
  logWarningMessage(encoded)
}
const decodeUri = async (file) => {
  const dencoded = decodeBase64(
    decodeURIComponent(await readFile(`./examples/${file}`, 'utf-8'))
  )
  logWarningMessage(dencoded)
}
const compile = async (file) => {
  try {
    logWarningMessage(
      compilePlainJs(await readFile(`./examples/${file}`, 'utf-8'))
    )
  } catch (error) {
    logErrorMessage(error.message)
  }
}
const mangle = async (file) => {
  const compressed = compress(await readFile(`./examples/${file}`, 'utf-8'))
  logSuccessMessage(compressed)
}
const countMangled = async (file) => {
  const compressed = compress(await readFile(`./examples/${file}`, 'utf-8'))
  logWarningMessage(`mangled size: ${compressed.length}`)
}
const [, , filename, flag, arg] = process.argv
switch (flag?.toLowerCase()) {
  case 'link':
  case 'l':
    encode(filename)
    break
  case 'uri':
    encodeUri(filename)
    break
  case 'deuri':
    decodeUri(filename)
    break
  case 'local':
    encode(filename, arg)
    break
  case 'mangle':
  case 'm':
    mangle(filename)
    break
  case 'js':
    compile(filename)
    break
  case 'c':
  case 'count':
    count(filename)
    break
  case 'cm':
    countMangled(filename)
    break
  case 'compile':
  case 'cr':
    logResultCompiled(filename, arg)
    break
  case 't':
  case 'test':
    test(filename)
    break
  case 'run':
  case 'r':
  case 'log':
  default:
    logResultInterpreted(filename, arg)
}
