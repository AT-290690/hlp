import { RUNES_NAMESPACE, evaluate } from './interpreter.js';
import Inventory from '../extensions/Inventory.js';
import { extensions } from '../extensions/extensions.js';
export const VOID = 0;
const extract = (item, env) => item.type === 'value' ? item.value : evaluate(item, env);
const MAX_KEY = 10;
const tokens = {
    ['+']: (args, env) => {
        if (args.length < 2)
            throw new RangeError('Invalid number of arguments to +');
        const operands = args.map((a) => evaluate(a, env));
        if (operands.some((n) => typeof n !== 'number'))
            throw new TypeError('Invalid use of + [] (Not all args are numbers)');
        const [first, ...rest] = operands;
        return rest.reduce((acc, x) => (acc += x), first);
    },
    ['-']: (args, env) => {
        if (args.length < 2)
            throw new RangeError('Invalid number of arguments to -');
        const operands = args.map((a) => evaluate(a, env));
        if (operands.some((n) => typeof n !== 'number'))
            throw new TypeError('Invalid use of - [] (Not all args are numbers)');
        const [first, ...rest] = operands;
        return rest.reduce((acc, x) => (acc -= x), first);
    },
    ['*']: (args, env) => {
        if (args.length < 2)
            throw new RangeError('Invalid number of arguments to *');
        const operands = args.map((a) => evaluate(a, env));
        if (operands.some((n) => typeof n !== 'number'))
            throw new TypeError('Invalid use of * [] (Not all args are numbers)');
        const [first, ...rest] = operands;
        return rest.reduce((acc, x) => (acc *= x), first);
    },
    ['/']: (args, env) => {
        if (args.length < 1)
            throw new RangeError('Invalid number of arguments to /');
        const operands = args.map((a) => evaluate(a, env));
        const isNumber = operands.some((n) => typeof n === 'number');
        if (!isNumber)
            throw new TypeError('Invalid use of / [] (Not all args are numbers)');
        const isZero = operands.includes(0);
        if (isZero)
            throw new RangeError('Invalid operation to / (devision by zero)');
        else
            return operands.reduce((acc, x) => (acc *= 1 / x), 1);
    },
    ['%']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments to %');
        const operands = args.map((a) => evaluate(a, env));
        if (operands.some((n) => typeof n !== 'number'))
            throw new TypeError('Invalid use of % [] (Not all args are numbers)');
        const [left, right] = operands;
        return left % right;
    },
    ['|']: (args, env) => {
        if (!args.length || args.length > 2)
            throw new RangeError('Invalid number of arguments to |');
        const rounder = args.length === 1 ? 0 : evaluate(args[1], env);
        const operand = evaluate(args[0], env);
        if (typeof operand !== 'number' || typeof rounder !== 'number')
            throw new TypeError('Invalid use of | [] (Not all args are numbers)');
        return +operand.toFixed(rounder);
    },
    ['+=']: (args, env) => {
        if (args.length > 2)
            throw new RangeError('Invalid number of arguments to +=');
        const [left, right] = args;
        const a = evaluate(left, env);
        const b = right ? evaluate(right, env) : 1;
        if (typeof a !== 'number' || typeof b !== 'number')
            throw new TypeError('Invalid use of += [] (Not all args are numbers)');
        for (let scope = env; scope; scope = Object.getPrototypeOf(scope))
            if (left.type === 'word' &&
                Object.prototype.hasOwnProperty.call(scope, left.name)) {
                const value = a + b;
                scope[left.name] = value;
                return value;
            }
    },
    ['-=']: (args, env) => {
        if (args.length > 2)
            throw new RangeError('Invalid number of arguments to -=');
        const [left, right] = args;
        const a = evaluate(left, env);
        const b = right ? evaluate(right, env) : 1;
        if (typeof a !== 'number' || typeof b !== 'number')
            throw new TypeError('Invalid use of -= [] (Not all args are numbers)');
        for (let scope = env; scope; scope = Object.getPrototypeOf(scope))
            if (left.type === 'word' &&
                Object.prototype.hasOwnProperty.call(scope, left.name)) {
                const value = a - b;
                scope[left.name] = value;
                return value;
            }
    },
    ['*=']: (args, env) => {
        if (args.length > 2)
            throw new RangeError('Invalid number of arguments to *=');
        const [left, right] = args;
        const a = evaluate(left, env);
        const b = right ? evaluate(right, env) : 1;
        if (typeof a !== 'number' || typeof b !== 'number')
            throw new TypeError('Invalid use of *= [] (Not all args are numbers)');
        for (let scope = env; scope; scope = Object.getPrototypeOf(scope))
            if (left.type === 'word' &&
                Object.prototype.hasOwnProperty.call(scope, left.name)) {
                const value = a * b;
                scope[left.name] = value;
                return value;
            }
    },
    ['~']: (args, env) => {
        if (args.length < 2)
            throw new RangeError('Invalid number of arguments to ~');
        const operands = args.map((a) => evaluate(a, env));
        if (operands.some((n) => typeof n !== 'string'))
            throw new TypeError('Invalid use of ~ [] (Not all args are strings)');
        const [first, ...rest] = operands;
        return rest.reduce((acc, x) => (acc += x), first);
    },
    ['?']: (args, env) => {
        if (args.length > 3 || args.length <= 1)
            throw new RangeError('Invalid number of arguments to ? []');
        if (!!evaluate(args[0], env))
            return evaluate(args[1], env);
        else if (args[2])
            return evaluate(args[2], env);
        else
            return 0;
    },
    ['!']: (args, env) => {
        if (args.length !== 1)
            throw new RangeError('Invalid number of arguments to !');
        return +!extract(args[0], env);
    },
    ['==']: (args, env) => {
        if (args.length < 2)
            throw new RangeError('Invalid number of arguments to ==');
        const [first, ...rest] = args.map((a) => evaluate(a, env));
        return +rest.every((x) => first === x);
    },
    ['!=']: (args, env) => {
        if (args.length < 2)
            throw new RangeError('Invalid number of arguments to !=');
        const [first, ...rest] = args.map((a) => evaluate(a, env));
        return +rest.every((x) => first !== x);
    },
    ['>']: (args, env) => {
        if (args.length < 2)
            throw new RangeError('Invalid number of arguments to >');
        const [first, ...rest] = args.map((a) => evaluate(a, env));
        return +rest.every((x) => first > x);
    },
    ['<']: (args, env) => {
        if (args.length < 2)
            throw new RangeError('Invalid number of arguments to <');
        const [first, ...rest] = args.map((a) => evaluate(a, env));
        return +rest.every((x) => first < x);
    },
    ['>=']: (args, env) => {
        if (args.length < 2)
            throw new RangeError('Invalid number of arguments to >=');
        const [first, ...rest] = args.map((a) => evaluate(a, env));
        return +rest.every((x) => first >= x);
    },
    ['<=']: (args, env) => {
        if (args.length < 2)
            throw new RangeError('Invalid number of arguments to <=');
        const [first, ...rest] = args.map((a) => evaluate(a, env));
        return +rest.every((x) => first <= x);
    },
    ['&&']: (args, env) => {
        if (args.length === 0)
            throw new RangeError('Invalid number of arguments to &&');
        for (let i = 0; i < args.length - 1; ++i)
            if (!!evaluate(args[i], env))
                continue;
            else
                return evaluate(args[i], env);
        return evaluate(args[args.length - 1], env);
    },
    ['||']: (args, env) => {
        if (args.length === 0)
            throw new RangeError('Invalid number of arguments  to ||');
        for (let i = 0; i < args.length - 1; ++i)
            if (!!evaluate(args[i], env))
                return evaluate(args[i], env);
            else
                continue;
        return evaluate(args[args.length - 1], env);
    },
    [':']: (args, env) => {
        let value = VOID;
        args.forEach((arg) => (value = evaluate(arg, env)));
        return value;
    },
    ['void:']: (args, env) => {
        let value = VOID;
        args.forEach((arg) => (value = evaluate(arg, env)));
        return value;
    },
    ['===']: (args, env) => {
        if (args.length < 2)
            throw new RangeError('Invalid number of arguments to ===');
        const [f, ...rest] = args.map((a) => evaluate(a, env));
        const first = Inventory.of(f);
        return +rest.every((x) => first.isEqual(Inventory.of(x)));
    },
    ['!==']: (args, env) => {
        if (args.length < 2)
            throw new RangeError('Invalid number of arguments to !==');
        const [f, ...rest] = args.map((a) => evaluate(a, env));
        const first = Inventory.of(f);
        return +rest.every((x) => !first.isEqual(Inventory.of(x)));
    },
    [':=']: (args, env) => {
        if (!args.length)
            throw new SyntaxError('Invalid number of arguments for := []');
        let name;
        for (let i = 0; i < args.length; ++i) {
            if (i % 2 === 0) {
                const word = args[i];
                if (word.type !== 'word')
                    throw new SyntaxError(`First argument of := [] must be word but got ${word.type ?? VOID}`);
                if (word.name.includes('.') || word.name.includes('-'))
                    throw new SyntaxError(`Invalid use of operation := [] [variable name must not contain . or -] but got ${word.name}`);
                if (word.name in tokens)
                    throw new SyntaxError(`${word.name} is a reserved word`);
                name = word.name;
            }
            else {
                const arg = args[i];
                if (arg.type === 'word' && arg.name in tokens)
                    throw new SyntaxError('To define new names of existing words Use aliases= instead');
                else
                    env[name] = evaluate(arg, env);
            }
        }
        return env[name];
    },
    ['=']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments for = []');
        if (args[0].type !== 'word')
            throw new TypeError('Argument for = [] must be words');
        const entityName = args[0].name;
        const value = evaluate(args[1], env);
        for (let scope = env; scope; scope = Object.getPrototypeOf(scope))
            if (Object.prototype.hasOwnProperty.call(scope, entityName)) {
                scope[entityName] = value;
                return value;
            }
        throw new ReferenceError(`Tried setting an undefined variable: ${entityName} using = []`);
    },
    ['->']: (args, env) => {
        if (!args.length)
            throw new SyntaxError('-> [] need a body');
        const argNames = args.slice(0, args.length - 1).map((expr) => {
            if (expr.type !== 'word')
                throw new TypeError('Argument names of -> [] must be words');
            return expr.name;
        });
        const body = args[args.length - 1];
        return (...args) => {
            const localEnv = Object.create(env);
            for (let i = 0; i < args.length; ++i)
                localEnv[argNames[i]] = args[i];
            return evaluate(body, localEnv);
        };
    },
    ['>>']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments to >>');
        const array = evaluate(args[0], env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of >> must be an .: []');
        const callback = evaluate(args[1], env);
        if (typeof callback !== 'function')
            throw new TypeError('Second argument of >> must be an -> []');
        return array.scan(callback, 1);
    },
    ['<<']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments to <<');
        const array = evaluate(args[0], env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of << must be an .: []');
        const callback = evaluate(args[1], env);
        if (typeof callback !== 'function')
            throw new TypeError('Second argument of << must be an -> []');
        return array.scan(callback, -1);
    },
    ['.:']: (args, env) => Inventory.from(args.map((item) => extract(item, env))),
    ['::']: (args, env) => {
        let tempKey = '';
        return args.reduce((acc, item, i) => {
            if (i % 2) {
                acc.set(tempKey, extract(item, env));
            }
            else {
                const key = extract(item, env);
                if (typeof key !== 'string') {
                    throw new SyntaxError(`Invalid use of operation :: [] (Only strings can be used as keys) setting ${key} `);
                }
                else if (key.length > MAX_KEY) {
                    throw new RangeError(`Key name "${key}" is too long. Max length is ${MAX_KEY} characters!`);
                }
                tempKey = key;
            }
            return acc;
        }, new Map());
    },
    ['::.?']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments for .? []');
        const prop = [];
        for (let i = 1; i < args.length; ++i) {
            const arg = args[i];
            const p = extract(arg, env);
            if (p == undefined)
                throw new TypeError(`Void key for accesing :: ${args[0].type === 'word' ? args[0].name : '::[]'}`);
            prop.push(extract(arg, env).toString());
        }
        if (args[0].type === 'apply' || args[0].type === 'value') {
            const entity = evaluate(args[0], env);
            if (!(entity instanceof Map))
                throw new TypeError(`:: ${args[0]} is not an instance of :: at .? []`);
            return +entity.has(prop[0]);
        }
        else {
            const entityName = args[0].name;
            for (let scope = env; scope; scope = Object.getPrototypeOf(scope))
                if (Object.prototype.hasOwnProperty.call(scope, entityName)) {
                    if (!(scope[entityName] instanceof Map))
                        throw new TypeError(`:: ${entityName} is not an instance of :: at .? []`);
                    return +scope[entityName].has(prop[0]);
                }
        }
    },
    ['::.']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments for . []');
        const prop = [];
        for (let i = 1; i < args.length; ++i) {
            const arg = args[i];
            const p = extract(arg, env);
            if (p == undefined)
                throw new TypeError(`Void key for accesing :: ${args[0].type === 'word' ? args[0].name : '::[]'}`);
            prop.push(extract(arg, env).toString());
        }
        if (args[0].type === 'apply' || args[0].type === 'value') {
            const entity = evaluate(args[0], env);
            if (!(entity instanceof Map))
                throw new TypeError(`:: ${args[0].type === 'apply' && args[0].operator.type === 'word'
                    ? args[0].operator.name
                    : args[0].type} is not an instance of :: at . []`);
            if (entity == undefined || !entity.has(prop[0]))
                throw new RangeError(`:: [${args[0].type === 'apply' && args[0].operator.type === 'word'
                    ? args[0].operator.name
                    : args[0].type}] doesnt have a . [${prop[0]}]`);
            const entityProperty = entity.get(prop[0]);
            if (typeof entityProperty === 'function') {
                const caller = entity;
                const fn = entityProperty;
                return fn.bind(caller);
            }
            else
                return entityProperty ?? VOID;
        }
        else {
            const entityName = args[0].name;
            for (let scope = env; scope; scope = Object.getPrototypeOf(scope))
                if (Object.prototype.hasOwnProperty.call(scope, entityName)) {
                    if (scope[entityName] == undefined ||
                        !(scope[entityName] instanceof Map))
                        throw new TypeError(`:: ${entityName} is not an instance of :: at . []`);
                    if (!scope[entityName].has(prop[0]))
                        throw new RangeError(`:: [${entityName ?? ''}] doesnt have a . [${prop[0]}]`);
                    const entityProperty = scope[entityName].get(prop[0]);
                    if (typeof entityProperty === 'function') {
                        const caller = scope[entityName];
                        const fn = entityProperty;
                        return fn.bind(caller);
                    }
                    else
                        return entityProperty ?? VOID;
                }
        }
    },
    ['::.=']: (args, env) => {
        if (args.length !== 3)
            throw new RangeError('Invalid number of arguments for .= []');
        const main = args[0];
        const last = args[args.length - 1];
        const prop = [];
        for (let i = 1; i < args.length - 1; ++i) {
            const arg = args[i];
            const p = extract(arg, env);
            if (p == undefined)
                throw new TypeError(`Void key for accesing :: ${args[0].type === 'word' ? args[0].name : args[0]}`);
            prop.push(extract(arg, env).toString());
        }
        const value = evaluate(last, env);
        if (main.type === 'apply') {
            const entity = evaluate(main, env);
            if (entity == undefined || !(entity instanceof Map))
                throw new TypeError(`:: ${entity.type === 'word' ? entity.name : entity} is not an instance of :: at .= []`);
            entity.set(prop[0], value);
            return entity;
        }
        else if (main.type === 'word') {
            const entityName = main.name;
            for (let scope = env; scope; scope = Object.getPrototypeOf(scope))
                if (Object.prototype.hasOwnProperty.call(scope, entityName)) {
                    const entity = scope[entityName];
                    if (entity == undefined || !(entity instanceof Map))
                        throw new TypeError(`:: ${entityName} is not an instance of :: at .= []`);
                    entity.set(prop[0], value);
                    return entity;
                }
        }
    },
    ['::.!=']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments for :: .!=  []');
        const prop = [];
        const main = args[0];
        if (main.type === 'value') {
            if (main == undefined || !(main instanceof Map))
                throw new TypeError(`:: ${main} is not an instance of :: at :: .!=  []`);
            main.delete(prop[0]);
            return main;
        }
        for (let i = 1; i < args.length; ++i) {
            const arg = args[i];
            const p = extract(arg, env);
            if (p == undefined)
                throw new TypeError(`Void key for accesing :: ${main.type === 'word' ? main.name : '::[]'}`);
            prop.push(extract(arg, env).toString());
        }
        if (main.type === 'word') {
            const entityName = main.name;
            for (let scope = env; scope; scope = Object.getPrototypeOf(scope))
                if (Object.prototype.hasOwnProperty.call(scope, entityName)) {
                    let temp = scope[entityName];
                    if (temp == undefined || !(temp instanceof Map))
                        throw new TypeError(`:: ${entityName} is not an instance of :: at :: .!=  []`);
                    if (!temp.has(prop[0])) {
                        throw new TypeError(`:: "${prop[0]}" doesn't exist in :: at :: .!=  []`);
                    }
                    temp.delete(prop[0]);
                    return temp;
                }
        }
        if (main.type === 'apply') {
            const entity = evaluate(main, env);
            if (entity == undefined || !(entity instanceof Map))
                throw new TypeError(`:: ${entity} is not an instance of :: at :: .!=  []`);
            entity.delete(prop[0]);
            return entity;
        }
    },
    ["'"]: (args, env) => {
        if (!args.length)
            throw new TypeError(`Invalid number of arguments for ' []`);
        let name = '';
        args.forEach((a) => {
            if (a.type !== 'word')
                throw new SyntaxError(`Invalid use of operation ' [] setting ${a.type === 'apply'
                    ? a.operator.type === 'word'
                        ? a.operator.name
                        : a
                    : a.value} (Arguments must be words)`);
            name = a.name;
            if (name.includes('.') || name.includes('-'))
                throw new SyntaxError(`Invalid use of operation ' [] (variable name must not contain . or -)`);
            env[name] = name;
        });
        return name;
    },
    ['.:.']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments to .');
        const array = evaluate(args[0], env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of . must be an .: []');
        const index = evaluate(args[1], env);
        if (!Number.isInteger(index))
            throw new TypeError('Second argument of . must be a number');
        if ((index < 0 && !array.isInBounds(array.length + index)) ||
            (index >= 0 && !array.isInBounds(index)))
            throw new RangeError(`Index is out of bounds . [${index}] .: [${array.length}]`);
        return array.at(index);
    },
    ['.:.=']: (args, env) => {
        if (args.length !== 3)
            throw new RangeError('Invalid number of arguments to .=');
        const array = evaluate(args[0], env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of  .= must be an .: []');
        const index = evaluate(args[1], env);
        if (!Number.isInteger(index))
            throw new TypeError('Second argument of .= must be a number');
        if (!array.isInBounds(Math.abs(index)))
            throw new RangeError(`Index is out of bounds .= [${index}] .: [${array.length}]`);
        return array.set(index, evaluate(args[2], env));
    },
    ['...']: (args, env) => {
        if (!args.length)
            throw new RangeError('Invalid number of arguments to ... []');
        const [first, ...rest] = args;
        const toSpread = evaluate(first, env);
        if (!Inventory.isBrrr(toSpread))
            throw new SyntaxError('... can only be used on .: []');
        return toSpread.merge(...rest.map((item) => evaluate(item, env)));
    },
    ['`']: (args, env) => {
        const value = evaluate(args[0], env);
        if (typeof value === 'string' || value == undefined)
            return Number(value);
        else if (typeof value === 'number')
            return value.toString();
        else
            throw new TypeError('Can only cast number or string at ` []');
    },
    ['|>']: (args, env) => evaluate(args[0], env),
    ['!throw']: (args, env) => {
        if (!evaluate(args[0], env))
            throw new Error(`${args[1] ? evaluate(args[1], env) : 'Something'} failed!`);
    },
    ['?==']: (args, env) => {
        if (!args.length || args.length > 2)
            throw new SyntaxError('Invalid number of arguments for ?== []');
        const entity = evaluate(args[0], env);
        const type = evaluate(args[1], env);
        return +(entity.constructor.name === type.constructor.name);
    },
    ['=>']: (args, env) => {
        if (args.length != 2)
            throw new SyntaxError('Invalid number of arguments for => []');
        const entity = evaluate(args[0], env);
        const callback = evaluate(args[1], env);
        if (typeof callback !== 'function')
            throw new TypeError('Second argument of => [] must be an -> []');
        return callback(entity);
    },
    ['.:filter']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments to .: filter[]');
        const array = evaluate(args[0], env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of .: filter[] must be an .: []');
        const callback = evaluate(args[1], env);
        if (typeof callback !== 'function')
            throw new TypeError('Second argument of .: filter[] must be an -> []');
        return array.filter(callback);
    },
    ['.:reduce>>']: (args, env) => {
        if (args.length !== 3)
            throw new RangeError('Invalid number of arguments to .: [] reduce >> []');
        const array = evaluate(args[0], env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of .: reduce >> [] must be an .: []');
        const callback = evaluate(args[1], env);
        if (typeof callback !== 'function')
            throw new TypeError('Second argument of .: reduce >> [] must be an -> []');
        return array.reduce(callback, evaluate(args[2], env));
    },
    ['.:reduce<<']: (args, env) => {
        if (args.length !== 3)
            throw new RangeError('Invalid number of arguments to .: reduce << []');
        const array = evaluate(args[0], env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of .: reduce << [] must be an .: []');
        const callback = evaluate(args[1], env);
        if (typeof callback !== 'function')
            throw new TypeError('Second argument of .: reduce << [] must be an -> []');
        return array.reduceRight(callback, evaluate(args[2], env));
    },
    ['.:map>>']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments to .: map >> []');
        const array = evaluate(args[0], env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of .: map >> [] must be an .: []');
        const callback = evaluate(args[1], env);
        if (typeof callback !== 'function')
            throw new TypeError('Second argument of .: map >> [] must be an -> []');
        const copy = new Inventory();
        for (let i = 0; i < array.length; ++i)
            copy.set(i, callback(array.get(i), i, array));
        return copy;
    },
    ['.:flatten']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments to .: map >> []');
        const array = evaluate(args[0], env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of .: map >> [] must be an .: []');
        const callback = evaluate(args[1], env);
        if (typeof callback !== 'function')
            throw new TypeError('Second argument of .: map >> [] must be an -> []');
        return array.flatten(callback);
    },
    ['.:map<<']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments to .: map << []');
        const array = evaluate(args[0], env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of .: map << [] must be an .: []');
        const callback = evaluate(args[1], env);
        if (typeof callback !== 'function')
            throw new TypeError('Second argument of .: map << [] must be an -> []');
        const copy = new Inventory();
        const len = array.length - 1;
        for (let i = len; i >= 0; --i)
            copy.set(len - i, callback(array.get(i), i, array));
        return copy;
    },
    ['.:quick_sort']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments to .: quick_sort []');
        const array = evaluate(args[0], env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of .: quick_sort [] must be an .: []');
        const dir = evaluate(args[1], env);
        if (dir !== -1 && dir !== 1)
            throw new TypeError('Second argument of .: quick_sort [] must be either -1 or 1');
        return array.quickSort(dir);
    },
    ['.:merge_sort']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments to .: merge_sort []');
        const array = evaluate(args[0], env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of .: merge_sort [] must be an .: []');
        const callback = evaluate(args[1], env);
        if (typeof callback !== 'function')
            throw new TypeError('Second argument of .: merge_sort [] must be an -> []');
        return array.mergeSort(callback);
    },
    ['.:->::']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments to .: -> :: []');
        const array = evaluate(args[0], env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of .: -> :: [] must be an .: []');
        const callback = evaluate(args[1], env);
        if (typeof callback !== 'function')
            throw new TypeError('Second argument of .: -> :: [] must be an -> []');
        return array.group(callback);
    },
    ['.:->:.']: (args, env) => {
        if (args.length !== 1)
            throw new RangeError('Invalid number of arguments to .: -> :. []');
        const array = evaluate(args[0], env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of .: -> :. [] must be an .: []');
        return array.uniform();
    },
    ['.:rotate']: (args, env) => {
        if (args.length !== 3)
            throw new RangeError('Invalid number of arguments to .: rotate []');
        const array = evaluate(args[0], env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of .: rotate [] must be an .: []');
        const n = evaluate(args[1], env);
        if (typeof n !== 'number' || n < 0)
            throw new TypeError('Second argument of .: rotate [] must be a positive number');
        const dir = evaluate(args[2], env);
        if (dir !== -1 && dir !== 1)
            throw new TypeError('Third argument of .: rotate [] must be either -1 or 1');
        return array.rotate(n, dir);
    },
    ['.:flat']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments to .: flat []');
        const array = evaluate(args[0], env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of .: flat [] must be an .: []');
        const level = evaluate(args[1], env);
        if (typeof level !== 'number' || level < 0)
            throw new TypeError('Second argument of .: flat [] must be a positive number');
        return array.flat(level);
    },
    ['.:slice']: (args, env) => {
        if (args.length !== 3)
            throw new RangeError('Invalid number of arguments to .: slice []');
        const array = evaluate(args[0], env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of .: slice [] must be an .: []');
        const n1 = evaluate(args[1], env);
        if (typeof n1 !== 'number')
            throw new TypeError('Second argument of .: slice [] must be a number');
        const n2 = evaluate(args[2], env);
        if (typeof n2 !== 'number')
            throw new TypeError('Third argument of .: slice [] must be a number');
        return array.slice(n1, n2);
    },
    ['*loop']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments to * loop []');
        const n = evaluate(args[0], env);
        if (typeof n !== 'number')
            throw new TypeError('First argument of * loop [] must be a number');
        const callback = evaluate(args[1], env);
        if (typeof callback !== 'function')
            throw new TypeError('Second argument of * loop [] must be an -> []');
        let out;
        for (let i = 0; i < n; ++i)
            out = callback(i);
        return out;
    },
    ['.:find_index>>']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments to .: find_index >> []');
        const array = evaluate(args[0], env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of .: find_index >> [] must be an .: []');
        const callback = evaluate(args[1], env);
        if (typeof callback !== 'function')
            throw new TypeError('Second argument of.: find_index >> []  must be an -> []');
        return array.findIndex(callback);
    },
    ['.:find_index<<']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments to .: find_index << []');
        const array = evaluate(args[0], env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of .: find_index << [] must be an .: []');
        const callback = evaluate(args[1], env);
        if (typeof callback !== 'function')
            throw new TypeError('Second argument of .: find_index << [] must be an -> []');
        return array.findLastIndex(callback);
    },
    ['.:find>>']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments to .: find >> []');
        const array = evaluate(args[0], env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of .: find >> [] must be an .: []');
        const callback = evaluate(args[1], env);
        if (typeof callback !== 'function')
            throw new TypeError('Second argument of .: find >> [] must be an -> []');
        return array.find(callback);
    },
    ['.:find<<']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments to .: find << []');
        const array = evaluate(args[0], env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of .: find << [] must be an .: []');
        const callback = evaluate(args[1], env);
        if (typeof callback !== 'function')
            throw new TypeError('Second argument of .: find << [] must be an -> []');
        return array.findLast(callback);
    },
    ['.:every']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments to .: every []');
        const array = evaluate(args[0], env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of .: every [] must be an .: []');
        const callback = evaluate(args[1], env);
        if (typeof callback !== 'function')
            throw new TypeError('Second argument of .: every [] must be an -> []');
        return +array.every(callback);
    },
    ['.:some']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments to .: some []');
        const array = evaluate(args[0], env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of .: some [] must be an .: []');
        const callback = evaluate(args[1], env);
        if (typeof callback !== 'function')
            throw new TypeError('Second argument of .: some [] must be an -> []');
        return +array.some(callback);
    },
    ['.:<']: (args, env) => {
        if (args.length !== 1)
            throw new RangeError('Invalid number of arguments to .: < []');
        const array = evaluate(args[0], env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of .: < [] must be an .: []');
        return array.first;
    },
    ['.:>']: (args, env) => {
        if (args.length !== 1)
            throw new RangeError('Invalid number of arguments to .: > []');
        const array = evaluate(args[0], env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of .: > [] must be an .: []');
        return array.last;
    },
    ['.:is_in_bounds']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments to .: is_in_bounds []');
        const array = evaluate(args[0], env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of .: is_in_bounds [] must be an .: []');
        const index = evaluate(args[1], env);
        return +array.isInBounds(Math.abs(index));
    },
    ['.:>=']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments to .: >= []');
        const array = evaluate(args[0], env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of .: >= must be an .: []');
        return array.append(evaluate(args[1], env));
    },
    ['.:add_at']: (args, env) => {
        if (args.length < 3)
            throw new RangeError('Invalid number of arguments to .: add_at []');
        const [first, second, ...rest] = args;
        const array = evaluate(first, env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of .: add_at must be an .: []');
        const index = evaluate(second, env);
        if (!Number.isInteger(index))
            throw new TypeError('Second argument of .: add_at [] must be a number');
        else if (!array.isInBounds(index))
            throw new RangeError('Second argument of .: add_at [] must be withing the bounds of .: []');
        return array.addAt(index, ...rest.map((item) => evaluate(item, env)));
    },
    ['.:remove_from']: (args, env) => {
        if (args.length !== 3)
            throw new RangeError('Invalid number of arguments to .: remove_from []');
        const array = evaluate(args[0], env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of .: remove_from [] must be an .: []');
        const index = evaluate(args[1], env);
        if (!Number.isInteger(index))
            throw new TypeError('Second argument of .: remove_from [] must be a number');
        else if (!array.isInBounds(index))
            throw new RangeError('Second argument of .: remove_from [] must be withing the bounds of .: []');
        const amount = evaluate(args[2], env);
        if (!Number.isInteger(amount) || amount < 0)
            throw new TypeError('Third argument of .: remove_from [] must be a number >= 0');
        return array.removeFrom(index, amount);
    },
    ['.:<=']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments to .: <= []');
        const array = evaluate(args[0], env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of .: <= [] must be an .: []');
        return array.prepend(evaluate(args[1], env));
    },
    ['.:>!=']: (args, env) => {
        if (args.length !== 1)
            throw new RangeError('Invalid number of arguments to .: >!= []');
        const array = evaluate(args[0], env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of .: >!= [] must be an .: []');
        return array.head();
    },
    ['.:<!=']: (args, env) => {
        if (args.length !== 1)
            throw new RangeError('Invalid number of arguments to .: <!= []');
        const array = evaluate(args[0], env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of .: <!= [] must be an .: []');
        return array.tail();
    },
    ['.:>!=.']: (args, env) => {
        if (args.length !== 1)
            throw new RangeError('Invalid number of arguments to .: >!=. []');
        const array = evaluate(args[0], env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of .: >!=. [] must be an .: []');
        return array.cut();
    },
    ['.:<!=.']: (args, env) => {
        if (args.length !== 1)
            throw new RangeError('Invalid number of arguments to .: <!=. []');
        const array = evaluate(args[0], env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of .: <!=. [] must be an .: []');
        return array.chop();
    },
    ['::entries']: (args, env) => {
        if (args.length !== 1)
            throw new RangeError('Invalid number of arguments to :: entries []');
        const map = evaluate(args[0], env);
        if (!(map.constructor.name === 'Map'))
            throw new TypeError('First argument of :: entries [] must be an :: []');
        return Inventory.from([...map.entries()].map(Inventory.from));
    },
    ['::keys']: (args, env) => {
        if (args.length !== 1)
            throw new RangeError('Invalid number of arguments to :: keys []');
        const map = evaluate(args[0], env);
        if (!(map.constructor.name === 'Map'))
            throw new TypeError('First argument of :: keys [] must be an :: []');
        return Inventory._mapKeys(map);
    },
    ['::->.:']: (args, env) => {
        if (args.length !== 1)
            throw new RangeError('Invalid number of arguments to :: -> .: []');
        const map = evaluate(args[0], env);
        if (!(map.constructor.name === 'Map'))
            throw new TypeError('First argument of :: -> .: [] must be an :: []');
        return Inventory._mapValues(map);
    },
    ['.:...']: (args, env) => {
        if (args.length !== 1)
            throw new RangeError('Invalid number of arguments to .: ... []');
        const n = evaluate(args[0], env);
        if (typeof n !== 'number')
            throw new TypeError('Second argument of .: ... [] must be an number');
        return Inventory.from(Array.from({ length: n })
            .fill(null)
            .map((_, i) => i));
    },
    ['.:from_string']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments to .: from_string []');
        const string = evaluate(args[0], env);
        if (typeof string !== 'string')
            throw new TypeError('First argument of .: from_string [] must be a string');
        const separator = evaluate(args[1], env);
        if (typeof separator !== 'string')
            throw new TypeError('Second argument of .: from_string [] must be a string');
        return Inventory.from(string.split(separator));
    },
    ['.:to_string']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments to .: to_string []');
        const array = evaluate(args[0], env);
        if (!Inventory.isBrrr(array))
            throw new TypeError('First argument of .: to_string [] must be an .: []');
        const separator = evaluate(args[1], env);
        if (typeof separator !== 'string')
            throw new TypeError('Second argument of .: to_string [] must be a string');
        return array.join(separator);
    },
    ['.:chunks']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments to .: chunks []');
        const array = evaluate(args[0], env);
        if (!Inventory.isBrrr(array))
            throw new TypeError('First argument of .: chunks [] must be an .: []');
        const n = evaluate(args[1], env);
        if (typeof n !== 'number')
            throw new TypeError('Second argument of .: chunks [] must be an number');
        return array.partition(n);
    },
    ['.:matrix']: (args, env) => {
        if (args.length < 1)
            throw new RangeError('Invalid number of arguments to .: matrix []');
        const dimensions = args.map((arg) => evaluate(arg, env));
        if (dimensions.some((d) => !Number.isInteger(d)))
            throw new TypeError('Argument of .: matrix [] must be integers');
        return Inventory.matrix(...dimensions);
    },
    ['.:length']: (args, env) => {
        if (args.length !== 1)
            throw new RangeError('Invalid number of arguments to .: length []');
        const array = evaluate(args[0], env);
        if (!(array.constructor.name === 'Inventory'))
            throw new TypeError('First argument of .: length [] must be an .: []');
        return array.length;
    },
    ['::size']: (args, env) => {
        if (args.length !== 1)
            throw new RangeError('Invalid number of arguments to :: size []');
        const map = evaluate(args[0], env);
        if (!(map.constructor.name === 'Map'))
            throw new TypeError('First argument of :: size [] must be an :: []');
        return map.size;
    },
    [':.']: (args, env) => {
        return args.reduce((acc, item) => {
            acc.add(extract(item, env));
            return acc;
        }, new Set());
    },
    [':..?']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments for .? []');
        const item = extract(args[1], env);
        if (item == undefined)
            throw new TypeError(`Void item for accesing :. ${args[0].type === 'word' ? args[0].name : ':.[]'}`);
        if (args[0].type === 'apply' || args[0].type === 'value') {
            const entity = evaluate(args[0], env);
            if (!(entity instanceof Set))
                throw new TypeError(`:. ${args[0]} is not an instance of :. at .? []`);
            return +entity.has(item);
        }
        else {
            const entityName = args[0].name;
            for (let scope = env; scope; scope = Object.getPrototypeOf(scope))
                if (Object.prototype.hasOwnProperty.call(scope, entityName)) {
                    if (!(scope[entityName] instanceof Set))
                        throw new TypeError(`:. ${entityName} is not an instance of :. at .? []`);
                    return +scope[entityName].has(item);
                }
        }
    },
    [':..=']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments for .= []');
        const main = args[0];
        const item = extract(args[1], env);
        if (item == undefined)
            throw new TypeError(`Void item for accesing :. ${args[0].type === 'word' ? args[0].name : ':.[]'}`);
        if (main.type === 'apply') {
            const entity = evaluate(main, env);
            if (entity == undefined || !(entity instanceof Set))
                throw new TypeError(`:. ${entity.type === 'word' ? entity.name : entity} is not an instance of :. at .= []`);
            entity.add(item);
            return entity;
        }
        else if (main.type === 'word') {
            const entityName = main.name;
            for (let scope = env; scope; scope = Object.getPrototypeOf(scope))
                if (Object.prototype.hasOwnProperty.call(scope, entityName)) {
                    const entity = scope[entityName];
                    if (entity == undefined || !(entity instanceof Set))
                        throw new TypeError(`:. ${entityName} is not an instance of :: at .= []`);
                    entity.add(item);
                    return entity;
                }
        }
    },
    [':..!=']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments for .= []');
        const main = args[0];
        const item = extract(args[1], env);
        if (item == undefined)
            throw new TypeError(`Void item for accesing :. ${args[0].type === 'word' ? args[0].name : ':.[]'}`);
        if (main.type === 'apply') {
            const entity = evaluate(main, env);
            if (entity == undefined || !(entity instanceof Set))
                throw new TypeError(`:. ${entity.type === 'word' ? entity.name : entity} is not an instance of :. at .= []`);
            entity.delete(item);
            return entity;
        }
        else if (main.type === 'word') {
            const entityName = main.name;
            for (let scope = env; scope; scope = Object.getPrototypeOf(scope))
                if (Object.prototype.hasOwnProperty.call(scope, entityName)) {
                    const entity = scope[entityName];
                    if (entity == undefined || !(entity instanceof Set))
                        throw new TypeError(`:. ${entityName} is not an instance of :: at .= []`);
                    entity.delete(item);
                    return entity;
                }
        }
    },
    [':.size']: (args, env) => {
        if (args.length !== 1)
            throw new RangeError('Invalid number of arguments to :. size []');
        const set = evaluate(args[0], env);
        if (!(set.constructor.name === 'Set'))
            throw new TypeError('First argument of :. size [] must be an :. []');
        return set.size;
    },
    [':.union']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments to :. union []');
        const a = evaluate(args[0], env);
        if (!(a.constructor.name === 'Set'))
            throw new TypeError('First argument of :. union [] must be an :. []');
        const b = evaluate(args[1], env);
        if (!(b.constructor.name === 'Set'))
            throw new TypeError('Second argument of :. union [] must be an :. []');
        return Inventory._setUnion(a, b);
    },
    [':.xor']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments to :. xor []');
        const a = evaluate(args[0], env);
        if (!(a.constructor.name === 'Set'))
            throw new TypeError('First argument of :. xor [] must be an :. []');
        const b = evaluate(args[1], env);
        if (!(b.constructor.name === 'Set'))
            throw new TypeError('Second argument of :. xor [] must be an :. []');
        return Inventory._setXor(a, b);
    },
    [':.intersection']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments to :. intersection []');
        const a = evaluate(args[0], env);
        if (!(a.constructor.name === 'Set'))
            throw new TypeError('First argument of :. intersection [] must be an :. []');
        const b = evaluate(args[1], env);
        if (!(b.constructor.name === 'Set'))
            throw new TypeError('Second argument of :. intersection [] must be an :. []');
        return Inventory._setIntersection(a, b);
    },
    [':.difference']: (args, env) => {
        if (args.length !== 2)
            throw new RangeError('Invalid number of arguments to :. difference []');
        const a = evaluate(args[0], env);
        if (!(a.constructor.name === 'Set'))
            throw new TypeError('First argument of :. difference [] must be an :. []');
        const b = evaluate(args[1], env);
        if (!(b.constructor.name === 'Set'))
            throw new TypeError('Second argument of :. difference [] must be an :. []');
        return Inventory._setDifference(a, b);
    },
    [':.->.:']: (args, env) => {
        if (args.length !== 1)
            throw new RangeError('Invalid number of arguments to :. -> .: []');
        const set = evaluate(args[0], env);
        if (!(set.constructor.name === 'Set'))
            throw new TypeError('First argument of :. -> .: [] must be an :. []');
        return Inventory._setValues(set);
    },
    // for executing hlp code
    // it's empty here
    // gets re-assigned when
    // the core is initialised
    ['~*']: () => { },
    ['void']: VOID,
    ['number']: 0,
    ['string']: '',
    ['array']: new Inventory(),
    ['object']: new Map(),
    ['aliases=']: (args, env) => {
        if (!args.length)
            return 0;
        let name;
        for (let i = 0; i < args.length; ++i) {
            if (i % 2 === 0) {
                const word = args[i];
                if (word.type !== 'word')
                    throw new SyntaxError(`First argument of aliases= [] must be word but got ${word.type ?? VOID}`);
                if (word.name in tokens)
                    throw new SyntaxError(`${word.name} is a reserved word`);
                name = word.name;
            }
            else {
                const arg = args[i];
                if (arg.type === 'word') {
                    if (arg.name in tokens)
                        env[RUNES_NAMESPACE][name] = env[RUNES_NAMESPACE][arg.name];
                    else if (arg.name in env)
                        env[name] = env[arg.name];
                    else
                        throw new TypeError('Attempt to alias undefined function at aliases=[]');
                }
                else
                    throw new SyntaxError('aliases= can only be words at aliases=[]');
            }
        }
        return env[name];
    },
    ...extensions,
};
export { tokens };
