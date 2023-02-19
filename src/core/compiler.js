const sanitizeProp = (prop) => {
  if (
    prop.includes('constructor') ||
    prop.includes('prototype') ||
    prop.includes('__proto__')
  )
    throw new TypeError(`Forbidden property access ${prop}`)
  return prop
}
const semiColumnEdgeCases = new Set([
  ';)',
  ';-',
  ';+',
  ';*',
  ';%',
  ';&',
  ';/',
  ';:',
  ';.',
  ';=',
  ';<',
  ';>',
  ';|',
  ';,',
  ';?',
  ',,',
  ';;',
  ';]',
])

const compile = () => {
  const vars = new Set()
  let modules = {}
  const dfs = (tree, locals) => {
    if (!tree) return ''
    if (tree.type === 'apply') {
      switch (tree.operator.name) {
        case ':':
          return `(()=>{${tree.args
            .map((x, i) => {
              const res = dfs(x, locals)
              return res !== undefined && i === tree.args.length - 1
                ? ';return ' + res.toString().trimStart()
                : res
            })
            .join('')}})()`
        case ':=': {
          let name,
            out = '(('
          for (let i = 0, len = tree.args.length; i < len; ++i) {
            if (i % 2 === 0) {
              name = tree.args[i].name
              locals.add(name)
            } else
              out += `${name}=${dfs(tree.args[i], locals)}${
                i !== len - 1 ? ',' : ''
              }`
          }
          out += `), ${name});`
          return out
        }
        case '<-::': {
          let out = '(('
          const obj = dfs(tree.args.pop(), locals)
          for (let i = 0, len = tree.args.length; i < len; ++i) {
            let name = tree.args[i].name
            locals.add(name)
            out += `${name}=${obj}.get(${`"${name}"`})${
              i !== len - 1 ? ',' : ''
            }`
          }
          out += `));`

          return out
        }
        case '<-.:': {
          let out = '(('
          const obj = dfs(tree.args.pop(), locals)
          for (let i = 0, len = tree.args.length; i < len; ++i) {
            let name = tree.args[i].name
            locals.add(name)
            if (i !== len - 1) out += `${name}=${obj}.at(${i}),`
            else out += `${name}=${obj}.slice(${i})`
          }
          out += `));`

          return out
        }
        case '~=': {
          const res = dfs(tree.args[1], locals)
          const name = tree.args[0].name
          locals.add(name)
          if (res !== undefined) return `((${name}=${res}),${name});`
          break
        }
        case '=': {
          const res = dfs(tree.args[1], locals)
          return `((${tree.args[0].name}=${res}),${tree.args[0].name});`
        }
        case '->': {
          const args = tree.args
          const body = args.pop()
          const localVars = new Set()
          const evaluatedBody = dfs(body, localVars)
          const vars = localVars.size ? `var ${[...localVars].join(',')};` : ''
          return `(${args.map((x) => dfs(x, locals))}) => {${vars} ${
            body.type === 'apply' || body.type === 'value' ? 'return ' : ' '
          } ${evaluatedBody.toString().trimStart()}};`
        }
        case '~':
          return '(' + tree.args.map((x) => dfs(x, locals)).join('+') + ');'
        case '==':
          return '(' + tree.args.map((x) => dfs(x, locals)).join('===') + ');'
        case '!=':
          return '(' + tree.args.map((x) => dfs(x, locals)).join('!==') + ');'
        case '+':
        case '-':
        case '*':
        case '/':
        case '>=':
        case '<=':
        case '>':
        case '<':
          return (
            '(' +
            tree.args.map((x) => dfs(x, locals)).join(tree.operator.name) +
            ');'
          )
        case '&&':
        case '||':
          return (
            '(' +
            tree.args
              .map((x) => `(${dfs(x, locals)})`)
              .join(tree.operator.name) +
            ');'
          )
        case '%':
          return (
            '(' +
            dfs(tree.args[0], locals) +
            '%' +
            dfs(tree.args[1], locals) +
            ');'
          )
        case '|':
          return `(${dfs(tree.args[0], locals)}.toFixed(
          ${tree.args.length === 1 ? 0 : dfs(tree.args[1], locals)}
        ));`
        case '+=':
          return `(${dfs(tree.args[0], locals)}+=${
            tree.args[1] != undefined ? dfs(tree.args[1], locals) : 1
          });`
        case '-=':
          return `(${dfs(tree.args[0], locals)}-=${
            tree.args[1] != undefined ? dfs(tree.args[1], locals) : 1
          });`
        case '*=':
          return `(${dfs(tree.args[0], locals)}*=${
            tree.args[1] != undefined ? dfs(tree.args[1], locals) : 1
          });`
        case '!':
          return '!' + dfs(tree.args[0], locals)

        case '?': {
          const conditionStack = []
          tree.args
            .map((x) => dfs(x, locals))
            .forEach((x, i) =>
              i % 2 === 0
                ? conditionStack.push(x, '?')
                : conditionStack.push(x, ':')
            )
          conditionStack.pop()
          if (conditionStack.length === 3) conditionStack.push(':', 'null;')
          return `(${conditionStack.join('')});`
        }

        case '*loop':
          return `_repeat(${dfs(tree.args[0], locals)},${dfs(
            tree.args[1],
            locals
          )});`
        case '===': {
          const [first, ...rest] = tree.args
          return `_every(Brrr.of(${rest
            .map((x) => dfs(x, locals))
            .join(',')}), x => Brrr.of(${dfs(
            first,
            locals
          )}).isEqual(Brrr.of(x)));`
        }
        case '!==': {
          const [first, ...rest] = tree.args
          return `_every(Brrr.of(${rest
            .map((x) => dfs(x, locals))
            .join(',')}), x => !Brrr.of(${dfs(
            first,
            locals
          )}).isEqual(Brrr.of(x)));`
        }
        case '`':
          return `_cast(${dfs(tree.args[0], locals)})`
        case '.:difference':
          return `_difference(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )});`
        case '.:intersection':
          return `_intersection(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )});`
        case '.:xor':
          return `_xor(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )});`
        case '.:union':
          return `_union(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )});`
        case '.:seq':
          return `_fill(${dfs(tree.args[0], locals)});`
        case '.:find>>':
          return `_findLeft(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )});`
        case '.:find<<':
          return `_findRight(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )});`
        case '.:every':
          return `_every(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )});`
        case '.:some':
          return `_some(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )});`
        case '.:find_index>>':
          return `_findIndexLeft(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )});`
        case '.:find_index<<':
          return `_findIndexRight(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )});`
        case '.:first':
          return `_arrAt(${dfs(tree.args[0], locals)}, 0);`
        case '.:last':
          return `_arrAt(${dfs(tree.args[0], locals)}, -1);`
        case '^':
          return `_arrAt(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )});`
        case '.:is_in_bounds':
          return `_arrInBounds(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )});`
        case ':':
          return `_arrGet(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )});`
        case '.:matrix':
          return `Brrr.matrix(${tree.args
            .map((x) => dfs(x, locals))
            .join(',')});`
        case '.:':
          return (
            'Brrr.of(' + tree.args.map((x) => dfs(x, locals)).join(',') + ')'
          )
        case '^=':
          return `_arrSet(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )}, ${dfs(tree.args[2], locals)});`
        case '.:append':
          return `_append(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )});`
        case '.:prepend':
          return `_prepend(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )});`
        case '.:head':
          return `_head(${dfs(tree.args[0], locals)});`
        case '.:tail':
          return `_tail(${dfs(tree.args[0], locals)});`
        case '.:cut':
          return `_cut(${dfs(tree.args[0], locals)});`
        case '.:chop':
          return `_chop(${dfs(tree.args[0], locals)});`
        case '.:from_string':
          return `_split(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )});`
        case '.:to_string':
          return `_join(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )});`
        case '.:chunks':
          return `_partition(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )});`
        case '.:length':
          return `_length(${dfs(tree.args[0], locals)});`
        case '::size':
          return `_mapSize(${dfs(tree.args[0], locals)});`
        case 'tco':
          return '_tco(' + dfs(tree.args[0], locals) + ');'
        case '...':
          return `_spreadArr([${tree.args
            .map((x) => dfs(x, locals))
            .join(',')}]);`
        case '|>': {
          return `(${dfs(tree.args[0], locals)});`
        }

        case '.:quick_sort': {
          return `_qSort(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )});`
        }
        case '.:merge_sort': {
          return `_mSort(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )});`
        }
        case '.:group': {
          return `_grp(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )});`
        }

        case '::':
          return (
            'new Map([' +
            tree.args
              .map((x) => dfs(x, locals))
              .reduce((acc, item, index) => {
                if (index % 2 === 0) {
                  const key = item.replace(';', '')
                  acc +=
                    key[0] === '"'
                      ? `["${key.replaceAll('"', '')}",`
                      : `[${key},`
                } else acc += `${item}],`
                return acc
              }, '') +
            '])'
          )
        case "'": {
          const names = tree.args.map(({ name }) => {
            locals.add(name)
            return `${name} = "${name}"`
          })

          return `((${names.join(',')}),${
            tree.args[tree.args.length - 1].name
          });`
        }
        case '.?':
          return `_mapHas(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )});`
        case '.':
          return `_mapGet(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )});`
        case '.=':
          return `_mapSet(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )}, ${dfs(tree.args[2], locals)});`
        case '.!=':
          return `_mapRemove(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )});`
        case '::entries':
          return `_mapEntries(${dfs(tree.args[0], locals)});`
        case '.:add_at': {
          const [first, second, ...rest] = tree.args.map((item) =>
            dfs(item, locals)
          )
          return `_addAt(${first}, ${second}, [${rest}]);`
        }
        case '.:remove_from':
          return `_removeFrom(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )}, ${dfs(tree.args[2], locals)});`
        case '::values':
          return `_mapValues(${dfs(tree.args[0], locals)});`
        case '::keys':
          return `_mapKeys(${dfs(tree.args[0], locals)});`
        case '.:rotate':
          return `_rot(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )}, ${dfs(tree.args[2], locals)});`
        case '.:slice':
          return `_slice(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )}, ${dfs(tree.args[2], locals)});`
        case '.:flat':
          return `_flat(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )});`
        case '>>':
          return `_scanLeft(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )});`
        case '<<':
          return `_scanRight(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )});`
        case '.:map>>':
          return `_mapLeft(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )});`
        case '.:map<<':
          return `_mapRight(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )});`
        case '.:flatten':
          return `_flatMap(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )});`
        case '.:filter':
          return `_filter(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )});`
        case '.:reduce>>': {
          const [array, callback, out] = tree.args.map((x) => dfs(x, locals))
          return `_reduceLeft(${array}, ${callback}, ${out});`
        }
        case '.:reduce<<': {
          const [array, callback, out] = tree.args.map((x) => dfs(x, locals))
          return `_reduceRight(${array}, ${callback}, ${out});`
        }
        case '=>': {
          return `_call(${dfs(tree.args[0], locals)}, ${dfs(
            tree.args[1],
            locals
          )});`
        }
        default: {
          if (tree.operator.name)
            return (
              tree.operator.name +
              '(' +
              tree.args.map((x) => dfs(x, locals)).join(',') +
              ');'
            )
          else {
            if (tree.operator.operator.name === '<-') {
              const lib = tree.args[0]
              const imp =
                lib.type === 'word' ? lib.name : dfs(lib, locals).slice(0, -1)
              const methods = tree.operator.args.map((x) =>
                sanitizeProp(x.name)
              )
              return methods
                .map((method) => {
                  if (method) {
                    locals.add(method)
                    if (imp in modules) modules[imp].push(method)
                    else modules[imp] = [method]
                  }
                  return `${method} = ${imp}["${method}"];`
                })
                .join('')
            } else {
              return `(${dfs(tree.operator, locals)})(${tree.args
                .map((x) => dfs(x, locals))
                .join(',')});`
            }
          }
        }
      }
    } else if (tree.type === 'word') return tree.name
    else if (tree.type === 'value')
      return tree.class === 'string' ? `"${tree.value}"` : tree.value
  }
  return { dfs, vars, modules }
}

export const compileToJs = (AST) => {
  const { dfs, vars, modules } = compile()
  const raw = dfs(AST, vars)
  let program = ''
  for (let i = 0; i < raw.length; ++i) {
    const current = raw[i]
    const next = raw[i + 1]
    if (!semiColumnEdgeCases.has(current + next)) program += current
  }
  const top = vars.size ? `var ${[...vars].join(',')};` : ''
  return { top, program, modules }
}
