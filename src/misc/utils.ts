import { compileToJs } from '../core/compiler.js'
import { parse } from '../core/parser.js'
import { runFromAST } from '../core/interpreter.js'
import { tokens } from '../core/tokeniser.js'
import Inventory from '../extensions/Inventory.js'
/**
 * Extract the comment from the source code
 * @param source
 * @returns
 * @example
 * extractComments(';; Hello World string\n := [hello; "Hello World"]')
 * // [" Hello World string"]
 * extractComments(':= [hello; "Hello World"]')
 * // []
 * extractComments(';;Hello\n := [hello; "Hello World"]; ;; World\nhello;')
 * // ["Hello", " World"]
 */
export const extractComments = (source: string) =>
  source.match(/(?<=;;).+/g) ?? []
export const extractTests = (source: string) =>
  (source.match(new RegExp(/(?<=;; @test).*?(?=\n)/gm)) ?? [])
    .map((x) => x.trim())
    .filter(Boolean)
export const extractMocks = (source: string) =>
  (source.match(new RegExp(/(?<=;; @mock).*?(?=\n)/gm)) ?? [])
    .filter(Boolean)
    .map((x) => x.trim())
export const extractChecks = (source: string) =>
  (source.match(new RegExp(/(?<=;; @check).*?(?=\n)/gm)) ?? [])
    .filter(Boolean)
    .map((x) => x.trim())
export const handleHangingSemi = (source: string) =>
  source[source.length - 1] === ';'
    ? source.substring(0, source.length - 1)
    : source
/**
 * Remove code spaces and comments
 * Leave only the spaces inside strings
 * @param source
 * @returns
 * @example
 * removeNoCode(';;Hello\n := [hello; "Hello World"]; ;; World\nhello;')
 * // ":=[hello;\"Hello World\"];hello;"
 */
export const removeNoCode = (source: string) =>
  source.replace(/[ ]+(?=[^"]*(?:"[^"]*"[^"]*)*$)+|\n|\t|;;.+/g, '')
export const wrapInBody = (source: string) => `:[${source}]`
export const protolessModule = (methods: Record<string, unknown>) => {
  const env = Object.create(null)
  for (const method in methods) env[method] = methods[method]
  return env
}
export const logBoldMessage = (msg: string) => console.log('\x1b[1m', msg)
export const logErrorMessage = (msg: string) =>
  console.log('\x1b[31m', '\x1b[1m', msg, '\x1b[0m')
export const logSuccessMessage = (msg: string) =>
  console.log('\x1b[32m', '\x1b[1m', msg, '\x1b[0m')
export const logWarningMessage = (msg: string) =>
  console.log('\x1b[33m', '\x1b[1m', msg, '\x1b[0m')
/**
 * Execude HLP interpreted code
 * @param source
 * @returns
 * @example
 * runFromInterpreted('"Hello World"') // "Hello World"
 * runFromInterpreted('+[1;2]') // 3
 * runFromInterpreted('|>[.:[1;2;3];.:map>>[->[x;*[x;2]]];.:reduce>>[->[a;x;+[a;x]];0]]')
 * // 12
 */
export const runFromInterpreted = (source: string, env?: object) =>
  exe(handleUnbalancedParens(removeNoCode(source.toString().trim())), env)
/**
 * Execude JavaScript compiled code
 * @param source
 * @returns
 * @example
 * runFromCompiled('"Hello World"') // "Hello World"
 * runFromCompiled('+[1;2]') // 3
 * runFromCompiled('|>[.:[1;2;3];.:map>>[->[x;*[x;2]]];.:reduce>>[->[a;x;+[a;x]];0]]')
 * // 12
 */
export const runFromCompiled = (source: string) => eval(compileModule(source))
/**
 * Execude HLP interpreted code
 * @param source
 * @returns
 * @example
 * exe('"Hello World"') // "Hello World"
 * exe('+[1;2]') // 3
 * exe('|>[.:[1;2;3];.:map>>[->[x;*[x;2]]];.:reduce>>[->[a;x;+[a;x]];0]]')
 * // 12
 */
export const exe = (source: string, env = {}) => {
  const ENV = protolessModule(env)
  ENV[';;runes'] = protolessModule(tokens)
  const AST = parse(wrapInBody(source))
  return runFromAST(AST, ENV).result
}
/**
 * Check if parens are balanced
 * @param sourceCode
 * @returns diff
 * @example
 * isBalancedParenthesis(":[.:[1;2;3]]]]") // 2
 * isBalancedParenthesis(":[.:[]]") // 0
 * isBalancedParenthesis(":[.:[") // -2
 */
export const isBalancedParenthesis = (sourceCode: string) => {
  let count = 0
  const stack = []
  const str = sourceCode.replace(/"(.*?)"/g, '')
  const pairs = { ']': '[' }
  for (let i = 0; i < str.length; ++i)
    if (str[i] === '[') stack.push(str[i])
    else if (str[i] in pairs) if (stack.pop() !== pairs[str[i]]) ++count
  return count - stack.length
}
export const handleUnbalancedParens = (sourceCode: string) => {
  const diff = isBalancedParenthesis(sourceCode)
  if (diff !== 0)
    throw new SyntaxError(
      `Parenthesis are unbalanced by ${diff > 0 ? '+' : ''}${diff} "]"`
    )
  return sourceCode
}
export const compilePlain = (source: string) => {
  const inlined = wrapInBody(removeNoCode(source))
  const { top, program } = compileToJs(parse(inlined))
  return `${top}
${program}`
}
export const compileModule = (source: string) => {
  const inlined = wrapInBody(removeNoCode(source))
  const { top, program } = compileToJs(parse(inlined))
  return `${Inventory.toString()}
${top}${program}`
}
export const compilePlainJs = (source: string) => {
  const inlined = wrapInBody(removeNoCode(source))
  const { top, program } = compileToJs(parse(inlined))
  return `${top}${program}`
}
export const compileHtml = (source: string, scripts = '') => {
  const inlined = wrapInBody(removeNoCode(source))
  const { top, program } = compileToJs(parse(inlined))
  return `
<style>body { background: #0e0e0e } </style><body>
${scripts}
<script>
${Inventory.toString()}
</script>
<script> (() => { ${top}${program} })()</script>
</body>`
}

export const compileExecutable = (source: string) => {
  const inlined = wrapInBody(removeNoCode(source))
  const ENV = protolessModule({})
  ENV[';;runes'] = protolessModule(tokens)
  const AST = parse(inlined)
  // const { AST } = cell(ENV, false)(inlined)
  const { top, program } = compileToJs(AST)
  return `${Inventory.toString()}
  ${top}${program}`
}