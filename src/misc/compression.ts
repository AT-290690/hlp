import { parse } from '../core/parser.js'
import { LZUTF8 } from '../../lib/lz-utf8.js'
import { tokens } from '../core/tokeniser.js'
import { evaluate } from '../core/interpreter.js'
import Inventory from '../extensions/Inventory.js'
import { runFromInterpreted, removeNoCode, wrapInBody } from '../misc/utils.js'
import { Expression, Word } from '../core'
import { stringify } from '../core/stringify.js'
const ABC = [
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
  'm',
  'n',
  'o',
  'p',
  'q',
  'r',
  's',
  't',
  'u',
  'v',
  'w',
  'x',
  'y',
  'z',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
]
export const VOID_CODE: Expression = { type: 'value', value: 0, class: 'void' }
tokens['~*'] = (args, env) => {
  if (!args.length) throw new RangeError('Invalid number of arguments to ~* []')
  const callback = evaluate(args.pop(), env)
  if (typeof callback !== 'function')
    throw new TypeError('Second argument of ~* must be an -> []')
  Promise.all(
    args.map((arg) => fetch(evaluate(arg, env)).then((r) => r.text()))
  ).then((encodes) => {
    const signals = Inventory.from(
      encodes.map((encode) =>
        runFromInterpreted(decodeBase64(decodeURIComponent(encode.trim())))
      )
    )
    callback(signals)
  })
  return 0
}
const OFFSET = 161
const generateCompressionRunes = (start) => {
  return Object.keys(tokens)
    .filter((x) => x.length > 1 && x !== 'aliases=' && x !== 'void:')
    .sort((a, b) => (a.length > b.length ? -1 : 1))
    .concat(['][', ']];', '];'])
    .reduce(
      (acc, full, i) => {
        const short = String.fromCharCode(start + i + OFFSET)
        acc.compressed.set(short, full)
        acc.decompressed.set(full, short)
        return acc
      },
      { compressed: new Map(), decompressed: new Map() }
    )
}
export const shortRunes = generateCompressionRunes(0)
const shortDefinitionsCounter = (index = 0, count = 0) => {
  return () => {
    const short = ABC[index] + count
    ++index
    if (index === ABC.length) {
      index = 0
      ++count
    }
    return short
  }
}
const compressCase = (node: Word): boolean =>
  node.name && node.name.length > 1 && node.name[0] !== '_'

const traverseAndDefineVariables = (
  tree: Expression[],
  definitions: Map<string, string> = new Map(),
  shortDefinitions: Function
): Expression[] => {
  for (const node of tree) {
    if (node.type === 'apply') {
      if (node.operator.type === 'word') {
        if (node.operator.name === ':=') {
          // node.operator.name === "'"
          node.args.forEach((variable, index) => {
            if (variable.type === 'word') {
              if (index % 2 === 0 && compressCase(variable)) {
                if (!definitions.has(variable.name)) {
                  const newName = shortDefinitions()
                  definitions.set(variable.name, newName)
                  variable.name = newName
                }
              } else if (shortRunes.decompressed.has(variable.name))
                variable.name = shortRunes.decompressed.get(variable.name)
            }
          })
        } else if (node.operator.name === "'") {
          node.args.forEach((variable) => {
            if (variable.type === 'word') {
              if (compressCase(variable)) {
                if (!definitions.has(variable.name)) {
                  const newName = shortDefinitions()
                  definitions.set(variable.name, newName)
                  variable.name = newName
                }
              } else if (shortRunes.decompressed.has(variable.name))
                variable.name = shortRunes.decompressed.get(variable.name)
            }
          })
        }
      }
      traverseAndDefineVariables([node.operator], definitions, shortDefinitions)
      traverseAndDefineVariables(
        node.operator.args,
        definitions,
        shortDefinitions
      )
    }
    if (node.type !== 'value')
      traverseAndDefineVariables(node.args, definitions, shortDefinitions)
  }
  return tree
}

const traverseAndAssigneVariables = (
  tree: Expression[],
  definitions: Map<string, string> = new Map()
): Expression[] => {
  for (const node of tree) {
    if (node.type === 'word' && compressCase(node)) {
      if (shortRunes.decompressed.has(node.name))
        node.name = shortRunes.decompressed.get(node.name)
      else if (definitions.has(node.name))
        node.name = definitions.get(node.name)
    } else if (node.type === 'apply') {
      traverseAndAssigneVariables([node.operator], definitions)
      traverseAndAssigneVariables(node.operator.args, definitions)
    }
    if (node.type !== 'value')
      traverseAndAssigneVariables(node.args, definitions)
  }
  return tree
}
interface Compression {
  result: string
  occurance: number
}
export const removeBody = (tree: Expression): Expression[] =>
  tree.type === 'apply' ? tree.args : []

export const pruneTree = (
  tree: Expression[],
  memo: Map<string, string> = new Map()
): Expression[] => {
  for (let i = 0; i < tree.length; ++i) {
    const node = tree[i]
    if (node.type === 'word') {
      if (memo.has(node.name)) node.name = memo.get(node.name)
    } else if (node.type === 'apply') {
      if (node.operator.type === 'word' && node.operator.name === 'aliases=') {
        node.args
          .reduce((acc, item, i) => {
            if (i % 2 === 0) acc.push([item])
            else acc.at(-1).push(item)
            return acc
          }, [] as Array<Array<Expression>>)
          .forEach(([left, right]) => {
            if (left.type === 'word' && right.type === 'word')
              memo.set(left.name, right.name)
          })
        tree[i] = VOID_CODE
      } else if (
        node.operator.type === 'word' &&
        node.operator.name === 'void:'
      ) {
        tree[i] = VOID_CODE
      } else {
        pruneTree([node.operator], memo)
        pruneTree(node.operator.args, memo)
      }
    }
    if (node.type !== 'value') pruneTree(node.args, memo)
  }
  return tree
}
export const compress = (source: string) => {
  const variablesMap = new Map()
  const tree = traverseAndAssigneVariables(
    traverseAndDefineVariables(
      pruneTree(removeBody(parse(wrapInBody(removeNoCode(source)))), new Map()),
      variablesMap,
      shortDefinitionsCounter(0, 0)
    ),
    variablesMap
  )
  let { result, occurance } = stringify(tree)
    .split('')
    .reduce(
      (acc: Compression, item: string) => {
        if (item === ']') acc.occurance++
        else {
          if (acc.occurance < 3) {
            acc.result += ']'.repeat(acc.occurance)
            acc.occurance = 0
          } else {
            acc.result += '·' + acc.occurance
            acc.occurance = 0
          }
          acc.result += item
        }
        return acc
      },
      { result: '', occurance: 0 }
    )
  if (occurance > 0) result += '·' + occurance
  return result
}
export const decompress = (raw: string) => {
  const suffix = [...new Set(raw.match(/·+?\d+/g))]
  const runes = suffix.reduce(
    (acc, m) => acc.split(m).join(']'.repeat(parseInt(m.substring(1)))),
    raw
  )
  let result = ''
  for (const tok of runes) {
    if (shortRunes.compressed.has(tok)) result += shortRunes.compressed.get(tok)
    else result += tok
  }
  return result
}
export const encodeBase64 = (source: string) =>
  LZUTF8.compress(compress(source).trim(), { outputEncoding: 'Base64' })
export const decodeBase64 = (source: string) =>
  decompress(
    LZUTF8.decompress(source.trim(), {
      inputEncoding: 'Base64',
      outputEncoding: 'String',
    })
  )
