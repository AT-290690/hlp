const DefaultBufferLength = 1024
let nextPropID = 0
class Range$1 {
  constructor(e, t) {
    ;(this.from = e), (this.to = t)
  }
}
class NodeProp {
  constructor(e = {}) {
    ;(this.id = nextPropID++),
      (this.perNode = !!e.perNode),
      (this.deserialize =
        e.deserialize ||
        (() => {
          throw new Error(
            "This node type doesn't define a deserialize function"
          )
        }))
  }
  add(t) {
    if (this.perNode)
      throw new RangeError("Can't add per-node props to node types")
    return (
      'function' != typeof t && (t = NodeType.match(t)),
      (e) => {
        e = t(e)
        return void 0 === e ? null : [this, e]
      }
    )
  }
}
;(NodeProp.closedBy = new NodeProp({ deserialize: (e) => e.split(' ') })),
  (NodeProp.openedBy = new NodeProp({ deserialize: (e) => e.split(' ') })),
  (NodeProp.group = new NodeProp({ deserialize: (e) => e.split(' ') })),
  (NodeProp.contextHash = new NodeProp({ perNode: !0 })),
  (NodeProp.lookAhead = new NodeProp({ perNode: !0 })),
  (NodeProp.mounted = new NodeProp({ perNode: !0 }))
const noProps = Object.create(null)
class NodeType {
  constructor(e, t, i, r = 0) {
    ;(this.name = e), (this.props = t), (this.id = i), (this.flags = r)
  }
  static define(e) {
    let t = e.props && e.props.length ? Object.create(null) : noProps
    var i =
        (e.top ? 1 : 0) |
        (e.skipped ? 2 : 0) |
        (e.error ? 4 : 0) |
        (null == e.name ? 8 : 0),
      r = new NodeType(e.name || '', t, e.id, i)
    if (e.props)
      for (var n of e.props)
        if ((n = Array.isArray(n) ? n : n(r))) {
          if (n[0].perNode)
            throw new RangeError("Can't store a per-node prop on a node type")
          t[n[0].id] = n[1]
        }
    return r
  }
  prop(e) {
    return this.props[e.id]
  }
  get isTop() {
    return 0 < (1 & this.flags)
  }
  get isSkipped() {
    return 0 < (2 & this.flags)
  }
  get isError() {
    return 0 < (4 & this.flags)
  }
  get isAnonymous() {
    return 0 < (8 & this.flags)
  }
  is(t) {
    if ('string' != typeof t) return this.id == t
    {
      if (this.name == t) return !0
      let e = this.prop(NodeProp.group)
      return !!e && -1 < e.indexOf(t)
    }
  }
  static match(e) {
    let n = Object.create(null)
    for (var t in e) for (var i of t.split(' ')) n[i] = e[t]
    return (i) => {
      for (
        let e = i.prop(NodeProp.group), t = -1;
        t < (e ? e.length : 0);
        t++
      ) {
        var r = n[t < 0 ? i.name : e[t]]
        if (r) return r
      }
    }
  }
}
NodeType.none = new NodeType('', Object.create(null), 0, 8)
class NodeSet {
  constructor(t) {
    this.types = t
    for (let e = 0; e < t.length; e++)
      if (t[e].id != e)
        throw new RangeError(
          'Node type ids should correspond to array positions when creating a node set'
        )
  }
  extend(...t) {
    let i = []
    for (var r of this.types) {
      let e = null
      for (var n of t) {
        n = n(r)
        n && ((e = e || Object.assign({}, r.props))[n[0].id] = n[1])
      }
      i.push(e ? new NodeType(r.name, e, r.id, r.flags) : r)
    }
    return new NodeSet(i)
  }
}
const CachedNode = new WeakMap(),
  CachedInnerNode = new WeakMap()
var IterMode, Recover, Safety, Rec
!(function (e) {
  ;(e[(e.ExcludeBuffers = 1)] = 'ExcludeBuffers'),
    (e[(e.IncludeAnonymous = 2)] = 'IncludeAnonymous'),
    (e[(e.IgnoreMounts = 4)] = 'IgnoreMounts'),
    (e[(e.IgnoreOverlays = 8)] = 'IgnoreOverlays')
})((IterMode = IterMode || {}))
class Tree {
  constructor(e, t, i, r, n) {
    if (
      ((this.type = e),
      (this.children = t),
      (this.positions = i),
      (this.length = r),
      (this.props = null),
      n && n.length)
    ) {
      this.props = Object.create(null)
      for (var [o, s] of n) this.props['number' == typeof o ? o : o.id] = s
    }
  }
  toString() {
    let e = this.prop(NodeProp.mounted)
    if (e && !e.overlay) return e.tree.toString()
    let t = ''
    for (var i of this.children) {
      i = i.toString()
      i && (t && (t += ','), (t += i))
    }
    return this.type.name
      ? (/\W/.test(this.type.name) && !this.type.isError
          ? JSON.stringify(this.type.name)
          : this.type.name) + (t.length ? '(' + t + ')' : '')
      : t
  }
  cursor(e = 0) {
    return new TreeCursor(this.topNode, e)
  }
  cursorAt(e, t = 0, i) {
    var r = CachedNode.get(this) || this.topNode
    let n = new TreeCursor(r)
    return n.moveTo(e, t), CachedNode.set(this, n._tree), n
  }
  get topNode() {
    return new TreeNode(this, 0, 0, null)
  }
  resolve(e, t = 0) {
    e = resolveNode(CachedNode.get(this) || this.topNode, e, t, !1)
    return CachedNode.set(this, e), e
  }
  resolveInner(e, t = 0) {
    e = resolveNode(CachedInnerNode.get(this) || this.topNode, e, t, !0)
    return CachedInnerNode.set(this, e), e
  }
  iterate(e) {
    let { enter: i, leave: r, from: n = 0, to: o = this.length } = e
    for (let t = this.cursor((e.mode || 0) | IterMode.IncludeAnonymous); ; ) {
      let e = !1
      if (t.from <= o && t.to >= n && (t.type.isAnonymous || !1 !== i(t))) {
        if (t.firstChild()) continue
        e = !0
      }
      for (; e && r && !t.type.isAnonymous && r(t), !t.nextSibling(); ) {
        if (!t.parent()) return
        e = !0
      }
    }
  }
  prop(e) {
    return e.perNode
      ? this.props
        ? this.props[e.id]
        : void 0
      : this.type.prop(e)
  }
  get propValues() {
    let e = []
    if (this.props) for (var t in this.props) e.push([+t, this.props[t]])
    return e
  }
  balance(e = {}) {
    return this.children.length <= 8
      ? this
      : balanceRange(
          NodeType.none,
          this.children,
          this.positions,
          0,
          this.children.length,
          0,
          this.length,
          (e, t, i) => new Tree(this.type, e, t, i, this.propValues),
          e.makeTree || ((e, t, i) => new Tree(NodeType.none, e, t, i))
        )
  }
  static build(e) {
    return buildTree(e)
  }
}
Tree.empty = new Tree(NodeType.none, [], [], 0)
class FlatBufferCursor {
  constructor(e, t) {
    ;(this.buffer = e), (this.index = t)
  }
  get id() {
    return this.buffer[this.index - 4]
  }
  get start() {
    return this.buffer[this.index - 3]
  }
  get end() {
    return this.buffer[this.index - 2]
  }
  get size() {
    return this.buffer[this.index - 1]
  }
  get pos() {
    return this.index
  }
  next() {
    this.index -= 4
  }
  fork() {
    return new FlatBufferCursor(this.buffer, this.index)
  }
}
class TreeBuffer {
  constructor(e, t, i) {
    ;(this.buffer = e), (this.length = t), (this.set = i)
  }
  get type() {
    return NodeType.none
  }
  toString() {
    let t = []
    for (let e = 0; e < this.buffer.length; )
      t.push(this.childString(e)), (e = this.buffer[e + 3])
    return t.join(',')
  }
  childString(e) {
    var t = this.buffer[e],
      i = this.buffer[e + 3]
    let r = this.set.types[t],
      n = r.name
    if ((/\W/.test(n) && !r.isError && (n = JSON.stringify(n)), i == (e += 4)))
      return n
    let o = []
    for (; e < i; ) o.push(this.childString(e)), (e = this.buffer[e + 3])
    return n + '(' + o.join(',') + ')'
  }
  findChild(t, i, r, n, o) {
    let s = this['buffer'],
      a = -1
    for (
      let e = t;
      e != i && !(checkSide(o, n, s[e + 1], s[e + 2]) && ((a = e), 0 < r));
      e = s[e + 3]
    );
    return a
  }
  slice(i, r, n, e) {
    var o = this.buffer
    let s = new Uint16Array(r - i)
    for (let e = i, t = 0; e < r; )
      (s[t++] = o[e++]),
        (s[t++] = o[e++] - n),
        (s[t++] = o[e++] - n),
        (s[t++] = o[e++] - i)
    return new TreeBuffer(s, e - n, this.set)
  }
}
function checkSide(e, t, i, r) {
  switch (e) {
    case -2:
      return i < t
    case -1:
      return t <= r && i < t
    case 0:
      return i < t && t < r
    case 1:
      return i <= t && t < r
    case 2:
      return t < r
    case 4:
      return !0
  }
}
function enterUnfinishedNodesBefore(e, t) {
  let i = e.childBefore(t)
  for (; i; ) {
    var r = i.lastChild
    if (!r || r.to != i.to) break
    i = r.type.isError && r.from == r.to ? ((e = i), r.prevSibling) : r
  }
  return e
}
function resolveNode(i, r, n, e) {
  for (
    var o;
    i.from == i.to ||
    (n < 1 ? i.from >= r : i.from > r) ||
    (-1 < n ? i.to <= r : i.to < r);

  ) {
    var t = !e && i instanceof TreeNode && i.index < 0 ? null : i.parent
    if (!t) return i
    i = t
  }
  var s = e ? 0 : IterMode.IgnoreOverlays
  if (e)
    for (let e = i, t = e.parent; t; t = (e = t).parent)
      e instanceof TreeNode &&
        e.index < 0 &&
        (null == (o = t.enter(r, n, s)) ? void 0 : o.from) != e.from &&
        (i = t)
  for (;;) {
    var a = i.enter(r, n, s)
    if (!a) return i
    i = a
  }
}
class TreeNode {
  constructor(e, t, i, r) {
    ;(this._tree = e), (this.from = t), (this.index = i), (this._parent = r)
  }
  get type() {
    return this._tree.type
  }
  get name() {
    return this._tree.type.name
  }
  get to() {
    return this.from + this._tree.length
  }
  nextChild(o, s, a, l, h = 0) {
    for (let n = this; ; ) {
      for (
        var { children: e, positions: t } = n._tree, i = 0 < s ? e.length : -1;
        o != i;
        o += s
      ) {
        let i = e[o],
          r = t[o] + n.from
        if (checkSide(l, a, r, r + i.length))
          if (i instanceof TreeBuffer) {
            if (!(h & IterMode.ExcludeBuffers)) {
              var c = i.findChild(0, i.buffer.length, s, a - r, l)
              if (-1 < c)
                return new BufferNode(new BufferContext(n, i, o, r), null, c)
            }
          } else if (
            h & IterMode.IncludeAnonymous ||
            !i.type.isAnonymous ||
            hasChild(i)
          ) {
            let e
            if (
              !(h & IterMode.IgnoreMounts) &&
              i.props &&
              (e = i.prop(NodeProp.mounted)) &&
              !e.overlay
            )
              return new TreeNode(e.tree, r, o, n)
            let t = new TreeNode(i, r, o, n)
            return h & IterMode.IncludeAnonymous || !t.type.isAnonymous
              ? t
              : t.nextChild(s < 0 ? i.children.length - 1 : 0, s, a, l)
          }
      }
      if (h & IterMode.IncludeAnonymous || !n.type.isAnonymous) return null
      if (
        ((o =
          0 <= n.index
            ? n.index + s
            : s < 0
            ? -1
            : n._parent._tree.children.length),
        !(n = n._parent))
      )
        return null
    }
  }
  get firstChild() {
    return this.nextChild(0, 1, 0, 4)
  }
  get lastChild() {
    return this.nextChild(this._tree.children.length - 1, -1, 0, 4)
  }
  childAfter(e) {
    return this.nextChild(0, 1, e, 2)
  }
  childBefore(e) {
    return this.nextChild(this._tree.children.length - 1, -1, e, -2)
  }
  enter(e, t, i = 0) {
    let r
    if (
      !(i & IterMode.IgnoreOverlays) &&
      (r = this._tree.prop(NodeProp.mounted)) &&
      r.overlay
    ) {
      var n,
        o,
        s = e - this.from
      for ({ from: n, to: o } of r.overlay)
        if ((0 < t ? n <= s : n < s) && (t < 0 ? o >= s : o > s))
          return new TreeNode(r.tree, r.overlay[0].from + this.from, -1, this)
    }
    return this.nextChild(0, 1, e, t, i)
  }
  nextSignificantParent() {
    let e = this
    for (; e.type.isAnonymous && e._parent; ) e = e._parent
    return e
  }
  get parent() {
    return this._parent ? this._parent.nextSignificantParent() : null
  }
  get nextSibling() {
    return this._parent && 0 <= this.index
      ? this._parent.nextChild(this.index + 1, 1, 0, 4)
      : null
  }
  get prevSibling() {
    return this._parent && 0 <= this.index
      ? this._parent.nextChild(this.index - 1, -1, 0, 4)
      : null
  }
  cursor(e = 0) {
    return new TreeCursor(this, e)
  }
  get tree() {
    return this._tree
  }
  toTree() {
    return this._tree
  }
  resolve(e, t = 0) {
    return resolveNode(this, e, t, !1)
  }
  resolveInner(e, t = 0) {
    return resolveNode(this, e, t, !0)
  }
  enterUnfinishedNodesBefore(e) {
    return enterUnfinishedNodesBefore(this, e)
  }
  getChild(e, t = null, i = null) {
    e = getChildren(this, e, t, i)
    return e.length ? e[0] : null
  }
  getChildren(e, t = null, i = null) {
    return getChildren(this, e, t, i)
  }
  toString() {
    return this._tree.toString()
  }
  get node() {
    return this
  }
  matchContext(e) {
    return matchNodeContext(this, e)
  }
}
function getChildren(e, t, i, r) {
  let n = e.cursor(),
    o = []
  if (!n.firstChild()) return o
  if (null != i) for (; !n.type.is(i); ) if (!n.nextSibling()) return o
  for (;;) {
    if (null != r && n.type.is(r)) return o
    if ((n.type.is(t) && o.push(n.node), !n.nextSibling()))
      return null == r ? o : []
  }
}
function matchNodeContext(t, i, r = i.length - 1) {
  for (let e = t.parent; 0 <= r; e = e.parent) {
    if (!e) return !1
    if (!e.type.isAnonymous) {
      if (i[r] && i[r] != e.name) return !1
      r--
    }
  }
  return !0
}
class BufferContext {
  constructor(e, t, i, r) {
    ;(this.parent = e), (this.buffer = t), (this.index = i), (this.start = r)
  }
}
class BufferNode {
  constructor(e, t, i) {
    ;(this.context = e),
      (this._parent = t),
      (this.index = i),
      (this.type = e.buffer.set.types[e.buffer.buffer[i]])
  }
  get name() {
    return this.type.name
  }
  get from() {
    return this.context.start + this.context.buffer.buffer[this.index + 1]
  }
  get to() {
    return this.context.start + this.context.buffer.buffer[this.index + 2]
  }
  child(e, t, i) {
    let r = this.context['buffer']
    e = r.findChild(
      this.index + 4,
      r.buffer[this.index + 3],
      e,
      t - this.context.start,
      i
    )
    return e < 0 ? null : new BufferNode(this.context, this, e)
  }
  get firstChild() {
    return this.child(1, 0, 4)
  }
  get lastChild() {
    return this.child(-1, 0, 4)
  }
  childAfter(e) {
    return this.child(1, e, 2)
  }
  childBefore(e) {
    return this.child(-1, e, -2)
  }
  enter(e, t, i = 0) {
    if (i & IterMode.ExcludeBuffers) return null
    let r = this.context['buffer']
    i = r.findChild(
      this.index + 4,
      r.buffer[this.index + 3],
      0 < t ? 1 : -1,
      e - this.context.start,
      t
    )
    return i < 0 ? null : new BufferNode(this.context, this, i)
  }
  get parent() {
    return this._parent || this.context.parent.nextSignificantParent()
  }
  externalSibling(e) {
    return this._parent
      ? null
      : this.context.parent.nextChild(this.context.index + e, e, 0, 4)
  }
  get nextSibling() {
    var e = this.context['buffer'],
      t = e.buffer[this.index + 3]
    return t <
      (this._parent ? e.buffer[this._parent.index + 3] : e.buffer.length)
      ? new BufferNode(this.context, this._parent, t)
      : this.externalSibling(1)
  }
  get prevSibling() {
    let e = this.context['buffer']
    var t = this._parent ? this._parent.index + 4 : 0
    return this.index == t
      ? this.externalSibling(-1)
      : new BufferNode(
          this.context,
          this._parent,
          e.findChild(t, this.index, -1, 0, 4)
        )
  }
  cursor(e = 0) {
    return new TreeCursor(this, e)
  }
  get tree() {
    return null
  }
  toTree() {
    let e = [],
      t = [],
      i = this.context['buffer']
    var r,
      n,
      o = this.index + 4,
      s = i.buffer[this.index + 3]
    return (
      o < s &&
        ((r = i.buffer[this.index + 1]),
        (n = i.buffer[this.index + 2]),
        e.push(i.slice(o, s, r, n)),
        t.push(0)),
      new Tree(this.type, e, t, this.to - this.from)
    )
  }
  resolve(e, t = 0) {
    return resolveNode(this, e, t, !1)
  }
  resolveInner(e, t = 0) {
    return resolveNode(this, e, t, !0)
  }
  enterUnfinishedNodesBefore(e) {
    return enterUnfinishedNodesBefore(this, e)
  }
  toString() {
    return this.context.buffer.childString(this.index)
  }
  getChild(e, t = null, i = null) {
    e = getChildren(this, e, t, i)
    return e.length ? e[0] : null
  }
  getChildren(e, t = null, i = null) {
    return getChildren(this, e, t, i)
  }
  get node() {
    return this
  }
  matchContext(e) {
    return matchNodeContext(this, e)
  }
}
class TreeCursor {
  constructor(t, e = 0) {
    if (
      ((this.mode = e),
      (this.buffer = null),
      (this.stack = []),
      (this.index = 0),
      (this.bufferNode = null),
      t instanceof TreeNode)
    )
      this.yieldNode(t)
    else {
      ;(this._tree = t.context.parent), (this.buffer = t.context)
      for (let e = t._parent; e; e = e._parent) this.stack.unshift(e.index)
      ;(this.bufferNode = t), this.yieldBuf(t.index)
    }
  }
  get name() {
    return this.type.name
  }
  yieldNode(e) {
    return (
      !!e &&
      ((this._tree = e),
      (this.type = e.type),
      (this.from = e.from),
      (this.to = e.to),
      !0)
    )
  }
  yieldBuf(e, t) {
    this.index = e
    var { start: i, buffer: r } = this.buffer
    return (
      (this.type = t || r.set.types[r.buffer[e]]),
      (this.from = i + r.buffer[e + 1]),
      (this.to = i + r.buffer[e + 2]),
      !0
    )
  }
  yield(e) {
    return (
      !!e &&
      (e instanceof TreeNode
        ? ((this.buffer = null), this.yieldNode(e))
        : ((this.buffer = e.context), this.yieldBuf(e.index, e.type)))
    )
  }
  toString() {
    return this.buffer
      ? this.buffer.buffer.childString(this.index)
      : this._tree.toString()
  }
  enterChild(e, t, i) {
    if (!this.buffer)
      return this.yield(
        this._tree.nextChild(
          e < 0 ? this._tree._tree.children.length - 1 : 0,
          e,
          t,
          i,
          this.mode
        )
      )
    let r = this.buffer['buffer']
    e = r.findChild(
      this.index + 4,
      r.buffer[this.index + 3],
      e,
      t - this.buffer.start,
      i
    )
    return !(e < 0) && (this.stack.push(this.index), this.yieldBuf(e))
  }
  firstChild() {
    return this.enterChild(1, 0, 4)
  }
  lastChild() {
    return this.enterChild(-1, 0, 4)
  }
  childAfter(e) {
    return this.enterChild(1, e, 2)
  }
  childBefore(e) {
    return this.enterChild(-1, e, -2)
  }
  enter(e, t, i = this.mode) {
    return this.buffer
      ? !(i & IterMode.ExcludeBuffers) && this.enterChild(1, e, t)
      : this.yield(this._tree.enter(e, t, i))
  }
  parent() {
    if (!this.buffer)
      return this.yieldNode(
        this.mode & IterMode.IncludeAnonymous
          ? this._tree._parent
          : this._tree.parent
      )
    if (this.stack.length) return this.yieldBuf(this.stack.pop())
    var e =
      this.mode & IterMode.IncludeAnonymous
        ? this.buffer.parent
        : this.buffer.parent.nextSignificantParent()
    return (this.buffer = null), this.yieldNode(e)
  }
  sibling(e) {
    if (!this.buffer)
      return (
        !!this._tree._parent &&
        this.yield(
          this._tree.index < 0
            ? null
            : this._tree._parent.nextChild(
                this._tree.index + e,
                e,
                0,
                4,
                this.mode
              )
        )
      )
    let t = this.buffer['buffer'],
      i = this.stack.length - 1
    if (e < 0) {
      var r = i < 0 ? 0 : this.stack[i] + 4
      if (this.index != r)
        return this.yieldBuf(t.findChild(r, this.index, -1, 0, 4))
    } else {
      r = t.buffer[this.index + 3]
      if (r < (i < 0 ? t.buffer.length : t.buffer[this.stack[i] + 3]))
        return this.yieldBuf(r)
    }
    return (
      i < 0 &&
      this.yield(
        this.buffer.parent.nextChild(this.buffer.index + e, e, 0, 4, this.mode)
      )
    )
  }
  nextSibling() {
    return this.sibling(1)
  }
  prevSibling() {
    return this.sibling(-1)
  }
  atLastNode(i) {
    let r,
      n,
      t = this['buffer']
    if (t) {
      if (0 < i) {
        if (this.index < t.buffer.buffer.length) return !1
      } else
        for (let e = 0; e < this.index; e++)
          if (t.buffer.buffer[e + 3] < this.index) return !1
      ;({ index: r, parent: n } = t)
    } else ({ index: r, _parent: n } = this._tree)
    for (; n; { index: r, _parent: n } = n)
      if (-1 < r)
        for (
          let e = r + i, t = i < 0 ? -1 : n._tree.children.length;
          e != t;
          e += i
        ) {
          var o = n._tree.children[e]
          if (
            this.mode & IterMode.IncludeAnonymous ||
            o instanceof TreeBuffer ||
            !o.type.isAnonymous ||
            hasChild(o)
          )
            return !1
        }
    return !0
  }
  move(e, t) {
    if (t && this.enterChild(e, 0, 4)) return !0
    for (;;) {
      if (this.sibling(e)) return !0
      if (this.atLastNode(e) || !this.parent()) return !1
    }
  }
  next(e = !0) {
    return this.move(1, e)
  }
  prev(e = !0) {
    return this.move(-1, e)
  }
  moveTo(e, t = 0) {
    for (
      ;
      (this.from == this.to ||
        (t < 1 ? this.from >= e : this.from > e) ||
        (-1 < t ? this.to <= e : this.to < e)) &&
      this.parent();

    );
    for (; this.enterChild(1, e, t); );
    return this
  }
  get node() {
    if (!this.buffer) return this._tree
    let r = this.bufferNode,
      n = null,
      o = 0
    if (r && r.context == this.buffer)
      e: for (let t = this.index, i = this.stack.length; 0 <= i; ) {
        for (let e = r; e; e = e._parent)
          if (e.index == t) {
            if (t == this.index) return e
            ;(n = e), (o = i + 1)
            break e
          }
        t = this.stack[--i]
      }
    for (let e = o; e < this.stack.length; e++)
      n = new BufferNode(this.buffer, n, this.stack[e])
    return (this.bufferNode = new BufferNode(this.buffer, n, this.index))
  }
  get tree() {
    return this.buffer ? null : this._tree._tree
  }
  iterate(i, r) {
    for (let t = 0; ; ) {
      let e = !1
      if (this.type.isAnonymous || !1 !== i(this)) {
        if (this.firstChild()) {
          t++
          continue
        }
        this.type.isAnonymous || (e = !0)
      }
      for (
        ;
        e && r && r(this), (e = this.type.isAnonymous), !this.nextSibling();

      ) {
        if (!t) return
        this.parent(), t--, (e = !0)
      }
    }
  }
  matchContext(i) {
    if (!this.buffer) return matchNodeContext(this.node, i)
    var r = this.buffer['buffer'],
      n = r.set['types']
    for (let e = i.length - 1, t = this.stack.length - 1; 0 <= e; t--) {
      if (t < 0) return matchNodeContext(this.node, i, e)
      var o = n[r.buffer[this.stack[t]]]
      if (!o.isAnonymous) {
        if (i[e] && i[e] != o.name) return !1
        e--
      }
    }
    return !0
  }
}
function hasChild(e) {
  return e.children.some(
    (e) => e instanceof TreeBuffer || !e.type.isAnonymous || hasChild(e)
  )
}
function buildTree(e) {
  let {
      buffer: t,
      nodeSet: w,
      maxBufferLength: b = DefaultBufferLength,
      reused: S = [],
      minRepeatType: k = w.types.length,
    } = e,
    x = Array.isArray(t) ? new FlatBufferCursor(t, t.length) : t,
    C = w.types,
    A = 0,
    T = 0
  function M(i, n, e, t, r) {
    for (var o, a, { id: s, start: l, end: h, size: c } = x, d = T; c < 0; ) {
      if ((x.next(), -1 == c)) return (o = S[s]), e.push(o), void t.push(l - i)
      if (-3 == c) return void (A = s)
      if (-4 == c) return void (T = s)
      throw new RangeError('Unrecognized record size: ' + c)
    }
    let u = C[s],
      f,
      p,
      g = l - i
    if (
      h - l <= b &&
      (p = (function (e, t) {
        let i = x.fork(),
          r = 0,
          n = 0,
          o = 0,
          s = i.end - b,
          a = { size: 0, start: 0, skip: 0 }
        e: for (var l = i.pos - e; i.pos > l; ) {
          var h = i.size
          if (i.id == t && 0 <= h)
            (a.size = r),
              (a.start = n),
              (a.skip = o),
              (o += 4),
              (r += 4),
              i.next()
          else {
            var c = i.pos - h
            if (h < 0 || c < l || i.start < s) break
            let e = i.id >= k ? 4 : 0
            var d = i.start
            for (i.next(); i.pos > c; ) {
              if (i.size < 0) {
                if (-3 != i.size) break e
                e += 4
              } else i.id >= k && (e += 4)
              i.next()
            }
            ;(n = d), (r += h), (o += e)
          }
        }
        ;(t < 0 || r == e) && ((a.size = r), (a.start = n), (a.skip = o))
        return 4 < a.size ? a : void 0
      })(x.pos - n, r))
    ) {
      var m = new Uint16Array(p.size - p.skip)
      let e = x.pos - p.size,
        t = m.length
      for (; x.pos > e; )
        t = (function t(i, r, n) {
          let { id: o, start: s, end: a, size: l } = x
          x.next()
          if (0 <= l && o < k) {
            let e = n
            if (4 < l) {
              let e = x.pos - (l - 4)
              for (; x.pos > e; ) n = t(i, r, n)
            }
            ;(r[--n] = e), (r[--n] = a - i), (r[--n] = s - i), (r[--n] = o)
          } else -3 == l ? (A = o) : -4 == l && (T = o)
          return n
        })(p.start, m, t)
      ;(f = new TreeBuffer(m, h - p.start, w)), (g = p.start - i)
    } else {
      var v = x.pos - c
      x.next()
      let e = [],
        t = []
      var y = s >= k ? s : -1
      let i = 0,
        r = h
      for (; x.pos > v; )
        0 <= y && x.id == y && 0 <= x.size
          ? (x.end <= r - b &&
              (D(e, t, l, i, x.end, r, y, d), (i = e.length), (r = x.end)),
            x.next())
          : M(l, v, e, t, y)
      0 <= y && 0 < i && i < e.length && D(e, t, l, i, l, r, y, d),
        e.reverse(),
        t.reverse(),
        (f =
          -1 < y && 0 < i
            ? ((n = (e, t, i) => {
                let r = 0,
                  n = e.length - 1,
                  o,
                  s
                if (0 <= n && (o = e[n]) instanceof Tree) {
                  if (!n && o.type == a && o.length == i) return o
                  ;(s = o.prop(NodeProp.lookAhead)) && (r = t[n] + o.length + s)
                }
                return E(a, e, t, i, r)
              }),
              balanceRange((a = u), e, t, 0, e.length, 0, h - l, n, n))
            : E(u, e, t, h - l, d - h))
    }
    e.push(f), t.push(g)
  }
  function D(e, t, i, r, n, o, s, a) {
    let l = [],
      h = []
    for (; e.length > r; ) l.push(e.pop()), h.push(t.pop() + i - n)
    e.push(E(w.types[s], l, h, o - n, a - o)), t.push(n - i)
  }
  function E(e, t, i, r, n = 0, o) {
    if (A) {
      let e = [NodeProp.contextHash, A]
      o = o ? [e].concat(o) : [e]
    }
    if (25 < n) {
      let e = [NodeProp.lookAhead, n]
      o = o ? [e].concat(o) : [e]
    }
    return new Tree(e, t, i, r, o)
  }
  let i = [],
    r = []
  for (; 0 < x.pos; ) M(e.start || 0, e.bufferStart || 0, i, r, -1)
  var n = null != (n = e.length) ? n : i.length ? r[0] + i[0].length : 0
  return new Tree(C[e.topID], i.reverse(), r.reverse(), n)
}
const nodeSizeCache = new WeakMap()
function nodeSize(e, t) {
  if (!e.isAnonymous || t instanceof TreeBuffer || t.type != e) return 1
  let i = nodeSizeCache.get(t)
  if (null == i) {
    i = 1
    for (var r of t.children) {
      if (r.type != e || !(r instanceof Tree)) {
        i = 1
        break
      }
      i += nodeSize(e, r)
    }
    nodeSizeCache.set(t, i)
  }
  return i
}
function balanceRange(d, t, e, i, r, u, n, o, f) {
  let s = 0
  for (let e = i; e < r; e++) s += nodeSize(d, t[e])
  let p = Math.ceil((1.5 * s) / 8),
    g = [],
    m = []
  return (
    (function n(o, s, e, a, l) {
      for (let r = e; r < a; ) {
        let e = r,
          t = s[r],
          i = nodeSize(d, o[r])
        for (r++; r < a; r++) {
          var h = nodeSize(d, o[r])
          if (i + h >= p) break
          i += h
        }
        if (r == e + 1) {
          if (i > p) {
            var c = o[e]
            n(c.children, c.positions, 0, c.children.length, s[e] + l)
            continue
          }
          g.push(o[e])
        } else
          (c = s[r - 1] + o[r - 1].length - t),
            g.push(balanceRange(d, o, s, e, r, t, c, null, f))
        m.push(t + l - u)
      }
    })(t, e, i, r, 0),
    (o || f)(g, m, n)
  )
}
class TreeFragment {
  constructor(e, t, i, r, n = !1, o = !1) {
    ;(this.from = e),
      (this.to = t),
      (this.tree = i),
      (this.offset = r),
      (this.open = (n ? 1 : 0) | (o ? 2 : 0))
  }
  get openStart() {
    return 0 < (1 & this.open)
  }
  get openEnd() {
    return 0 < (2 & this.open)
  }
  static addTree(e, t = [], i = !1) {
    let r = [new TreeFragment(0, e.length, e, 0, !1, i)]
    for (var n of t) n.to > e.length && r.push(n)
    return r
  }
  static applyChanges(n, e, o = 128) {
    if (!e.length) return n
    let s = [],
      a = 1,
      l = n.length ? n[0] : null
    for (let t = 0, i = 0, r = 0; ; t++) {
      var h,
        c,
        d = t < e.length ? e[t] : null,
        u = d ? d.fromA : 1e9
      if (u - i >= o)
        for (; l && l.from < u; ) {
          let e = l
          if (
            ((i >= e.from || u <= e.to || r) &&
              ((h = Math.max(e.from, i) - r),
              (c = Math.min(e.to, u) - r),
              (e =
                c <= h
                  ? null
                  : new TreeFragment(h, c, e.tree, e.offset + r, 0 < t, !!d))),
            e && s.push(e),
            l.to > u)
          )
            break
          l = a < n.length ? n[a++] : null
        }
      if (!d) break
      ;(i = d.toA), (r = d.toA - d.toB)
    }
    return s
  }
}
class Parser {
  startParse(e, t, i) {
    return (
      'string' == typeof e && (e = new StringInput(e)),
      (i = i
        ? i.length
          ? i.map((e) => new Range$1(e.from, e.to))
          : [new Range$1(0, 0)]
        : [new Range$1(0, e.length)]),
      this.createParse(e, t || [], i)
    )
  }
  parse(e, t, i) {
    let r = this.startParse(e, t, i)
    for (;;) {
      var n = r.advance()
      if (n) return n
    }
  }
}
class StringInput {
  constructor(e) {
    this.string = e
  }
  get length() {
    return this.string.length
  }
  chunk(e) {
    return this.string.slice(e)
  }
  get lineChunks() {
    return !1
  }
  read(e, t) {
    return this.string.slice(e, t)
  }
}
new NodeProp({ perNode: !0 })
class Stack {
  constructor(e, t, i, r, n, o, s, a, l, h = 0, c) {
    ;(this.p = e),
      (this.stack = t),
      (this.state = i),
      (this.reducePos = r),
      (this.pos = n),
      (this.score = o),
      (this.buffer = s),
      (this.bufferBase = a),
      (this.curContext = l),
      (this.lookAhead = h),
      (this.parent = c)
  }
  toString() {
    return (
      `[${this.stack.filter((e, t) => t % 3 == 0).concat(this.state)}]@` +
      this.pos +
      (this.score ? '!' + this.score : '')
    )
  }
  static start(e, t, i = 0) {
    var r = e.parser.context
    return new Stack(
      e,
      [],
      t,
      i,
      i,
      0,
      [],
      0,
      r ? new StackContext(r, r.start) : null,
      0,
      null
    )
  }
  get context() {
    return this.curContext ? this.curContext.context : null
  }
  pushState(e, t) {
    this.stack.push(this.state, t, this.bufferBase + this.buffer.length),
      (this.state = e)
  }
  reduce(e) {
    var t = e >> 19,
      i = 65535 & e
    let r = this.p['parser']
    var n = r.dynamicPrecedence(i)
    if ((n && (this.score += n), 0 == t))
      return (
        this.pushState(r.getGoto(this.state, i, !0), this.reducePos),
        i < r.minRepeatTerm &&
          this.storeNode(i, this.reducePos, this.reducePos, 4, !0),
        void this.reduceContext(i, this.reducePos)
      )
    var o,
      s = this.stack.length - 3 * (t - 1) - (262144 & e ? 6 : 0),
      n = this.stack[s - 2],
      t = this.stack[s - 1],
      t = this.bufferBase + this.buffer.length - t
    for (
      (i < r.minRepeatTerm || 131072 & e) &&
        ((o = r.stateFlag(this.state, 1) ? this.pos : this.reducePos),
        this.storeNode(i, n, o, 4 + t, !0)),
        262144 & e
          ? (this.state = this.stack[s])
          : ((o = this.stack[s - 3]), (this.state = r.getGoto(o, i, !0)));
      this.stack.length > s;

    )
      this.stack.pop()
    this.reduceContext(i, n)
  }
  storeNode(t, i, r, n = 4, e = !1) {
    if (
      0 == t &&
      (!this.stack.length ||
        this.stack[this.stack.length - 1] <
          this.buffer.length + this.bufferBase)
    ) {
      let e = this,
        t = this.buffer.length
      if (
        (0 == t &&
          e.parent &&
          ((t = e.bufferBase - e.parent.bufferBase), (e = e.parent)),
        0 < t && 0 == e.buffer[t - 4] && -1 < e.buffer[t - 1])
      ) {
        if (i == r) return
        if (e.buffer[t - 2] >= i) return void (e.buffer[t - 2] = r)
      }
    }
    if (e && this.pos != r) {
      let e = this.buffer.length
      if (0 < e && 0 != this.buffer[e - 4])
        for (; 0 < e && this.buffer[e - 2] > r; )
          (this.buffer[e] = this.buffer[e - 4]),
            (this.buffer[e + 1] = this.buffer[e - 3]),
            (this.buffer[e + 2] = this.buffer[e - 2]),
            (this.buffer[e + 3] = this.buffer[e - 1]),
            (e -= 4),
            4 < n && (n -= 4)
      ;(this.buffer[e] = t),
        (this.buffer[e + 1] = i),
        (this.buffer[e + 2] = r),
        (this.buffer[e + 3] = n)
    } else this.buffer.push(t, i, r, n)
  }
  shift(i, r, n) {
    var o = this.pos
    if (131072 & i) this.pushState(65535 & i, this.pos)
    else if (0 == (262144 & i)) {
      let e = i,
        t = this.p['parser']
      ;(n > this.pos || r <= t.maxNode) &&
        ((this.pos = n), t.stateFlag(e, 1) || (this.reducePos = n)),
        this.pushState(e, o),
        this.shiftContext(r, o),
        r <= t.maxNode && this.buffer.push(r, o, n, 4)
    } else
      (this.pos = n),
        this.shiftContext(r, o),
        r <= this.p.parser.maxNode && this.buffer.push(r, o, n, 4)
  }
  apply(e, t, i) {
    65536 & e ? this.reduce(e) : this.shift(e, t, i)
  }
  useNode(e, t) {
    let i = this.p.reused.length - 1
    ;(i < 0 || this.p.reused[i] != e) && (this.p.reused.push(e), i++)
    var r = this.pos
    ;(this.reducePos = this.pos = r + e.length),
      this.pushState(t, r),
      this.buffer.push(i, r, this.reducePos, -1),
      this.curContext &&
        this.updateContext(
          this.curContext.tracker.reuse(
            this.curContext.context,
            e,
            this,
            this.p.stream.reset(this.pos - e.length)
          )
        )
  }
  split() {
    let e = this,
      t = e.buffer.length
    for (; 0 < t && e.buffer[t - 2] > e.reducePos; ) t -= 4
    for (
      var i = e.buffer.slice(t), r = e.bufferBase + t;
      e && r == e.bufferBase;

    )
      e = e.parent
    return new Stack(
      this.p,
      this.stack.slice(),
      this.state,
      this.reducePos,
      this.pos,
      this.score,
      i,
      r,
      this.curContext,
      this.lookAhead,
      e
    )
  }
  recoverByDelete(e, t) {
    var i = e <= this.p.parser.maxNode
    i && this.storeNode(e, this.pos, t, 4),
      this.storeNode(0, this.pos, t, i ? 8 : 4),
      (this.pos = this.reducePos = t),
      (this.score -= 190)
  }
  canShift(t) {
    for (let e = new SimulatedStack(this); ; ) {
      var i =
        this.p.parser.stateSlot(e.state, 4) ||
        this.p.parser.hasAction(e.state, t)
      if (0 == (65536 & i)) return !0
      if (0 == i) return !1
      e.reduce(i)
    }
  }
  recoverByInsert(i) {
    if (300 <= this.stack.length) return []
    let n = this.p.parser.nextStates(this.state)
    if (8 < n.length || 120 <= this.stack.length) {
      let r = []
      for (let e = 0, t; e < n.length; e += 2)
        (t = n[e + 1]) != this.state &&
          this.p.parser.hasAction(t, i) &&
          r.push(n[e], t)
      if (this.stack.length < 120)
        for (let e = 0; r.length < 8 && e < n.length; e += 2) {
          let i = n[e + 1]
          r.some((e, t) => 1 & t && e == i) || r.push(n[e], i)
        }
      n = r
    }
    let r = []
    for (let t = 0; t < n.length && r.length < 4; t += 2) {
      var o = n[t + 1]
      if (o != this.state) {
        let e = this.split()
        e.pushState(o, this.pos),
          e.storeNode(0, e.pos, e.pos, 4, !0),
          e.shiftContext(n[t], this.pos),
          (e.score -= 200),
          r.push(e)
      }
    }
    return r
  }
  forceReduce() {
    var e = this.p.parser.stateSlot(this.state, 5)
    if (0 == (65536 & e)) return !1
    let t = this.p['parser']
    if (!t.validAction(this.state, e)) {
      var i = this.stack.length - 3 * (e >> 19)
      if (i < 0 || t.getGoto(this.stack[i], 65535 & e, !1) < 0) return !1
      this.storeNode(0, this.reducePos, this.reducePos, 4, !0),
        (this.score -= 100)
    }
    return (this.reducePos = this.pos), this.reduce(e), !0
  }
  forceAll() {
    for (; !this.p.parser.stateFlag(this.state, 2); )
      if (!this.forceReduce()) {
        this.storeNode(0, this.pos, this.pos, 4, !0)
        break
      }
    return this
  }
  get deadEnd() {
    if (3 != this.stack.length) return !1
    let e = this.p['parser']
    return (
      65535 == e.data[e.stateSlot(this.state, 1)] && !e.stateSlot(this.state, 4)
    )
  }
  restart() {
    ;(this.state = this.stack[0]), (this.stack.length = 0)
  }
  sameState(t) {
    if (this.state != t.state || this.stack.length != t.stack.length) return !1
    for (let e = 0; e < this.stack.length; e += 3)
      if (this.stack[e] != t.stack[e]) return !1
    return !0
  }
  get parser() {
    return this.p.parser
  }
  dialectEnabled(e) {
    return this.p.parser.dialect.flags[e]
  }
  shiftContext(e, t) {
    this.curContext &&
      this.updateContext(
        this.curContext.tracker.shift(
          this.curContext.context,
          e,
          this,
          this.p.stream.reset(t)
        )
      )
  }
  reduceContext(e, t) {
    this.curContext &&
      this.updateContext(
        this.curContext.tracker.reduce(
          this.curContext.context,
          e,
          this,
          this.p.stream.reset(t)
        )
      )
  }
  emitContext() {
    var e = this.buffer.length - 1
    ;(e < 0 || -3 != this.buffer[e]) &&
      this.buffer.push(this.curContext.hash, this.reducePos, this.reducePos, -3)
  }
  emitLookAhead() {
    var e = this.buffer.length - 1
    ;(e < 0 || -4 != this.buffer[e]) &&
      this.buffer.push(this.lookAhead, this.reducePos, this.reducePos, -4)
  }
  updateContext(e) {
    e != this.curContext.context &&
      ((e = new StackContext(this.curContext.tracker, e)).hash !=
        this.curContext.hash && this.emitContext(),
      (this.curContext = e))
  }
  setLookAhead(e) {
    e > this.lookAhead && (this.emitLookAhead(), (this.lookAhead = e))
  }
  close() {
    this.curContext && this.curContext.tracker.strict && this.emitContext(),
      0 < this.lookAhead && this.emitLookAhead()
  }
}
class StackContext {
  constructor(e, t) {
    ;(this.tracker = e),
      (this.context = t),
      (this.hash = e.strict ? e.hash(t) : 0)
  }
}
!(function (e) {
  ;(e[(e.Insert = 200)] = 'Insert'),
    (e[(e.Delete = 190)] = 'Delete'),
    (e[(e.Reduce = 100)] = 'Reduce'),
    (e[(e.MaxNext = 4)] = 'MaxNext'),
    (e[(e.MaxInsertStackDepth = 300)] = 'MaxInsertStackDepth'),
    (e[(e.DampenInsertStackDepth = 120)] = 'DampenInsertStackDepth')
})((Recover = Recover || {}))
class SimulatedStack {
  constructor(e) {
    ;(this.start = e),
      (this.state = e.state),
      (this.stack = e.stack),
      (this.base = this.stack.length)
  }
  reduce(e) {
    var t = 65535 & e,
      e = e >> 19,
      e =
        (0 == e
          ? (this.stack == this.start.stack &&
              (this.stack = this.stack.slice()),
            this.stack.push(this.state, 0, 0),
            (this.base += 3))
          : (this.base -= 3 * (e - 1)),
        this.start.p.parser.getGoto(this.stack[this.base - 3], t, !0))
    this.state = e
  }
}
class StackBufferCursor {
  constructor(e, t, i) {
    ;(this.stack = e),
      (this.pos = t),
      (this.index = i),
      (this.buffer = e.buffer),
      0 == this.index && this.maybeNext()
  }
  static create(e, t = e.bufferBase + e.buffer.length) {
    return new StackBufferCursor(e, t, t - e.bufferBase)
  }
  maybeNext() {
    var e = this.stack.parent
    null != e &&
      ((this.index = this.stack.bufferBase - e.bufferBase),
      (this.stack = e),
      (this.buffer = e.buffer))
  }
  get id() {
    return this.buffer[this.index - 4]
  }
  get start() {
    return this.buffer[this.index - 3]
  }
  get end() {
    return this.buffer[this.index - 2]
  }
  get size() {
    return this.buffer[this.index - 1]
  }
  next() {
    ;(this.index -= 4), (this.pos -= 4), 0 == this.index && this.maybeNext()
  }
  fork() {
    return new StackBufferCursor(this.stack, this.pos, this.index)
  }
}
class CachedToken {
  constructor() {
    ;(this.start = -1),
      (this.value = -1),
      (this.end = -1),
      (this.extended = -1),
      (this.lookAhead = 0),
      (this.mask = 0),
      (this.context = 0)
  }
}
const nullToken = new CachedToken()
class InputStream {
  constructor(e, t) {
    ;(this.input = e),
      (this.ranges = t),
      (this.chunk = ''),
      (this.chunkOff = 0),
      (this.chunk2 = ''),
      (this.chunk2Pos = 0),
      (this.next = -1),
      (this.token = nullToken),
      (this.rangeIndex = 0),
      (this.pos = this.chunkPos = t[0].from),
      (this.range = t[0]),
      (this.end = t[t.length - 1].to),
      this.readNext()
  }
  resolveOffset(e, t) {
    let i = this.range,
      r = this.rangeIndex,
      n = this.pos + e
    for (; n < i.from; ) {
      if (!r) return null
      var o = this.ranges[--r]
      ;(n -= i.from - o.to), (i = o)
    }
    for (; t < 0 ? n > i.to : n >= i.to; ) {
      if (r == this.ranges.length - 1) return null
      var s = this.ranges[++r]
      ;(n += s.from - i.to), (i = s)
    }
    return n
  }
  peek(e) {
    let t = this.chunkOff + e,
      i,
      r
    if (0 <= t && t < this.chunk.length)
      (i = this.pos + e), (r = this.chunk.charCodeAt(t))
    else {
      e = this.resolveOffset(e, 1)
      if (null == e) return -1
      if ((i = e) >= this.chunk2Pos && i < this.chunk2Pos + this.chunk2.length)
        r = this.chunk2.charCodeAt(i - this.chunk2Pos)
      else {
        let e = this.rangeIndex,
          t = this.range
        for (; t.to <= i; ) t = this.ranges[++e]
        ;(this.chunk2 = this.input.chunk((this.chunk2Pos = i))),
          i + this.chunk2.length > t.to &&
            (this.chunk2 = this.chunk2.slice(0, t.to - i)),
          (r = this.chunk2.charCodeAt(0))
      }
    }
    return i >= this.token.lookAhead && (this.token.lookAhead = i + 1), r
  }
  acceptToken(e, t = 0) {
    t = t ? this.resolveOffset(t, -1) : this.pos
    if (null == t || t < this.token.start)
      throw new RangeError('Token end out of bounds')
    ;(this.token.value = e), (this.token.end = t)
  }
  getChunk() {
    if (
      this.pos >= this.chunk2Pos &&
      this.pos < this.chunk2Pos + this.chunk2.length
    ) {
      var { chunk: t, chunkPos: e } = this
      ;(this.chunk = this.chunk2),
        (this.chunkPos = this.chunk2Pos),
        (this.chunk2 = t),
        (this.chunk2Pos = e),
        (this.chunkOff = this.pos - this.chunkPos)
    } else {
      ;(this.chunk2 = this.chunk), (this.chunk2Pos = this.chunkPos)
      let e = this.input.chunk(this.pos)
      t = this.pos + e.length
      ;(this.chunk =
        t > this.range.to ? e.slice(0, this.range.to - this.pos) : e),
        (this.chunkPos = this.pos),
        (this.chunkOff = 0)
    }
  }
  readNext() {
    return this.chunkOff >= this.chunk.length &&
      (this.getChunk(), this.chunkOff == this.chunk.length)
      ? (this.next = -1)
      : (this.next = this.chunk.charCodeAt(this.chunkOff))
  }
  advance(e = 1) {
    for (this.chunkOff += e; this.pos + e >= this.range.to; ) {
      if (this.rangeIndex == this.ranges.length - 1) return this.setDone()
      ;(e -= this.range.to - this.pos),
        (this.range = this.ranges[++this.rangeIndex]),
        (this.pos = this.range.from)
    }
    return (
      (this.pos += e),
      this.pos >= this.token.lookAhead && (this.token.lookAhead = this.pos + 1),
      this.readNext()
    )
  }
  setDone() {
    return (
      (this.pos = this.chunkPos = this.end),
      (this.range = this.ranges[(this.rangeIndex = this.ranges.length - 1)]),
      (this.chunk = ''),
      (this.next = -1)
    )
  }
  reset(e, t) {
    if (
      (t
        ? (((this.token = t).start = e),
          (t.lookAhead = e + 1),
          (t.value = t.extended = -1))
        : (this.token = nullToken),
      this.pos != e)
    ) {
      if ((this.pos = e) == this.end) return this.setDone(), this
      for (; e < this.range.from; ) this.range = this.ranges[--this.rangeIndex]
      for (; e >= this.range.to; ) this.range = this.ranges[++this.rangeIndex]
      e >= this.chunkPos && e < this.chunkPos + this.chunk.length
        ? (this.chunkOff = e - this.chunkPos)
        : ((this.chunk = ''), (this.chunkOff = 0)),
        this.readNext()
    }
    return this
  }
  read(e, t) {
    if (e >= this.chunkPos && t <= this.chunkPos + this.chunk.length)
      return this.chunk.slice(e - this.chunkPos, t - this.chunkPos)
    if (e >= this.chunk2Pos && t <= this.chunk2Pos + this.chunk2.length)
      return this.chunk2.slice(e - this.chunk2Pos, t - this.chunk2Pos)
    if (e >= this.range.from && t <= this.range.to) return this.input.read(e, t)
    let i = ''
    for (var r of this.ranges) {
      if (r.from >= t) break
      r.to > e && (i += this.input.read(Math.max(r.from, e), Math.min(r.to, t)))
    }
    return i
  }
}
class TokenGroup {
  constructor(e, t) {
    ;(this.data = e), (this.id = t)
  }
  token(e, t) {
    readToken(this.data, e, t, this.id)
  }
}
function readToken(r, n, e, t) {
  let o = 0,
    i = 1 << t,
    s = e.p['parser'],
    a = s['dialect']
  e: for (; 0 != (i & r[o]); ) {
    var l = r[o + 1]
    for (let e = o + 3; e < l; e += 2)
      if (0 < (r[e + 1] & i)) {
        var h = r[e]
        if (
          a.allows(h) &&
          (-1 == n.token.value ||
            n.token.value == h ||
            s.overrides(h, n.token.value))
        ) {
          n.acceptToken(h)
          break
        }
      }
    for (let e = n.next, t = 0, i = r[o + 2]; t < i; ) {
      var c = (t + i) >> 1,
        d = l + c + (c << 1),
        u = r[d],
        f = r[d + 1]
      if (e < u) i = c
      else {
        if (!(f <= e)) {
          ;(o = r[d + 2]), n.advance()
          continue e
        }
        t = 1 + c
      }
    }
    break
  }
}
function decodeArray(o, t = Uint16Array) {
  if ('string' != typeof o) return o
  let i = null
  for (let n = 0, e = 0; n < o.length; ) {
    let r = 0
    for (;;) {
      let e = o.charCodeAt(n++),
        t = !1
      if (126 == e) {
        r = 65535
        break
      }
      92 <= e && e--, 34 <= e && e--
      let i = e - 32
      if ((46 <= i && ((i -= 46), (t = !0)), (r += i), t)) break
      r *= 46
    }
    i ? (i[e++] = r) : (i = new t(r))
  }
  return i
}
TokenGroup.prototype.contextual =
  TokenGroup.prototype.fallback =
  TokenGroup.prototype.extend =
    !1
const verbose =
  'undefined' != typeof process &&
  process.env &&
  /\bparse\b/.test(process.env.LOG)
let stackIDs = null
function cutAt(e, t, i) {
  let r = e.cursor(IterMode.IncludeAnonymous)
  for (r.moveTo(t); ; )
    if (!(i < 0 ? r.childBefore(t) : r.childAfter(t)))
      for (;;) {
        if ((i < 0 ? r.to < t : r.from > t) && !r.type.isError)
          return i < 0
            ? Math.max(0, Math.min(r.to - 1, t - 25))
            : Math.min(e.length, Math.max(r.from + 1, t + 25))
        if (i < 0 ? r.prevSibling() : r.nextSibling()) break
        if (!r.parent()) return i < 0 ? 0 : e.length
      }
}
!(function (e) {
  e[(e.Margin = 25)] = 'Margin'
})((Safety = Safety || {}))
class FragmentCursor {
  constructor(e, t) {
    ;(this.fragments = e),
      (this.nodeSet = t),
      (this.i = 0),
      (this.fragment = null),
      (this.safeFrom = -1),
      (this.safeTo = -1),
      (this.trees = []),
      (this.start = []),
      (this.index = []),
      this.nextFragment()
  }
  nextFragment() {
    var e = (this.fragment =
      this.i == this.fragments.length ? null : this.fragments[this.i++])
    if (e) {
      for (
        this.safeFrom = e.openStart
          ? cutAt(e.tree, e.from + e.offset, 1) - e.offset
          : e.from,
          this.safeTo = e.openEnd
            ? cutAt(e.tree, e.to + e.offset, -1) - e.offset
            : e.to;
        this.trees.length;

      )
        this.trees.pop(), this.start.pop(), this.index.pop()
      this.trees.push(e.tree),
        this.start.push(-e.offset),
        this.index.push(0),
        (this.nextStart = this.safeFrom)
    } else this.nextStart = 1e9
  }
  nodeAt(t) {
    if (t < this.nextStart) return null
    for (; this.fragment && this.safeTo <= t; ) this.nextFragment()
    if (!this.fragment) return null
    for (;;) {
      var i = this.trees.length - 1
      if (i < 0) return this.nextFragment(), null
      var r = this.trees[i],
        n = this.index[i]
      if (n == r.children.length)
        this.trees.pop(), this.start.pop(), this.index.pop()
      else {
        let e = r.children[n]
        r = this.start[i] + r.positions[n]
        if (t < r) return (this.nextStart = r), null
        if (e instanceof Tree) {
          if (r == t) {
            if (r < this.safeFrom) return null
            n = r + e.length
            if (n <= this.safeTo) {
              var o = e.prop(NodeProp.lookAhead)
              if (!o || n + o < this.fragment.to) return e
            }
          }
          this.index[i]++,
            r + e.length >= Math.max(this.safeFrom, t) &&
              (this.trees.push(e), this.start.push(r), this.index.push(0))
        } else this.index[i]++, (this.nextStart = r + e.length)
      }
    }
  }
}
class TokenCache {
  constructor(e, t) {
    ;(this.stream = t),
      (this.tokens = []),
      (this.mainToken = null),
      (this.actions = []),
      (this.tokens = e.tokenizers.map((e) => new CachedToken()))
  }
  getActions(r) {
    let n = 0,
      o = null,
      e = r.p['parser'],
      s = e['tokenizers']
    var a = e.stateSlot(r.state, 3),
      l = r.curContext ? r.curContext.hash : 0
    let h = 0
    for (let i = 0; i < s.length; i++)
      if (0 != ((1 << i) & a)) {
        let e = s[i],
          t = this.tokens[i]
        if (
          (!o || e.fallback) &&
          ((!e.contextual &&
            t.start == r.pos &&
            t.mask == a &&
            t.context == l) ||
            (this.updateCachedToken(t, e, r), (t.mask = a), (t.context = l)),
          t.lookAhead > t.end + 25 && (h = Math.max(t.lookAhead, h)),
          0 != t.value)
        ) {
          var c = n
          if (
            (-1 < t.extended && (n = this.addActions(r, t.extended, t.end, n)),
            (n = this.addActions(r, t.value, t.end, n)),
            !e.extend && ((o = t), n > c))
          )
            break
        }
      }
    for (; this.actions.length > n; ) this.actions.pop()
    return (
      h && r.setLookAhead(h),
      o ||
        r.pos != this.stream.end ||
        (((o = new CachedToken()).value = r.p.parser.eofTerm),
        (o.start = o.end = r.pos),
        (n = this.addActions(r, o.value, o.end, n))),
      (this.mainToken = o),
      this.actions
    )
  }
  getMainToken(e) {
    if (this.mainToken) return this.mainToken
    let t = new CachedToken(),
      { pos: i, p: r } = e
    return (
      (t.start = i),
      (t.end = Math.min(i + 1, r.stream.end)),
      (t.value = i == r.stream.end ? r.parser.eofTerm : 0),
      t
    )
  }
  updateCachedToken(i, e, r) {
    if ((e.token(this.stream.reset(r.pos, i), r), -1 < i.value)) {
      let t = r.p['parser']
      for (let e = 0; e < t.specialized.length; e++)
        if (t.specialized[e] == i.value) {
          var n = t.specializers[e](this.stream.read(i.start, i.end), r)
          if (0 <= n && r.p.parser.dialect.allows(n >> 1)) {
            0 == (1 & n) ? (i.value = n >> 1) : (i.extended = n >> 1)
            break
          }
        }
    } else (i.value = 0), (i.end = Math.min(r.p.stream.end, r.pos + 1))
  }
  putAction(t, e, i, r) {
    for (let e = 0; e < r; e += 3) if (this.actions[e] == t) return r
    return (
      (this.actions[r++] = t),
      (this.actions[r++] = e),
      (this.actions[r++] = i),
      r
    )
  }
  addActions(e, i, r, n) {
    let o = e['state'],
      s = e.p['parser'],
      a = s['data']
    for (let t = 0; t < 2; t++)
      for (let e = s.stateSlot(o, t ? 2 : 1); ; e += 3) {
        if (65535 == a[e]) {
          if (1 != a[e + 1]) {
            0 == n &&
              2 == a[e + 1] &&
              (n = this.putAction(pair(a, e + 2), i, r, n))
            break
          }
          e = pair(a, e + 2)
        }
        a[e] == i && (n = this.putAction(pair(a, e + 1), i, r, n))
      }
    return n
  }
}
!(function (e) {
  ;(e[(e.Distance = 5)] = 'Distance'),
    (e[(e.MaxRemainingPerStep = 3)] = 'MaxRemainingPerStep'),
    (e[(e.MinBufferLengthPrune = 500)] = 'MinBufferLengthPrune'),
    (e[(e.ForceReduceLimit = 10)] = 'ForceReduceLimit'),
    (e[(e.CutDepth = 15e3)] = 'CutDepth'),
    (e[(e.CutTo = 9e3)] = 'CutTo')
})((Rec = Rec || {}))
class Parse {
  constructor(e, t, i, r) {
    ;(this.parser = e),
      (this.input = t),
      (this.ranges = r),
      (this.recovering = 0),
      (this.nextStackID = 9812),
      (this.minStackPos = 0),
      (this.reused = []),
      (this.stoppedAt = null),
      (this.stream = new InputStream(t, r)),
      (this.tokens = new TokenCache(e, this.stream)),
      (this.topTerm = e.top[1])
    t = r[0].from
    ;(this.stacks = [Stack.start(this, e.top[0], t)]),
      (this.fragments =
        i.length && this.stream.end - t > 4 * e.bufferLength
          ? new FragmentCursor(i, e.nodeSet)
          : null)
  }
  get parsedPos() {
    return this.minStackPos
  }
  advance() {
    let t = this.stacks,
      i = this.minStackPos,
      r = (this.stacks = []),
      n,
      o
    for (let e = 0; e < t.length; e++)
      for (var s = t[e]; ; ) {
        if (((this.tokens.mainToken = null), s.pos > i)) r.push(s)
        else {
          if (this.advanceStack(s, r, t)) continue
          n || ((n = []), (o = [])), n.push(s)
          var a = this.tokens.getMainToken(s)
          o.push(a.value, a.end)
        }
        break
      }
    if (!r.length) {
      var e = n && findFinished(n)
      if (e) return this.stackToTree(e)
      if (this.parser.strict)
        throw (
          (verbose &&
            n &&
            console.log(
              'Stuck with token ' +
                (this.tokens.mainToken
                  ? this.parser.getName(this.tokens.mainToken.value)
                  : 'none')
            ),
          new SyntaxError('No parse at ' + i))
        )
      this.recovering || (this.recovering = 5)
    }
    if (this.recovering && n) {
      let e =
        null != this.stoppedAt && n[0].pos > this.stoppedAt
          ? n[0]
          : this.runRecovery(n, o, r)
      if (e) return this.stackToTree(e.forceAll())
    }
    if (this.recovering) {
      var l = 1 == this.recovering ? 1 : 3 * this.recovering
      if (r.length > l)
        for (r.sort((e, t) => t.score - e.score); r.length > l; ) r.pop()
      r.some((e) => e.reducePos > i) && this.recovering--
    } else if (1 < r.length)
      e: for (let i = 0; i < r.length - 1; i++) {
        let t = r[i]
        for (let e = i + 1; e < r.length; e++) {
          var h = r[e]
          if (
            t.sameState(h) ||
            (500 < t.buffer.length && 500 < h.buffer.length)
          ) {
            if (
              !(0 < (t.score - h.score || t.buffer.length - h.buffer.length))
            ) {
              r.splice(i--, 1)
              continue e
            }
            r.splice(e--, 1)
          }
        }
      }
    this.minStackPos = r[0].pos
    for (let e = 1; e < r.length; e++)
      r[e].pos < this.minStackPos && (this.minStackPos = r[e].pos)
    return null
  }
  stopAt(e) {
    if (null != this.stoppedAt && this.stoppedAt < e)
      throw new RangeError("Can't move stoppedAt forward")
    this.stoppedAt = e
  }
  advanceStack(i, r, n) {
    let o = i.pos,
      s = this['parser']
    var a = verbose ? this.stackID(i) + ' -> ' : ''
    if (null != this.stoppedAt && o > this.stoppedAt)
      return i.forceReduce() ? i : null
    if (this.fragments) {
      var t = i.curContext && i.curContext.tracker.strict,
        l = t ? i.curContext.hash : 0
      for (let e = this.fragments.nodeAt(o); e; ) {
        var h =
          this.parser.nodeSet.types[e.type.id] == e.type
            ? s.getGoto(i.state, e.type.id)
            : -1
        if (
          -1 < h &&
          e.length &&
          (!t || (e.prop(NodeProp.contextHash) || 0) == l)
        )
          return (
            i.useNode(e, h),
            verbose &&
              console.log(
                a + this.stackID(i) + ` (via reuse of ${s.getName(e.type.id)})`
              ),
            !0
          )
        if (
          !(e instanceof Tree) ||
          0 == e.children.length ||
          0 < e.positions[0]
        )
          break
        h = e.children[0]
        if (!(h instanceof Tree && 0 == e.positions[0])) break
        e = h
      }
    }
    var e = s.stateSlot(i.state, 4)
    if (0 < e)
      return (
        i.reduce(e),
        verbose &&
          console.log(
            a + this.stackID(i) + ` (via always-reduce ${s.getName(65535 & e)})`
          ),
        !0
      )
    if (15e3 <= i.stack.length)
      for (; 9e3 < i.stack.length && i.forceReduce(); );
    var c = this.tokens.getActions(i)
    for (let t = 0; t < c.length; ) {
      var d = c[t++],
        u = c[t++],
        f = c[t++],
        p = t == c.length || !n
      let e = p ? i : i.split()
      if (
        (e.apply(d, u, f),
        verbose &&
          console.log(
            a +
              this.stackID(e) +
              ` (via ${
                0 == (65536 & d) ? 'shift' : 'reduce of ' + s.getName(65535 & d)
              } for ${s.getName(u)} @ ${o}${e == i ? '' : ', split'})`
          ),
        p)
      )
        return !0
      ;(e.pos > o ? r : n).push(e)
    }
    return !1
  }
  advanceFully(e, t) {
    for (var i = e.pos; ; ) {
      if (!this.advanceStack(e, null, null)) return !1
      if (e.pos > i) return pushStackDedup(e, t), !0
    }
  }
  runRecovery(s, a, l) {
    let h = null,
      c = !1
    for (let o = 0; o < s.length; o++) {
      let e = s[o],
        t = a[o << 1],
        i = a[1 + (o << 1)]
      var d,
        u = verbose ? this.stackID(e) + ' -> ' : ''
      if (e.deadEnd) {
        if (c) continue
        if (
          ((c = !0),
          e.restart(),
          verbose && console.log(u + this.stackID(e) + ' (restarted)'),
          this.advanceFully(e, l))
        )
          continue
      }
      let r = e.split(),
        n = u
      for (let e = 0; r.forceReduce() && e < 10; e++) {
        if (
          (verbose && console.log(n + this.stackID(r) + ' (via force-reduce)'),
          this.advanceFully(r, l))
        )
          break
        verbose && (n = this.stackID(r) + ' -> ')
      }
      for (d of e.recoverByInsert(t))
        verbose && console.log(u + this.stackID(d) + ' (via recover-insert)'),
          this.advanceFully(d, l)
      this.stream.end > e.pos
        ? (i == e.pos && (i++, (t = 0)),
          e.recoverByDelete(t, i),
          verbose &&
            console.log(
              u +
                this.stackID(e) +
                ` (via recover-delete ${this.parser.getName(t)})`
            ),
          pushStackDedup(e, l))
        : (!h || h.score < e.score) && (h = e)
    }
    return h
  }
  stackToTree(e) {
    return (
      e.close(),
      Tree.build({
        buffer: StackBufferCursor.create(e),
        nodeSet: this.parser.nodeSet,
        topID: this.topTerm,
        maxBufferLength: this.parser.bufferLength,
        reused: this.reused,
        start: this.ranges[0].from,
        length: e.pos - this.ranges[0].from,
        minRepeatType: this.parser.minRepeatTerm,
      })
    )
  }
  stackID(e) {
    let t = (stackIDs = stackIDs || new WeakMap()).get(e)
    return (
      t || stackIDs.set(e, (t = String.fromCodePoint(this.nextStackID++))),
      t + e
    )
  }
}
function pushStackDedup(i, r) {
  for (let t = 0; t < r.length; t++) {
    let e = r[t]
    if (e.pos == i.pos && e.sameState(i))
      return void (r[t].score < i.score && (r[t] = i))
  }
  r.push(i)
}
class Dialect {
  constructor(e, t, i) {
    ;(this.source = e), (this.flags = t), (this.disabled = i)
  }
  allows(e) {
    return !this.disabled || 0 == this.disabled[e]
  }
}
class LRParser extends Parser {
  constructor(i) {
    if ((super(), (this.wrappers = []), 14 != i.version))
      throw new RangeError(
        `Parser version (${i.version}) doesn't match runtime version (14)`
      )
    let t = i.nodeNames.split(' ')
    this.minRepeatTerm = t.length
    for (let e = 0; e < i.repeatNodeCount; e++) t.push('')
    let r = Object.keys(i.topRules).map((e) => i.topRules[e][1]),
      n = []
    for (let e = 0; e < t.length; e++) n.push([])
    function o(e, t, i) {
      n[e].push([t, t.deserialize(String(i))])
    }
    if (i.nodeProps)
      for (var s of i.nodeProps) {
        let i = s[0]
        'string' == typeof i && (i = NodeProp[i])
        for (let t = 1; t < s.length; ) {
          var a = s[t++]
          if (0 <= a) o(a, i, s[t++])
          else {
            var l = s[t + -a]
            for (let e = -a; 0 < e; e--) o(s[t++], i, l)
            t++
          }
        }
      }
    ;(this.nodeSet = new NodeSet(
      t.map((e, t) =>
        NodeType.define({
          name: t >= this.minRepeatTerm ? void 0 : e,
          id: t,
          props: n[t],
          top: -1 < r.indexOf(t),
          error: 0 == t,
          skipped: i.skippedNodes && -1 < i.skippedNodes.indexOf(t),
        })
      )
    )),
      i.propSources && (this.nodeSet = this.nodeSet.extend(...i.propSources)),
      (this.strict = !1),
      (this.bufferLength = DefaultBufferLength)
    let h = decodeArray(i.tokenData)
    if (
      ((this.context = i.context),
      (this.specialized = new Uint16Array(
        i.specialized ? i.specialized.length : 0
      )),
      (this.specializers = []),
      i.specialized)
    )
      for (let e = 0; e < i.specialized.length; e++)
        (this.specialized[e] = i.specialized[e].term),
          (this.specializers[e] = i.specialized[e].get)
    ;(this.states = decodeArray(i.states, Uint32Array)),
      (this.data = decodeArray(i.stateData)),
      (this.goto = decodeArray(i.goto)),
      (this.maxTerm = i.maxTerm),
      (this.tokenizers = i.tokenizers.map((e) =>
        'number' == typeof e ? new TokenGroup(h, e) : e
      )),
      (this.topRules = i.topRules),
      (this.dialects = i.dialects || {}),
      (this.dynamicPrecedences = i.dynamicPrecedences || null),
      (this.tokenPrecTable = i.tokenPrec),
      (this.termNames = i.termNames || null),
      (this.maxNode = this.nodeSet.types.length - 1),
      (this.dialect = this.parseDialect()),
      (this.top = this.topRules[Object.keys(this.topRules)[0]])
  }
  createParse(e, t, i) {
    let r = new Parse(this, e, t, i)
    for (var n of this.wrappers) r = n(r, e, t, i)
    return r
  }
  getGoto(t, i, r = !1) {
    var n = this.goto
    if (i >= n[0]) return -1
    for (let e = n[i + 1]; ; ) {
      var o = n[e++],
        s = 1 & o,
        a = n[e++]
      if (s && r) return a
      for (var l = e + (o >> 1); e < l; e++) if (n[e] == t) return a
      if (s) return -1
    }
  }
  hasAction(r, n) {
    var o = this.data
    for (let i = 0; i < 2; i++)
      for (let e = this.stateSlot(r, i ? 2 : 1), t; ; e += 3) {
        if (65535 == (t = o[e])) {
          if (1 != o[e + 1]) {
            if (2 == o[e + 1]) return pair(o, e + 2)
            break
          }
          t = o[(e = pair(o, e + 2))]
        }
        if (t == n || 0 == t) return pair(o, e + 1)
      }
    return 0
  }
  stateSlot(e, t) {
    return this.states[6 * e + t]
  }
  stateFlag(e, t) {
    return 0 < (this.stateSlot(e, 0) & t)
  }
  validAction(t, i) {
    if (i == this.stateSlot(t, 4)) return !0
    for (let e = this.stateSlot(t, 1); ; e += 3) {
      if (65535 == this.data[e]) {
        if (1 != this.data[e + 1]) return !1
        e = pair(this.data, e + 2)
      }
      if (i == pair(this.data, e + 1)) return !0
    }
  }
  nextStates(t) {
    let r = []
    for (let e = this.stateSlot(t, 1); ; e += 3) {
      if (65535 == this.data[e]) {
        if (1 != this.data[e + 1]) break
        e = pair(this.data, e + 2)
      }
      if (0 == (1 & this.data[e + 2])) {
        let i = this.data[e + 1]
        r.some((e, t) => 1 & t && e == i) || r.push(this.data[e], i)
      }
    }
    return r
  }
  overrides(e, t) {
    t = findOffset(this.data, this.tokenPrecTable, t)
    return t < 0 || findOffset(this.data, this.tokenPrecTable, e) < t
  }
  configure(i) {
    let e = Object.assign(Object.create(LRParser.prototype), this)
    if ((i.props && (e.nodeSet = this.nodeSet.extend(...i.props)), i.top)) {
      var t = this.topRules[i.top]
      if (!t) throw new RangeError('Invalid top rule name ' + i.top)
      e.top = t
    }
    return (
      i.tokenizers &&
        (e.tokenizers = this.tokenizers.map((t) => {
          var e = i.tokenizers.find((e) => e.from == t)
          return e ? e.to : t
        })),
      i.contextTracker && (e.context = i.contextTracker),
      i.dialect && (e.dialect = this.parseDialect(i.dialect)),
      null != i.strict && (e.strict = i.strict),
      i.wrap && (e.wrappers = e.wrappers.concat(i.wrap)),
      null != i.bufferLength && (e.bufferLength = i.bufferLength),
      e
    )
  }
  hasWrappers() {
    return 0 < this.wrappers.length
  }
  getName(e) {
    return this.termNames
      ? this.termNames[e]
      : String((e <= this.maxNode && this.nodeSet.types[e].name) || e)
  }
  get eofTerm() {
    return this.maxNode + 1
  }
  get topNode() {
    return this.nodeSet.types[this.top[1]]
  }
  dynamicPrecedence(e) {
    var t = this.dynamicPrecedences
    return (null != t && t[e]) || 0
  }
  parseDialect(e) {
    let r = Object.keys(this.dialects),
      t = r.map(() => !1)
    if (e)
      for (var i of e.split(' ')) {
        i = r.indexOf(i)
        0 <= i && (t[i] = !0)
      }
    let n = null
    for (let i = 0; i < r.length; i++)
      if (!t[i])
        for (let e = this.dialects[r[i]], t; 65535 != (t = this.data[e++]); )
          (n = n || new Uint8Array(this.maxTerm + 1))[t] = 1
    return new Dialect(e, t, n)
  }
  static deserialize(e) {
    return new LRParser(e)
  }
}
function pair(e, t) {
  return e[t] | (e[t + 1] << 16)
}
function findOffset(i, r, n) {
  for (let e = r, t; 65535 != (t = i[e]); e++) if (t == n) return e - r
  return -1
}
function findFinished(e) {
  let t = null
  for (var i of e) {
    var r = i.p.stoppedAt
    ;(i.pos == i.p.stream.end || (null != r && i.pos > r)) &&
      i.p.parser.stateFlag(i.state, 2) &&
      (!t || t.score < i.score) &&
      (t = i)
  }
  return t
}
let nextTagID = 0
class Tag {
  constructor(e, t, i) {
    ;(this.set = e),
      (this.base = t),
      (this.modified = i),
      (this.id = nextTagID++)
  }
  static define(e) {
    if (null != e && e.base)
      throw new Error('Can not derive from a modified tag')
    let t = new Tag([], null, [])
    if ((t.set.push(t), e)) for (var i of e.set) t.set.push(i)
    return t
  }
  static defineModifier() {
    let t = new Modifier()
    return (e) =>
      -1 < e.modified.indexOf(t)
        ? e
        : Modifier.get(
            e.base || e,
            e.modified.concat(t).sort((e, t) => e.id - t.id)
          )
  }
}
let nextModifierID = 0
class Modifier {
  constructor() {
    ;(this.instances = []), (this.id = nextModifierID++)
  }
  static get(t, i) {
    if (!i.length) return t
    var e,
      r = i[0].instances.find((e) => e.base == t && sameArray$1(i, e.modified))
    if (r) return r
    let n = [],
      o = new Tag(n, t, i)
    for (e of i) e.instances.push(o)
    var s,
      a = permute(i)
    for (s of t.set) for (var l of a) n.push(Modifier.get(s, l))
    return o
  }
}
function sameArray$1(e, i) {
  return e.length == i.length && e.every((e, t) => e == i[t])
}
function permute(t) {
  let i = [t]
  for (let e = 0; e < t.length; e++)
    for (var r of permute(t.slice(0, e).concat(t.slice(e + 1)))) i.push(r)
  return i
}
function styleTags(e) {
  let o = Object.create(null)
  for (var t in e) {
    let n = e[t]
    Array.isArray(n) || (n = [n])
    for (var s of t.split(' '))
      if (s) {
        let t = [],
          i = 2,
          r = s
        for (let e = 0; ; ) {
          if ('...' == r && 0 < e && e + 3 == s.length) {
            i = 1
            break
          }
          var a = /^"(?:[^"\\]|\\.)*?"|[^\/!]+/.exec(r)
          if (!a) throw new RangeError('Invalid path: ' + s)
          if (
            (t.push(
              '*' == a[0] ? '' : '"' == a[0][0] ? JSON.parse(a[0]) : a[0]
            ),
            (e += a[0].length) == s.length)
          )
            break
          a = s[e++]
          if (e == s.length && '!' == a) {
            i = 0
            break
          }
          if ('/' != a) throw new RangeError('Invalid path: ' + s)
          r = s.slice(e)
        }
        var l = t.length - 1,
          h = t[l]
        if (!h) throw new RangeError('Invalid path: ' + s)
        let e = new Rule(n, i, 0 < l ? t.slice(0, l) : null)
        o[h] = e.sort(o[h])
      }
  }
  return ruleNodeProp.add(o)
}
const ruleNodeProp = new NodeProp()
class Rule {
  constructor(e, t, i, r) {
    ;(this.tags = e), (this.mode = t), (this.context = i), (this.next = r)
  }
  sort(e) {
    return !e || e.depth < this.depth
      ? ((this.next = e), this)
      : ((e.next = this.sort(e.next)), e)
  }
  get depth() {
    return this.context ? this.context.length : 0
  }
}
function tagHighlighter(e, t) {
  let n = Object.create(null)
  for (var i of e)
    if (Array.isArray(i.tag)) for (var r of i.tag) n[r.id] = i.class
    else n[i.tag.id] = i.class
  let { scope: o, all: s = null } = t || {}
  return {
    style: (e) => {
      let t = s
      for (var i of e)
        for (var r of i.set) {
          r = n[r.id]
          if (r) {
            t = t ? t + ' ' + r : r
            break
          }
        }
      return t
    },
    scope: o,
  }
}
function highlightTags(e, t) {
  let i = null
  for (var r of e) {
    r = r.style(t)
    r && (i = i ? i + ' ' + r : r)
  }
  return i
}
function highlightTree(e, t, i, r = 0, n = e.length) {
  let o = new HighlightBuilder(r, Array.isArray(t) ? t : [t], i)
  o.highlightRange(e.cursor(), r, n, '', o.highlighters), o.flush(n)
}
class HighlightBuilder {
  constructor(e, t, i) {
    ;(this.at = e), (this.highlighters = t), (this.span = i), (this.class = '')
  }
  startSpan(e, t) {
    t != this.class &&
      (this.flush(e), e > this.at && (this.at = e), (this.class = t))
  }
  flush(e) {
    e > this.at && this.class && this.span(this.at, e, this.class)
  }
  highlightRange(o, s, a, l, h) {
    let { type: i, from: c, to: d } = o
    if (!(a <= c || d <= s)) {
      i.isTop && (h = this.highlighters.filter((e) => !e.scope || e.scope(i)))
      let n = l,
        e = i.prop(ruleNodeProp),
        t = !1
      for (; e; ) {
        if (!e.context || o.matchContext(e.context)) {
          var r = highlightTags(h, e.tags)
          r &&
            (n && (n += ' '),
            (n += r),
            1 == e.mode ? (l += (l ? ' ' : '') + r) : 0 == e.mode && (t = !0))
          break
        }
        e = e.next
      }
      if ((this.startSpan(o.from, n), !t)) {
        let r = o.tree && o.tree.prop(NodeProp.mounted)
        if (r && r.overlay) {
          let i = o.node.enter(r.overlay[0].from + c, 1)
          var u = this.highlighters.filter(
              (e) => !e.scope || e.scope(r.tree.type)
            ),
            f = o.firstChild()
          for (let e = 0, t = c; ; e++) {
            var p = e < r.overlay.length ? r.overlay[e] : null,
              g = p ? p.from + c : d,
              m = Math.max(s, t),
              v = Math.min(a, g)
            if (m < v && f)
              for (
                ;
                o.from < v &&
                (this.highlightRange(o, m, v, l, h),
                this.startSpan(Math.min(a, o.to), n),
                !(o.to >= g) && o.nextSibling());

              );
            if (!p || a < g) break
            ;(t = p.to + c) > s &&
              (this.highlightRange(
                i.cursor(),
                Math.max(s, p.from + c),
                Math.min(a, t),
                l,
                u
              ),
              this.startSpan(t, n))
          }
          f && o.parent()
        } else if (o.firstChild()) {
          do {
            if (!(o.to <= s)) {
              if (o.from >= a) break
              this.highlightRange(o, s, a, l, h),
                this.startSpan(Math.min(a, o.to), n)
            }
          } while (o.nextSibling())
          o.parent()
        }
      }
    }
  }
}
const t = Tag.define,
  comment = t(),
  name = t(),
  typeName = t(name),
  propertyName = t(name),
  literal = t(),
  string = t(literal),
  number = t(literal),
  content = t(),
  heading = t(content),
  keyword = t(),
  operator = t(),
  punctuation = t(),
  bracket = t(punctuation),
  meta = t(),
  tags = {
    comment: comment,
    lineComment: t(comment),
    blockComment: t(comment),
    docComment: t(comment),
    name: name,
    variableName: t(name),
    typeName: typeName,
    tagName: t(typeName),
    propertyName: propertyName,
    attributeName: t(propertyName),
    className: t(name),
    labelName: t(name),
    namespace: t(name),
    macroName: t(name),
    literal: literal,
    string: string,
    docString: t(string),
    character: t(string),
    attributeValue: t(string),
    number: number,
    integer: t(number),
    float: t(number),
    bool: t(literal),
    regexp: t(literal),
    escape: t(literal),
    color: t(literal),
    url: t(literal),
    keyword: keyword,
    self: t(keyword),
    null: t(keyword),
    atom: t(keyword),
    unit: t(keyword),
    modifier: t(keyword),
    operatorKeyword: t(keyword),
    controlKeyword: t(keyword),
    definitionKeyword: t(keyword),
    moduleKeyword: t(keyword),
    operator: operator,
    derefOperator: t(operator),
    arithmeticOperator: t(operator),
    logicOperator: t(operator),
    bitwiseOperator: t(operator),
    compareOperator: t(operator),
    updateOperator: t(operator),
    definitionOperator: t(operator),
    typeOperator: t(operator),
    controlOperator: t(operator),
    punctuation: punctuation,
    separator: t(punctuation),
    bracket: bracket,
    angleBracket: t(bracket),
    squareBracket: t(bracket),
    paren: t(bracket),
    brace: t(bracket),
    content: content,
    heading: heading,
    heading1: t(heading),
    heading2: t(heading),
    heading3: t(heading),
    heading4: t(heading),
    heading5: t(heading),
    heading6: t(heading),
    contentSeparator: t(content),
    list: t(content),
    quote: t(content),
    emphasis: t(content),
    strong: t(content),
    link: t(content),
    monospace: t(content),
    strikethrough: t(content),
    inserted: t(),
    deleted: t(),
    changed: t(),
    invalid: t(),
    meta: meta,
    documentMeta: t(meta),
    annotation: t(meta),
    processingInstruction: t(meta),
    definition: Tag.defineModifier(),
    constant: Tag.defineModifier(),
    function: Tag.defineModifier(),
    standard: Tag.defineModifier(),
    local: Tag.defineModifier(),
    special: Tag.defineModifier(),
  }
tagHighlighter([
  { tag: tags.link, class: 'tok-link' },
  { tag: tags.heading, class: 'tok-heading' },
  { tag: tags.emphasis, class: 'tok-emphasis' },
  { tag: tags.strong, class: 'tok-strong' },
  { tag: tags.keyword, class: 'tok-keyword' },
  { tag: tags.atom, class: 'tok-atom' },
  { tag: tags.bool, class: 'tok-bool' },
  { tag: tags.url, class: 'tok-url' },
  { tag: tags.labelName, class: 'tok-labelName' },
  { tag: tags.inserted, class: 'tok-inserted' },
  { tag: tags.deleted, class: 'tok-deleted' },
  { tag: tags.literal, class: 'tok-literal' },
  { tag: tags.string, class: 'tok-string' },
  { tag: tags.number, class: 'tok-number' },
  {
    tag: [tags.regexp, tags.escape, tags.special(tags.string)],
    class: 'tok-string2',
  },
  { tag: tags.variableName, class: 'tok-variableName' },
  { tag: tags.local(tags.variableName), class: 'tok-variableName tok-local' },
  {
    tag: tags.definition(tags.variableName),
    class: 'tok-variableName tok-definition',
  },
  { tag: tags.special(tags.variableName), class: 'tok-variableName2' },
  {
    tag: tags.definition(tags.propertyName),
    class: 'tok-propertyName tok-definition',
  },
  { tag: tags.typeName, class: 'tok-typeName' },
  { tag: tags.namespace, class: 'tok-namespace' },
  { tag: tags.className, class: 'tok-className' },
  { tag: tags.macroName, class: 'tok-macroName' },
  { tag: tags.propertyName, class: 'tok-propertyName' },
  { tag: tags.operator, class: 'tok-operator' },
  { tag: tags.comment, class: 'tok-comment' },
  { tag: tags.meta, class: 'tok-meta' },
  { tag: tags.invalid, class: 'tok-invalid' },
  { tag: tags.punctuation, class: 'tok-punctuation' },
])
class Text {
  constructor() {}
  lineAt(e) {
    if (e < 0 || e > this.length)
      throw new RangeError(
        `Invalid position ${e} in document of length ` + this.length
      )
    return this.lineInner(e, !1, 1, 0)
  }
  line(e) {
    if (e < 1 || e > this.lines)
      throw new RangeError(
        `Invalid line number ${e} in ${this.lines}-line document`
      )
    return this.lineInner(e, !0, 1, 0)
  }
  replace(e, t, i) {
    var r = []
    return (
      this.decompose(0, e, r, 2),
      i.length && i.decompose(0, i.length, r, 3),
      this.decompose(t, this.length, r, 1),
      TextNode.from(r, this.length - (t - e) + i.length)
    )
  }
  append(e) {
    return this.replace(this.length, this.length, e)
  }
  slice(e, t = this.length) {
    var i = []
    return this.decompose(e, t, i, 0), TextNode.from(i, t - e)
  }
  eq(e) {
    if (e == this) return !0
    if (e.length != this.length || e.lines != this.lines) return !1
    var i = this.scanIdentical(e, 1),
      r = this.length - this.scanIdentical(e, -1)
    let n = new RawTextCursor(this),
      o = new RawTextCursor(e)
    for (let e = i, t = i; ; ) {
      if (
        (n.next(e),
        o.next(e),
        (e = 0),
        n.lineBreak != o.lineBreak || n.done != o.done || n.value != o.value)
      )
        return !1
      if (((t += n.value.length), n.done || t >= r)) return !0
    }
  }
  iter(e = 1) {
    return new RawTextCursor(this, e)
  }
  iterRange(e, t = this.length) {
    return new PartialTextCursor(this, e, t)
  }
  iterLines(e, t) {
    let i
    return (
      (i =
        null == e
          ? this.iter()
          : (null == t && (t = this.lines + 1),
            (e = this.line(e).from),
            this.iterRange(
              e,
              Math.max(
                e,
                t == this.lines + 1
                  ? this.length
                  : t <= 1
                  ? 0
                  : this.line(t - 1).to
              )
            ))),
      new LineCursor(i)
    )
  }
  toString() {
    return this.sliceString(0)
  }
  toJSON() {
    var e = []
    return this.flatten(e), e
  }
  static of(e) {
    if (0 == e.length)
      throw new RangeError('A document must have at least one line')
    return 1 != e.length || e[0]
      ? e.length <= 32
        ? new TextLeaf(e)
        : TextNode.from(TextLeaf.split(e, []))
      : Text.empty
  }
}
class TextLeaf extends Text {
  constructor(e, t = textLength(e)) {
    super(), (this.text = e), (this.length = t)
  }
  get lines() {
    return this.text.length
  }
  get children() {
    return null
  }
  lineInner(t, i, r, n) {
    for (let e = 0; ; e++) {
      var o = this.text[e],
        s = n + o.length
      if (t <= (i ? r : s)) return new Line(n, s, r, o)
      ;(n = s + 1), r++
    }
  }
  decompose(i, r, n, e) {
    r =
      i <= 0 && r >= this.length
        ? this
        : new TextLeaf(
            sliceText(this.text, i, r),
            Math.min(r, this.length) - Math.max(0, i)
          )
    if (1 & e) {
      let e = n.pop(),
        t = appendText(r.text, e.text.slice(), 0, r.length)
      t.length <= 32
        ? n.push(new TextLeaf(t, e.length + r.length))
        : ((i = t.length >> 1),
          n.push(new TextLeaf(t.slice(0, i)), new TextLeaf(t.slice(i))))
    } else n.push(r)
  }
  replace(e, t, i) {
    if (!(i instanceof TextLeaf)) return super.replace(e, t, i)
    var r = appendText(
        this.text,
        appendText(i.text, sliceText(this.text, 0, e)),
        t
      ),
      i = this.length + i.length - (t - e)
    return r.length <= 32
      ? new TextLeaf(r, i)
      : TextNode.from(TextLeaf.split(r, []), i)
  }
  sliceString(n, o = this.length, s = '\n') {
    let a = ''
    for (let i = 0, r = 0; i <= o && r < this.text.length; r++) {
      let e = this.text[r],
        t = i + e.length
      i > n && r && (a += s),
        n < t && o > i && (a += e.slice(Math.max(0, n - i), o - i)),
        (i = t + 1)
    }
    return a
  }
  flatten(e) {
    for (var t of this.text) e.push(t)
  }
  scanIdentical() {
    return 0
  }
  static split(e, t) {
    let i = [],
      r = -1
    for (var n of e)
      i.push(n),
        (r += n.length + 1),
        32 == i.length && (t.push(new TextLeaf(i, r)), (i = []), (r = -1))
    return -1 < r && t.push(new TextLeaf(i, r)), t
  }
}
class TextNode extends Text {
  constructor(e, t) {
    super(), (this.children = e), (this.length = t), (this.lines = 0)
    for (var i of e) this.lines += i.lines
  }
  lineInner(n, o, s, a) {
    for (let r = 0; ; r++) {
      let e = this.children[r],
        t = a + e.length,
        i = s + e.lines - 1
      if (n <= (o ? i : t)) return e.lineInner(n, o, s, a)
      ;(a = t + 1), (s = 1 + i)
    }
  }
  decompose(n, o, s, a) {
    for (let i = 0, r = 0; r <= o && i < this.children.length; i++) {
      let e = this.children[i],
        t = r + e.length
      var l
      n <= t &&
        o >= r &&
        ((l = a & ((r <= n ? 1 : 0) | (o <= t ? 2 : 0))),
        r >= n && t <= o && !l ? s.push(e) : e.decompose(n - r, o - r, s, l)),
        (r = t + 1)
    }
  }
  replace(n, o, s) {
    if (s.lines < this.lines)
      for (let i = 0, r = 0; i < this.children.length; i++) {
        let e = this.children[i],
          t = r + e.length
        if (n >= r && o <= t) {
          var a = e.replace(n - r, o - r, s),
            l = this.lines - e.lines + a.lines
          if (a.lines < l >> 4 && a.lines > l >> 6) {
            let e = this.children.slice()
            return (e[i] = a), new TextNode(e, this.length - (o - n) + s.length)
          }
          return super.replace(r, t, a)
        }
        r = t + 1
      }
    return super.replace(n, o, s)
  }
  sliceString(n, o = this.length, s = '\n') {
    let a = ''
    for (let i = 0, r = 0; i < this.children.length && r <= o; i++) {
      let e = this.children[i],
        t = r + e.length
      r > n && i && (a += s),
        n < t && o > r && (a += e.sliceString(n - r, o - r, s)),
        (r = t + 1)
    }
    return a
  }
  flatten(e) {
    for (var t of this.children) t.flatten(e)
  }
  scanIdentical(i, r) {
    if (!(i instanceof TextNode)) return 0
    let n = 0,
      [o, s, a, l] =
        0 < r
          ? [0, 0, this.children.length, i.children.length]
          : [this.children.length - 1, i.children.length - 1, -1, -1]
    for (; ; o += r, s += r) {
      if (o == a || s == l) return n
      let e = this.children[o],
        t = i.children[s]
      if (e != t) return n + e.scanIdentical(t, r)
      n += e.length + 1
    }
  }
  static from(e, t = e.reduce((e, t) => e + t.length + 1, -1)) {
    let i = 0
    for (var r of e) i += r.lines
    if (i < 32) {
      var n,
        o = []
      for (n of e) n.flatten(o)
      return new TextLeaf(o, t)
    }
    let s = Math.max(32, i >> 5),
      a = s << 1,
      l = s >> 1,
      h = [],
      c = 0,
      d = -1,
      u = []
    function f() {
      0 != c &&
        (h.push(1 == u.length ? u[0] : TextNode.from(u, d)),
        (d = -1),
        (c = u.length = 0))
    }
    for (var p of e)
      !(function e(t) {
        let i
        if (t.lines > a && t instanceof TextNode) for (var r of t.children) e(r)
        else
          t.lines > l && (c > l || !c)
            ? (f(), h.push(t))
            : t instanceof TextLeaf &&
              c &&
              (i = u[u.length - 1]) instanceof TextLeaf &&
              t.lines + i.lines <= 32
            ? ((c += t.lines),
              (d += t.length + 1),
              (u[u.length - 1] = new TextLeaf(
                i.text.concat(t.text),
                i.length + 1 + t.length
              )))
            : (c + t.lines > s && f(),
              (c += t.lines),
              (d += t.length + 1),
              u.push(t))
      })(p)
    return f(), 1 == h.length ? h[0] : new TextNode(h, t)
  }
}
function textLength(e) {
  let t = -1
  for (var i of e) t += i.length + 1
  return t
}
function appendText(o, s, a = 0, l = 1e9) {
  for (let i = 0, r = 0, n = !0; r < o.length && i <= l; r++) {
    let e = o[r],
      t = i + e.length
    a <= t &&
      (l < t && (e = e.slice(0, l - i)),
      i < a && (e = e.slice(a - i)),
      n ? ((s[s.length - 1] += e), (n = !1)) : s.push(e)),
      (i = t + 1)
  }
  return s
}
function sliceText(e, t, i) {
  return appendText(e, [''], t, i)
}
Text.empty = new TextLeaf([''], 0)
class RawTextCursor {
  constructor(e, t = 1) {
    ;(this.dir = t),
      (this.done = !1),
      (this.lineBreak = !1),
      (this.value = ''),
      (this.nodes = [e]),
      (this.offsets = [
        0 < t ? 1 : (e instanceof TextLeaf ? e.text : e.children).length << 1,
      ])
  }
  nextInner(t, i) {
    for (this.done = this.lineBreak = !1; ; ) {
      var r = this.nodes.length - 1,
        n = this.nodes[r],
        e = this.offsets[r],
        o = e >> 1,
        s = (n instanceof TextLeaf ? n.text : n.children).length
      if (o == (0 < i ? s : 0)) {
        if (0 == r) return (this.done = !0), (this.value = ''), this
        0 < i && this.offsets[r - 1]++, this.nodes.pop(), this.offsets.pop()
      } else if ((1 & e) == (0 < i ? 0 : 1)) {
        if (((this.offsets[r] += i), 0 == t))
          return (this.lineBreak = !0), (this.value = '\n'), this
        t--
      } else if (n instanceof TextLeaf) {
        let e = n.text[o + (i < 0 ? -1 : 0)]
        if (((this.offsets[r] += i), e.length > Math.max(0, t)))
          return (
            (this.value =
              0 == t ? e : 0 < i ? e.slice(t) : e.slice(0, e.length - t)),
            this
          )
        t -= e.length
      } else {
        s = n.children[o + (i < 0 ? -1 : 0)]
        t > s.length
          ? ((t -= s.length), (this.offsets[r] += i))
          : (i < 0 && this.offsets[r]--,
            this.nodes.push(s),
            this.offsets.push(
              0 < i
                ? 1
                : (s instanceof TextLeaf ? s.text : s.children).length << 1
            ))
      }
    }
  }
  next(e = 0) {
    return (
      e < 0 && (this.nextInner(-e, -this.dir), (e = this.value.length)),
      this.nextInner(e, this.dir)
    )
  }
}
class PartialTextCursor {
  constructor(e, t, i) {
    ;(this.value = ''),
      (this.done = !1),
      (this.cursor = new RawTextCursor(e, i < t ? -1 : 1)),
      (this.pos = i < t ? e.length : 0),
      (this.from = Math.min(t, i)),
      (this.to = Math.max(t, i))
  }
  nextInner(e, t) {
    if (t < 0 ? this.pos <= this.from : this.pos >= this.to)
      return (this.value = ''), (this.done = !0), this
    e += Math.max(0, t < 0 ? this.pos - this.to : this.from - this.pos)
    let i = t < 0 ? this.pos - this.from : this.to - this.pos,
      r = (e > i && (e = i), (i -= e), this.cursor.next(e))['value']
    return (
      (this.pos += (r.length + e) * t),
      (this.value =
        r.length <= i ? r : t < 0 ? r.slice(r.length - i) : r.slice(0, i)),
      (this.done = !this.value),
      this
    )
  }
  next(e = 0) {
    return (
      e < 0
        ? (e = Math.max(e, this.from - this.pos))
        : 0 < e && (e = Math.min(e, this.to - this.pos)),
      this.nextInner(e, this.cursor.dir)
    )
  }
  get lineBreak() {
    return this.cursor.lineBreak && '' != this.value
  }
}
class LineCursor {
  constructor(e) {
    ;(this.inner = e),
      (this.afterBreak = !0),
      (this.value = ''),
      (this.done = !1)
  }
  next(e = 0) {
    var { done: e, lineBreak: t, value: i } = this.inner.next(e)
    return (
      e
        ? ((this.done = !0), (this.value = ''))
        : t
        ? this.afterBreak
          ? (this.value = '')
          : ((this.afterBreak = !0), this.next())
        : ((this.value = i), (this.afterBreak = !1)),
      this
    )
  }
  get lineBreak() {
    return !1
  }
}
'undefined' != typeof Symbol &&
  ((Text.prototype[Symbol.iterator] = function () {
    return this.iter()
  }),
  (RawTextCursor.prototype[Symbol.iterator] =
    PartialTextCursor.prototype[Symbol.iterator] =
    LineCursor.prototype[Symbol.iterator] =
      function () {
        return this
      }))
class Line {
  constructor(e, t, i, r) {
    ;(this.from = e), (this.to = t), (this.number = i), (this.text = r)
  }
  get length() {
    return this.to - this.from
  }
}
let extend =
  'lc,34,7n,7,7b,19,,,,2,,2,,,20,b,1c,l,g,,2t,7,2,6,2,2,,4,z,,u,r,2j,b,1m,9,9,,o,4,,9,,3,,5,17,3,3b,f,,w,1j,,,,4,8,4,,3,7,a,2,t,,1m,,,,2,4,8,,9,,a,2,q,,2,2,1l,,4,2,4,2,2,3,3,,u,2,3,,b,2,1l,,4,5,,2,4,,k,2,m,6,,,1m,,,2,,4,8,,7,3,a,2,u,,1n,,,,c,,9,,14,,3,,1l,3,5,3,,4,7,2,b,2,t,,1m,,2,,2,,3,,5,2,7,2,b,2,s,2,1l,2,,,2,4,8,,9,,a,2,t,,20,,4,,2,3,,,8,,29,,2,7,c,8,2q,,2,9,b,6,22,2,r,,,,,,1j,e,,5,,2,5,b,,10,9,,2u,4,,6,,2,2,2,p,2,4,3,g,4,d,,2,2,6,,f,,jj,3,qa,3,t,3,t,2,u,2,1s,2,,7,8,,2,b,9,,19,3,3b,2,y,,3a,3,4,2,9,,6,3,63,2,2,,1m,,,7,,,,,2,8,6,a,2,,1c,h,1r,4,1c,7,,,5,,14,9,c,2,w,4,2,2,,3,1k,,,2,3,,,3,1m,8,2,2,48,3,,d,,7,4,,6,,3,2,5i,1m,,5,ek,,5f,x,2da,3,3x,,2o,w,fe,6,2x,2,n9w,4,,a,w,2,28,2,7k,,3,,4,,p,2,5,,47,2,q,i,d,,12,8,p,b,1a,3,1c,,2,4,2,2,13,,1v,6,2,2,2,2,c,,8,,1b,,1f,,,3,2,2,5,2,,,16,2,8,,6m,,2,,4,,fn4,,kh,g,g,g,a6,2,gt,,6a,,45,5,1ae,3,,2,5,4,14,3,4,,4l,2,fx,4,ar,2,49,b,4w,,1i,f,1k,3,1d,4,2,2,1x,3,10,5,,8,1q,,c,2,1g,9,a,4,2,,2n,3,2,,,2,6,,4g,,3,8,l,2,1l,2,,,,,m,,e,7,3,5,5f,8,2,3,,,n,,29,,2,6,,,2,,,2,,2,6j,,2,4,6,2,,2,r,2,2d,8,2,,,2,2y,,,,2,6,,,2t,3,2,4,,5,77,9,,2,6t,,a,2,,,4,,40,4,2,2,4,,w,a,14,6,2,4,8,,9,6,2,3,1a,d,,2,ba,7,,6,,,2a,m,2,7,,2,,2,3e,6,3,,,2,,7,,,20,2,3,,,,9n,2,f0b,5,1n,7,t4,,1r,4,29,,f5k,2,43q,,,3,4,5,8,8,2,7,u,4,44,3,1iz,1j,4,1e,8,,e,,m,5,,f,11s,7,,h,2,7,,2,,5,79,7,c5,4,15s,7,31,7,240,5,gx7k,2o,3k,6o'
    .split(',')
    .map((e) => (e ? parseInt(e, 36) : 1))
for (let e = 1; e < extend.length; e++) extend[e] += extend[e - 1]
function isExtendingChar(t) {
  for (let e = 1; e < extend.length; e += 2)
    if (extend[e] > t) return extend[e - 1] <= t
  return !1
}
function isRegionalIndicator(e) {
  return 127462 <= e && e <= 127487
}
const ZWJ = 8205
function findClusterBreak(e, t, i = !0, r = !0) {
  return (i ? nextClusterBreak : prevClusterBreak)(e, t, r)
}
function nextClusterBreak(i, r, e) {
  if (r == i.length) return r
  r &&
    surrogateLow(i.charCodeAt(r)) &&
    surrogateHigh(i.charCodeAt(r - 1)) &&
    r--
  let t = codePointAt(i, r)
  for (r += codePointSize(t); r < i.length; ) {
    var n = codePointAt(i, r)
    if (t == ZWJ || n == ZWJ || (e && isExtendingChar(n)))
      (r += codePointSize(n)), (t = n)
    else {
      if (!isRegionalIndicator(n)) break
      {
        let e = 0,
          t = r - 2
        for (; 0 <= t && isRegionalIndicator(codePointAt(i, t)); ) e++, (t -= 2)
        if (e % 2 == 0) break
        r += 2
      }
    }
  }
  return r
}
function prevClusterBreak(e, t, i) {
  for (; 0 < t; ) {
    var r = nextClusterBreak(e, t - 2, i)
    if (r < t) return r
    t--
  }
  return 0
}
function surrogateLow(e) {
  return 56320 <= e && e < 57344
}
function surrogateHigh(e) {
  return 55296 <= e && e < 56320
}
function codePointAt(e, t) {
  var i = e.charCodeAt(t)
  if (!surrogateHigh(i) || t + 1 == e.length) return i
  e = e.charCodeAt(t + 1)
  return surrogateLow(e) ? e - 56320 + ((i - 55296) << 10) + 65536 : i
}
function fromCodePoint(e) {
  return e <= 65535
    ? String.fromCharCode(e)
    : ((e -= 65536), String.fromCharCode(55296 + (e >> 10), 56320 + (1023 & e)))
}
function codePointSize(e) {
  return e < 65536 ? 1 : 2
}
const DefaultSplit = /\r\n?|\n/
var MapMode = (function (e) {
  return (
    (e[(e.Simple = 0)] = 'Simple'),
    (e[(e.TrackDel = 1)] = 'TrackDel'),
    (e[(e.TrackBefore = 2)] = 'TrackBefore'),
    (e[(e.TrackAfter = 3)] = 'TrackAfter'),
    e
  )
})((MapMode = MapMode || {}))
class ChangeDesc {
  constructor(e) {
    this.sections = e
  }
  get length() {
    let t = 0
    for (let e = 0; e < this.sections.length; e += 2) t += this.sections[e]
    return t
  }
  get newLength() {
    let t = 0
    for (let e = 0; e < this.sections.length; e += 2) {
      var i = this.sections[e + 1]
      t += i < 0 ? this.sections[e] : i
    }
    return t
  }
  get empty() {
    return (
      0 == this.sections.length ||
      (2 == this.sections.length && this.sections[1] < 0)
    )
  }
  iterGaps(r) {
    for (let e = 0, t = 0, i = 0; e < this.sections.length; ) {
      var n = this.sections[e++],
        o = this.sections[e++]
      o < 0 ? (r(t, i, n), (i += n)) : (i += o), (t += n)
    }
  }
  iterChangedRanges(e, t = !1) {
    iterChanges(this, e, t)
  }
  get invertedDesc() {
    let t = []
    for (let e = 0; e < this.sections.length; ) {
      var i = this.sections[e++],
        r = this.sections[e++]
      r < 0 ? t.push(i, r) : t.push(r, i)
    }
    return new ChangeDesc(t)
  }
  composeDesc(e) {
    return this.empty ? e : e.empty ? this : composeSets(this, e)
  }
  mapDesc(e, t = !1) {
    return e.empty ? this : mapSet(this, e, t)
  }
  mapPos(t, i = -1, r = MapMode.Simple) {
    let n = 0,
      o = 0
    for (let e = 0; e < this.sections.length; ) {
      var s = this.sections[e++],
        a = this.sections[e++],
        l = n + s
      if (a < 0) {
        if (t < l) return o + (t - n)
        o += s
      } else {
        if (
          r != MapMode.Simple &&
          t <= l &&
          ((r == MapMode.TrackDel && n < t && t < l) ||
            (r == MapMode.TrackBefore && n < t) ||
            (r == MapMode.TrackAfter && t < l))
        )
          return null
        if (t < l || (l == t && i < 0 && !s)) return t == n || i < 0 ? o : o + a
        o += a
      }
      n = l
    }
    if (t > n)
      throw new RangeError(
        `Position ${t} is out of range for changeset of length ` + n
      )
    return o
  }
  touchesRange(i, r = i) {
    for (let e = 0, t = 0; e < this.sections.length && t <= r; ) {
      var n = this.sections[e++],
        o = this.sections[e++],
        n = t + n
      if (0 <= o && t <= r && i <= n) return !(t < i && r < n) || 'cover'
      t = n
    }
    return !1
  }
  toString() {
    let t = ''
    for (let e = 0; e < this.sections.length; ) {
      var i = this.sections[e++],
        r = this.sections[e++]
      t += (t ? ' ' : '') + i + (0 <= r ? ':' + r : '')
    }
    return t
  }
  toJSON() {
    return this.sections
  }
  static fromJSON(e) {
    if (
      !Array.isArray(e) ||
      e.length % 2 ||
      e.some((e) => 'number' != typeof e)
    )
      throw new RangeError('Invalid JSON representation of ChangeDesc')
    return new ChangeDesc(e)
  }
  static create(e) {
    return new ChangeDesc(e)
  }
}
class ChangeSet extends ChangeDesc {
  constructor(e, t) {
    super(e), (this.inserted = t)
  }
  apply(o) {
    if (this.length != o.length)
      throw new RangeError(
        'Applying change set to a document with the wrong length'
      )
    return (
      iterChanges(
        this,
        (e, t, i, r, n) => (o = o.replace(i, i + (t - e), n)),
        !1
      ),
      o
    )
  }
  mapDesc(e, t = !1) {
    return mapSet(this, e, t, !0)
  }
  invert(i) {
    let r = this.sections.slice(),
      n = []
    for (let e = 0, t = 0; e < r.length; e += 2) {
      var o = r[e],
        s = r[e + 1]
      if (0 <= s) {
        ;(r[e] = s), (r[e + 1] = o)
        for (var a = e >> 1; n.length < a; ) n.push(Text.empty)
        n.push(o ? i.slice(t, t + o) : Text.empty)
      }
      t += o
    }
    return new ChangeSet(r, n)
  }
  compose(e) {
    return this.empty ? e : e.empty ? this : composeSets(this, e, !0)
  }
  map(e, t = !1) {
    return e.empty ? this : mapSet(this, e, t, !0)
  }
  iterChanges(e, t = !1) {
    iterChanges(this, e, t)
  }
  get desc() {
    return ChangeDesc.create(this.sections)
  }
  filter(i) {
    var r = [],
      n = [],
      o = []
    let s = new SectionIter(this)
    e: for (let e = 0, t = 0; ; ) {
      for (
        var a = e == i.length ? 1e9 : i[e++];
        t < a || (t == a && 0 == s.len);

      ) {
        if (s.done) break e
        var l = Math.min(s.len, a - t),
          h = (addSection(o, l, -1), -1 == s.ins ? -1 : 0 == s.off ? s.ins : 0)
        addSection(r, l, h),
          0 < h && addInsert(n, r, s.text),
          s.forward(l),
          (t += l)
      }
      for (var c = i[e++]; t < c; ) {
        if (s.done) break e
        var d = Math.min(s.len, c - t)
        addSection(r, d, -1),
          addSection(o, d, -1 == s.ins ? -1 : 0 == s.off ? s.ins : 0),
          s.forward(d),
          (t += d)
      }
    }
    return { changes: new ChangeSet(r, n), filtered: ChangeDesc.create(o) }
  }
  toJSON() {
    let r = []
    for (let i = 0; i < this.sections.length; i += 2) {
      let e = this.sections[i],
        t = this.sections[i + 1]
      t < 0
        ? r.push(e)
        : 0 == t
        ? r.push([e])
        : r.push([e].concat(this.inserted[i >> 1].toJSON()))
    }
    return r
  }
  static of(e, o, s) {
    let a = [],
      l = [],
      h = 0,
      i = null
    function c(e = !1) {
      if (e || a.length) {
        h < o && addSection(a, o - h, -1)
        let e = new ChangeSet(a, l)
        ;(i = i ? i.compose(e.map(i)) : e), (a = []), (l = []), (h = 0)
      }
    }
    return (
      (function e(r) {
        if (Array.isArray(r)) for (var t of r) e(t)
        else if (r instanceof ChangeSet) {
          if (r.length != o)
            throw new RangeError(
              `Mismatched change set length (got ${r.length}, expected ${o})`
            )
          c(), (i = i ? i.compose(r.map(i)) : r)
        } else {
          let { from: e, to: t = e, insert: i } = r
          if (t < e || e < 0 || o < t)
            throw new RangeError(
              `Invalid change range ${e} to ${t} (in doc of length ${o})`
            )
          var n = (r = i
            ? 'string' == typeof i
              ? Text.of(i.split(s || DefaultSplit))
              : i
            : Text.empty).length
          ;(e == t && 0 == n) ||
            (e < h && c(),
            e > h && addSection(a, e - h, -1),
            addSection(a, t - e, n),
            addInsert(l, a, r),
            (h = t))
        }
      })(e),
      c(!i),
      i
    )
  }
  static empty(e) {
    return new ChangeSet(e ? [e, -1] : [], [])
  }
  static fromJSON(i) {
    if (!Array.isArray(i))
      throw new RangeError('Invalid JSON representation of ChangeSet')
    let r = [],
      n = []
    for (let t = 0; t < i.length; t++) {
      let e = i[t]
      if ('number' == typeof e) r.push(e, -1)
      else {
        if (
          !Array.isArray(e) ||
          'number' != typeof e[0] ||
          e.some((e, t) => t && 'string' != typeof e)
        )
          throw new RangeError('Invalid JSON representation of ChangeSet')
        if (1 == e.length) r.push(e[0], 0)
        else {
          for (; n.length < t; ) n.push(Text.empty)
          ;(n[t] = Text.of(e.slice(1))), r.push(e[0], n[t].length)
        }
      }
    }
    return new ChangeSet(r, n)
  }
  static createSet(e, t) {
    return new ChangeSet(e, t)
  }
}
function addSection(e, t, i, r = !1) {
  var n
  ;(0 == t && i <= 0) ||
    (0 <= (n = e.length - 2) && i <= 0 && i == e[1 + n]
      ? (e[n] += t)
      : 0 == t && 0 == e[n]
      ? (e[1 + n] += i)
      : r
      ? ((e[n] += t), (e[1 + n] += i))
      : e.push(t, i))
}
function addInsert(e, t, i) {
  if (0 != i.length) {
    var r = (t.length - 2) >> 1
    if (r < e.length) e[e.length - 1] = e[e.length - 1].append(i)
    else {
      for (; e.length < r; ) e.push(Text.empty)
      e.push(i)
    }
  }
}
function iterChanges(l, h, c) {
  var d = l.inserted
  for (let o = 0, s = 0, a = 0; a < l.sections.length; ) {
    let r = l.sections[a++],
      n = l.sections[a++]
    if (n < 0) (o += r), (s += r)
    else {
      let e = o,
        t = s,
        i = Text.empty
      for (
        ;
        (e += r),
          (t += n),
          n && d && (i = i.append(d[(a - 2) >> 1])),
          !(c || a == l.sections.length || l.sections[a + 1] < 0);

      )
        (r = l.sections[a++]), (n = l.sections[a++])
      h(o, e, s, t, i), (o = e), (s = t)
    }
  }
}
function mapSet(e, t, n, i = !1) {
  var o = [],
    s = i ? [] : null
  let a = new SectionIter(e),
    l = new SectionIter(t)
  for (let i = 0, r = 0; ; )
    if (-1 == a.ins) (i += a.len), a.next()
    else if (-1 == l.ins && r < i) {
      var h = Math.min(l.len, i - r)
      l.forward(h), addSection(o, h, -1), (r += h)
    } else if (
      0 <= l.ins &&
      (a.done || r < i || (r == i && (l.len < a.len || (l.len == a.len && !n))))
    ) {
      for (
        addSection(o, l.ins, -1);
        i > r && !a.done && i + a.len < r + l.len;

      )
        (i += a.len), a.next()
      ;(r += l.len), l.next()
    } else {
      if (!(0 <= a.ins)) {
        if (a.done && l.done)
          return s ? ChangeSet.createSet(o, s) : ChangeDesc.create(o)
        throw new Error('Mismatched change set lengths')
      }
      {
        let e = 0,
          t = i + a.len
        for (;;)
          if (0 <= l.ins && r > i && r + l.len < t)
            (e += l.ins), (r += l.len), l.next()
          else {
            if (!(-1 == l.ins && r < t)) break
            var c = Math.min(l.len, t - r)
            ;(e += c), l.forward(c), (r += c)
          }
        addSection(o, e, a.ins), s && addInsert(s, o, a.text), (i = t), a.next()
      }
    }
}
function composeSets(e, t, i = !1) {
  var r = [],
    n = i ? [] : null
  let o = new SectionIter(e),
    s = new SectionIter(t)
  for (let e = !1; ; ) {
    if (o.done && s.done)
      return n ? ChangeSet.createSet(r, n) : ChangeDesc.create(r)
    if (0 == o.ins) addSection(r, o.len, 0, e), o.next()
    else if (0 != s.len || s.done) {
      if (o.done || s.done) throw new Error('Mismatched change set lengths')
      var a,
        l = Math.min(o.len2, s.len),
        h = r.length
      ;-1 == o.ins
        ? (addSection(r, l, (a = -1 == s.ins ? -1 : s.off ? 0 : s.ins), e),
          n && a && addInsert(n, r, s.text))
        : -1 == s.ins
        ? (addSection(r, o.off ? 0 : o.len, l, e),
          n && addInsert(n, r, o.textBit(l)))
        : (addSection(r, o.off ? 0 : o.len, s.off ? 0 : s.ins, e),
          n && !s.off && addInsert(n, r, s.text)),
        (e = (o.ins > l || (0 <= s.ins && s.len > l)) && (e || h < r.length)),
        o.forward2(l),
        s.forward(l)
    } else addSection(r, 0, s.ins, e), n && addInsert(n, r, s.text), s.next()
  }
}
class SectionIter {
  constructor(e) {
    ;(this.set = e), (this.i = 0), this.next()
  }
  next() {
    var e = this.set['sections']
    this.i < e.length
      ? ((this.len = e[this.i++]), (this.ins = e[this.i++]))
      : ((this.len = 0), (this.ins = -2)),
      (this.off = 0)
  }
  get done() {
    return -2 == this.ins
  }
  get len2() {
    return this.ins < 0 ? this.len : this.ins
  }
  get text() {
    var e = this.set['inserted'],
      t = (this.i - 2) >> 1
    return t >= e.length ? Text.empty : e[t]
  }
  textBit(e) {
    let t = this.set['inserted'],
      i = (this.i - 2) >> 1
    return i >= t.length && !e
      ? Text.empty
      : t[i].slice(this.off, null == e ? void 0 : this.off + e)
  }
  forward(e) {
    e == this.len ? this.next() : ((this.len -= e), (this.off += e))
  }
  forward2(e) {
    ;-1 == this.ins
      ? this.forward(e)
      : e == this.ins
      ? this.next()
      : ((this.ins -= e), (this.off += e))
  }
}
class SelectionRange {
  constructor(e, t, i) {
    ;(this.from = e), (this.to = t), (this.flags = i)
  }
  get anchor() {
    return 16 & this.flags ? this.to : this.from
  }
  get head() {
    return 16 & this.flags ? this.from : this.to
  }
  get empty() {
    return this.from == this.to
  }
  get assoc() {
    return 4 & this.flags ? -1 : 8 & this.flags ? 1 : 0
  }
  get bidiLevel() {
    var e = 3 & this.flags
    return 3 == e ? null : e
  }
  get goalColumn() {
    var e = this.flags >> 5
    return 33554431 == e ? void 0 : e
  }
  map(e, t = -1) {
    let i, r
    return (
      this.empty
        ? (i = r = e.mapPos(this.from, t))
        : ((i = e.mapPos(this.from, 1)), (r = e.mapPos(this.to, -1))),
      i == this.from && r == this.to
        ? this
        : new SelectionRange(i, r, this.flags)
    )
  }
  extend(e, t = e) {
    if (e <= this.anchor && t >= this.anchor) return EditorSelection.range(e, t)
    t = Math.abs(e - this.anchor) > Math.abs(t - this.anchor) ? e : t
    return EditorSelection.range(this.anchor, t)
  }
  eq(e) {
    return this.anchor == e.anchor && this.head == e.head
  }
  toJSON() {
    return { anchor: this.anchor, head: this.head }
  }
  static fromJSON(e) {
    if (e && 'number' == typeof e.anchor && 'number' == typeof e.head)
      return EditorSelection.range(e.anchor, e.head)
    throw new RangeError('Invalid JSON representation for SelectionRange')
  }
  static create(e, t, i) {
    return new SelectionRange(e, t, i)
  }
}
class EditorSelection {
  constructor(e, t) {
    ;(this.ranges = e), (this.mainIndex = t)
  }
  map(t, i = -1) {
    return t.empty
      ? this
      : EditorSelection.create(
          this.ranges.map((e) => e.map(t, i)),
          this.mainIndex
        )
  }
  eq(t) {
    if (this.ranges.length != t.ranges.length || this.mainIndex != t.mainIndex)
      return !1
    for (let e = 0; e < this.ranges.length; e++)
      if (!this.ranges[e].eq(t.ranges[e])) return !1
    return !0
  }
  get main() {
    return this.ranges[this.mainIndex]
  }
  asSingle() {
    return 1 == this.ranges.length ? this : new EditorSelection([this.main], 0)
  }
  addRange(e, t = !0) {
    return EditorSelection.create(
      [e].concat(this.ranges),
      t ? 0 : this.mainIndex + 1
    )
  }
  replaceRange(e, t = this.mainIndex) {
    let i = this.ranges.slice()
    return (i[t] = e), EditorSelection.create(i, this.mainIndex)
  }
  toJSON() {
    return { ranges: this.ranges.map((e) => e.toJSON()), main: this.mainIndex }
  }
  static fromJSON(e) {
    if (
      !e ||
      !Array.isArray(e.ranges) ||
      'number' != typeof e.main ||
      e.main >= e.ranges.length
    )
      throw new RangeError('Invalid JSON representation for EditorSelection')
    return new EditorSelection(
      e.ranges.map((e) => SelectionRange.fromJSON(e)),
      e.main
    )
  }
  static single(e, t = e) {
    return new EditorSelection([EditorSelection.range(e, t)], 0)
  }
  static create(i, r = 0) {
    if (0 == i.length)
      throw new RangeError('A selection needs at least one range')
    for (let e = 0, t = 0; t < i.length; t++) {
      var n = i[t]
      if (n.empty ? n.from <= e : n.from < e)
        return EditorSelection.normalized(i.slice(), r)
      e = n.to
    }
    return new EditorSelection(i, r)
  }
  static cursor(e, t = 0, i, r) {
    return SelectionRange.create(
      e,
      e,
      (0 == t ? 0 : t < 0 ? 4 : 8) |
        (null == i ? 3 : Math.min(2, i)) |
        ((null != r ? r : 33554431) << 5)
    )
  }
  static range(e, t, i) {
    i = (null != i ? i : 33554431) << 5
    return t < e
      ? SelectionRange.create(t, e, 24 | i)
      : SelectionRange.create(e, t, i | (e < t ? 4 : 0))
  }
  static normalized(t, i = 0) {
    var e = t[i]
    t.sort((e, t) => e.from - t.from), (i = t.indexOf(e))
    for (let e = 1; e < t.length; e++) {
      var r,
        n = t[e],
        o = t[e - 1]
      ;(n.empty ? n.from <= o.to : n.from < o.to) &&
        ((r = o.from),
        (o = Math.max(n.to, o.to)),
        e <= i && i--,
        t.splice(
          --e,
          2,
          n.anchor > n.head
            ? EditorSelection.range(o, r)
            : EditorSelection.range(r, o)
        ))
    }
    return new EditorSelection(t, i)
  }
}
function checkSelection(e, t) {
  for (var i of e.ranges)
    if (i.to > t) throw new RangeError('Selection points outside of document')
}
let nextID = 0
class Facet {
  constructor(e, t, i, r, n) {
    ;(this.combine = e),
      (this.compareInput = t),
      (this.compare = i),
      (this.isStatic = r),
      (this.extensions = n),
      (this.id = nextID++),
      (this.default = e([]))
  }
  static define(e = {}) {
    return new Facet(
      e.combine || ((e) => e),
      e.compareInput || ((e, t) => e === t),
      e.compare || (e.combine ? (e, t) => e === t : sameArray),
      !!e.static,
      e.enables
    )
  }
  of(e) {
    return new FacetProvider([], this, 0, e)
  }
  compute(e, t) {
    if (this.isStatic) throw new Error("Can't compute a static facet")
    return new FacetProvider(e, this, 1, t)
  }
  computeN(e, t) {
    if (this.isStatic) throw new Error("Can't compute a static facet")
    return new FacetProvider(e, this, 2, t)
  }
  from(t, i) {
    return (i = i || ((e) => e)), this.compute([t], (e) => i(e.field(t)))
  }
}
function sameArray(e, i) {
  return e == i || (e.length == i.length && e.every((e, t) => e === i[t]))
}
class FacetProvider {
  constructor(e, t, i, r) {
    ;(this.dependencies = e),
      (this.facet = t),
      (this.type = i),
      (this.value = r),
      (this.id = nextID++)
  }
  dynamicSlot(e) {
    var t, i
    let n = this.value,
      o = this.facet.compareInput,
      s = this.id,
      a = e[s] >> 1,
      l = 2 == this.type,
      r = !1,
      h = !1,
      c = []
    for (i of this.dependencies)
      'doc' == i
        ? (r = !0)
        : 'selection' == i
        ? (h = !0)
        : 0 == (1 & (null != (t = e[i.id]) ? t : 1)) && c.push(e[i.id])
    return {
      create(e) {
        return (e.values[a] = n(e)), 1
      },
      update(e, t) {
        if (
          (r && t.docChanged) ||
          (h && (t.docChanged || t.selection)) ||
          ensureAll(e, c)
        ) {
          t = n(e)
          if (l ? !compareArray(t, e.values[a], o) : !o(t, e.values[a]))
            return (e.values[a] = t), 1
        }
        return 0
      },
      reconfigure: (t, i) => {
        var e = n(t),
          r = i.config.address[s]
        if (null != r) {
          r = getAddr(i, r)
          if (
            this.dependencies.every((e) =>
              e instanceof Facet
                ? i.facet(e) === t.facet(e)
                : !(e instanceof StateField) || i.field(e, !1) == t.field(e, !1)
            ) ||
            (l ? compareArray(e, r, o) : o(e, r))
          )
            return (t.values[a] = r), 0
        }
        return (t.values[a] = e), 1
      },
    }
  }
}
function compareArray(t, i, r) {
  if (t.length != i.length) return !1
  for (let e = 0; e < t.length; e++) if (!r(t[e], i[e])) return !1
  return !0
}
function ensureAll(e, t) {
  let i = !1
  for (var r of t) 1 & ensureAddr(e, r) && (i = !0)
  return i
}
function dynamicFacetSlot(t, o, n) {
  let s = n.map((e) => t[e.id]),
    a = n.map((e) => e.type),
    r = s.filter((e) => !(1 & e)),
    l = t[o.id] >> 1
  function h(t) {
    let i = []
    for (let e = 0; e < s.length; e++) {
      var r = getAddr(t, s[e])
      if (2 == a[e]) for (var n of r) i.push(n)
      else i.push(r)
    }
    return o.combine(i)
  }
  return {
    create(e) {
      for (var t of s) ensureAddr(e, t)
      return (e.values[l] = h(e)), 1
    },
    update(e, t) {
      if (!ensureAll(e, r)) return 0
      var i = h(e)
      return o.compare(i, e.values[l]) ? 0 : ((e.values[l] = i), 1)
    },
    reconfigure(e, t) {
      var i = ensureAll(e, s),
        r = t.config.facets[o.id],
        t = t.facet(o)
      if (r && !i && sameArray(n, r)) return (e.values[l] = t), 0
      i = h(e)
      return o.compare(i, t) ? ((e.values[l] = t), 0) : ((e.values[l] = i), 1)
    },
  }
}
const initField = Facet.define({ static: !0 })
class StateField {
  constructor(e, t, i, r, n) {
    ;(this.id = e),
      (this.createF = t),
      (this.updateF = i),
      (this.compareF = r),
      (this.spec = n),
      (this.provides = void 0)
  }
  static define(e) {
    let t = new StateField(
      nextID++,
      e.create,
      e.update,
      e.compare || ((e, t) => e === t),
      e
    )
    return e.provide && (t.provides = e.provide(t)), t
  }
  create(e) {
    let t = e.facet(initField).find((e) => e.field == this)
    return ((null === t || void 0 === t ? void 0 : t.create) || this.createF)(e)
  }
  slot(e) {
    let r = e[this.id] >> 1
    return {
      create: (e) => ((e.values[r] = this.create(e)), 1),
      update: (e, t) => {
        var i = e.values[r],
          t = this.updateF(i, t)
        return this.compareF(i, t) ? 0 : ((e.values[r] = t), 1)
      },
      reconfigure: (e, t) =>
        null != t.config.address[this.id]
          ? ((e.values[r] = t.field(this)), 0)
          : ((e.values[r] = this.create(e)), 1),
    }
  }
  init(e) {
    return [this, initField.of({ field: this, create: e })]
  }
  get extension() {
    return this
  }
}
const Prec_ = { lowest: 4, low: 3, default: 2, high: 1, highest: 0 }
function prec(t) {
  return (e) => new PrecExtension(e, t)
}
const Prec = {
  highest: prec(Prec_.highest),
  high: prec(Prec_.high),
  default: prec(Prec_.default),
  low: prec(Prec_.low),
  lowest: prec(Prec_.lowest),
}
class PrecExtension {
  constructor(e, t) {
    ;(this.inner = e), (this.prec = t)
  }
}
class Compartment {
  of(e) {
    return new CompartmentInstance(this, e)
  }
  reconfigure(e) {
    return Compartment.reconfigure.of({ compartment: this, extension: e })
  }
  get(e) {
    return e.config.compartments.get(this)
  }
}
class CompartmentInstance {
  constructor(e, t) {
    ;(this.compartment = e), (this.inner = t)
  }
}
class Configuration {
  constructor(e, t, i, r, n, o) {
    for (
      this.base = e,
        this.compartments = t,
        this.dynamicSlots = i,
        this.address = r,
        this.staticValues = n,
        this.facets = o,
        this.statusTemplate = [];
      this.statusTemplate.length < i.length;

    )
      this.statusTemplate.push(0)
  }
  staticFacet(e) {
    var t = this.address[e.id]
    return null == t ? e.default : this.staticValues[t >> 1]
  }
  static resolve(e, t, r) {
    let i = [],
      n = Object.create(null)
    var o,
      s = new Map()
    for (o of flatten(e, t, s))
      (o instanceof StateField
        ? i
        : n[o.facet.id] || (n[o.facet.id] = [])
      ).push(o)
    let a = Object.create(null),
      l = [],
      h = []
    for (let t of i) (a[t.id] = h.length << 1), h.push((e) => t.slot(e))
    var c,
      d = null == r ? void 0 : r.config.facets
    for (c in n) {
      let i = n[c],
        t = i[0].facet
      var u = (d && d[c]) || []
      if (i.every((e) => 0 == e.type))
        (a[t.id] = (l.length << 1) | 1),
          sameArray(u, i)
            ? l.push(r.facet(t))
            : ((u = t.combine(i.map((e) => e.value))),
              l.push(r && t.compare(u, r.facet(t)) ? r.facet(t) : u))
      else {
        for (let t of i)
          0 == t.type
            ? ((a[t.id] = (l.length << 1) | 1), l.push(t.value))
            : ((a[t.id] = h.length << 1), h.push((e) => t.dynamicSlot(e)))
        ;(a[t.id] = h.length << 1), h.push((e) => dynamicFacetSlot(e, t, i))
      }
    }
    t = h.map((e) => e(a))
    return new Configuration(e, s, t, a, l, n)
  }
}
function flatten(e, s, a) {
  let l = [[], [], [], [], []],
    h = new Map()
  return (
    (function e(t, i) {
      var r = h.get(t)
      if (null != r) {
        if (r <= i) return
        var n = l[r].indexOf(t)
        ;-1 < n && l[r].splice(n, 1),
          t instanceof CompartmentInstance && a.delete(t.compartment)
      }
      if ((h.set(t, i), Array.isArray(t))) for (var o of t) e(o, i)
      else if (t instanceof CompartmentInstance) {
        if (a.has(t.compartment))
          throw new RangeError('Duplicate use of compartment in extensions')
        ;(r = s.get(t.compartment) || t.inner), a.set(t.compartment, r), e(r, i)
      } else if (t instanceof PrecExtension) e(t.inner, t.prec)
      else if (t instanceof StateField)
        l[i].push(t), t.provides && e(t.provides, i)
      else if (t instanceof FacetProvider)
        l[i].push(t), t.facet.extensions && e(t.facet.extensions, i)
      else {
        if (!(n = t.extension))
          throw new Error(
            `Unrecognized extension value in extension set (${t}). This sometimes happens because multiple instances of @codemirror/state are loaded, breaking instanceof checks.`
          )
        e(n, i)
      }
    })(e, Prec_.default),
    l.reduce((e, t) => e.concat(t))
  )
}
function ensureAddr(e, t) {
  if (1 & t) return 2
  var t = t >> 1,
    i = e.status[t]
  if (4 == i) throw new Error('Cyclic dependency between fields and/or facets')
  if (2 & i) return i
  e.status[t] = 4
  i = e.computeSlot(e, e.config.dynamicSlots[t])
  return (e.status[t] = 2 | i)
}
function getAddr(e, t) {
  return (1 & t ? e.config.staticValues : e.values)[t >> 1]
}
const languageData = Facet.define(),
  allowMultipleSelections = Facet.define({
    combine: (e) => e.some((e) => e),
    static: !0,
  }),
  lineSeparator = Facet.define({
    combine: (e) => (e.length ? e[0] : void 0),
    static: !0,
  }),
  changeFilter = Facet.define(),
  transactionFilter = Facet.define(),
  transactionExtender = Facet.define(),
  readOnly = Facet.define({ combine: (e) => !!e.length && e[0] })
class Annotation {
  constructor(e, t) {
    ;(this.type = e), (this.value = t)
  }
  static define() {
    return new AnnotationType()
  }
}
class AnnotationType {
  of(e) {
    return new Annotation(this, e)
  }
}
class StateEffectType {
  constructor(e) {
    this.map = e
  }
  of(e) {
    return new StateEffect(this, e)
  }
}
class StateEffect {
  constructor(e, t) {
    ;(this.type = e), (this.value = t)
  }
  map(e) {
    e = this.type.map(this.value, e)
    return void 0 === e
      ? void 0
      : e == this.value
      ? this
      : new StateEffect(this.type, e)
  }
  is(e) {
    return this.type == e
  }
  static define(e = {}) {
    return new StateEffectType(e.map || ((e) => e))
  }
  static mapEffects(e, t) {
    if (!e.length) return e
    let i = []
    for (var r of e) {
      r = r.map(t)
      r && i.push(r)
    }
    return i
  }
}
;(StateEffect.reconfigure = StateEffect.define()),
  (StateEffect.appendConfig = StateEffect.define())
class Transaction {
  constructor(e, t, i, r, n, o) {
    ;(this.startState = e),
      (this.changes = t),
      (this.selection = i),
      (this.effects = r),
      (this.annotations = n),
      (this.scrollIntoView = o),
      (this._doc = null),
      (this._state = null),
      i && checkSelection(i, t.newLength),
      n.some((e) => e.type == Transaction.time) ||
        (this.annotations = n.concat(Transaction.time.of(Date.now())))
  }
  static create(e, t, i, r, n, o) {
    return new Transaction(e, t, i, r, n, o)
  }
  get newDoc() {
    return this._doc || (this._doc = this.changes.apply(this.startState.doc))
  }
  get newSelection() {
    return this.selection || this.startState.selection.map(this.changes)
  }
  get state() {
    return this._state || this.startState.applyTransaction(this), this._state
  }
  annotation(e) {
    for (var t of this.annotations) if (t.type == e) return t.value
  }
  get docChanged() {
    return !this.changes.empty
  }
  get reconfigured() {
    return this.startState.config != this.state.config
  }
  isUserEvent(e) {
    let t = this.annotation(Transaction.userEvent)
    return !(
      !t ||
      !(
        t == e ||
        (t.length > e.length && t.slice(0, e.length) == e && '.' == t[e.length])
      )
    )
  }
}
function joinRanges(n, o) {
  let s = []
  for (let i = 0, r = 0; ; ) {
    let e, t
    if (i < n.length && (r == o.length || o[r] >= n[i]))
      (e = n[i++]), (t = n[i++])
    else {
      if (!(r < o.length)) return s
      ;(e = o[r++]), (t = o[r++])
    }
    !s.length || s[s.length - 1] < e
      ? s.push(e, t)
      : s[s.length - 1] < t && (s[s.length - 1] = t)
  }
}
function mergeTransaction(e, t, i) {
  let r, n, o
  return {
    changes: (o = i
      ? ((r = t.changes),
        (n = ChangeSet.empty(t.changes.length)),
        e.changes.compose(t.changes))
      : ((r = t.changes.map(e.changes)),
        (n = e.changes.mapDesc(t.changes, !0)),
        e.changes.compose(r))),
    selection: t.selection
      ? t.selection.map(n)
      : null == (i = e.selection)
      ? void 0
      : i.map(r),
    effects: StateEffect.mapEffects(e.effects, r).concat(
      StateEffect.mapEffects(t.effects, n)
    ),
    annotations: e.annotations.length
      ? e.annotations.concat(t.annotations)
      : t.annotations,
    scrollIntoView: e.scrollIntoView || t.scrollIntoView,
  }
}
function resolveTransactionInner(e, t, i) {
  let r = t.selection,
    n = asArray(t.annotations)
  return (
    t.userEvent && (n = n.concat(Transaction.userEvent.of(t.userEvent))),
    {
      changes:
        t.changes instanceof ChangeSet
          ? t.changes
          : ChangeSet.of(t.changes || [], i, e.facet(lineSeparator)),
      selection:
        r &&
        (r instanceof EditorSelection
          ? r
          : EditorSelection.single(r.anchor, r.head)),
      effects: asArray(t.effects),
      annotations: n,
      scrollIntoView: !!t.scrollIntoView,
    }
  )
}
function resolveTransaction(t, i, r) {
  let n = resolveTransactionInner(t, i.length ? i[0] : {}, t.doc.length)
  i.length && !1 === i[0].filter && (r = !1)
  for (let e = 1; e < i.length; e++) {
    !1 === i[e].filter && (r = !1)
    var o = !!i[e].sequential
    n = mergeTransaction(
      n,
      resolveTransactionInner(t, i[e], o ? n.changes.newLength : t.doc.length),
      o
    )
  }
  var e = Transaction.create(
    t,
    n.changes,
    n.selection,
    n.effects,
    n.annotations,
    n.scrollIntoView
  )
  return extendTransaction(r ? filterTransaction(e) : e)
}
function filterTransaction(i) {
  let r = i.startState,
    n = !0
  for (var e of r.facet(changeFilter)) {
    e = e(i)
    if (!1 === e) {
      n = !1
      break
    }
    Array.isArray(e) && (n = !0 === n ? e : joinRanges(n, e))
  }
  if (!0 !== n) {
    let e, t
    var o
    !1 === n
      ? ((t = i.changes.invertedDesc), (e = ChangeSet.empty(r.doc.length)))
      : ((o = i.changes.filter(n)),
        (e = o.changes),
        (t = o.filtered.invertedDesc)),
      (i = Transaction.create(
        r,
        e,
        i.selection && i.selection.map(t),
        StateEffect.mapEffects(i.effects, t),
        i.annotations,
        i.scrollIntoView
      ))
  }
  let t = r.facet(transactionFilter)
  for (let e = t.length - 1; 0 <= e; e--) {
    var s = t[e](i)
    i =
      s instanceof Transaction
        ? s
        : Array.isArray(s) && 1 == s.length && s[0] instanceof Transaction
        ? s[0]
        : resolveTransaction(r, asArray(s), !1)
  }
  return i
}
function extendTransaction(t) {
  let i = t.startState,
    r = i.facet(transactionExtender),
    n = t
  for (let e = r.length - 1; 0 <= e; e--) {
    var o = r[e](t)
    o &&
      Object.keys(o).length &&
      (n = mergeTransaction(
        t,
        resolveTransactionInner(i, o, t.changes.newLength),
        !0
      ))
  }
  return n == t
    ? t
    : Transaction.create(
        i,
        t.changes,
        t.selection,
        n.effects,
        n.annotations,
        n.scrollIntoView
      )
}
;(Transaction.time = Annotation.define()),
  (Transaction.userEvent = Annotation.define()),
  (Transaction.addToHistory = Annotation.define()),
  (Transaction.remote = Annotation.define())
const none$2 = []
function asArray(e) {
  return null == e ? none$2 : Array.isArray(e) ? e : [e]
}
var CharCategory = (function (e) {
  return (
    (e[(e.Word = 0)] = 'Word'),
    (e[(e.Space = 1)] = 'Space'),
    (e[(e.Other = 2)] = 'Other'),
    e
  )
})((CharCategory = CharCategory || {}))
const nonASCIISingleCaseWordChar =
  /[\u00df\u0587\u0590-\u05f4\u0600-\u06ff\u3040-\u309f\u30a0-\u30ff\u3400-\u4db5\u4e00-\u9fcc\uac00-\ud7af]/
let wordChar
try {
  wordChar = new RegExp('[\\p{Alphabetic}\\p{Number}_]', 'u')
} catch (e) {}
function hasWordChar(i) {
  if (wordChar) return wordChar.test(i)
  for (let t = 0; t < i.length; t++) {
    let e = i[t]
    if (
      /\w/.test(e) ||
      ('' < e &&
        (e.toUpperCase() != e.toLowerCase() ||
          nonASCIISingleCaseWordChar.test(e)))
    )
      return !0
  }
  return !1
}
function makeCategorizer(i) {
  return (t) => {
    if (!/\S/.test(t)) return CharCategory.Space
    if (hasWordChar(t)) return CharCategory.Word
    for (let e = 0; e < i.length; e++)
      if (-1 < t.indexOf(i[e])) return CharCategory.Word
    return CharCategory.Other
  }
}
class EditorState {
  constructor(e, t, i, r, n, o) {
    ;(this.config = e),
      (this.doc = t),
      (this.selection = i),
      (this.values = r),
      (this.status = e.statusTemplate.slice()),
      (this.computeSlot = n),
      o && (o._state = this)
    for (let e = 0; e < this.config.dynamicSlots.length; e++)
      ensureAddr(this, e << 1)
    this.computeSlot = null
  }
  field(e, t = !0) {
    e = this.config.address[e.id]
    if (null != e) return ensureAddr(this, e), getAddr(this, e)
    if (t) throw new RangeError('Field is not present in this state')
  }
  update(...e) {
    return resolveTransaction(this, e, !0)
  }
  applyTransaction(i) {
    let e = this.config,
      { base: t, compartments: r } = e
    for (var n of i.effects)
      n.is(Compartment.reconfigure)
        ? (e &&
            ((r = new Map()),
            e.compartments.forEach((e, t) => r.set(t, e)),
            (e = null)),
          r.set(n.value.compartment, n.value.extension))
        : n.is(StateEffect.reconfigure)
        ? ((e = null), (t = n.value))
        : n.is(StateEffect.appendConfig) &&
          ((e = null), (t = asArray(t).concat(n.value)))
    let o
    ;(o = e
      ? i.startState.values.slice()
      : ((e = Configuration.resolve(t, r, this)),
        new EditorState(
          e,
          this.doc,
          this.selection,
          e.dynamicSlots.map(() => null),
          (e, t) => t.reconfigure(e, this),
          null
        ).values)),
      new EditorState(
        e,
        i.newDoc,
        i.newSelection,
        o,
        (e, t) => t.update(e, i),
        i
      )
  }
  replaceSelection(t) {
    return (
      'string' == typeof t && (t = this.toText(t)),
      this.changeByRange((e) => ({
        changes: { from: e.from, to: e.to, insert: t },
        range: EditorSelection.cursor(e.from + t.length),
      }))
    )
  }
  changeByRange(n) {
    var o = this.selection,
      e = n(o.ranges[0])
    let s = this.changes(e.changes),
      a = [e.range],
      l = asArray(e.effects)
    for (let r = 1; r < o.ranges.length; r++) {
      let e = n(o.ranges[r]),
        t = this.changes(e.changes),
        i = t.map(s)
      for (let e = 0; e < r; e++) a[e] = a[e].map(i)
      var h = s.mapDesc(t, !0)
      a.push(e.range.map(h)),
        (s = s.compose(i)),
        (l = StateEffect.mapEffects(l, i).concat(
          StateEffect.mapEffects(asArray(e.effects), h)
        ))
    }
    return {
      changes: s,
      selection: EditorSelection.create(a, o.mainIndex),
      effects: l,
    }
  }
  changes(e = []) {
    return e instanceof ChangeSet
      ? e
      : ChangeSet.of(e, this.doc.length, this.facet(EditorState.lineSeparator))
  }
  toText(e) {
    return Text.of(
      e.split(this.facet(EditorState.lineSeparator) || DefaultSplit)
    )
  }
  sliceDoc(e = 0, t = this.doc.length) {
    return this.doc.sliceString(e, t, this.lineBreak)
  }
  facet(e) {
    var t = this.config.address[e.id]
    return null == t ? e.default : (ensureAddr(this, t), getAddr(this, t))
  }
  toJSON(t) {
    let i = { doc: this.sliceDoc(), selection: this.selection.toJSON() }
    if (t)
      for (var r in t) {
        let e = t[r]
        e instanceof StateField &&
          (i[r] = e.spec.toJSON(this.field(t[r]), this))
      }
    return i
  }
  static fromJSON(e, t = {}, r) {
    if (!e || 'string' != typeof e.doc)
      throw new RangeError('Invalid JSON representation for EditorState')
    let n = []
    if (r)
      for (var o in r) {
        let t = r[o],
          i = e[o]
        n.push(t.init((e) => t.spec.fromJSON(i, e)))
      }
    return EditorState.create({
      doc: e.doc,
      selection: EditorSelection.fromJSON(e.selection),
      extensions: t.extensions ? n.concat([t.extensions]) : n,
    })
  }
  static create(e = {}) {
    let t = Configuration.resolve(e.extensions || [], new Map())
    var i =
      e.doc instanceof Text
        ? e.doc
        : Text.of(
            (e.doc || '').split(
              t.staticFacet(EditorState.lineSeparator) || DefaultSplit
            )
          )
    let r = e.selection
      ? e.selection instanceof EditorSelection
        ? e.selection
        : EditorSelection.single(e.selection.anchor, e.selection.head)
      : EditorSelection.single(0)
    return (
      checkSelection(r, i.length),
      t.staticFacet(allowMultipleSelections) || (r = r.asSingle()),
      new EditorState(
        t,
        i,
        r,
        t.dynamicSlots.map(() => null),
        (e, t) => t.create(e),
        null
      )
    )
  }
  get tabSize() {
    return this.facet(EditorState.tabSize)
  }
  get lineBreak() {
    return this.facet(EditorState.lineSeparator) || '\n'
  }
  get readOnly() {
    return this.facet(readOnly)
  }
  phrase(e, ...i) {
    for (var t of this.facet(EditorState.phrases))
      if (Object.prototype.hasOwnProperty.call(t, e)) {
        e = t[e]
        break
      }
    return (e = i.length
      ? e.replace(/\$(\$|\d*)/g, (e, t) => {
          if ('$' == t) return '$'
          t = +(t || 1)
          return t > i.length ? e : i[t - 1]
        })
      : e)
  }
  languageDataAt(e, t, i = -1) {
    let r = []
    for (var n of this.facet(languageData))
      for (var o of n(this, t, i))
        Object.prototype.hasOwnProperty.call(o, e) && r.push(o[e])
    return r
  }
  charCategorizer(e) {
    return makeCategorizer(this.languageDataAt('wordChars', e).join(''))
  }
  wordAt(e) {
    let { text: t, from: i, length: r } = this.doc.lineAt(e),
      n = this.charCategorizer(e),
      o = e - i,
      s = e - i
    for (; 0 < o; ) {
      var a = findClusterBreak(t, o, !1)
      if (n(t.slice(a, o)) != CharCategory.Word) break
      o = a
    }
    for (; s < r; ) {
      var l = findClusterBreak(t, s)
      if (n(t.slice(s, l)) != CharCategory.Word) break
      s = l
    }
    return o == s ? null : EditorSelection.range(o + i, s + i)
  }
}
function combineConfig(e, t, i = {}) {
  let r = {}
  for (var n of e)
    for (var o of Object.keys(n)) {
      var s = n[o],
        a = r[o]
      if (void 0 === a) r[o] = s
      else if (a !== s && void 0 !== s) {
        if (!Object.hasOwnProperty.call(i, o))
          throw new Error('Config merge conflict for field ' + o)
        r[o] = i[o](a, s)
      }
    }
  for (var l in t) void 0 === r[l] && (r[l] = t[l])
  return r
}
;(EditorState.allowMultipleSelections = allowMultipleSelections),
  (EditorState.tabSize = Facet.define({
    combine: (e) => (e.length ? e[0] : 4),
  })),
  (EditorState.lineSeparator = lineSeparator),
  (EditorState.readOnly = readOnly),
  (EditorState.phrases = Facet.define({
    compare(t, i) {
      let e = Object.keys(t),
        r = Object.keys(i)
      return e.length == r.length && e.every((e) => t[e] == i[e])
    },
  })),
  (EditorState.languageData = languageData),
  (EditorState.changeFilter = changeFilter),
  (EditorState.transactionFilter = transactionFilter),
  (EditorState.transactionExtender = transactionExtender),
  (Compartment.reconfigure = StateEffect.define())
class RangeValue {
  eq(e) {
    return this == e
  }
  range(e, t = e) {
    return Range.create(e, t, this)
  }
}
;(RangeValue.prototype.startSide = RangeValue.prototype.endSide = 0),
  (RangeValue.prototype.point = !1),
  (RangeValue.prototype.mapMode = MapMode.TrackDel)
class Range {
  constructor(e, t, i) {
    ;(this.from = e), (this.to = t), (this.value = i)
  }
  static create(e, t, i) {
    return new Range(e, t, i)
  }
}
function cmpRange(e, t) {
  return e.from - t.from || e.value.startSide - t.value.startSide
}
class Chunk {
  constructor(e, t, i, r) {
    ;(this.from = e), (this.to = t), (this.value = i), (this.maxPoint = r)
  }
  get length() {
    return this.to[this.to.length - 1]
  }
  findIndex(i, r, n, o = 0) {
    var s = n ? this.to : this.from
    for (let e = o, t = s.length; ; ) {
      if (e == t) return e
      var a = (e + t) >> 1,
        l =
          s[a] - i || (n ? this.value[a].endSide : this.value[a].startSide) - r
      if (a == e) return 0 <= l ? e : t
      0 <= l ? (t = a) : (e = 1 + a)
    }
  }
  between(i, r, n, o) {
    for (
      let e = this.findIndex(r, -1e9, !0), t = this.findIndex(n, 1e9, !1, e);
      e < t;
      e++
    )
      if (!1 === o(this.from[e] + i, this.to[e] + i, this.value[e])) return !1
  }
  map(s, a) {
    let l = [],
      h = [],
      c = [],
      d = -1,
      u = -1
    for (let o = 0; o < this.value.length; o++) {
      let e = this.value[o],
        t = this.from[o] + s,
        i = this.to[o] + s,
        r,
        n
      if (t == i) {
        var f = a.mapPos(t, e.startSide, e.mapMode)
        if (null == f) continue
        if (
          ((r = n = f),
          e.startSide != e.endSide && (n = a.mapPos(t, e.endSide)) < r)
        )
          continue
      } else if (
        ((r = a.mapPos(t, e.startSide)),
        (n = a.mapPos(i, e.endSide)),
        r > n || (r == n && 0 < e.startSide && e.endSide <= 0))
      )
        continue
      ;(n - r || e.endSide - e.startSide) < 0 ||
        (d < 0 && (d = r),
        e.point && (u = Math.max(u, n - r)),
        l.push(e),
        h.push(r - d),
        c.push(n - d))
    }
    return { mapped: l.length ? new Chunk(h, c, l, u) : null, pos: d }
  }
}
class RangeSet {
  constructor(e, t, i, r) {
    ;(this.chunkPos = e),
      (this.chunk = t),
      (this.nextLayer = i),
      (this.maxPoint = r)
  }
  static create(e, t, i, r) {
    return new RangeSet(e, t, i, r)
  }
  get length() {
    var e = this.chunk.length - 1
    return e < 0 ? 0 : Math.max(this.chunkEnd(e), this.nextLayer.length)
  }
  get size() {
    if (this.isEmpty) return 0
    let e = this.nextLayer.size
    for (var t of this.chunk) e += t.value.length
    return e
  }
  chunkEnd(e) {
    return this.chunkPos[e] + this.chunk[e].length
  }
  update(e) {
    let {
        add: t = [],
        sort: i = !1,
        filterFrom: r = 0,
        filterTo: n = this.length,
      } = e,
      o = e.filter
    if (0 == t.length && !o) return this
    if ((i && (t = t.slice().sort(cmpRange)), this.isEmpty))
      return t.length ? RangeSet.of(t) : this
    let s = new LayerCursor(this, null, -1).goto(0),
      a = 0,
      l = [],
      h = new RangeSetBuilder()
    for (; s.value || a < t.length; ) {
      var c
      a < t.length &&
      0 <= (s.from - t[a].from || s.startSide - t[a].value.startSide)
        ? ((c = t[a++]), h.addInner(c.from, c.to, c.value) || l.push(c))
        : 1 == s.rangeIndex &&
          s.chunkIndex < this.chunk.length &&
          (a == t.length || this.chunkEnd(s.chunkIndex) < t[a].from) &&
          (!o ||
            r > this.chunkEnd(s.chunkIndex) ||
            n < this.chunkPos[s.chunkIndex]) &&
          h.addChunk(this.chunkPos[s.chunkIndex], this.chunk[s.chunkIndex])
        ? s.nextChunk()
        : ((!o || r > s.to || n < s.from || o(s.from, s.to, s.value)) &&
            !h.addInner(s.from, s.to, s.value) &&
            l.push(Range.create(s.from, s.to, s.value)),
          s.next())
    }
    return h.finishInner(
      this.nextLayer.isEmpty && !l.length
        ? RangeSet.empty
        : this.nextLayer.update({
            add: l,
            filter: o,
            filterFrom: r,
            filterTo: n,
          })
    )
  }
  map(r) {
    if (r.empty || this.isEmpty) return this
    let n = [],
      o = [],
      s = -1
    for (let i = 0; i < this.chunk.length; i++) {
      let e = this.chunkPos[i],
        t = this.chunk[i]
      var a,
        l = r.touchesRange(e, e + t.length)
      !1 === l
        ? ((s = Math.max(s, t.maxPoint)), n.push(t), o.push(r.mapPos(e)))
        : !0 === l &&
          (({ mapped: l, pos: a } = t.map(e, r)),
          l && ((s = Math.max(s, l.maxPoint)), n.push(l), o.push(a)))
    }
    var e = this.nextLayer.map(r)
    return 0 == n.length ? e : new RangeSet(o, n, e || RangeSet.empty, s)
  }
  between(r, n, o) {
    if (!this.isEmpty) {
      for (let i = 0; i < this.chunk.length; i++) {
        let e = this.chunkPos[i],
          t = this.chunk[i]
        if (e <= n && r <= e + t.length && !1 === t.between(e, r - e, n - e, o))
          return
      }
      this.nextLayer.between(r, n, o)
    }
  }
  iter(e = 0) {
    return HeapCursor.from([this]).goto(e)
  }
  get isEmpty() {
    return this.nextLayer == this
  }
  static iter(e, t = 0) {
    return HeapCursor.from(e).goto(t)
  }
  static compare(e, t, i, r, n = -1) {
    var e = e.filter((e) => 0 < e.maxPoint || (!e.isEmpty && e.maxPoint >= n)),
      t = t.filter((e) => 0 < e.maxPoint || (!e.isEmpty && e.maxPoint >= n)),
      o = findSharedChunks(e, t, i)
    let s = new SpanCursor(e, o, n),
      a = new SpanCursor(t, o, n)
    i.iterGaps((e, t, i) => compare(s, e, a, t, i, r)),
      i.empty && 0 == i.length && compare(s, 0, a, 0, 0, r)
  }
  static eq(t, i, e = 0, r) {
    null == r && (r = 1e9)
    var n = t.filter((e) => !e.isEmpty && i.indexOf(e) < 0),
      o = i.filter((e) => !e.isEmpty && t.indexOf(e) < 0)
    if (n.length != o.length) return !1
    if (!n.length) return !0
    var s = findSharedChunks(n, o)
    let a = new SpanCursor(n, s, 0).goto(e),
      l = new SpanCursor(o, s, 0).goto(e)
    for (;;) {
      if (
        a.to != l.to ||
        !sameValues(a.active, l.active) ||
        (a.point && (!l.point || !a.point.eq(l.point)))
      )
        return !1
      if (a.to > r) return !0
      a.next(), l.next()
    }
  }
  static spans(e, t, i, r, n = -1) {
    let o = new SpanCursor(e, null, n).goto(t),
      s = t,
      a = o.openStart
    for (;;) {
      var l = Math.min(o.to, i)
      if (
        (o.point
          ? (r.point(s, l, o.point, o.activeForPoint(o.to), a, o.pointRank),
            (a = o.openEnd(l) + (o.to > l ? 1 : 0)))
          : l > s && (r.span(s, l, o.active, a), (a = o.openEnd(l))),
        o.to > i)
      )
        break
      ;(s = o.to), o.next()
    }
    return a
  }
  static of(e, t = !1) {
    let i = new RangeSetBuilder()
    for (var r of e instanceof Range ? [e] : t ? lazySort(e) : e)
      i.add(r.from, r.to, r.value)
    return i.finish()
  }
}
function lazySort(i) {
  if (1 < i.length)
    for (let e = i[0], t = 1; t < i.length; t++) {
      var r = i[t]
      if (0 < cmpRange(e, r)) return i.slice().sort(cmpRange)
      e = r
    }
  return i
}
;(RangeSet.empty = new RangeSet([], [], null, -1)),
  (RangeSet.empty.nextLayer = RangeSet.empty)
class RangeSetBuilder {
  constructor() {
    ;(this.chunks = []),
      (this.chunkPos = []),
      (this.chunkStart = -1),
      (this.last = null),
      (this.lastFrom = -1e9),
      (this.lastTo = -1e9),
      (this.from = []),
      (this.to = []),
      (this.value = []),
      (this.maxPoint = -1),
      (this.setMaxPoint = -1),
      (this.nextLayer = null)
  }
  finishChunk(e) {
    this.chunks.push(new Chunk(this.from, this.to, this.value, this.maxPoint)),
      this.chunkPos.push(this.chunkStart),
      (this.chunkStart = -1),
      (this.setMaxPoint = Math.max(this.setMaxPoint, this.maxPoint)),
      (this.maxPoint = -1),
      e && ((this.from = []), (this.to = []), (this.value = []))
  }
  add(e, t, i) {
    this.addInner(e, t, i) ||
      (this.nextLayer || (this.nextLayer = new RangeSetBuilder())).add(e, t, i)
  }
  addInner(e, t, i) {
    var r = e - this.lastTo || i.startSide - this.last.endSide
    if (r <= 0 && (e - this.lastFrom || i.startSide - this.last.startSide) < 0)
      throw new Error(
        'Ranges must be added sorted by `from` position and `startSide`'
      )
    return (
      !(r < 0) &&
      (250 == this.from.length && this.finishChunk(!0),
      this.chunkStart < 0 && (this.chunkStart = e),
      this.from.push(e - this.chunkStart),
      this.to.push(t - this.chunkStart),
      (this.last = i),
      (this.lastFrom = e),
      (this.lastTo = t),
      this.value.push(i),
      i.point && (this.maxPoint = Math.max(this.maxPoint, t - e)),
      !0)
    )
  }
  addChunk(e, t) {
    if ((e - this.lastTo || t.value[0].startSide - this.last.endSide) < 0)
      return !1
    this.from.length && this.finishChunk(!0),
      (this.setMaxPoint = Math.max(this.setMaxPoint, t.maxPoint)),
      this.chunks.push(t),
      this.chunkPos.push(e)
    var i = t.value.length - 1
    return (
      (this.last = t.value[i]),
      (this.lastFrom = t.from[i] + e),
      (this.lastTo = t.to[i] + e),
      !0
    )
  }
  finish() {
    return this.finishInner(RangeSet.empty)
  }
  finishInner(e) {
    if ((this.from.length && this.finishChunk(!1), 0 == this.chunks.length))
      return e
    e = RangeSet.create(
      this.chunkPos,
      this.chunks,
      this.nextLayer ? this.nextLayer.finishInner(e) : e,
      this.setMaxPoint
    )
    return (this.from = null), e
  }
}
function findSharedChunks(e, t, i) {
  let r = new Map()
  for (var n of e)
    for (let e = 0; e < n.chunk.length; e++)
      n.chunk[e].maxPoint <= 0 && r.set(n.chunk[e], n.chunkPos[e])
  let o = new Set()
  for (var s of t)
    for (let e = 0; e < s.chunk.length; e++) {
      var a = r.get(s.chunk[e])
      null == a ||
        (i ? i.mapPos(a) : a) != s.chunkPos[e] ||
        (null != i && i.touchesRange(a, a + s.chunk[e].length)) ||
        o.add(s.chunk[e])
    }
  return o
}
class LayerCursor {
  constructor(e, t, i, r = 0) {
    ;(this.layer = e), (this.skip = t), (this.minPoint = i), (this.rank = r)
  }
  get startSide() {
    return this.value ? this.value.startSide : 0
  }
  get endSide() {
    return this.value ? this.value.endSide : 0
  }
  goto(e, t = -1e9) {
    return (
      (this.chunkIndex = this.rangeIndex = 0), this.gotoInner(e, t, !1), this
    )
  }
  gotoInner(e, t, i) {
    for (; this.chunkIndex < this.layer.chunk.length; ) {
      var r = this.layer.chunk[this.chunkIndex]
      if (
        !(
          (this.skip && this.skip.has(r)) ||
          this.layer.chunkEnd(this.chunkIndex) < e ||
          r.maxPoint < this.minPoint
        )
      )
        break
      this.chunkIndex++, (i = !1)
    }
    this.chunkIndex < this.layer.chunk.length &&
      ((t = this.layer.chunk[this.chunkIndex].findIndex(
        e - this.layer.chunkPos[this.chunkIndex],
        t,
        !0
      )),
      (!i || this.rangeIndex < t) && this.setRangeIndex(t)),
      this.next()
  }
  forward(e, t) {
    ;(this.to - e || this.endSide - t) < 0 && this.gotoInner(e, t, !0)
  }
  next() {
    for (;;) {
      if (this.chunkIndex == this.layer.chunk.length) {
        ;(this.from = this.to = 1e9), (this.value = null)
        break
      }
      var e = this.layer.chunkPos[this.chunkIndex],
        t = this.layer.chunk[this.chunkIndex],
        i = e + t.from[this.rangeIndex]
      if (
        ((this.from = i),
        (this.to = e + t.to[this.rangeIndex]),
        (this.value = t.value[this.rangeIndex]),
        this.setRangeIndex(this.rangeIndex + 1),
        this.minPoint < 0 ||
          (this.value.point && this.to - this.from >= this.minPoint))
      )
        break
    }
  }
  setRangeIndex(e) {
    if (e == this.layer.chunk[this.chunkIndex].value.length) {
      if ((this.chunkIndex++, this.skip))
        for (
          ;
          this.chunkIndex < this.layer.chunk.length &&
          this.skip.has(this.layer.chunk[this.chunkIndex]);

        )
          this.chunkIndex++
      this.rangeIndex = 0
    } else this.rangeIndex = e
  }
  nextChunk() {
    this.chunkIndex++, (this.rangeIndex = 0), this.next()
  }
  compare(e) {
    return (
      this.from - e.from ||
      this.startSide - e.startSide ||
      this.rank - e.rank ||
      this.to - e.to ||
      this.endSide - e.endSide
    )
  }
}
class HeapCursor {
  constructor(e) {
    this.heap = e
  }
  static from(i, r = null, n = -1) {
    let o = []
    for (let t = 0; t < i.length; t++)
      for (let e = i[t]; !e.isEmpty; e = e.nextLayer)
        e.maxPoint >= n && o.push(new LayerCursor(e, r, n, t))
    return 1 == o.length ? o[0] : new HeapCursor(o)
  }
  get startSide() {
    return this.value ? this.value.startSide : 0
  }
  goto(e, t = -1e9) {
    for (var i of this.heap) i.goto(e, t)
    for (let e = this.heap.length >> 1; 0 <= e; e--) heapBubble(this.heap, e)
    return this.next(), this
  }
  forward(e, t) {
    for (var i of this.heap) i.forward(e, t)
    for (let e = this.heap.length >> 1; 0 <= e; e--) heapBubble(this.heap, e)
    ;(this.to - e || this.value.endSide - t) < 0 && this.next()
  }
  next() {
    if (0 == this.heap.length)
      (this.from = this.to = 1e9), (this.value = null), (this.rank = -1)
    else {
      let e = this.heap[0]
      ;(this.from = e.from),
        (this.to = e.to),
        (this.value = e.value),
        (this.rank = e.rank),
        e.value && e.next(),
        heapBubble(this.heap, 0)
    }
  }
}
function heapBubble(r, n) {
  for (let i = r[n]; ; ) {
    let e = 1 + (n << 1)
    if (e >= r.length) break
    let t = r[e]
    if (
      (e + 1 < r.length && 0 <= t.compare(r[e + 1]) && ((t = r[e + 1]), e++),
      i.compare(t) < 0)
    )
      break
    ;(r[e] = i), (r[n] = t), (n = e)
  }
}
class SpanCursor {
  constructor(e, t, i) {
    ;(this.minPoint = i),
      (this.active = []),
      (this.activeTo = []),
      (this.activeRank = []),
      (this.minActive = -1),
      (this.point = null),
      (this.pointFrom = 0),
      (this.pointRank = 0),
      (this.to = -1e9),
      (this.endSide = 0),
      (this.openStart = -1),
      (this.cursor = HeapCursor.from(e, t, i))
  }
  goto(e, t = -1e9) {
    return (
      this.cursor.goto(e, t),
      (this.active.length = this.activeTo.length = this.activeRank.length = 0),
      (this.minActive = -1),
      (this.to = e),
      (this.endSide = t),
      (this.openStart = -1),
      this.next(),
      this
    )
  }
  forward(e, t) {
    for (
      ;
      -1 < this.minActive &&
      (this.activeTo[this.minActive] - e ||
        this.active[this.minActive].endSide - t) < 0;

    )
      this.removeActive(this.minActive)
    this.cursor.forward(e, t)
  }
  removeActive(e) {
    remove(this.active, e),
      remove(this.activeTo, e),
      remove(this.activeRank, e),
      (this.minActive = findMinIndex(this.active, this.activeTo))
  }
  addActive(e) {
    let t = 0,
      { value: i, to: r, rank: n } = this.cursor
    for (; t < this.activeRank.length && this.activeRank[t] <= n; ) t++
    insert(this.active, t, i),
      insert(this.activeTo, t, r),
      insert(this.activeRank, t, n),
      e && insert(e, t, this.cursor.from),
      (this.minActive = findMinIndex(this.active, this.activeTo))
  }
  next() {
    var t = this.to,
      e = this.point
    this.point = null
    let i = this.openStart < 0 ? [] : null,
      r = 0
    for (;;) {
      var n = this.minActive
      if (
        -1 < n &&
        (this.activeTo[n] - this.cursor.from ||
          this.active[n].endSide - this.cursor.startSide) < 0
      ) {
        if (this.activeTo[n] > t) {
          ;(this.to = this.activeTo[n]), (this.endSide = this.active[n].endSide)
          break
        }
        this.removeActive(n), i && remove(i, n)
      } else {
        if (!this.cursor.value) {
          this.to = this.endSide = 1e9
          break
        }
        if (this.cursor.from > t) {
          ;(this.to = this.cursor.from), (this.endSide = this.cursor.startSide)
          break
        }
        n = this.cursor.value
        if (n.point) {
          if (
            !(
              e &&
              this.cursor.to == this.to &&
              this.cursor.from < this.cursor.to
            )
          ) {
            ;(this.point = n),
              (this.pointFrom = this.cursor.from),
              (this.pointRank = this.cursor.rank),
              (this.to = this.cursor.to),
              (this.endSide = n.endSide),
              this.cursor.from < t && (r = 1),
              this.cursor.next(),
              this.forward(this.to, this.endSide)
            break
          }
          this.cursor.next()
        } else this.addActive(i), this.cursor.next()
      }
    }
    if (i) {
      let e = 0
      for (; e < i.length && i[e] < t; ) e++
      this.openStart = e + r
    }
  }
  activeForPoint(t) {
    if (!this.active.length) return this.active
    let i = []
    for (
      let e = this.active.length - 1;
      0 <= e && !(this.activeRank[e] < this.pointRank);
      e--
    )
      (this.activeTo[e] > t ||
        (this.activeTo[e] == t &&
          this.active[e].endSide >= this.point.endSide)) &&
        i.push(this.active[e])
    return i.reverse()
  }
  openEnd(t) {
    let i = 0
    for (let e = this.activeTo.length - 1; 0 <= e && this.activeTo[e] > t; e--)
      i++
    return i
  }
}
function compare(e, t, i, r, n, o) {
  e.goto(t), i.goto(r)
  var s = r + n
  let a = r,
    l = r - t
  for (;;) {
    var h = e.to + l - i.to || e.endSide - i.endSide,
      c = h < 0 ? e.to + l : i.to,
      d = Math.min(c, s)
    if (
      (e.point || i.point
        ? (e.point &&
            i.point &&
            (e.point == i.point || e.point.eq(i.point)) &&
            sameValues(e.activeForPoint(e.to + l), i.activeForPoint(i.to))) ||
          o.comparePoint(a, d, e.point, i.point)
        : d > a &&
          !sameValues(e.active, i.active) &&
          o.compareRange(a, d, e.active, i.active),
      s < c)
    )
      break
    ;(a = c), h <= 0 && e.next(), 0 <= h && i.next()
  }
}
function sameValues(t, i) {
  if (t.length != i.length) return !1
  for (let e = 0; e < t.length; e++)
    if (t[e] != i[e] && !t[e].eq(i[e])) return !1
  return !0
}
function remove(i, r) {
  for (let e = r, t = i.length - 1; e < t; e++) i[e] = i[e + 1]
  i.pop()
}
function insert(t, i, e) {
  for (let e = t.length - 1; e >= i; e--) t[e + 1] = t[e]
  t[i] = e
}
function findMinIndex(t, i) {
  let r = -1,
    n = 1e9
  for (let e = 0; e < i.length; e++)
    (i[e] - n || t[e].endSide - t[r].endSide) < 0 && ((r = e), (n = i[e]))
  return r
}
function countColumn(t, i, r = t.length) {
  let n = 0
  for (let e = 0; e < r; )
    9 == t.charCodeAt(e)
      ? ((n += i - (n % i)), e++)
      : (n++, (e = findClusterBreak(t, e)))
  return n
}
function findColumn(i, r, n, e) {
  for (let e = 0, t = 0; ; ) {
    if (t >= r) return e
    if (e == i.length) break
    ;(t += 9 == i.charCodeAt(e) ? n - (t % n) : 1), (e = findClusterBreak(i, e))
  }
  return !0 === e ? -1 : i.length
}
const C = 'ͼ',
  COUNT = 'undefined' == typeof Symbol ? '__' + C : Symbol.for(C),
  SET =
    'undefined' == typeof Symbol
      ? '__styleSet' + Math.floor(1e8 * Math.random())
      : Symbol('styleSet'),
  top =
    'undefined' != typeof globalThis
      ? globalThis
      : 'undefined' != typeof window
      ? window
      : {}
class StyleModule {
  constructor(e, t) {
    this.rules = []
    let c = (t || {})['finish']
    function d(e) {
      return /^@/.test(e) ? [e] : e.split(/,\s*/)
    }
    for (var i in e)
      !(function e(i, t, r, n) {
        let o = [],
          s = /^@(\w+)\b/.exec(i[0]),
          a = s && 'keyframes' == s[1]
        if (s && null == t) return r.push(i[0] + ';')
        for (var l in t) {
          var h = t[l]
          if (/&/.test(l))
            e(
              l
                .split(/,\s*/)
                .map((t) => i.map((e) => t.replace(/&/, e)))
                .reduce((e, t) => e.concat(t)),
              h,
              r
            )
          else if (h && 'object' == typeof h) {
            if (!s)
              throw new RangeError(
                'The value of a property (' +
                  l +
                  ') should be a primitive value.'
              )
            e(d(l), h, o, a)
          } else
            null != h &&
              o.push(
                l
                  .replace(/_.*/, '')
                  .replace(/[A-Z]/g, (e) => '-' + e.toLowerCase()) +
                  ': ' +
                  h +
                  ';'
              )
        }
        ;(o.length || a) &&
          r.push(
            (!c || s || n ? i : i.map(c)).join(', ') + ' {' + o.join(' ') + '}'
          )
      })(d(i), e[i], this.rules)
  }
  getRules() {
    return this.rules.join('\n')
  }
  static newName() {
    let e = top[COUNT] || 1
    return (top[COUNT] = e + 1), C + e.toString(36)
  }
  static mount(e, t) {
    ;(e[SET] || new StyleSet(e)).mount(Array.isArray(t) ? t : [t])
  }
}
let adoptedSet = null
class StyleSet {
  constructor(t) {
    if (
      !t.head &&
      t.adoptedStyleSheets &&
      'undefined' != typeof CSSStyleSheet
    ) {
      if (adoptedSet)
        return (
          (t.adoptedStyleSheets = [adoptedSet.sheet].concat(
            t.adoptedStyleSheets
          )),
          (t[SET] = adoptedSet)
        )
      ;(this.sheet = new CSSStyleSheet()),
        (t.adoptedStyleSheets = [this.sheet].concat(t.adoptedStyleSheets)),
        (adoptedSet = this)
    } else {
      this.styleTag = (t.ownerDocument || t).createElement('style')
      let e = t.head || t
      e.insertBefore(this.styleTag, e.firstChild)
    }
    ;(this.modules = []), (t[SET] = this)
  }
  mount(r) {
    let n = this.sheet,
      o = 0,
      s = 0
    for (let i = 0; i < r.length; i++) {
      let t = r[i],
        e = this.modules.indexOf(t)
      if (
        (e < s && -1 < e && (this.modules.splice(e, 1), s--, (e = -1)), -1 == e)
      ) {
        if ((this.modules.splice(s++, 0, t), n))
          for (let e = 0; e < t.rules.length; e++) n.insertRule(t.rules[e], o++)
      } else {
        for (; s < e; ) o += this.modules[s++].rules.length
        ;(o += t.rules.length), s++
      }
    }
    if (!n) {
      let t = ''
      for (let e = 0; e < this.modules.length; e++)
        t += this.modules[e].getRules() + '\n'
      this.styleTag.textContent = t
    }
  }
}
for (
  var base = {
      8: 'Backspace',
      9: 'Tab',
      10: 'Enter',
      12: 'NumLock',
      13: 'Enter',
      16: 'Shift',
      17: 'Control',
      18: 'Alt',
      20: 'CapsLock',
      27: 'Escape',
      32: ' ',
      33: 'PageUp',
      34: 'PageDown',
      35: 'End',
      36: 'Home',
      37: 'ArrowLeft',
      38: 'ArrowUp',
      39: 'ArrowRight',
      40: 'ArrowDown',
      44: 'PrintScreen',
      45: 'Insert',
      46: 'Delete',
      59: ';',
      61: '=',
      91: 'Meta',
      92: 'Meta',
      106: '*',
      107: '+',
      108: ',',
      109: '-',
      110: '.',
      111: '/',
      144: 'NumLock',
      145: 'ScrollLock',
      160: 'Shift',
      161: 'Shift',
      162: 'Control',
      163: 'Control',
      164: 'Alt',
      165: 'Alt',
      173: '-',
      186: ';',
      187: '=',
      188: ',',
      189: '-',
      190: '.',
      191: '/',
      192: '`',
      219: '[',
      220: '\\',
      221: ']',
      222: "'",
      229: 'q',
    },
    shift = {
      48: ')',
      49: '!',
      50: '@',
      51: '#',
      52: '$',
      53: '%',
      54: '^',
      55: '&',
      56: '*',
      57: '(',
      59: ':',
      61: '+',
      173: '_',
      186: ':',
      187: '+',
      188: '<',
      189: '_',
      190: '>',
      191: '?',
      192: '~',
      219: '{',
      220: '|',
      221: '}',
      222: '"',
      229: 'Q',
    },
    chrome$1 =
      'undefined' != typeof navigator &&
      /Chrome\/(\d+)/.exec(navigator.userAgent),
    safari$1 =
      'undefined' != typeof navigator &&
      /Apple Computer/.test(navigator.vendor),
    gecko$1 =
      'undefined' != typeof navigator && /Gecko\/\d+/.test(navigator.userAgent),
    mac = 'undefined' != typeof navigator && /Mac/.test(navigator.platform),
    ie$1 =
      'undefined' != typeof navigator &&
      /MSIE \d|Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent),
    brokenModifierNames =
      (chrome$1 && (mac || +chrome$1[1] < 57)) || (gecko$1 && mac),
    i = 0;
  i < 10;
  i++
)
  base[48 + i] = base[96 + i] = String(i)
for (i = 1; i <= 24; i++) base[i + 111] = 'F' + i
for (var code, i = 65; i <= 90; i++)
  (base[i] = String.fromCharCode(i + 32)), (shift[i] = String.fromCharCode(i))
for (code in base) shift.hasOwnProperty(code) || (shift[code] = base[code])
function keyName(e) {
  e =
    (!(
      (brokenModifierNames && (e.ctrlKey || e.altKey || e.metaKey)) ||
      ((safari$1 || ie$1) && e.shiftKey && e.key && 1 == e.key.length)
    ) &&
      e.key) ||
    (e.shiftKey ? shift : base)[e.keyCode] ||
    e.key ||
    'Unidentified'
  return (e =
    'Down' ==
    (e =
      'Right' ==
      (e =
        'Up' ==
        (e =
          'Left' ==
          (e = 'Del' == (e = 'Esc' == e ? 'Escape' : e) ? 'Delete' : e)
            ? 'ArrowLeft'
            : e)
          ? 'ArrowUp'
          : e)
        ? 'ArrowRight'
        : e)
      ? 'ArrowDown'
      : e)
}
function getSelection(e) {
  let t
  return (t =
    11 != e.nodeType || e.getSelection ? e : e.ownerDocument).getSelection()
}
function contains(e, t) {
  return !!t && (e == t || e.contains(1 != t.nodeType ? t.parentNode : t))
}
function deepActiveElement() {
  let e = document.activeElement
  for (; e && e.shadowRoot; ) e = e.shadowRoot.activeElement
  return e
}
function hasSelection(e, t) {
  if (!t.anchorNode) return !1
  try {
    return contains(e, t.anchorNode)
  } catch (e) {
    return !1
  }
}
function clientRectsFor(e) {
  return 3 == e.nodeType
    ? textRange(e, 0, e.nodeValue.length).getClientRects()
    : 1 == e.nodeType
    ? e.getClientRects()
    : []
}
function isEquivalentPosition(e, t, i, r) {
  return !!i && (scanFor(e, t, i, r, -1) || scanFor(e, t, i, r, 1))
}
function domIndex(e) {
  for (var t = 0; ; t++) if (!(e = e.previousSibling)) return t
}
function scanFor(e, t, i, r, n) {
  for (;;) {
    if (e == i && t == r) return !0
    if (t == (n < 0 ? 0 : maxOffset(e))) {
      if ('DIV' == e.nodeName) return !1
      var o = e.parentNode
      if (!o || 1 != o.nodeType) return !1
      ;(t = domIndex(e) + (n < 0 ? 0 : 1)), (e = o)
    } else {
      if (1 != e.nodeType) return !1
      if (
        1 == (e = e.childNodes[t + (n < 0 ? -1 : 0)]).nodeType &&
        'false' == e.contentEditable
      )
        return !1
      t = n < 0 ? maxOffset(e) : 0
    }
  }
}
function maxOffset(e) {
  return (3 == e.nodeType ? e.nodeValue : e.childNodes).length
}
const Rect0 = { left: 0, right: 0, top: 0, bottom: 0 }
function flattenRect(e, t) {
  t = t ? e.left : e.right
  return { left: t, right: t, top: e.top, bottom: e.bottom }
}
function windowRect(e) {
  return { left: 0, right: e.innerWidth, top: 0, bottom: e.innerHeight }
}
function scrollRectIntoView(e, o, s, a, l, h, c, d) {
  let u = e.ownerDocument,
    f = u.defaultView
  for (let n = e; n; )
    if (1 == n.nodeType) {
      let e,
        t = n == u.body
      if (t) e = windowRect(f)
      else {
        if (
          n.scrollHeight <= n.clientHeight &&
          n.scrollWidth <= n.clientWidth
        ) {
          n = n.parentNode
          continue
        }
        var p = n.getBoundingClientRect()
        e = {
          left: p.left,
          right: p.left + n.clientWidth,
          top: p.top,
          bottom: p.top + n.clientHeight,
        }
      }
      let i = 0,
        r = 0
      var g, m
      if (
        ('nearest' == l
          ? o.top < e.top
            ? ((r = -(e.top - o.top + c)),
              0 < s &&
                o.bottom > e.bottom + r &&
                (r = o.bottom - e.bottom + r + c))
            : o.bottom > e.bottom &&
              ((r = o.bottom - e.bottom + c),
              s < 0 && o.top - r < e.top && (r = -(e.top + r - o.top + c)))
          : ((p = o.bottom - o.top),
            (g = e.bottom - e.top),
            (g =
              'center' == l && p <= g
                ? o.top + p / 2 - g / 2
                : 'start' == l || ('center' == l && s < 0)
                ? o.top - c
                : o.bottom - g + c),
            (r = g - e.top)),
        'nearest' == a
          ? o.left < e.left
            ? ((i = -(e.left - o.left + h)),
              0 < s && o.right > e.right + i && (i = o.right - e.right + i + h))
            : o.right > e.right &&
              ((i = o.right - e.right + h),
              s < 0 && o.left < e.left + i && (i = -(e.left + i - o.left + h)))
          : ((g =
              'center' == a
                ? o.left + (o.right - o.left) / 2 - (e.right - e.left) / 2
                : ('start' == a) == d
                ? o.left - h
                : o.right - (e.right - e.left) + h),
            (i = g - e.left)),
        (i || r) &&
          (t
            ? f.scrollBy(i, r)
            : (r &&
                ((m = n.scrollTop), (n.scrollTop += r), (r = n.scrollTop - m)),
              i &&
                ((m = n.scrollLeft),
                (n.scrollLeft += i),
                (i = n.scrollLeft - m)),
              (o = {
                left: o.left - i,
                top: o.top - r,
                right: o.right - i,
                bottom: o.bottom - r,
              }))),
        t)
      )
        break
      ;(n = n.assignedSlot || n.parentNode), (a = l = 'nearest')
    } else {
      if (11 != n.nodeType) break
      n = n.host
    }
}
class DOMSelectionState {
  constructor() {
    ;(this.anchorNode = null),
      (this.anchorOffset = 0),
      (this.focusNode = null),
      (this.focusOffset = 0)
  }
  eq(e) {
    return (
      this.anchorNode == e.anchorNode &&
      this.anchorOffset == e.anchorOffset &&
      this.focusNode == e.focusNode &&
      this.focusOffset == e.focusOffset
    )
  }
  setRange(e) {
    this.set(e.anchorNode, e.anchorOffset, e.focusNode, e.focusOffset)
  }
  set(e, t, i, r) {
    ;(this.anchorNode = e),
      (this.anchorOffset = t),
      (this.focusNode = i),
      (this.focusOffset = r)
  }
}
let preventScrollSupported = null
function focusPreventScroll(t) {
  if (t.setActive) return t.setActive()
  if (preventScrollSupported) return t.focus(preventScrollSupported)
  let n = []
  for (
    let e = t;
    e && (n.push(e, e.scrollTop, e.scrollLeft), e != e.ownerDocument);
    e = e.parentNode
  );
  if (
    (t.focus(
      null == preventScrollSupported
        ? {
            get preventScroll() {
              return (preventScrollSupported = { preventScroll: !0 }), !0
            },
          }
        : void 0
    ),
    !preventScrollSupported)
  ) {
    preventScrollSupported = !1
    for (let r = 0; r < n.length; ) {
      let e = n[r++],
        t = n[r++],
        i = n[r++]
      e.scrollTop != t && (e.scrollTop = t),
        e.scrollLeft != i && (e.scrollLeft = i)
    }
  }
}
let scratchRange
function textRange(e, t, i = t) {
  let r = (scratchRange = scratchRange || document.createRange())
  return r.setEnd(e, i), r.setStart(e, t), r
}
function dispatchKey(e, t, i) {
  t = { key: t, code: t, keyCode: i, which: i, cancelable: !0 }
  let r = new KeyboardEvent('keydown', t),
    n = ((r.synthetic = !0), e.dispatchEvent(r), new KeyboardEvent('keyup', t))
  return (
    (n.synthetic = !0),
    e.dispatchEvent(n),
    r.defaultPrevented || n.defaultPrevented
  )
}
function getRoot(e) {
  for (; e; ) {
    if (e && (9 == e.nodeType || (11 == e.nodeType && e.host))) return e
    e = e.assignedSlot || e.parentNode
  }
  return null
}
function clearAttributes(e) {
  for (; e.attributes.length; ) e.removeAttributeNode(e.attributes[0])
}
class DOMPos {
  constructor(e, t, i = !0) {
    ;(this.node = e), (this.offset = t), (this.precise = i)
  }
  static before(e, t) {
    return new DOMPos(e.parentNode, domIndex(e), t)
  }
  static after(e, t) {
    return new DOMPos(e.parentNode, domIndex(e) + 1, t)
  }
}
const noChildren = []
class ContentView {
  constructor() {
    ;(this.parent = null), (this.dom = null), (this.dirty = 2)
  }
  get editorView() {
    if (this.parent) return this.parent.editorView
    throw new Error('Accessing view in orphan content view')
  }
  get overrideDOMText() {
    return null
  }
  get posAtStart() {
    return this.parent ? this.parent.posBefore(this) : 0
  }
  get posAtEnd() {
    return this.posAtStart + this.length
  }
  posBefore(e) {
    let t = this.posAtStart
    for (var i of this.children) {
      if (i == e) return t
      t += i.length + i.breakAfter
    }
    throw new RangeError('Invalid child in posBefore')
  }
  posAfter(e) {
    return this.posBefore(e) + e.length
  }
  coordsAt(e, t) {
    return null
  }
  sync(r) {
    if (2 & this.dirty) {
      let e = this.dom,
        t = null,
        i
      for (var n of this.children) {
        var o
        if (
          (n.dirty &&
            (n.dom ||
              !(i = t ? t.nextSibling : e.firstChild) ||
              ((o = ContentView.get(i)) &&
                (o.parent || o.constructor != n.constructor)) ||
              n.reuseDOM(i),
            n.sync(r),
            (n.dirty = 0)),
          (i = t ? t.nextSibling : e.firstChild),
          r && !r.written && r.node == e && i != n.dom && (r.written = !0),
          n.dom.parentNode == e)
        )
          for (; i && i != n.dom; ) i = rm$1(i)
        else e.insertBefore(n.dom, i)
        t = n.dom
      }
      for (
        (i = t ? t.nextSibling : e.firstChild) &&
        r &&
        r.node == e &&
        (r.written = !0);
        i;

      )
        i = rm$1(i)
    } else if (1 & this.dirty)
      for (var e of this.children) e.dirty && (e.sync(r), (e.dirty = 0))
  }
  reuseDOM(e) {}
  localPosFromDOM(t, i) {
    let r
    if (t == this.dom) r = this.dom.childNodes[i]
    else {
      let e = 0 == maxOffset(t) ? 0 : 0 == i ? -1 : 1
      for (;;) {
        var n = t.parentNode
        if (n == this.dom) break
        0 == e &&
          n.firstChild != n.lastChild &&
          (e = t == n.firstChild ? -1 : 1),
          (t = n)
      }
      r = e < 0 ? t : t.nextSibling
    }
    if (r == this.dom.firstChild) return 0
    for (; r && !ContentView.get(r); ) r = r.nextSibling
    if (!r) return this.length
    for (let e = 0, t = 0; ; e++) {
      var o = this.children[e]
      if (o.dom == r) return t
      t += o.length + o.breakAfter
    }
  }
  domBoundsAround(o, s, e = 0) {
    let a = -1,
      l = -1,
      h = -1,
      c = -1
    for (let i = 0, r = e, n = e; i < this.children.length; i++) {
      let e = this.children[i],
        t = r + e.length
      if (r < o && s < t) return e.domBoundsAround(o, s, r)
      if (
        (o <= t && -1 == a && ((a = i), (l = r)),
        r > s && e.dom.parentNode == this.dom)
      ) {
        ;(h = i), (c = n)
        break
      }
      ;(n = t), (r = t + e.breakAfter)
    }
    return {
      from: l,
      to: c < 0 ? e + this.length : c,
      startDOM:
        (a ? this.children[a - 1].dom.nextSibling : null) ||
        this.dom.firstChild,
      endDOM: h < this.children.length && 0 <= h ? this.children[h].dom : null,
    }
  }
  markDirty(e = !1) {
    ;(this.dirty |= 2), this.markParentsDirty(e)
  }
  markParentsDirty(t) {
    for (let e = this.parent; e; e = e.parent) {
      if ((t && (e.dirty |= 2), 1 & e.dirty)) return
      ;(e.dirty |= 1), (t = !1)
    }
  }
  setParent(e) {
    this.parent != e &&
      ((this.parent = e), this.dirty && this.markParentsDirty(!0))
  }
  setDOM(e) {
    this.dom && (this.dom.cmView = null), ((this.dom = e).cmView = this)
  }
  get rootView() {
    for (let e = this; ; ) {
      var t = e.parent
      if (!t) return e
      e = t
    }
  }
  replaceChildren(e, i, t = noChildren) {
    this.markDirty()
    for (let t = e; t < i; t++) {
      let e = this.children[t]
      e.parent == this && e.destroy()
    }
    this.children.splice(e, i - e, ...t)
    for (let e = 0; e < t.length; e++) t[e].setParent(this)
  }
  ignoreMutation(e) {
    return !1
  }
  ignoreEvent(e) {
    return !1
  }
  childCursor(e = this.length) {
    return new ChildCursor(this.children, e, this.children.length)
  }
  childPos(e, t = 1) {
    return this.childCursor().findPos(e, t)
  }
  toString() {
    var e = this.constructor.name.replace('View', '')
    return (
      e +
      (this.children.length
        ? '(' + this.children.join() + ')'
        : this.length
        ? '[' + ('Text' == e ? this.text : this.length) + ']'
        : '') +
      (this.breakAfter ? '#' : '')
    )
  }
  static get(e) {
    return e.cmView
  }
  get isEditable() {
    return !0
  }
  merge(e, t, i, r, n, o) {
    return !1
  }
  become(e) {
    return !1
  }
  getSide() {
    return 0
  }
  destroy() {
    this.parent = null
  }
}
function rm$1(e) {
  var t = e.nextSibling
  return e.parentNode.removeChild(e), t
}
ContentView.prototype.breakAfter = 0
class ChildCursor {
  constructor(e, t, i) {
    ;(this.children = e), (this.pos = t), (this.i = i), (this.off = 0)
  }
  findPos(e, t = 1) {
    for (;;) {
      if (
        e > this.pos ||
        (e == this.pos &&
          (0 < t || 0 == this.i || this.children[this.i - 1].breakAfter))
      )
        return (this.off = e - this.pos), this
      var i = this.children[--this.i]
      this.pos -= i.length + i.breakAfter
    }
  }
}
function replaceRange(e, t, i, r, n, o, s, a, l) {
  let h = e['children'],
    c = h.length ? h[t] : null,
    d = o.length ? o[o.length - 1] : null
  var u = d ? d.breakAfter : s
  if (
    !(
      t == r &&
      c &&
      !s &&
      !u &&
      o.length < 2 &&
      c.merge(i, n, o.length ? d : null, 0 == i, a, l)
    )
  ) {
    if (r < h.length) {
      let e = h[r]
      e && n < e.length
        ? (t == r && ((e = e.split(n)), (n = 0)),
          !u && d && e.merge(0, n, d, !0, 0, l)
            ? (o[o.length - 1] = e)
            : (n && e.merge(0, n, null, !1, 0, l), o.push(e)))
        : null !== e &&
          void 0 !== e &&
          e.breakAfter &&
          (d ? (d.breakAfter = 1) : (s = 1)),
        r++
    }
    for (
      c &&
      ((c.breakAfter = s),
      0 < i &&
        (!s && o.length && c.merge(i, c.length, o[0], !1, a, 0)
          ? (c.breakAfter = o.shift().breakAfter)
          : (i < c.length ||
              (c.children.length &&
                0 == c.children[c.children.length - 1].length)) &&
            c.merge(i, c.length, null, !1, a, 0),
        t++));
      t < r && o.length;

    )
      if (h[r - 1].become(o[o.length - 1])) r--, o.pop(), (l = o.length ? 0 : a)
      else {
        if (!h[t].become(o[0])) break
        t++, o.shift(), (a = o.length ? 0 : l)
      }
    !o.length &&
      t &&
      r < h.length &&
      !h[t - 1].breakAfter &&
      h[r].merge(0, 0, h[t - 1], !1, a, l) &&
      t--,
      (t < r || o.length) && e.replaceChildren(t, r, o)
  }
}
function mergeChildrenInto(e, t, i, r, n, o) {
  let s = e.childCursor()
  var a,
    { i: l, off: h } = s.findPos(i, 1),
    { i: c, off: d } = s.findPos(t, -1)
  let u = t - i
  for (a of r) u += a.length
  ;(e.length += u), replaceRange(e, c, d, l, h, r, 0, n, o)
}
let nav =
    'undefined' != typeof navigator
      ? navigator
      : { userAgent: '', vendor: '', platform: '' },
  doc =
    'undefined' != typeof document
      ? document
      : { documentElement: { style: {} } }
const ie_edge = /Edge\/(\d+)/.exec(nav.userAgent),
  ie_upto10 = /MSIE \d/.test(nav.userAgent),
  ie_11up = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(nav.userAgent),
  ie = !!(ie_upto10 || ie_11up || ie_edge),
  gecko = !ie && /gecko\/(\d+)/i.test(nav.userAgent),
  chrome = !ie && /Chrome\/(\d+)/.exec(nav.userAgent),
  webkit = 'webkitFontSmoothing' in doc.documentElement.style,
  safari = !ie && /Apple Computer/.test(nav.vendor),
  ios = safari && (/Mobile\/\w+/.test(nav.userAgent) || 2 < nav.maxTouchPoints)
var browser = {
  mac: ios || /Mac/.test(nav.platform),
  windows: /Win/.test(nav.platform),
  linux: /Linux|X11/.test(nav.platform),
  ie: ie,
  ie_version: ie_upto10
    ? doc.documentMode || 6
    : ie_11up
    ? +ie_11up[1]
    : ie_edge
    ? +ie_edge[1]
    : 0,
  gecko: gecko,
  gecko_version: gecko
    ? +(/Firefox\/(\d+)/.exec(nav.userAgent) || [0, 0])[1]
    : 0,
  chrome: !!chrome,
  chrome_version: chrome ? +chrome[1] : 0,
  ios: ios,
  android: /Android\b/.test(nav.userAgent),
  webkit: webkit,
  safari: safari,
  webkit_version: webkit
    ? +(/\bAppleWebKit\/(\d+)/.exec(navigator.userAgent) || [0, 0])[1]
    : 0,
  tabSize:
    null != doc.documentElement.style.tabSize ? 'tab-size' : '-moz-tab-size',
}
const MaxJoinLen = 256
class TextView extends ContentView {
  constructor(e) {
    super(), (this.text = e)
  }
  get length() {
    return this.text.length
  }
  createDOM(e) {
    this.setDOM(e || document.createTextNode(this.text))
  }
  sync(e) {
    this.dom || this.createDOM(),
      this.dom.nodeValue != this.text &&
        (e && e.node == this.dom && (e.written = !0),
        (this.dom.nodeValue = this.text))
  }
  reuseDOM(e) {
    3 == e.nodeType && this.createDOM(e)
  }
  merge(e, t, i) {
    return (
      (!i ||
        (i instanceof TextView &&
          !(this.length - (t - e) + i.length > MaxJoinLen))) &&
      ((this.text =
        this.text.slice(0, e) + (i ? i.text : '') + this.text.slice(t)),
      this.markDirty(),
      !0)
    )
  }
  split(e) {
    var t = new TextView(this.text.slice(e))
    return (this.text = this.text.slice(0, e)), this.markDirty(), t
  }
  localPosFromDOM(e, t) {
    return e == this.dom ? t : t ? this.text.length : 0
  }
  domAtPos(e) {
    return new DOMPos(this.dom, e)
  }
  domBoundsAround(e, t, i) {
    return {
      from: i,
      to: i + this.length,
      startDOM: this.dom,
      endDOM: this.dom.nextSibling,
    }
  }
  coordsAt(e, t) {
    return textCoords(this.dom, e, t)
  }
}
class MarkView extends ContentView {
  constructor(e, t = [], i = 0) {
    super(), (this.mark = e), (this.children = t), (this.length = i)
    for (var r of t) r.setParent(this)
  }
  setAttrs(e) {
    if (
      (clearAttributes(e),
      this.mark.class && (e.className = this.mark.class),
      this.mark.attrs)
    )
      for (var t in this.mark.attrs) e.setAttribute(t, this.mark.attrs[t])
    return e
  }
  reuseDOM(e) {
    e.nodeName == this.mark.tagName.toUpperCase() &&
      (this.setDOM(e), (this.dirty |= 6))
  }
  sync(e) {
    this.dom
      ? 4 & this.dirty && this.setAttrs(this.dom)
      : this.setDOM(this.setAttrs(document.createElement(this.mark.tagName))),
      super.sync(e)
  }
  merge(e, t, i, r, n, o) {
    return (
      (!i ||
        !(
          !(i instanceof MarkView && i.mark.eq(this.mark)) ||
          (e && n <= 0) ||
          (t < this.length && o <= 0)
        )) &&
      (mergeChildrenInto(this, e, t, i ? i.children : [], n - 1, o - 1),
      this.markDirty(),
      !0)
    )
  }
  split(e) {
    let t = [],
      i = 0,
      r = -1,
      n = 0
    for (var o of this.children) {
      var s = i + o.length
      e < s && t.push(i < e ? o.split(e - i) : o),
        r < 0 && i >= e && (r = n),
        (i = s),
        n++
    }
    var a = this.length - e
    return (
      (this.length = e),
      -1 < r && ((this.children.length = r), this.markDirty()),
      new MarkView(this.mark, t, a)
    )
  }
  domAtPos(e) {
    return inlineDOMAtPos(this.dom, this.children, e)
  }
  coordsAt(e, t) {
    return coordsInChildren(this, e, t)
  }
}
function textCoords(e, t, i) {
  var r = e.nodeValue.length
  let n = (t = r < t ? r : t),
    o = t,
    s = 0
  ;(0 == t && i < 0) || (t == r && 0 <= i)
    ? browser.chrome ||
      browser.gecko ||
      (t ? (n--, (s = 1)) : o < r && (o++, (s = -1)))
    : i < 0
    ? n--
    : o < r && o++
  t = textRange(e, n, o).getClientRects()
  if (!t.length) return Rect0
  let a = t[(s ? s < 0 : 0 <= i) ? 0 : t.length - 1]
  return (
    browser.safari &&
      !s &&
      0 == a.width &&
      (a = Array.prototype.find.call(t, (e) => e.width) || a),
    s ? flattenRect(a, s < 0) : a || null
  )
}
class WidgetView extends ContentView {
  constructor(e, t, i) {
    super(),
      (this.widget = e),
      (this.length = t),
      (this.side = i),
      (this.prevWidget = null)
  }
  static create(e, t, i) {
    return new (e.customView || WidgetView)(e, t, i)
  }
  split(e) {
    var t = WidgetView.create(this.widget, this.length - e, this.side)
    return (this.length -= e), t
  }
  sync() {
    ;(this.dom && this.widget.updateDOM(this.dom)) ||
      (this.dom && this.prevWidget && this.prevWidget.destroy(this.dom),
      (this.prevWidget = null),
      this.setDOM(this.widget.toDOM(this.editorView)),
      (this.dom.contentEditable = 'false'))
  }
  getSide() {
    return this.side
  }
  merge(e, t, i, r, n, o) {
    return (
      !(
        i &&
        (!(i instanceof WidgetView && this.widget.compare(i.widget)) ||
          (0 < e && n <= 0) ||
          (t < this.length && o <= 0))
      ) && ((this.length = e + (i ? i.length : 0) + (this.length - t)), !0)
    )
  }
  become(e) {
    return (
      e.length == this.length &&
      e instanceof WidgetView &&
      e.side == this.side &&
      this.widget.constructor == e.widget.constructor &&
      (this.widget.eq(e.widget) || this.markDirty(!0),
      this.dom && !this.prevWidget && (this.prevWidget = this.widget),
      (this.widget = e.widget),
      !0)
    )
  }
  ignoreMutation() {
    return !0
  }
  ignoreEvent(e) {
    return this.widget.ignoreEvent(e)
  }
  get overrideDOMText() {
    if (0 == this.length) return Text.empty
    let e = this
    for (; e.parent; ) e = e.parent
    let t = e.editorView,
      i = t && t.state.doc,
      r = this.posAtStart
    return i ? i.slice(r, r + this.length) : Text.empty
  }
  domAtPos(e) {
    return 0 == e
      ? DOMPos.before(this.dom)
      : DOMPos.after(this.dom, e == this.length)
  }
  domBoundsAround() {
    return null
  }
  coordsAt(t, e) {
    let i = this.dom.getClientRects(),
      r = null
    if (!i.length) return Rect0
    for (
      let e = 0 < t ? i.length - 1 : 0;
      (r = i[e]), !(0 < t ? 0 == e : e == i.length - 1 || r.top < r.bottom);
      e += 0 < t ? -1 : 1
    );
    return (0 == t && 0 < e) || (t == this.length && e <= 0)
      ? r
      : flattenRect(r, 0 == t)
  }
  get isEditable() {
    return !1
  }
  destroy() {
    super.destroy(), this.dom && this.widget.destroy(this.dom)
  }
}
class CompositionView extends WidgetView {
  domAtPos(e) {
    let { topView: t, text: i } = this.widget
    return t
      ? scanCompositionTree(
          e,
          0,
          t,
          i,
          (e, t) => e.domAtPos(t),
          (e) => new DOMPos(i, Math.min(e, i.nodeValue.length))
        )
      : new DOMPos(i, Math.min(e, i.nodeValue.length))
  }
  sync() {
    this.setDOM(this.widget.toDOM())
  }
  localPosFromDOM(e, t) {
    var { topView: i, text: r } = this.widget
    return i
      ? posFromDOMInCompositionTree(e, t, i, r)
      : Math.min(t, this.length)
  }
  ignoreMutation() {
    return !1
  }
  get overrideDOMText() {
    return null
  }
  coordsAt(e, t) {
    let { topView: i, text: r } = this.widget
    return i
      ? scanCompositionTree(
          e,
          t,
          i,
          r,
          (e, t, i) => e.coordsAt(t, i),
          (e, t) => textCoords(r, e, t)
        )
      : textCoords(r, e, t)
  }
  destroy() {
    var e
    super.destroy(), null != (e = this.widget.topView) && e.destroy()
  }
  get isEditable() {
    return !0
  }
}
function scanCompositionTree(e, t, i, r, n, o) {
  if (i instanceof MarkView) {
    for (var s of i.children) {
      var a = contains(s.dom, r),
        l = (a ? r.nodeValue : s).length
      if (e < l || (e == l && s.getSide() <= 0))
        return a ? scanCompositionTree(e, t, s, r, n, o) : n(s, e, t)
      e -= l
    }
    return n(i, i.length, -1)
  }
  return i.dom == r ? o(e, t) : n(i, e, t)
}
function posFromDOMInCompositionTree(i, r, e, n) {
  if (e instanceof MarkView)
    for (var o of e.children) {
      let e = 0,
        t = contains(o.dom, n)
      if (contains(o.dom, i))
        return (
          e +
          (t
            ? posFromDOMInCompositionTree(i, r, o, n)
            : o.localPosFromDOM(i, r))
        )
      e += (t ? n.nodeValue : o).length
    }
  else if (e.dom == n) return Math.min(r, n.nodeValue.length)
  return e.localPosFromDOM(i, r)
}
class WidgetBufferView extends ContentView {
  constructor(e) {
    super(), (this.side = e)
  }
  get length() {
    return 0
  }
  merge() {
    return !1
  }
  become(e) {
    return e instanceof WidgetBufferView && e.side == this.side
  }
  split() {
    return new WidgetBufferView(this.side)
  }
  sync() {
    if (!this.dom) {
      let e = document.createElement('img')
      ;(e.className = 'cm-widgetBuffer'),
        e.setAttribute('aria-hidden', 'true'),
        this.setDOM(e)
    }
  }
  getSide() {
    return this.side
  }
  domAtPos(e) {
    return DOMPos.before(this.dom)
  }
  localPosFromDOM() {
    return 0
  }
  domBoundsAround() {
    return null
  }
  coordsAt(e) {
    var t = this.dom.getBoundingClientRect(),
      i = inlineSiblingRect(this, 0 < this.side ? -1 : 1)
    return i && i.top < t.bottom && i.bottom > t.top
      ? { left: t.left, right: t.right, top: i.top, bottom: i.bottom }
      : t
  }
  get overrideDOMText() {
    return Text.empty
  }
}
function inlineSiblingRect(e, t) {
  let i = e.parent,
    r = i ? i.children.indexOf(e) : -1
  for (; i && 0 <= r; )
    if (t < 0 ? 0 < r : r < i.children.length) {
      let e = i.children[r + t]
      if (e instanceof TextView) {
        var n = e.coordsAt(t < 0 ? e.length : 0, t)
        if (n) return n
      }
      r += t
    } else {
      if (!(i instanceof MarkView && i.parent)) {
        let e = i.dom.lastChild
        if (e && 'BR' == e.nodeName) return e.getClientRects()[0]
        break
      }
      ;(r = i.parent.children.indexOf(i) + (t < 0 ? 0 : 1)), (i = i.parent)
    }
}
function inlineDOMAtPos(r, n, o) {
  let s = 0
  for (let i = 0; s < n.length; s++) {
    let e = n[s],
      t = i + e.length
    if (!(t == i && e.getSide() <= 0)) {
      if (o > i && o < t && e.dom.parentNode == r) return e.domAtPos(o - i)
      if (o <= i) break
      i = t
    }
  }
  for (; 0 < s; s--) {
    var e = n[s - 1].dom
    if (e.parentNode == r) return DOMPos.after(e)
  }
  return new DOMPos(r, 0)
}
function joinInlineInto(e, t, i) {
  let r,
    n = e['children']
  0 < i &&
  t instanceof MarkView &&
  n.length &&
  (r = n[n.length - 1]) instanceof MarkView &&
  r.mark.eq(t.mark)
    ? joinInlineInto(r, t.children[0], i - 1)
    : (n.push(t), t.setParent(e)),
    (e.length += t.length)
}
function coordsInChildren(o, s, a) {
  for (let r = 0, n = 0; n < o.children.length; n++) {
    let t = o.children[n],
      i = r + t.length,
      e
    if (
      (a <= 0 || i == o.length || 0 < t.getSide() ? s <= i : s < i) &&
      (s < i ||
        n + 1 == o.children.length ||
        (e = o.children[n + 1]).length ||
        0 < e.getSide())
    ) {
      let e = 0
      if (i == r) {
        if (t.getSide() <= 0) continue
        e = a = -t.getSide()
      }
      var l = t.coordsAt(Math.max(0, s - r), a)
      return e && l ? flattenRect(l, a < 0) : l
    }
    r = i
  }
  var e = o.dom.lastChild
  if (!e) return o.dom.getBoundingClientRect()
  e = clientRectsFor(e)
  return e[e.length - 1] || null
}
function combineAttrs(e, t) {
  for (var i in e)
    'class' == i && t.class
      ? (t.class += ' ' + e.class)
      : 'style' == i && t.style
      ? (t.style += ';' + e.style)
      : (t[i] = e[i])
  return t
}
function attrsEq(e, t) {
  if (e == t) return !0
  if (!e || !t) return !1
  let i = Object.keys(e),
    r = Object.keys(t)
  if (i.length != r.length) return !1
  for (var n of i) if (-1 == r.indexOf(n) || e[n] !== t[n]) return !1
  return !0
}
function updateAttrs(e, t, i) {
  let r = null
  if (t) for (var n in t) (i && n in i) || e.removeAttribute((r = n))
  if (i) for (var o in i) (t && t[o] == i[o]) || e.setAttribute((r = o), i[o])
  return !!r
}
TextView.prototype.children =
  WidgetView.prototype.children =
  WidgetBufferView.prototype.children =
    noChildren
class WidgetType {
  eq(e) {
    return !1
  }
  updateDOM(e) {
    return !1
  }
  compare(e) {
    return this == e || (this.constructor == e.constructor && this.eq(e))
  }
  get estimatedHeight() {
    return -1
  }
  ignoreEvent(e) {
    return !0
  }
  get customView() {
    return null
  }
  destroy(e) {}
}
var BlockType = (function (e) {
  return (
    (e[(e.Text = 0)] = 'Text'),
    (e[(e.WidgetBefore = 1)] = 'WidgetBefore'),
    (e[(e.WidgetAfter = 2)] = 'WidgetAfter'),
    (e[(e.WidgetRange = 3)] = 'WidgetRange'),
    e
  )
})((BlockType = BlockType || {}))
class Decoration extends RangeValue {
  constructor(e, t, i, r) {
    super(),
      (this.startSide = e),
      (this.endSide = t),
      (this.widget = i),
      (this.spec = r)
  }
  get heightRelevant() {
    return !1
  }
  static mark(e) {
    return new MarkDecoration(e)
  }
  static widget(e) {
    let t = e.side || 0,
      i = !!e.block
    return (
      (t += i ? (0 < t ? 3e8 : -4e8) : 0 < t ? 1e8 : -1e8),
      new PointDecoration(e, t, t, i, e.widget || null, !1)
    )
  }
  static replace(e) {
    let t = !!e.block,
      i,
      r
    var n, o
    return (
      (r = e.isBlockGap
        ? ((i = -5e8), 4e8)
        : (({ start: n, end: o } = getInclusive(e, t)),
          (i = (n ? (t ? -3e8 : -1) : 5e8) - 1),
          1 + (o ? (t ? 2e8 : 1) : -6e8))),
      new PointDecoration(e, i, r, t, e.widget || null, !0)
    )
  }
  static line(e) {
    return new LineDecoration(e)
  }
  static set(e, t = !1) {
    return RangeSet.of(e, t)
  }
  hasHeight() {
    return !!this.widget && -1 < this.widget.estimatedHeight
  }
}
Decoration.none = RangeSet.empty
class MarkDecoration extends Decoration {
  constructor(e) {
    var { start: t, end: i } = getInclusive(e)
    super(t ? -1 : 5e8, i ? 1 : -6e8, null, e),
      (this.tagName = e.tagName || 'span'),
      (this.class = e.class || ''),
      (this.attrs = e.attributes || null)
  }
  eq(e) {
    return (
      this == e ||
      (e instanceof MarkDecoration &&
        this.tagName == e.tagName &&
        this.class == e.class &&
        attrsEq(this.attrs, e.attrs))
    )
  }
  range(e, t = e) {
    if (t <= e) throw new RangeError('Mark decorations may not be empty')
    return super.range(e, t)
  }
}
MarkDecoration.prototype.point = !1
class LineDecoration extends Decoration {
  constructor(e) {
    super(-2e8, -2e8, null, e)
  }
  eq(e) {
    return (
      e instanceof LineDecoration &&
      attrsEq(this.spec.attributes, e.spec.attributes)
    )
  }
  range(e, t = e) {
    if (t != e)
      throw new RangeError('Line decoration ranges must be zero-length')
    return super.range(e, t)
  }
}
;(LineDecoration.prototype.mapMode = MapMode.TrackBefore),
  (LineDecoration.prototype.point = !0)
class PointDecoration extends Decoration {
  constructor(e, t, i, r, n, o) {
    super(t, i, n, e),
      (this.block = r),
      (this.isReplace = o),
      (this.mapMode = r
        ? t <= 0
          ? MapMode.TrackBefore
          : MapMode.TrackAfter
        : MapMode.TrackDel)
  }
  get type() {
    return this.startSide < this.endSide
      ? BlockType.WidgetRange
      : this.startSide <= 0
      ? BlockType.WidgetBefore
      : BlockType.WidgetAfter
  }
  get heightRelevant() {
    return this.block || (!!this.widget && 5 <= this.widget.estimatedHeight)
  }
  eq(e) {
    return (
      e instanceof PointDecoration &&
      widgetsEq(this.widget, e.widget) &&
      this.block == e.block &&
      this.startSide == e.startSide &&
      this.endSide == e.endSide
    )
  }
  range(e, t = e) {
    if (
      this.isReplace &&
      (t < e || (e == t && 0 < this.startSide && this.endSide <= 0))
    )
      throw new RangeError('Invalid range for replacement decoration')
    if (this.isReplace || t == e) return super.range(e, t)
    throw new RangeError('Widget decorations can only have zero-length ranges')
  }
}
function getInclusive(e, t = !1) {
  let { inclusiveStart: i, inclusiveEnd: r } = e
  return (
    null == i && (i = e.inclusive),
    null == r && (r = e.inclusive),
    {
      start: null !== i && void 0 !== i ? i : t,
      end: null !== r && void 0 !== r ? r : t,
    }
  )
}
function widgetsEq(e, t) {
  return e == t || !!(e && t && e.compare(t))
}
function addRange(e, t, i, r = 0) {
  var n = i.length - 1
  0 <= n && i[n] + r >= e ? (i[n] = Math.max(i[n], t)) : i.push(e, t)
}
PointDecoration.prototype.point = !0
class LineView extends ContentView {
  constructor() {
    super(...arguments),
      (this.children = []),
      (this.length = 0),
      (this.prevAttrs = void 0),
      (this.attrs = null),
      (this.breakAfter = 0)
  }
  merge(e, t, i, r, n, o) {
    if (i) {
      if (!(i instanceof LineView)) return !1
      this.dom || i.transferDOM(this)
    }
    return (
      r && this.setDeco(i ? i.attrs : null),
      mergeChildrenInto(this, e, t, i ? i.children : [], n, o),
      !0
    )
  }
  split(e) {
    let t = new LineView()
    if (((t.breakAfter = this.breakAfter), 0 == this.length)) return t
    let { i, off: r } = this.childPos(e)
    r &&
      (t.append(this.children[i].split(r), 0),
      this.children[i].merge(r, this.children[i].length, null, !1, 0, 0),
      i++)
    for (let e = i; e < this.children.length; e++) t.append(this.children[e], 0)
    for (; 0 < i && 0 == this.children[i - 1].length; )
      this.children[--i].destroy()
    return (this.children.length = i), this.markDirty(), (this.length = e), t
  }
  transferDOM(e) {
    this.dom &&
      (this.markDirty(),
      e.setDOM(this.dom),
      (e.prevAttrs = void 0 === this.prevAttrs ? this.attrs : this.prevAttrs),
      (this.prevAttrs = void 0),
      (this.dom = null))
  }
  setDeco(e) {
    attrsEq(this.attrs, e) ||
      (this.dom && ((this.prevAttrs = this.attrs), this.markDirty()),
      (this.attrs = e))
  }
  append(e, t) {
    joinInlineInto(this, e, t)
  }
  addLineDeco(e) {
    var t = e.spec.attributes,
      e = e.spec.class
    t && (this.attrs = combineAttrs(t, this.attrs || {})),
      e && (this.attrs = combineAttrs({ class: e }, this.attrs || {}))
  }
  domAtPos(e) {
    return inlineDOMAtPos(this.dom, this.children, e)
  }
  reuseDOM(e) {
    'DIV' == e.nodeName && (this.setDOM(e), (this.dirty |= 6))
  }
  sync(e) {
    this.dom
      ? 4 & this.dirty &&
        (clearAttributes(this.dom),
        (this.dom.className = 'cm-line'),
        (this.prevAttrs = this.attrs ? null : void 0))
      : (this.setDOM(document.createElement('div')),
        (this.dom.className = 'cm-line'),
        (this.prevAttrs = this.attrs ? null : void 0)),
      void 0 !== this.prevAttrs &&
        (updateAttrs(this.dom, this.prevAttrs, this.attrs),
        this.dom.classList.add('cm-line'),
        (this.prevAttrs = void 0)),
      super.sync(e)
    let t = this.dom.lastChild
    for (; t && ContentView.get(t) instanceof MarkView; ) t = t.lastChild
    if (
      !(
        t &&
        this.length &&
        ('BR' == t.nodeName ||
          0 != (null == (e = ContentView.get(t)) ? void 0 : e.isEditable) ||
          (browser.ios && this.children.some((e) => e instanceof TextView)))
      )
    ) {
      let e = document.createElement('BR')
      ;(e.cmIgnore = !0), this.dom.appendChild(e)
    }
  }
  measureTextSize() {
    if (0 == this.children.length || 20 < this.length) return null
    let e = 0
    for (var t of this.children) {
      if (!(t instanceof TextView)) return null
      t = clientRectsFor(t.dom)
      if (1 != t.length) return null
      e += t[0].width
    }
    return {
      lineHeight: this.dom.getBoundingClientRect().height,
      charWidth: e / this.length,
    }
  }
  coordsAt(e, t) {
    return coordsInChildren(this, e, t)
  }
  become(e) {
    return !1
  }
  get type() {
    return BlockType.Text
  }
  static find(i, r) {
    for (let e = 0, t = 0; e < i.children.length; e++) {
      var n = i.children[e],
        o = t + n.length
      if (r <= o) {
        if (n instanceof LineView) return n
        if (r < o) break
      }
      t = o + n.breakAfter
    }
    return null
  }
}
class BlockWidgetView extends ContentView {
  constructor(e, t, i) {
    super(),
      (this.widget = e),
      (this.length = t),
      (this.type = i),
      (this.breakAfter = 0),
      (this.prevWidget = null)
  }
  merge(e, t, i, r, n, o) {
    return (
      !(
        i &&
        (!(i instanceof BlockWidgetView && this.widget.compare(i.widget)) ||
          (0 < e && n <= 0) ||
          (t < this.length && o <= 0))
      ) && ((this.length = e + (i ? i.length : 0) + (this.length - t)), !0)
    )
  }
  domAtPos(e) {
    return 0 == e
      ? DOMPos.before(this.dom)
      : DOMPos.after(this.dom, e == this.length)
  }
  split(e) {
    var t = this.length - e
    this.length = e
    let i = new BlockWidgetView(this.widget, t, this.type)
    return (i.breakAfter = this.breakAfter), i
  }
  get children() {
    return noChildren
  }
  sync() {
    ;(this.dom && this.widget.updateDOM(this.dom)) ||
      (this.dom && this.prevWidget && this.prevWidget.destroy(this.dom),
      (this.prevWidget = null),
      this.setDOM(this.widget.toDOM(this.editorView)),
      (this.dom.contentEditable = 'false'))
  }
  get overrideDOMText() {
    return this.parent
      ? this.parent.view.state.doc.slice(this.posAtStart, this.posAtEnd)
      : Text.empty
  }
  domBoundsAround() {
    return null
  }
  become(e) {
    return (
      e instanceof BlockWidgetView &&
      e.type == this.type &&
      e.widget.constructor == this.widget.constructor &&
      (e.widget.eq(this.widget) || this.markDirty(!0),
      this.dom && !this.prevWidget && (this.prevWidget = this.widget),
      (this.widget = e.widget),
      (this.length = e.length),
      (this.breakAfter = e.breakAfter),
      !0)
    )
  }
  ignoreMutation() {
    return !0
  }
  ignoreEvent(e) {
    return this.widget.ignoreEvent(e)
  }
  destroy() {
    super.destroy(), this.dom && this.widget.destroy(this.dom)
  }
}
class ContentBuilder {
  constructor(e, t, i, r) {
    ;(this.doc = e),
      (this.pos = t),
      (this.end = i),
      (this.disallowBlockEffectsFor = r),
      (this.content = []),
      (this.curLine = null),
      (this.breakAtStart = 0),
      (this.pendingBuffer = 0),
      (this.atCursorPos = !0),
      (this.openStart = -1),
      (this.openEnd = -1),
      (this.text = ''),
      (this.textOff = 0),
      (this.cursor = e.iter()),
      (this.skip = t)
  }
  posCovered() {
    if (0 == this.content.length)
      return !this.breakAtStart && this.doc.lineAt(this.pos).from != this.pos
    var e = this.content[this.content.length - 1]
    return !(
      e.breakAfter ||
      (e instanceof BlockWidgetView && e.type == BlockType.WidgetBefore)
    )
  }
  getLine() {
    return (
      this.curLine ||
        (this.content.push((this.curLine = new LineView())),
        (this.atCursorPos = !0)),
      this.curLine
    )
  }
  flushBuffer(e) {
    this.pendingBuffer &&
      (this.curLine.append(wrapMarks(new WidgetBufferView(-1), e), e.length),
      (this.pendingBuffer = 0))
  }
  addBlockWidget(e) {
    this.flushBuffer([]), (this.curLine = null), this.content.push(e)
  }
  finish(e) {
    e ? (this.pendingBuffer = 0) : this.flushBuffer([]),
      this.posCovered() || this.getLine()
  }
  buildText(e, t, i) {
    for (; 0 < e; ) {
      if (this.textOff == this.text.length) {
        var { value: r, lineBreak: n, done: o } = this.cursor.next(this.skip)
        if (((this.skip = 0), o))
          throw new Error('Ran out of text content when drawing inline views')
        if (n) {
          this.posCovered() || this.getLine(),
            this.content.length
              ? (this.content[this.content.length - 1].breakAfter = 1)
              : (this.breakAtStart = 1),
            this.flushBuffer([]),
            (this.curLine = null),
            e--
          continue
        }
        ;(this.text = r), (this.textOff = 0)
      }
      o = Math.min(this.text.length - this.textOff, e, 512)
      this.flushBuffer(t.slice(0, i)),
        this.getLine().append(
          wrapMarks(
            new TextView(this.text.slice(this.textOff, this.textOff + o)),
            t
          ),
          i
        ),
        (this.atCursorPos = !0),
        (this.textOff += o),
        (e -= o),
        (i = 0)
    }
  }
  span(e, t, i, r) {
    this.buildText(t - e, i, r),
      (this.pos = t),
      this.openStart < 0 && (this.openStart = r)
  }
  point(t, i, r, n, o, s) {
    if (this.disallowBlockEffectsFor[s] && r instanceof PointDecoration) {
      if (r.block)
        throw new RangeError(
          'Block decorations may not be specified via plugins'
        )
      if (i > this.doc.lineAt(this.pos).to)
        throw new RangeError(
          'Decorations that replace line breaks may not be specified via plugins'
        )
    }
    s = i - t
    if (r instanceof PointDecoration)
      if (r.block) {
        var a = r['type']
        a != BlockType.WidgetAfter || this.posCovered() || this.getLine(),
          this.addBlockWidget(
            new BlockWidgetView(r.widget || new NullWidget('div'), s, a)
          )
      } else {
        var a = WidgetView.create(
            r.widget || new NullWidget('span'),
            s,
            r.startSide
          ),
          l =
            this.atCursorPos &&
            !a.isEditable &&
            o <= n.length &&
            (t < i || 0 < r.startSide),
          h = !a.isEditable && (t < i || r.startSide <= 0)
        let e = this.getLine()
        2 != this.pendingBuffer || l || (this.pendingBuffer = 0),
          this.flushBuffer(n),
          l &&
            (e.append(wrapMarks(new WidgetBufferView(1), n), o),
            (o = n.length + Math.max(0, o - n.length))),
          e.append(wrapMarks(a, n), o),
          (this.atCursorPos = h),
          (this.pendingBuffer = h ? (t < i ? 1 : 2) : 0)
      }
    else
      this.doc.lineAt(this.pos).from == this.pos &&
        this.getLine().addLineDeco(r)
    s &&
      (this.textOff + s <= this.text.length
        ? (this.textOff += s)
        : ((this.skip += s - (this.text.length - this.textOff)),
          (this.text = ''),
          (this.textOff = 0)),
      (this.pos = i)),
      this.openStart < 0 && (this.openStart = o)
  }
  static build(e, t, i, r, n) {
    let o = new ContentBuilder(e, t, i, n)
    return (
      (o.openEnd = RangeSet.spans(r, t, i, o)),
      o.openStart < 0 && (o.openStart = o.openEnd),
      o.finish(o.openEnd),
      o
    )
  }
}
function wrapMarks(e, t) {
  for (var i of t) e = new MarkView(i, [e], e.length)
  return e
}
class NullWidget extends WidgetType {
  constructor(e) {
    super(), (this.tag = e)
  }
  eq(e) {
    return e.tag == this.tag
  }
  toDOM() {
    return document.createElement(this.tag)
  }
  updateDOM(e) {
    return e.nodeName.toLowerCase() == this.tag
  }
}
const clickAddsSelectionRange = Facet.define(),
  dragMovesSelection$1 = Facet.define(),
  mouseSelectionStyle = Facet.define(),
  exceptionSink = Facet.define(),
  updateListener = Facet.define(),
  inputHandler$1 = Facet.define(),
  perLineTextDirection = Facet.define({ combine: (e) => e.some((e) => e) })
class ScrollTarget {
  constructor(e, t = 'nearest', i = 'nearest', r = 5, n = 5) {
    ;(this.range = e),
      (this.y = t),
      (this.x = i),
      (this.yMargin = r),
      (this.xMargin = n)
  }
  map(e) {
    return e.empty
      ? this
      : new ScrollTarget(
          this.range.map(e),
          this.y,
          this.x,
          this.yMargin,
          this.xMargin
        )
  }
}
const scrollIntoView$1 = StateEffect.define({ map: (e, t) => e.map(t) })
function logException(e, t, i) {
  let r = e.facet(exceptionSink)
  r.length
    ? r[0](t)
    : window.onerror
    ? window.onerror(String(t), i, void 0, void 0, t)
    : i
    ? console.error(i + ':', t)
    : console.error(t)
}
const editable = Facet.define({ combine: (e) => !e.length || e[0] })
let nextPluginID = 0
const viewPlugin = Facet.define()
class ViewPlugin {
  constructor(e, t, i, r) {
    ;(this.id = e),
      (this.create = t),
      (this.domEventHandlers = i),
      (this.extension = r(this))
  }
  static define(e, t) {
    const { eventHandlers: i, provide: r, decorations: n } = t || {}
    return new ViewPlugin(nextPluginID++, e, i, (t) => {
      let e = [viewPlugin.of(t)]
      return (
        n &&
          e.push(
            decorations.of((e) => {
              e = e.plugin(t)
              return e ? n(e) : Decoration.none
            })
          ),
        r && e.push(r(t)),
        e
      )
    })
  }
  static fromClass(t, e) {
    return ViewPlugin.define((e) => new t(e), e)
  }
}
class PluginInstance {
  constructor(e) {
    ;(this.spec = e), (this.mustUpdate = null), (this.value = null)
  }
  update(t) {
    if (this.value) {
      if (this.mustUpdate) {
        var i = this.mustUpdate
        if (((this.mustUpdate = null), this.value.update))
          try {
            this.value.update(i)
          } catch (e) {
            if (
              (logException(i.state, e, 'CodeMirror plugin crashed'),
              this.value.destroy)
            )
              try {
                this.value.destroy()
              } catch (e) {}
            this.deactivate()
          }
      }
    } else if (this.spec)
      try {
        this.value = this.spec.create(t)
      } catch (e) {
        logException(t.state, e, 'CodeMirror plugin crashed'), this.deactivate()
      }
    return this
  }
  destroy(t) {
    var e
    if (null != (e = this.value) && e.destroy)
      try {
        this.value.destroy()
      } catch (e) {
        logException(t.state, e, 'CodeMirror plugin crashed')
      }
  }
  deactivate() {
    this.spec = this.value = null
  }
}
const editorAttributes = Facet.define(),
  contentAttributes = Facet.define(),
  decorations = Facet.define(),
  atomicRanges = Facet.define(),
  scrollMargins = Facet.define(),
  styleModule = Facet.define()
class ChangedRange {
  constructor(e, t, i, r) {
    ;(this.fromA = e), (this.toA = t), (this.fromB = i), (this.toB = r)
  }
  join(e) {
    return new ChangedRange(
      Math.min(this.fromA, e.fromA),
      Math.max(this.toA, e.toA),
      Math.min(this.fromB, e.fromB),
      Math.max(this.toB, e.toB)
    )
  }
  addToSet(e) {
    let t = e.length,
      i = this
    for (; 0 < t; t--) {
      var r = e[t - 1]
      if (!(r.fromA > i.toA)) {
        if (r.toA < i.fromA) break
        ;(i = i.join(r)), e.splice(t - 1, 1)
      }
    }
    return e.splice(t, 0, i), e
  }
  static extendWithRanges(n, o) {
    if (0 == o.length) return n
    var s = []
    for (let e = 0, t = 0, i = 0, r = 0; ; e++) {
      for (
        var a = e == n.length ? null : n[e], l = i - r, h = a ? a.fromB : 1e9;
        t < o.length && o[t] < h;

      ) {
        var c = o[t],
          d = o[t + 1],
          c = Math.max(r, c),
          u = Math.min(h, d)
        if ((c <= u && new ChangedRange(c + l, u + l, c, u).addToSet(s), h < d))
          break
        t += 2
      }
      if (!a) return s
      new ChangedRange(a.fromA, a.toA, a.fromB, a.toB).addToSet(s),
        (i = a.toA),
        (r = a.toB)
    }
  }
}
class ViewUpdate {
  constructor(e, t, i) {
    ;(this.view = e),
      (this.state = t),
      (this.transactions = i),
      (this.flags = 0),
      (this.startState = e.state),
      (this.changes = ChangeSet.empty(this.startState.doc.length))
    for (var r of i) this.changes = this.changes.compose(r.changes)
    let n = []
    this.changes.iterChangedRanges((e, t, i, r) =>
      n.push(new ChangedRange(e, t, i, r))
    ),
      (this.changedRanges = n)
    t = e.hasFocus
    t != e.inputState.notifiedFocused &&
      ((e.inputState.notifiedFocused = t), (this.flags |= 1))
  }
  static create(e, t, i) {
    return new ViewUpdate(e, t, i)
  }
  get viewportChanged() {
    return 0 < (4 & this.flags)
  }
  get heightChanged() {
    return 0 < (2 & this.flags)
  }
  get geometryChanged() {
    return this.docChanged || 0 < (10 & this.flags)
  }
  get focusChanged() {
    return 0 < (1 & this.flags)
  }
  get docChanged() {
    return !this.changes.empty
  }
  get selectionSet() {
    return this.transactions.some((e) => e.selection)
  }
  get empty() {
    return 0 == this.flags && 0 == this.transactions.length
  }
}
var Direction = (function (e) {
  return (e[(e.LTR = 0)] = 'LTR'), (e[(e.RTL = 1)] = 'RTL'), e
})((Direction = Direction || {}))
const LTR = Direction.LTR,
  RTL = Direction.RTL
function dec(t) {
  let i = []
  for (let e = 0; e < t.length; e++) i.push(1 << +t[e])
  return i
}
const LowTypes = dec(
    '88888888888888888888888888888888888666888888787833333333337888888000000000000000000000000008888880000000000000000000000000088888888888888888888888888888888888887866668888088888663380888308888800000000000000000000000800000000000000000000000000000008'
  ),
  ArabicTypes = dec(
    '4444448826627288999999999992222222222222222222222222222222222222222222222229999999999999999999994444444444644222822222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222999999949999999229989999223333333333'
  ),
  Brackets = Object.create(null),
  BracketStack = []
for (let i of ['()', '[]', '{}']) {
  let e = i.charCodeAt(0),
    t = i.charCodeAt(1)
  ;(Brackets[e] = t), (Brackets[t] = -e)
}
function charType(e) {
  return e <= 247
    ? LowTypes[e]
    : 1424 <= e && e <= 1524
    ? 2
    : 1536 <= e && e <= 1785
    ? ArabicTypes[e - 1536]
    : 1774 <= e && e <= 2220
    ? 4
    : (8192 <= e && e <= 8203) || 8204 == e
    ? 256
    : 1
}
const BidiRE = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/
class BidiSpan {
  constructor(e, t, i) {
    ;(this.from = e), (this.to = t), (this.level = i)
  }
  get dir() {
    return this.level % 2 ? RTL : LTR
  }
  side(e, t) {
    return (this.dir == t) == e ? this.to : this.from
  }
  static find(t, i, r, n) {
    let o = -1
    for (let e = 0; e < t.length; e++) {
      var s = t[e]
      if (s.from <= i && s.to >= i) {
        if (s.level == r) return e
        ;(o < 0 ||
          (0 != n ? (n < 0 ? s.from < i : s.to > i) : t[o].level > s.level)) &&
          (o = e)
      }
    }
    if (o < 0) throw new RangeError('Index out of range')
    return o
  }
}
const types = []
function computeOrder(s, e) {
  var a = s.length,
    l = e == LTR ? 1 : 2,
    h = e == LTR ? 2 : 1
  if (!s || (1 == l && !BidiRE.test(s))) return trivialOrder(a)
  for (let t = 0, i = l, r = l; t < a; t++) {
    let e = charType(s.charCodeAt(t))
    512 == e ? (e = i) : 8 == e && 4 == r && (e = 16),
      (types[t] = 4 == e ? 2 : e),
      7 & e && (r = e),
      (i = e)
  }
  for (let i = 0, r = l, n = l; i < a; i++) {
    let e = types[i]
    if (128 == e)
      i < a - 1 && r == types[i + 1] && 24 & r
        ? (e = types[i] = r)
        : (types[i] = 256)
    else if (64 == e) {
      let t = i + 1
      for (; t < a && 64 == types[t]; ) t++
      var o = (i && 8 == r) || (t < a && 8 == types[t]) ? (1 == n ? 1 : 8) : 256
      for (let e = i; e < t; e++) types[e] = o
      i = t - 1
    } else 8 == e && 1 == n && (types[i] = 1)
    7 & (r = e) && (n = e)
  }
  for (let t = 0, i = 0, e = 0, r, n, o; t < a; t++)
    if ((n = Brackets[(r = s.charCodeAt(t))]))
      if (n < 0) {
        for (let e = i - 3; 0 <= e; e -= 3)
          if (BracketStack[e + 1] == -n) {
            var c = BracketStack[e + 2],
              c = 2 & c ? l : 4 & c ? (1 & c ? h : l) : 0
            c && (types[t] = types[BracketStack[e]] = c), (i = e)
            break
          }
      } else {
        if (189 == BracketStack.length) break
        ;(BracketStack[i++] = t),
          (BracketStack[i++] = r),
          (BracketStack[i++] = e)
      }
    else if (2 == (o = types[t]) || 1 == o) {
      var d = o == l
      e = d ? 0 : 1
      for (let e = i - 3; 0 <= e; e -= 3) {
        var u = BracketStack[e + 2]
        if (2 & u) break
        if (d) BracketStack[e + 2] |= 2
        else {
          if (4 & u) break
          BracketStack[e + 2] |= 4
        }
      }
    }
  for (let i = 0; i < a; i++)
    if (256 == types[i]) {
      let t = i + 1
      for (; t < a && 256 == types[t]; ) t++
      var r = 1 == (i ? types[i - 1] : l),
        n = r == (1 == (t < a ? types[t] : l)) ? (r ? 1 : 2) : l
      for (let e = i; e < t; e++) types[e] = n
      i = t - 1
    }
  let i = []
  if (1 == l)
    for (let t = 0; t < a; ) {
      for (var f = t, p = 1 != types[t++]; t < a && p == (1 != types[t]); ) t++
      if (p)
        for (let e = t; e > f; ) {
          for (
            var g = e, m = 2 != types[--e];
            e > f && m == (2 != types[e - 1]);

          )
            e--
          i.push(new BidiSpan(e, g, m ? 2 : 1))
        }
      else i.push(new BidiSpan(f, t, 0))
    }
  else
    for (let e = 0; e < a; ) {
      for (var t = e, v = 2 == types[e++]; e < a && v == (2 == types[e]); ) e++
      i.push(new BidiSpan(t, e, v ? 1 : 2))
    }
  return i
}
function trivialOrder(e) {
  return [new BidiSpan(0, e, 0)]
}
let movedOver = ''
function moveVisually(e, t, i, r, n) {
  let o = r.head - e.from,
    s = -1
  if (0 == o) {
    if (!n || !e.length) return null
    t[0].level != i && ((o = t[0].side(!1, i)), (s = 0))
  } else if (o == e.length) {
    if (n) return null
    let e = t[t.length - 1]
    e.level != i && ((o = e.side(!0, i)), (s = t.length - 1))
  }
  let a =
    t[
      (s =
        s < 0
          ? BidiSpan.find(t, o, null != (l = r.bidiLevel) ? l : -1, r.assoc)
          : s)
    ]
  o == a.side(n, i) && ((a = t[(s += n ? 1 : -1)]), (o = a.side(!n, i)))
  var l = n == (a.dir == i),
    r = findClusterBreak(e.text, o, l)
  if (
    ((movedOver = e.text.slice(Math.min(o, r), Math.max(o, r))),
    r != a.side(n, i))
  )
    return EditorSelection.cursor(r + e.from, l ? -1 : 1, a.level)
  let h = s == (n ? t.length - 1 : 0) ? null : t[s + (n ? 1 : -1)]
  return h || a.level == i
    ? h && h.level < a.level
      ? EditorSelection.cursor(h.side(!n, i) + e.from, n ? 1 : -1, h.level)
      : EditorSelection.cursor(r + e.from, n ? -1 : 1, a.level)
    : EditorSelection.cursor(n ? e.to : e.from, n ? -1 : 1, i)
}
const LineBreakPlaceholder = '￿'
class DOMReader {
  constructor(e, t) {
    ;(this.points = e),
      (this.text = ''),
      (this.lineSeparator = t.facet(EditorState.lineSeparator))
  }
  append(e) {
    this.text += e
  }
  lineBreak() {
    this.text += LineBreakPlaceholder
  }
  readRange(t, i) {
    if (!t) return this
    var r = t.parentNode
    for (let e = t; ; ) {
      this.findPointBefore(r, e), this.readNode(e)
      var n = e.nextSibling
      if (n == i) break
      var o = ContentView.get(e),
        s = ContentView.get(n)
      ;(o && s
        ? o.breakAfter
        : (o ? o.breakAfter : isBlockElement(e)) ||
          (isBlockElement(n) && ('BR' != e.nodeName || e.cmIgnore))) &&
        this.lineBreak(),
        (e = n)
    }
    return this.findPointBefore(r, i), this
  }
  readTextNode(o) {
    let s = o.nodeValue
    for (var e of this.points)
      e.node == o && (e.pos = this.text.length + Math.min(e.offset, s.length))
    for (let r = 0, n = this.lineSeparator ? null : /\r\n?|\n/g; ; ) {
      let e = -1,
        t = 1,
        i
      if (
        (this.lineSeparator
          ? ((e = s.indexOf(this.lineSeparator, r)),
            (t = this.lineSeparator.length))
          : (i = n.exec(s)) && ((e = i.index), (t = i[0].length)),
        this.append(s.slice(r, e < 0 ? s.length : e)),
        e < 0)
      )
        break
      if ((this.lineBreak(), 1 < t))
        for (var a of this.points)
          a.node == o && a.pos > this.text.length && (a.pos -= t - 1)
      r = e + t
    }
  }
  readNode(e) {
    if (!e.cmIgnore) {
      var i = ContentView.get(e)
      let t = i && i.overrideDOMText
      if (null != t) {
        this.findPointInside(e, t.length)
        for (let e = t.iter(); !e.next().done; )
          e.lineBreak ? this.lineBreak() : this.append(e.value)
      } else
        3 == e.nodeType
          ? this.readTextNode(e)
          : 'BR' == e.nodeName
          ? e.nextSibling && this.lineBreak()
          : 1 == e.nodeType && this.readRange(e.firstChild, null)
    }
  }
  findPointBefore(e, t) {
    for (var i of this.points)
      i.node == e && e.childNodes[i.offset] == t && (i.pos = this.text.length)
  }
  findPointInside(e, t) {
    for (var i of this.points)
      (3 == e.nodeType ? i.node == e : e.contains(i.node)) &&
        (i.pos = this.text.length + Math.min(t, i.offset))
  }
}
function isBlockElement(e) {
  return (
    1 == e.nodeType &&
    /^(DIV|P|LI|UL|OL|BLOCKQUOTE|DD|DT|H\d|SECTION|PRE)$/.test(e.nodeName)
  )
}
class DOMPoint {
  constructor(e, t) {
    ;(this.node = e), (this.offset = t), (this.pos = -1)
  }
}
class DocView extends ContentView {
  constructor(e) {
    super(),
      (this.view = e),
      (this.compositionDeco = Decoration.none),
      (this.decorations = []),
      (this.dynamicDecorationMap = []),
      (this.minWidth = 0),
      (this.minWidthFrom = 0),
      (this.minWidthTo = 0),
      (this.impreciseAnchor = null),
      (this.impreciseHead = null),
      (this.forceSelection = !1),
      (this.lastUpdate = Date.now()),
      this.setDOM(e.contentDOM),
      (this.children = [new LineView()]),
      this.children[0].setParent(this),
      this.updateDeco(),
      this.updateInner([new ChangedRange(0, 0, 0, e.state.doc.length)], 0)
  }
  get root() {
    return this.view.root
  }
  get editorView() {
    return this.view
  }
  get length() {
    return this.view.state.doc.length
  }
  update(e) {
    let t = e.changedRanges
    0 < this.minWidth &&
      t.length &&
      (t.every(
        ({ fromA: e, toA: t }) => t < this.minWidthFrom || e > this.minWidthTo
      )
        ? ((this.minWidthFrom = e.changes.mapPos(this.minWidthFrom, 1)),
          (this.minWidthTo = e.changes.mapPos(this.minWidthTo, 1)))
        : (this.minWidth = this.minWidthFrom = this.minWidthTo = 0)),
      this.view.inputState.composing < 0
        ? (this.compositionDeco = Decoration.none)
        : (e.transactions.length || this.dirty) &&
          (this.compositionDeco = computeCompositionDeco(this.view, e.changes)),
      (browser.ie || browser.chrome) &&
        !this.compositionDeco.size &&
        e &&
        e.state.doc.lines != e.startState.doc.lines &&
        (this.forceSelection = !0)
    var i = findChangedDeco(this.decorations, this.updateDeco(), e.changes)
    return (
      (t = ChangedRange.extendWithRanges(t, i)),
      (0 != this.dirty || 0 != t.length) &&
        (this.updateInner(t, e.startState.doc.length),
        e.transactions.length && (this.lastUpdate = Date.now()),
        !0)
    )
  }
  updateInner(e, t) {
    ;(this.view.viewState.mustMeasureContent = !0), this.updateChildren(e, t)
    let i = this.view['observer'],
      r =
        (i.ignore(() => {
          ;(this.dom.style.height = this.view.viewState.contentHeight + 'px'),
            (this.dom.style.flexBasis = this.minWidth
              ? this.minWidth + 'px'
              : '')
          var e =
            browser.chrome || browser.ios
              ? { node: i.selectionRange.focusNode, written: !1 }
              : void 0
          this.sync(e),
            (this.dirty = 0),
            e &&
              (e.written || i.selectionRange.focusNode != e.node) &&
              (this.forceSelection = !0),
            (this.dom.style.height = '')
        }),
        [])
    if (
      this.view.viewport.from ||
      this.view.viewport.to < this.view.state.doc.length
    )
      for (var n of this.children)
        n instanceof BlockWidgetView &&
          n.widget instanceof BlockGapWidget &&
          r.push(n.dom)
    i.updateGaps(r)
  }
  updateChildren(t, e) {
    let i = this.childCursor(e)
    for (let e = t.length - 1; ; e--) {
      var r = 0 <= e ? t[e] : null
      if (!r) break
      var { fromA: r, toA: n, fromB: o, toB: s } = r,
        {
          content: o,
          breakAtStart: s,
          openStart: a,
          openEnd: l,
        } = ContentBuilder.build(
          this.view.state.doc,
          o,
          s,
          this.decorations,
          this.dynamicDecorationMap
        ),
        { i: n, off: h } = i.findPos(n, 1),
        { i: r, off: c } = i.findPos(r, -1)
      replaceRange(this, r, c, n, h, o, s, a, l)
    }
  }
  updateSelection(e = !1, t = !1) {
    if (
      (e && this.view.observer.readSelectionRange(),
      !(
        (!t && !this.mayControlSelection()) ||
        (browser.ios && this.view.inputState.rapidCompositionStart)
      ))
    ) {
      let t = this.forceSelection,
        r = ((this.forceSelection = !1), this.view.state.selection.main),
        n = this.domAtPos(r.anchor),
        o = r.empty ? n : this.domAtPos(r.head)
      if (browser.gecko && r.empty && betweenUneditable(n)) {
        let e = document.createTextNode('')
        this.view.observer.ignore(() =>
          n.node.insertBefore(e, n.node.childNodes[n.offset] || null)
        ),
          (n = o = new DOMPos(e, 0)),
          (t = !0)
      }
      let s = this.view.observer.selectionRange
      ;(!t &&
        s.focusNode &&
        isEquivalentPosition(n.node, n.offset, s.anchorNode, s.anchorOffset) &&
        isEquivalentPosition(o.node, o.offset, s.focusNode, s.focusOffset)) ||
        (this.view.observer.ignore(() => {
          browser.android &&
            browser.chrome &&
            this.dom.contains(s.focusNode) &&
            inUneditable(s.focusNode, this.dom) &&
            (this.dom.blur(), this.dom.focus({ preventScroll: !0 }))
          let t = getSelection(this.root)
          var e, i
          if (r.empty)
            browser.gecko &&
              (e = nextToUneditable(n.node, n.offset)) &&
              3 != e &&
              (i = nearbyTextNode(n.node, n.offset, 1 == e ? 1 : -1)) &&
              (n = new DOMPos(i, 1 == e ? 0 : i.nodeValue.length)),
              t.collapse(n.node, n.offset),
              null != r.bidiLevel &&
                null != s.cursorBidiLevel &&
                (s.cursorBidiLevel = r.bidiLevel)
          else if (t.extend)
            t.collapse(n.node, n.offset), t.extend(o.node, o.offset)
          else {
            let e = document.createRange()
            r.anchor > r.head && ([n, o] = [o, n]),
              e.setEnd(o.node, o.offset),
              e.setStart(n.node, n.offset),
              t.removeAllRanges(),
              t.addRange(e)
          }
        }),
        this.view.observer.setSelectionRange(n, o)),
        (this.impreciseAnchor = n.precise
          ? null
          : new DOMPos(s.anchorNode, s.anchorOffset)),
        (this.impreciseHead = o.precise
          ? null
          : new DOMPos(s.focusNode, s.focusOffset))
    }
  }
  enforceCursorAssoc() {
    if (!this.compositionDeco.size) {
      var t,
        i,
        r = this.view.state.selection.main
      let e = getSelection(this.root)
      r.empty &&
        r.assoc &&
        e.modify &&
        (t = LineView.find(this, r.head)) &&
        ((i = t.posAtStart),
        r.head != i &&
          r.head != i + t.length &&
          ((i = this.coordsAt(r.head, -1)),
          (t = this.coordsAt(r.head, 1)),
          !i ||
            !t ||
            i.bottom > t.top ||
            ((i = this.domAtPos(r.head + r.assoc)),
            e.collapse(i.node, i.offset),
            e.modify(
              'move',
              r.assoc < 0 ? 'forward' : 'backward',
              'lineboundary'
            ))))
    }
  }
  mayControlSelection() {
    return this.view.state.facet(editable)
      ? this.root.activeElement == this.dom
      : hasSelection(this.dom, this.view.observer.selectionRange)
  }
  nearest(t) {
    for (let e = t; e; ) {
      var i = ContentView.get(e)
      if (i && i.rootView == this) return i
      e = e.parentNode
    }
    return null
  }
  posFromDOM(e, t) {
    let i = this.nearest(e)
    if (i) return i.localPosFromDOM(e, t) + i.posAtStart
    throw new RangeError(
      'Trying to find position for a DOM position outside of the document'
    )
  }
  domAtPos(e) {
    let { i: t, off: i } = this.childCursor().findPos(e, -1)
    for (; t < this.children.length - 1; ) {
      var r = this.children[t]
      if (i < r.length || r instanceof LineView) break
      t++, (i = 0)
    }
    return this.children[t].domAtPos(i)
  }
  coordsAt(n, o) {
    for (let i = this.length, r = this.children.length - 1; ; r--) {
      let e = this.children[r],
        t = i - e.breakAfter - e.length
      if (
        t < n ||
        (n == t &&
          e.type != BlockType.WidgetBefore &&
          e.type != BlockType.WidgetAfter &&
          (!r ||
            2 == o ||
            this.children[r - 1].breakAfter ||
            (this.children[r - 1].type == BlockType.WidgetBefore && -2 < o)))
      )
        return e.coordsAt(n - t, o)
      i = t
    }
  }
  measureVisibleLineHeights(e) {
    let n = [],
      { from: o, to: s } = e
    var a,
      l,
      h = this.view.contentDOM.clientWidth,
      c = h > Math.max(this.view.scrollDOM.clientWidth, this.minWidth) + 1
    let d = -1,
      u = this.view.textDirection == Direction.LTR
    for (let i = 0, r = 0; r < this.children.length; r++) {
      let e = this.children[r],
        t = i + e.length
      if (s < t) break
      i >= o &&
        ((l = e.dom.getBoundingClientRect()),
        n.push(l.height),
        c &&
          (a = (a = e.dom.lastChild) ? clientRectsFor(a) : []).length &&
          ((a = a[a.length - 1]),
          (l = u ? a.right - l.left : l.right - a.left) > d &&
            ((d = l),
            (this.minWidth = h),
            (this.minWidthFrom = i),
            (this.minWidthTo = t)))),
        (i = t + e.breakAfter)
    }
    return n
  }
  textDirectionAt(e) {
    e = this.childPos(e, 1).i
    return 'rtl' == getComputedStyle(this.children[e].dom).direction
      ? Direction.RTL
      : Direction.LTR
  }
  measureTextSize() {
    for (var e of this.children)
      if (e instanceof LineView) {
        e = e.measureTextSize()
        if (e) return e
      }
    let t = document.createElement('div'),
      i,
      r
    return (
      (t.className = 'cm-line'),
      (t.textContent = 'abc def ghi jkl mno pqr stu'),
      this.view.observer.ignore(() => {
        this.dom.appendChild(t)
        var e = clientRectsFor(t.firstChild)[0]
        ;(i = t.getBoundingClientRect().height),
          (r = e ? e.width / 27 : 7),
          t.remove()
      }),
      { lineHeight: i, charWidth: r }
    )
  }
  childCursor(e = this.length) {
    let t = this.children.length
    return (
      t && (e -= this.children[--t].length),
      new ChildCursor(this.children, e, t)
    )
  }
  computeBlockGapDeco() {
    let i = [],
      r = this.view.viewState
    for (let e = 0, t = 0; ; t++) {
      var n,
        o = t == r.viewports.length ? null : r.viewports[t],
        s = o ? o.from - 1 : this.length
      if (
        (s > e &&
          ((n = r.lineBlockAt(s).bottom - r.lineBlockAt(e).top),
          i.push(
            Decoration.replace({
              widget: new BlockGapWidget(n),
              block: !0,
              inclusive: !0,
              isBlockGap: !0,
            }).range(e, s)
          )),
        !o)
      )
        break
      e = o.to + 1
    }
    return Decoration.set(i)
  }
  updateDeco() {
    var t = this.view.state.facet(decorations).map((e, t) => {
      return (this.dynamicDecorationMap[t] = 'function' == typeof e)
        ? e(this.view)
        : e
    })
    for (let e = t.length; e < t.length + 3; e++)
      this.dynamicDecorationMap[e] = !1
    return (this.decorations = [
      ...t,
      this.compositionDeco,
      this.computeBlockGapDeco(),
      this.view.viewState.lineGapDeco,
    ])
  }
  scrollIntoView(n) {
    var o,
      s,
      a,
      l = n['range']
    let h = this.coordsAt(
        l.head,
        l.empty ? l.assoc : l.head > l.anchor ? -1 : 1
      ),
      c
    if (h) {
      !l.empty &&
        (c = this.coordsAt(l.anchor, l.anchor > l.head ? -1 : 1)) &&
        (h = {
          left: Math.min(h.left, c.left),
          top: Math.min(h.top, c.top),
          right: Math.max(h.right, c.right),
          bottom: Math.max(h.bottom, c.bottom),
        })
      let e = 0,
        t = 0,
        i = 0,
        r = 0
      for (var d of this.view.state
        .facet(scrollMargins)
        .map((e) => e(this.view)))
        d &&
          (({ left: d, right: o, top: s, bottom: a } = d),
          null != d && (e = Math.max(e, d)),
          null != o && (t = Math.max(t, o)),
          null != s && (i = Math.max(i, s)),
          null != a && (r = Math.max(r, a)))
      var u = {
        left: h.left - e,
        top: h.top - i,
        right: h.right + t,
        bottom: h.bottom + r,
      }
      scrollRectIntoView(
        this.view.scrollDOM,
        u,
        l.head < l.anchor ? -1 : 1,
        n.x,
        n.y,
        n.xMargin,
        n.yMargin,
        this.view.textDirection == Direction.LTR
      )
    }
  }
}
function betweenUneditable(e) {
  return (
    1 == e.node.nodeType &&
    e.node.firstChild &&
    (0 == e.offset ||
      'false' == e.node.childNodes[e.offset - 1].contentEditable) &&
    (e.offset == e.node.childNodes.length ||
      'false' == e.node.childNodes[e.offset].contentEditable)
  )
}
class BlockGapWidget extends WidgetType {
  constructor(e) {
    super(), (this.height = e)
  }
  toDOM() {
    var e = document.createElement('div')
    return this.updateDOM(e), e
  }
  eq(e) {
    return e.height == this.height
  }
  updateDOM(e) {
    return (e.style.height = this.height + 'px'), !0
  }
  get estimatedHeight() {
    return this.height
  }
}
function compositionSurroundingNode(i) {
  var r = i.observer.selectionRange,
    r = r.focusNode && nearbyTextNode(r.focusNode, r.focusOffset, 0)
  if (!r) return null
  let n = i.docView.nearest(r)
  if (!n) return null
  if (n instanceof LineView) {
    let e = r
    for (; e.parentNode != n.dom; ) e = e.parentNode
    let t = e.previousSibling
    for (; t && !ContentView.get(t); ) t = t.previousSibling
    i = t ? ContentView.get(t).posAtEnd : n.posAtStart
    return { from: i, to: i, node: e, text: r }
  }
  for (;;) {
    var e = n['parent']
    if (!e) return null
    if (e instanceof LineView) break
    n = e
  }
  i = n.posAtStart
  return { from: i, to: i + n.length, node: n.dom, text: r }
}
function computeCompositionDeco(e, t) {
  var i = compositionSurroundingNode(e)
  if (!i) return Decoration.none
  var { from: i, to: r, node: n, text: o } = i
  let s = t.mapPos(i, 1),
    a = Math.max(s, t.mapPos(r, -1)),
    l = e['state'],
    h =
      3 == n.nodeType
        ? n.nodeValue
        : new DOMReader([], l).readRange(n.firstChild, null).text
  if (a - s < h.length)
    if (
      l.doc.sliceString(
        s,
        Math.min(l.doc.length, s + h.length),
        LineBreakPlaceholder
      ) == h
    )
      a = s + h.length
    else {
      if (
        l.doc.sliceString(Math.max(0, a - h.length), a, LineBreakPlaceholder) !=
        h
      )
        return Decoration.none
      s = a - h.length
    }
  else if (l.doc.sliceString(s, a, LineBreakPlaceholder) != h)
    return Decoration.none
  let c = ContentView.get(n)
  return (
    c instanceof CompositionView
      ? (c = c.widget.topView)
      : c && (c.parent = null),
    Decoration.set(
      Decoration.replace({
        widget: new CompositionWidget(n, o, c),
        inclusive: !0,
      }).range(s, a)
    )
  )
}
class CompositionWidget extends WidgetType {
  constructor(e, t, i) {
    super(), (this.top = e), (this.text = t), (this.topView = i)
  }
  eq(e) {
    return this.top == e.top && this.text == e.text
  }
  toDOM() {
    return this.top
  }
  ignoreEvent() {
    return !1
  }
  get customView() {
    return CompositionView
  }
}
function nearbyTextNode(e, t, i) {
  for (;;) {
    if (3 == e.nodeType) return e
    if (1 == e.nodeType && 0 < t && i <= 0)
      t = maxOffset((e = e.childNodes[t - 1]))
    else {
      if (!(1 == e.nodeType && t < e.childNodes.length && 0 <= i)) return null
      ;(e = e.childNodes[t]), (t = 0)
    }
  }
}
function nextToUneditable(e, t) {
  return 1 != e.nodeType
    ? 0
    : (t && 'false' == e.childNodes[t - 1].contentEditable ? 1 : 0) |
        (t < e.childNodes.length && 'false' == e.childNodes[t].contentEditable
          ? 2
          : 0)
}
class DecorationComparator$1 {
  constructor() {
    this.changes = []
  }
  compareRange(e, t) {
    addRange(e, t, this.changes)
  }
  comparePoint(e, t) {
    addRange(e, t, this.changes)
  }
}
function findChangedDeco(e, t, i) {
  var r = new DecorationComparator$1()
  return RangeSet.compare(e, t, i, r), r.changes
}
function inUneditable(t, i) {
  for (let e = t; e && e != i; e = e.assignedSlot || e.parentNode)
    if (1 == e.nodeType && 'false' == e.contentEditable) return !0
  return !1
}
function groupAt(e, t, i = 1) {
  let r = e.charCategorizer(t),
    n = e.doc.lineAt(t),
    o = t - n.from
  if (0 == n.length) return EditorSelection.cursor(t)
  0 == o ? (i = 1) : o == n.length && (i = -1)
  let s = o,
    a = o
  i < 0
    ? (s = findClusterBreak(n.text, o, !1))
    : (a = findClusterBreak(n.text, o))
  for (var l = r(n.text.slice(s, a)); 0 < s; ) {
    var h = findClusterBreak(n.text, s, !1)
    if (r(n.text.slice(h, s)) != l) break
    s = h
  }
  for (; a < n.length; ) {
    var c = findClusterBreak(n.text, a)
    if (r(n.text.slice(a, c)) != l) break
    a = c
  }
  return EditorSelection.range(s + n.from, a + n.from)
}
function getdx(e, t) {
  return t.left > e ? t.left - e : Math.max(0, e - t.right)
}
function getdy(e, t) {
  return t.top > e ? t.top - e : Math.max(0, e - t.bottom)
}
function yOverlap(e, t) {
  return e.top < t.bottom - 1 && e.bottom > t.top + 1
}
function upTop(e, t) {
  return t < e.top
    ? { top: t, left: e.left, right: e.right, bottom: e.bottom }
    : e
}
function upBot(e, t) {
  return t > e.bottom
    ? { top: e.top, left: e.left, right: e.right, bottom: t }
    : e
}
function domPosAtCoords(e, r, n) {
  let o, s, a, l, h, c, d, u
  for (let i = e.firstChild; i; i = i.nextSibling) {
    var f = clientRectsFor(i)
    for (let t = 0; t < f.length; t++) {
      let e = f[t]
      var p = getdx(
          r,
          (e = s && yOverlap(s, e) ? upTop(upBot(e, s.bottom), s.top) : e)
        ),
        g = getdy(n, e)
      if (0 == p && 0 == g)
        return (3 == i.nodeType ? domPosInText : domPosAtCoords)(i, r, n)
      ;(!o || l > g || (l == g && a > p)) &&
        ((o = i), (s = e), (a = p), (l = g)),
        0 == p
          ? n > e.bottom && (!d || d.bottom < e.bottom)
            ? ((h = i), (d = e))
            : n < e.top && (!u || u.top > e.top) && ((c = i), (u = e))
          : d && yOverlap(d, e)
          ? (d = upBot(d, e.bottom))
          : u && yOverlap(u, e) && (u = upTop(u, e.top))
    }
  }
  if (
    (d && d.bottom >= n
      ? ((o = h), (s = d))
      : u && u.top <= n && ((o = c), (s = u)),
    !o)
  )
    return { node: e, offset: 0 }
  var t = Math.max(s.left, Math.min(s.right, r))
  return 3 == o.nodeType
    ? domPosInText(o, t, n)
    : a || 'true' != o.contentEditable
    ? {
        node: e,
        offset:
          Array.prototype.indexOf.call(e.childNodes, o) +
          (r >= (s.left + s.right) / 2 ? 1 : 0),
      }
    : domPosAtCoords(o, t, n)
}
function domPosInText(r, n, t) {
  var e = r.nodeValue.length
  let o = -1,
    s = 1e9,
    a = 0
  for (let i = 0; i < e; i++) {
    var l = textRange(r, i, i + 1).getClientRects()
    for (let e = 0; e < l.length; e++) {
      var h = l[e]
      if (h.top != h.bottom) {
        a = a || n - h.left
        var c = (h.top > t ? h.top - t : t - h.bottom) - 1
        if (h.left - 1 <= n && h.right + 1 >= n && c < s) {
          let e = n >= (h.left + h.right) / 2,
            t = e
          if (
            ((browser.chrome || browser.gecko) &&
              textRange(r, i).getBoundingClientRect().left == h.right &&
              (t = !e),
            c <= 0)
          )
            return { node: r, offset: i + (t ? 1 : 0) }
          ;(o = i + (t ? 1 : 0)), (s = c)
        }
      }
    }
  }
  return { node: r, offset: -1 < o ? o : 0 < a ? r.nodeValue.length : 0 }
}
function posAtCoords(i, { x: e, y: t }, r, n = -1) {
  var o = i.contentDOM.getBoundingClientRect(),
    s = o.top + i.viewState.paddingTop
  let a,
    l = i.viewState['docHeight'],
    h = t - s
  if (h < 0) return 0
  if (h > l) return i.state.doc.length
  for (
    let e = i.defaultLineHeight / 2, t = !1;
    (a = i.elementAtHeight(h)).type != BlockType.Text;

  )
    for (; !(0 <= (h = 0 < n ? a.bottom + e : a.top - e) && h <= l); ) {
      if (t) return r ? null : 0
      ;(t = !0), (n = -n)
    }
  t = s + h
  s = a.from
  if (s < i.viewport.from)
    return 0 == i.viewport.from
      ? 0
      : r
      ? null
      : posAtCoordsImprecise(i, o, a, e, t)
  if (s > i.viewport.to)
    return i.viewport.to == i.state.doc.length
      ? i.state.doc.length
      : r
      ? null
      : posAtCoordsImprecise(i, o, a, e, t)
  let c = i.dom.ownerDocument,
    d = i.root.elementFromPoint ? i.root : c,
    u = d.elementFromPoint(e, t)
  ;(u = u && !i.contentDOM.contains(u) ? null : u) ||
    ((e = Math.max(o.left + 1, Math.min(o.right - 1, e))),
    (u = d.elementFromPoint(e, t)) && !i.contentDOM.contains(u) && (u = null))
  let f,
    p = -1
  if (
    (u &&
      0 != (null == (o = i.docView.nearest(u)) ? void 0 : o.isEditable) &&
      (c.caretPositionFromPoint
        ? (o = c.caretPositionFromPoint(e, t)) &&
          ({ offsetNode: f, offset: p } = o)
        : c.caretRangeFromPoint &&
          (o = c.caretRangeFromPoint(e, t)) &&
          (({ startContainer: f, startOffset: p } = o),
          browser.safari && isSuspiciousCaretResult(f, p, e) && (f = void 0))),
    !f || !i.docView.dom.contains(f))
  ) {
    o = LineView.find(i.docView, s)
    if (!o) return h > a.top + a.height / 2 ? a.to : a.from
    ;({ node: f, offset: p } = domPosAtCoords(o.dom, e, t))
  }
  return i.docView.posFromDOM(f, p)
}
function posAtCoordsImprecise(e, t, i, r, n) {
  let o = Math.round((r - t.left) * e.defaultCharacterWidth)
  e.lineWrapping &&
    i.height > 1.5 * e.defaultLineHeight &&
    ((r = Math.floor((n - i.top) / e.defaultLineHeight)),
    (o += r * e.viewState.heightOracle.lineLength))
  t = e.state.sliceDoc(i.from, i.to)
  return i.from + findColumn(t, o, e.state.tabSize)
}
function isSuspiciousCaretResult(t, e, i) {
  let r
  if (3 != t.nodeType || e != (r = t.nodeValue.length)) return !1
  for (let e = t.nextSibling; e; e = e.nextSibling)
    if (1 != e.nodeType || 'BR' != e.nodeName) return !1
  return textRange(t, r - 1, r).getBoundingClientRect().left > i
}
function moveToLineBoundary(e, t, i, r) {
  var n = e.state.doc.lineAt(t.head),
    r =
      r && e.lineWrapping
        ? e.coordsAtPos(t.assoc < 0 && t.head > n.from ? t.head - 1 : t.head)
        : null
  if (r) {
    var o = e.dom.getBoundingClientRect(),
      s = e.textDirectionAt(n.from),
      s = e.posAtCoords({
        x: i == (s == Direction.LTR) ? o.right - 1 : o.left + 1,
        y: (r.top + r.bottom) / 2,
      })
    if (null != s) return EditorSelection.cursor(s, i ? -1 : 1)
  }
  ;(o = LineView.find(e.docView, t.head)),
    (r = o ? (i ? o.posAtEnd : o.posAtStart) : i ? n.to : n.from)
  return EditorSelection.cursor(r, i ? -1 : 1)
}
function moveByChar(n, e, o, s) {
  let a = n.state.doc.lineAt(e.head),
    l = n.bidiSpans(a)
  var h = n.textDirectionAt(a.from)
  for (let i = e, r = null; ; ) {
    let e = moveVisually(a, l, h, i, o),
      t = movedOver
    if (!e) {
      if (a.number == (o ? n.state.doc.lines : 1)) return i
      ;(t = '\n'),
        (a = n.state.doc.line(a.number + (o ? 1 : -1))),
        (l = n.bidiSpans(a)),
        (e = EditorSelection.cursor(o ? a.from : a.to))
    }
    if (r) {
      if (!r(t)) return i
    } else {
      if (!s) return e
      r = s(t)
    }
    i = e
  }
}
function byGroup(e, t, i) {
  let r = e.state.charCategorizer(t),
    n = r(i)
  return (e) => {
    e = r(e)
    return (n = n == CharCategory.Space ? e : n) == e
  }
}
function moveVertically(t, i, e, r) {
  var n = i.head,
    o = e ? 1 : -1
  if (n == (e ? t.state.doc.length : 0))
    return EditorSelection.cursor(n, i.assoc)
  let s = i.goalColumn,
    a
  var l = t.contentDOM.getBoundingClientRect(),
    e = t.coordsAtPos(n),
    h = t.documentTop,
    c =
      ((a = e
        ? (null == s && (s = e.left - l.left), o < 0 ? e.top : e.bottom)
        : ((e = t.viewState.lineBlockAt(n)),
          null == s &&
            (s = Math.min(
              l.right - l.left,
              t.defaultCharacterWidth * (n - e.from)
            )),
          (o < 0 ? e.top : e.bottom) + h)),
      l.left + s),
    d = null != r ? r : t.defaultLineHeight >> 1
  for (let e = 0; ; e += 10) {
    var u = a + (d + e) * o,
      f = posAtCoords(t, { x: c, y: u }, !1, o)
    if (u < l.top || u > l.bottom || (o < 0 ? f < n : n < f))
      return EditorSelection.cursor(f, i.assoc, void 0, s)
  }
}
function skipAtoms(t, n, o) {
  for (var e = t.state.facet(atomicRanges).map((e) => e(t)); ; ) {
    let r = !1
    for (var i of e)
      i.between(o.from - 1, o.from + 1, (e, t, i) => {
        o.from > e &&
          o.from < t &&
          ((o =
            n.from > o.from
              ? EditorSelection.cursor(e, 1)
              : EditorSelection.cursor(t, -1)),
          (r = !0))
      })
    if (!r) return o
  }
}
class InputState {
  constructor(r) {
    ;(this.lastKeyCode = 0),
      (this.lastKeyTime = 0),
      (this.chromeScrollHack = -1),
      (this.pendingIOSKey = void 0),
      (this.lastSelectionOrigin = null),
      (this.lastSelectionTime = 0),
      (this.lastEscPress = 0),
      (this.lastContextMenu = 0),
      (this.scrollHandlers = []),
      (this.registeredEvents = []),
      (this.customHandlers = []),
      (this.composing = -1),
      (this.compositionFirstChange = null),
      (this.compositionEndedAt = 0),
      (this.rapidCompositionStart = !1),
      (this.mouseSelection = null)
    for (let i in handlers) {
      let t = handlers[i]
      r.contentDOM.addEventListener(i, (e) => {
        !eventBelongsToEditor(r, e) ||
          this.ignoreDuringComposition(e) ||
          ('keydown' == i && this.keydown(r, e)) ||
          (this.mustFlushObserver(e) && r.observer.forceFlush(),
          this.runCustomHandlers(i, r, e) ? e.preventDefault() : t(r, e))
      }),
        this.registeredEvents.push(i)
    }
    browser.chrome &&
      102 <= browser.chrome_version &&
      r.scrollDOM.addEventListener(
        'wheel',
        () => {
          this.chromeScrollHack < 0
            ? (r.contentDOM.style.pointerEvents = 'none')
            : window.clearTimeout(this.chromeScrollHack),
            (this.chromeScrollHack = setTimeout(() => {
              ;(this.chromeScrollHack = -1),
                (r.contentDOM.style.pointerEvents = '')
            }, 100))
        },
        { passive: !0 }
      ),
      (this.notifiedFocused = r.hasFocus),
      browser.safari && r.contentDOM.addEventListener('input', () => null)
  }
  setSelectionOrigin(e) {
    ;(this.lastSelectionOrigin = e), (this.lastSelectionTime = Date.now())
  }
  ensureHandlers(i, e) {
    var r, t
    this.customHandlers = []
    for (t of e)
      if ((r = null == (r = t.update(i).spec) ? void 0 : r.domEventHandlers)) {
        this.customHandlers.push({ plugin: t.value, handlers: r })
        for (let t in r)
          this.registeredEvents.indexOf(t) < 0 &&
            'scroll' != t &&
            (this.registeredEvents.push(t),
            i.contentDOM.addEventListener(t, (e) => {
              eventBelongsToEditor(i, e) &&
                this.runCustomHandlers(t, i, e) &&
                e.preventDefault()
            }))
      }
  }
  runCustomHandlers(t, i, r) {
    for (var n of this.customHandlers) {
      let e = n.handlers[t]
      if (e)
        try {
          if (e.call(n.plugin, r, i) || r.defaultPrevented) return !0
        } catch (e) {
          logException(i.state, e)
        }
    }
    return !1
  }
  runScrollHandlers(t, i) {
    for (var r of this.customHandlers) {
      let e = r.handlers.scroll
      if (e)
        try {
          e.call(r.plugin, i, t)
        } catch (e) {
          logException(t.state, e)
        }
    }
  }
  keydown(e, t) {
    if (
      ((this.lastKeyCode = t.keyCode),
      (this.lastKeyTime = Date.now()),
      9 == t.keyCode && Date.now() < this.lastEscPress + 2e3)
    )
      return !0
    if (
      browser.android &&
      browser.chrome &&
      !t.synthetic &&
      (13 == t.keyCode || 8 == t.keyCode)
    )
      return e.observer.delayAndroidKey(t.key, t.keyCode), !0
    let i
    return (
      !(
        !browser.ios ||
        !(i = PendingKeys.find((e) => e.keyCode == t.keyCode)) ||
        t.ctrlKey ||
        t.altKey ||
        t.metaKey ||
        t.synthetic
      ) &&
      ((this.pendingIOSKey = i), setTimeout(() => this.flushIOSKey(e), 250), !0)
    )
  }
  flushIOSKey(e) {
    var t = this.pendingIOSKey
    return (
      !!t &&
      ((this.pendingIOSKey = void 0),
      dispatchKey(e.contentDOM, t.key, t.keyCode))
    )
  }
  ignoreDuringComposition(e) {
    return (
      !!/^key/.test(e.type) &&
      (0 < this.composing ||
        (!!(browser.safari && Date.now() - this.compositionEndedAt < 100) &&
          !(this.compositionEndedAt = 0)))
    )
  }
  mustFlushObserver(e) {
    return (
      ('keydown' == e.type && 229 != e.keyCode) ||
      ('compositionend' == e.type && !browser.ios)
    )
  }
  startMouseSelection(e) {
    this.mouseSelection && this.mouseSelection.destroy(),
      (this.mouseSelection = e)
  }
  update(e) {
    this.mouseSelection && this.mouseSelection.update(e),
      e.transactions.length && (this.lastKeyCode = this.lastSelectionTime = 0)
  }
  destroy() {
    this.mouseSelection && this.mouseSelection.destroy()
  }
}
const PendingKeys = [
    { key: 'Backspace', keyCode: 8, inputType: 'deleteContentBackward' },
    { key: 'Enter', keyCode: 13, inputType: 'insertParagraph' },
    { key: 'Delete', keyCode: 46, inputType: 'deleteContentForward' },
  ],
  modifierCodes = [16, 17, 18, 20, 91, 92, 224, 225]
class MouseSelection {
  constructor(e, t, i, r) {
    ;(this.view = e),
      (this.style = i),
      (this.mustSelect = r),
      (this.lastEvent = t)
    let n = e.contentDOM.ownerDocument
    n.addEventListener('mousemove', (this.move = this.move.bind(this))),
      n.addEventListener('mouseup', (this.up = this.up.bind(this))),
      (this.extend = t.shiftKey),
      (this.multiple =
        e.state.facet(EditorState.allowMultipleSelections) &&
        addsSelectionRange(e, t)),
      (this.dragMove = dragMovesSelection(e, t)),
      (this.dragging =
        !(!isInPrimarySelection(e, t) || 1 != getClickType(t)) && null),
      !1 === this.dragging && (t.preventDefault(), this.select(t))
  }
  move(e) {
    if (0 == e.buttons) return this.destroy()
    !1 === this.dragging && this.select((this.lastEvent = e))
  }
  up(e) {
    null == this.dragging && this.select(this.lastEvent),
      this.dragging || e.preventDefault(),
      this.destroy()
  }
  destroy() {
    let e = this.view.contentDOM.ownerDocument
    e.removeEventListener('mousemove', this.move),
      e.removeEventListener('mouseup', this.up),
      (this.view.inputState.mouseSelection = null)
  }
  select(e) {
    let t = this.style.get(e, this.extend, this.multiple)
    ;(!this.mustSelect &&
      t.eq(this.view.state.selection) &&
      t.main.assoc == this.view.state.selection.main.assoc) ||
      this.view.dispatch({
        selection: t,
        userEvent: 'select.pointer',
        scrollIntoView: !0,
      }),
      (this.mustSelect = !1)
  }
  update(e) {
    e.docChanged &&
      this.dragging &&
      (this.dragging = this.dragging.map(e.changes)),
      this.style.update(e) && setTimeout(() => this.select(this.lastEvent), 20)
  }
}
function addsSelectionRange(e, t) {
  let i = e.state.facet(clickAddsSelectionRange)
  return i.length ? i[0](t) : browser.mac ? t.metaKey : t.ctrlKey
}
function dragMovesSelection(e, t) {
  let i = e.state.facet(dragMovesSelection$1)
  return i.length ? i[0](t) : browser.mac ? !t.altKey : !t.ctrlKey
}
function isInPrimarySelection(e, t) {
  var i = e.state.selection['main']
  if (i.empty) return !1
  let r = getSelection(e.root)
  if (0 == r.rangeCount) return !0
  var n = r.getRangeAt(0).getClientRects()
  for (let e = 0; e < n.length; e++) {
    var o = n[e]
    if (
      o.left <= t.clientX &&
      o.right >= t.clientX &&
      o.top <= t.clientY &&
      o.bottom >= t.clientY
    )
      return !0
  }
  return !1
}
function eventBelongsToEditor(i, r) {
  if (!r.bubbles) return !0
  if (r.defaultPrevented) return !1
  for (let e = r.target, t; e != i.contentDOM; e = e.parentNode)
    if (
      !e ||
      11 == e.nodeType ||
      ((t = ContentView.get(e)) && t.ignoreEvent(r))
    )
      return !1
  return !0
}
const handlers = Object.create(null),
  brokenClipboardAPI =
    (browser.ie && browser.ie_version < 15) ||
    (browser.ios && browser.webkit_version < 604)
function capturePaste(t) {
  let i = t.dom.parentNode
  if (i) {
    let e = i.appendChild(document.createElement('textarea'))
    ;(e.style.cssText = 'position: fixed; left: -10000px; top: 10px'),
      e.focus(),
      setTimeout(() => {
        t.focus(), e.remove(), doPaste(t, e.value)
      }, 50)
  }
}
function doPaste(e, n) {
  let o = e['state'],
    t,
    s = 1,
    a = o.toText(n),
    l = a.lines == o.selection.ranges.length
  if (
    null != lastLinewiseCopy &&
    o.selection.ranges.every((e) => e.empty) &&
    lastLinewiseCopy == a.toString()
  ) {
    let r = -1
    t = o.changeByRange((e) => {
      var t = o.doc.lineAt(e.from)
      if (t.from == r) return { range: e }
      r = t.from
      var i = o.toText((l ? a.line(s++).text : n) + o.lineBreak)
      return {
        changes: { from: t.from, insert: i },
        range: EditorSelection.cursor(e.from + i.length),
      }
    })
  } else
    t = l
      ? o.changeByRange((e) => {
          var t = a.line(s++)
          return {
            changes: { from: e.from, to: e.to, insert: t.text },
            range: EditorSelection.cursor(e.from + t.length),
          }
        })
      : o.replaceSelection(a)
  e.dispatch(t, { userEvent: 'input.paste', scrollIntoView: !0 })
}
handlers.keydown = (e, t) => {
  e.inputState.setSelectionOrigin('select'),
    27 == t.keyCode
      ? (e.inputState.lastEscPress = Date.now())
      : modifierCodes.indexOf(t.keyCode) < 0 && (e.inputState.lastEscPress = 0)
}
let lastTouch = 0
function rangeForClick(i, r, n, o) {
  if (1 == o) return EditorSelection.cursor(r, n)
  if (2 == o) return groupAt(i.state, r, n)
  {
    ;(o = LineView.find(i.docView, r)),
      (n = i.state.doc.lineAt(o ? o.posAtEnd : r))
    let e = o ? o.posAtStart : n.from,
      t = o ? o.posAtEnd : n.to
    return (
      t < i.state.doc.length && t == n.to && t++, EditorSelection.range(e, t)
    )
  }
}
;(handlers.touchstart = (e, t) => {
  ;(lastTouch = Date.now()), e.inputState.setSelectionOrigin('select.pointer')
}),
  (handlers.touchmove = (e) => {
    e.inputState.setSelectionOrigin('select.pointer')
  }),
  (handlers.mousedown = (t, i) => {
    if (
      (t.observer.flush(),
      !(lastTouch > Date.now() - 2e3 && 1 == getClickType(i)))
    ) {
      let e = null
      for (var r of t.state.facet(mouseSelectionStyle)) if ((e = r(t, i))) break
      var n
      ;(e = e || 0 != i.button ? e : basicMouseSelection(t, i)) &&
        ((n = t.root.activeElement != t.contentDOM) &&
          t.observer.ignore(() => focusPreventScroll(t.contentDOM)),
        t.inputState.startMouseSelection(new MouseSelection(t, i, e, n)))
    }
  })
let insideY = (e, t) => e >= t.top && e <= t.bottom,
  inside = (e, t, i) => insideY(t, i) && e >= i.left && e <= i.right
function findPositionSide(e, t, i, r) {
  let n = LineView.find(e.docView, t)
  if (!n) return 1
  e = t - n.posAtStart
  if (0 == e) return 1
  if (e == n.length) return -1
  t = n.coordsAt(e, -1)
  if (t && inside(i, r, t)) return -1
  e = n.coordsAt(e, 1)
  return (!e || !inside(i, r, e)) && t && insideY(r, t) ? -1 : 1
}
function queryPos(e, t) {
  var i = e.posAtCoords({ x: t.clientX, y: t.clientY }, !1)
  return { pos: i, bias: findPositionSide(e, i, t.clientX, t.clientY) }
}
const BadMouseDetail = browser.ie && browser.ie_version <= 11
let lastMouseDown = null,
  lastMouseDownCount = 0,
  lastMouseDownTime = 0
function getClickType(e) {
  if (!BadMouseDetail) return e.detail
  var t = lastMouseDown,
    i = lastMouseDownTime
  return (
    (lastMouseDown = e),
    (lastMouseDownTime = Date.now()),
    (lastMouseDownCount =
      !t ||
      (i > Date.now() - 400 &&
        Math.abs(t.clientX - e.clientX) < 2 &&
        Math.abs(t.clientY - e.clientY) < 2)
        ? (lastMouseDownCount + 1) % 3
        : 1)
  )
}
function basicMouseSelection(s, e) {
  let a = queryPos(s, e),
    l = getClickType(e),
    h = s.state.selection,
    c = a,
    d = e
  return {
    update(e) {
      e.docChanged &&
        (a && (a.pos = e.changes.mapPos(a.pos)),
        (h = h.map(e.changes)),
        (d = null))
    },
    get(e, t, i) {
      let r
      if (
        (d && e.clientX == d.clientX && e.clientY == d.clientY
          ? (r = c)
          : ((r = c = queryPos(s, e)), (d = e)),
        !r || !a)
      )
        return h
      let n = rangeForClick(s, r.pos, r.bias, l)
      var o
      return (
        a.pos == r.pos ||
          t ||
          ((e = rangeForClick(s, a.pos, a.bias, l)),
          (o = Math.min(e.from, n.from)),
          (e = Math.max(e.to, n.to)),
          (n =
            o < n.from
              ? EditorSelection.range(o, e)
              : EditorSelection.range(e, o))),
        t
          ? h.replaceRange(h.main.extend(n.from, n.to))
          : i
          ? h.addRange(n)
          : EditorSelection.create([n])
      )
    },
  }
}
function dropText(t, i, r, n) {
  if (r) {
    var o = t.posAtCoords({ x: i.clientX, y: i.clientY }, !1),
      i = (i.preventDefault(), t.inputState)['mouseSelection'],
      n =
        n && i && i.dragging && i.dragMove
          ? { from: i.dragging.from, to: i.dragging.to }
          : null,
      i = { from: o, insert: r }
    let e = t.state.changes(n ? [n, i] : i)
    t.focus(),
      t.dispatch({
        changes: e,
        selection: { anchor: e.mapPos(o, -1), head: e.mapPos(o, 1) },
        userEvent: n ? 'move.drop' : 'input.drop',
      })
  }
}
function captureCopy(t, i) {
  let r = t.dom.parentNode
  if (r) {
    let e = r.appendChild(document.createElement('textarea'))
    ;(e.style.cssText = 'position: fixed; left: -10000px; top: 10px'),
      (e.value = i),
      e.focus(),
      (e.selectionEnd = i.length),
      (e.selectionStart = 0),
      setTimeout(() => {
        e.remove(), t.focus()
      }, 50)
  }
}
function copiedRange(t) {
  let i = [],
    r = [],
    n = !1
  for (var e of t.selection.ranges)
    e.empty || (i.push(t.sliceDoc(e.from, e.to)), r.push(e))
  if (!i.length) {
    let e = -1
    for (var { from: o } of t.selection.ranges) {
      o = t.doc.lineAt(o)
      o.number > e &&
        (i.push(o.text),
        r.push({ from: o.from, to: Math.min(t.doc.length, o.to + 1) })),
        (e = o.number)
    }
    n = !0
  }
  return { text: i.join(t.lineBreak), ranges: r, linewise: n }
}
;(handlers.dragstart = (e, t) => {
  var { main: i } = e.state['selection']
  let r = e.inputState['mouseSelection']
  r && (r.dragging = i),
    t.dataTransfer &&
      (t.dataTransfer.setData('Text', e.state.sliceDoc(i.from, i.to)),
      (t.dataTransfer.effectAllowed = 'copyMove'))
}),
  (handlers.drop = (t, o) => {
    if (o.dataTransfer) {
      if (t.state.readOnly) return o.preventDefault()
      let n = o.dataTransfer.files
      if (n && n.length) {
        o.preventDefault()
        let i = Array(n.length),
          e = 0,
          r = () => {
            ++e == n.length &&
              dropText(
                t,
                o,
                i.filter((e) => null != e).join(t.state.lineBreak),
                !1
              )
          }
        for (let t = 0; t < n.length; t++) {
          let e = new FileReader()
          ;(e.onerror = r),
            (e.onload = () => {
              ;/[\x00-\x08\x0e-\x1f]{2}/.test(e.result) || (i[t] = e.result),
                r()
            }),
            e.readAsText(n[t])
        }
      } else dropText(t, o, o.dataTransfer.getData('Text'), !0)
    }
  }),
  (handlers.paste = (e, t) => {
    if (e.state.readOnly) return t.preventDefault()
    e.observer.flush()
    let i = brokenClipboardAPI ? null : t.clipboardData
    i
      ? (doPaste(e, i.getData('text/plain')), t.preventDefault())
      : capturePaste(e)
  })
let lastLinewiseCopy = null
function updateForFocusChange(e) {
  setTimeout(() => {
    e.hasFocus != e.inputState.notifiedFocused && e.update([])
  }, 10)
}
function forceClearComposition(e, t) {
  if (e.docView.compositionDeco.size) {
    e.inputState.rapidCompositionStart = t
    try {
      e.update([])
    } finally {
      e.inputState.rapidCompositionStart = !1
    }
  }
}
;(handlers.copy = handlers.cut =
  (t, i) => {
    var { text: r, ranges: n, linewise: o } = copiedRange(t.state)
    if (r || o) {
      lastLinewiseCopy = o ? r : null
      let e = brokenClipboardAPI ? null : i.clipboardData
      e
        ? (i.preventDefault(), e.clearData(), e.setData('text/plain', r))
        : captureCopy(t, r),
        'cut' != i.type ||
          t.state.readOnly ||
          t.dispatch({
            changes: n,
            scrollIntoView: !0,
            userEvent: 'delete.cut',
          })
    }
  }),
  (handlers.focus = updateForFocusChange),
  (handlers.blur = (e) => {
    e.observer.clearSelectionRange(), updateForFocusChange(e)
  }),
  (handlers.compositionstart = handlers.compositionupdate =
    (e) => {
      null == e.inputState.compositionFirstChange &&
        (e.inputState.compositionFirstChange = !0),
        e.inputState.composing < 0 &&
          ((e.inputState.composing = 0),
          e.docView.compositionDeco.size &&
            (e.observer.flush(), forceClearComposition(e, !0)))
    }),
  (handlers.compositionend = (e) => {
    ;(e.inputState.composing = -1),
      (e.inputState.compositionEndedAt = Date.now()),
      (e.inputState.compositionFirstChange = null),
      setTimeout(() => {
        e.inputState.composing < 0 && forceClearComposition(e, !1)
      }, 50)
  }),
  (handlers.contextmenu = (e) => {
    e.inputState.lastContextMenu = Date.now()
  }),
  (handlers.beforeinput = (i, t) => {
    var e
    let r
    if (
      browser.chrome &&
      browser.android &&
      (r = PendingKeys.find((e) => e.inputType == t.inputType)) &&
      (i.observer.delayAndroidKey(r.key, r.keyCode),
      'Backspace' == r.key || 'Delete' == r.key)
    ) {
      let t = (null == (e = window.visualViewport) ? void 0 : e.height) || 0
      setTimeout(() => {
        var e
        ;((null == (e = window.visualViewport) ? void 0 : e.height) || 0) >
          t + 10 &&
          i.hasFocus &&
          (i.contentDOM.blur(), i.focus())
      }, 100)
    }
  })
const wrappingWhiteSpace = ['pre-wrap', 'normal', 'pre-line', 'break-spaces']
class HeightOracle {
  constructor() {
    ;(this.doc = Text.empty),
      (this.lineWrapping = !1),
      (this.heightSamples = {}),
      (this.lineHeight = 14),
      (this.charWidth = 7),
      (this.lineLength = 30),
      (this.heightChanged = !1)
  }
  heightForGap(e, t) {
    let i = this.doc.lineAt(t).number - this.doc.lineAt(e).number + 1
    return (
      this.lineWrapping &&
        (i += Math.ceil((t - e - i * this.lineLength * 0.5) / this.lineLength)),
      this.lineHeight * i
    )
  }
  heightForLine(e) {
    return this.lineWrapping
      ? (1 +
          Math.max(
            0,
            Math.ceil((e - this.lineLength) / (this.lineLength - 5))
          )) *
          this.lineHeight
      : this.lineHeight
  }
  setDoc(e) {
    return (this.doc = e), this
  }
  mustRefreshForWrapping(e) {
    return -1 < wrappingWhiteSpace.indexOf(e) != this.lineWrapping
  }
  mustRefreshForHeights(t) {
    let i = !1
    for (let e = 0; e < t.length; e++) {
      var r = t[e]
      r < 0
        ? e++
        : this.heightSamples[Math.floor(10 * r)] ||
          ((i = !0), (this.heightSamples[Math.floor(10 * r)] = !0))
    }
    return i
  }
  refresh(e, t, i, r, n) {
    var e = -1 < wrappingWhiteSpace.indexOf(e),
      o = Math.round(t) != Math.round(this.lineHeight) || this.lineWrapping != e
    if (
      ((this.lineWrapping = e),
      (this.lineHeight = t),
      (this.charWidth = i),
      (this.lineLength = r),
      o)
    ) {
      this.heightSamples = {}
      for (let e = 0; e < n.length; e++) {
        var s = n[e]
        s < 0 ? e++ : (this.heightSamples[Math.floor(10 * s)] = !0)
      }
    }
    return o
  }
}
class MeasuredHeights {
  constructor(e, t) {
    ;(this.from = e), (this.heights = t), (this.index = 0)
  }
  get more() {
    return this.index < this.heights.length
  }
}
class BlockInfo {
  constructor(e, t, i, r, n) {
    ;(this.from = e),
      (this.length = t),
      (this.top = i),
      (this.height = r),
      (this.type = n)
  }
  get to() {
    return this.from + this.length
  }
  get bottom() {
    return this.top + this.height
  }
  join(e) {
    var t = (Array.isArray(this.type) ? this.type : [this]).concat(
      Array.isArray(e.type) ? e.type : [e]
    )
    return new BlockInfo(
      this.from,
      this.length + e.length,
      this.top,
      this.height + e.height,
      t
    )
  }
}
var _a,
  QueryType$1 = (function (e) {
    return (
      (e[(e.ByPos = 0)] = 'ByPos'),
      (e[(e.ByHeight = 1)] = 'ByHeight'),
      (e[(e.ByPosNoHeight = 2)] = 'ByPosNoHeight'),
      e
    )
  })((QueryType$1 = QueryType$1 || {}))
const Epsilon = 0.001
class HeightMap {
  constructor(e, t, i = 2) {
    ;(this.length = e), (this.height = t), (this.flags = i)
  }
  get outdated() {
    return 0 < (2 & this.flags)
  }
  set outdated(e) {
    this.flags = (e ? 2 : 0) | (-3 & this.flags)
  }
  setHeight(e, t) {
    this.height != t &&
      (Math.abs(this.height - t) > Epsilon && (e.heightChanged = !0),
      (this.height = t))
  }
  replace(e, t, i) {
    return HeightMap.of(i)
  }
  decomposeLeft(e, t) {
    t.push(this)
  }
  decomposeRight(e, t) {
    t.push(this)
  }
  applyChanges(s, a, l, h) {
    let c = this
    for (let o = h.length - 1; 0 <= o; o--) {
      let { fromA: e, toA: t, fromB: i, toB: r } = h[o],
        n = c.lineAt(e, QueryType$1.ByPosNoHeight, a, 0, 0)
      var d = n.to >= t ? n : c.lineAt(t, QueryType$1.ByPosNoHeight, a, 0, 0)
      for (r += d.to - t, t = d.to; 0 < o && n.from <= h[o - 1].toA; )
        (e = h[o - 1].fromA),
          (i = h[o - 1].fromB),
          o--,
          e < n.from && (n = c.lineAt(e, QueryType$1.ByPosNoHeight, a, 0, 0))
      ;(i += n.from - e), (e = n.from)
      d = NodeBuilder.build(l, s, i, r)
      c = c.replace(e, t, d)
    }
    return c.updateHeight(l, 0)
  }
  static empty() {
    return new HeightMapText(0, 0)
  }
  static of(e) {
    if (1 == e.length) return e[0]
    let t = 0,
      i = e.length,
      r = 0,
      n = 0
    for (;;) {
      var o
      if (t == i)
        if (r > 2 * n) {
          var s = e[t - 1]
          s.break
            ? e.splice(--t, 1, s.left, null, s.right)
            : e.splice(--t, 1, s.left, s.right),
            (i += 1 + s.break),
            (r -= s.size)
        } else {
          if (!(n > 2 * r)) break
          s = e[i]
          s.break
            ? e.splice(i, 1, s.left, null, s.right)
            : e.splice(i, 1, s.left, s.right),
            (i += 2 + s.break),
            (n -= s.size)
        }
      else r < n ? (o = e[t++]) && (r += o.size) : (o = e[--i]) && (n += o.size)
    }
    let a = 0
    return (
      null == e[t - 1] ? ((a = 1), t--) : null == e[t] && ((a = 1), i++),
      new HeightMapBranch(
        HeightMap.of(e.slice(0, t)),
        a,
        HeightMap.of(e.slice(i))
      )
    )
  }
}
HeightMap.prototype.size = 1
class HeightMapBlock extends HeightMap {
  constructor(e, t, i) {
    super(e, t), (this.type = i)
  }
  blockAt(e, t, i, r) {
    return new BlockInfo(r, this.length, i, this.height, this.type)
  }
  lineAt(e, t, i, r, n) {
    return this.blockAt(0, i, r, n)
  }
  forEachLine(e, t, i, r, n, o) {
    e <= n + this.length && n <= t && o(this.blockAt(0, i, r, n))
  }
  updateHeight(e, t = 0, i, r) {
    return (
      r && r.from <= t && r.more && this.setHeight(e, r.heights[r.index++]),
      (this.outdated = !1),
      this
    )
  }
  toString() {
    return `block(${this.length})`
  }
}
class HeightMapText extends HeightMapBlock {
  constructor(e, t) {
    super(e, t, BlockType.Text), (this.collapsed = 0), (this.widgetHeight = 0)
  }
  replace(e, t, i) {
    let r = i[0]
    return 1 == i.length &&
      (r instanceof HeightMapText ||
        (r instanceof HeightMapGap && 4 & r.flags)) &&
      Math.abs(this.length - r.length) < 10
      ? (r instanceof HeightMapGap
          ? (r = new HeightMapText(r.length, this.height))
          : (r.height = this.height),
        this.outdated || (r.outdated = !1),
        r)
      : HeightMap.of(i)
  }
  updateHeight(e, t = 0, i = !1, r) {
    return (
      r && r.from <= t && r.more
        ? this.setHeight(e, r.heights[r.index++])
        : (i || this.outdated) &&
          this.setHeight(
            e,
            Math.max(
              this.widgetHeight,
              e.heightForLine(this.length - this.collapsed)
            )
          ),
      (this.outdated = !1),
      this
    )
  }
  toString() {
    return `line(${this.length}${this.collapsed ? -this.collapsed : ''}${
      this.widgetHeight ? ':' + this.widgetHeight : ''
    })`
  }
}
class HeightMapGap extends HeightMap {
  constructor(e) {
    super(e, 0)
  }
  lines(e, t) {
    var i = e.lineAt(t).number,
      e = e.lineAt(t + this.length).number
    return { firstLine: i, lastLine: e, lineHeight: this.height / (e - i + 1) }
  }
  blockAt(e, t, i, r) {
    var { firstLine: r, lastLine: n, lineHeight: o } = this.lines(t, r),
      n = Math.max(0, Math.min(n - r, Math.floor((e - i) / o))),
      { from: e, length: t } = t.line(r + n)
    return new BlockInfo(e, t, i + o * n, o, BlockType.Text)
  }
  lineAt(e, t, i, r, n) {
    if (t == QueryType$1.ByHeight) return this.blockAt(e, i, r, n)
    if (t == QueryType$1.ByPosNoHeight)
      return (
        ({ from: t, to: o } = i.lineAt(e)),
        new BlockInfo(t, o - t, 0, 0, BlockType.Text)
      )
    var { firstLine: o, lineHeight: t } = this.lines(i, n),
      { from: n, length: i, number: e } = i.lineAt(e)
    return new BlockInfo(n, i, r + t * (e - o), t, BlockType.Text)
  }
  forEachLine(i, r, n, o, s, a) {
    var { firstLine: l, lineHeight: h } = this.lines(n, s)
    for (let e = Math.max(i, s), t = Math.min(s + this.length, r); e <= t; ) {
      var c = n.lineAt(e)
      e == i && (o += h * (c.number - l)),
        a(new BlockInfo(c.from, c.length, o, h, BlockType.Text)),
        (o += h),
        (e = c.to + 1)
    }
  }
  replace(e, t, i) {
    var r,
      t = this.length - t
    return (
      0 < t &&
        ((r = i[i.length - 1]) instanceof HeightMapGap
          ? (i[i.length - 1] = new HeightMapGap(r.length + t))
          : i.push(null, new HeightMapGap(t - 1))),
      0 < e &&
        ((r = i[0]) instanceof HeightMapGap
          ? (i[0] = new HeightMapGap(e + r.length))
          : i.unshift(new HeightMapGap(e - 1), null)),
      HeightMap.of(i)
    )
  }
  decomposeLeft(e, t) {
    t.push(new HeightMapGap(e - 1), null)
  }
  decomposeRight(e, t) {
    t.push(null, new HeightMapGap(this.length - e - 1))
  }
  updateHeight(n, e = 0, t = !1, o) {
    var s = e + this.length
    if (o && o.from <= e + this.length && o.more) {
      let t = [],
        i = Math.max(e, o.from),
        r = -1
      var a = n.heightChanged
      for (
        o.from > e &&
        t.push(new HeightMapGap(o.from - e - 1).updateHeight(n, e));
        i <= s && o.more;

      ) {
        var l = n.doc.lineAt(i).length,
          h = (t.length && t.push(null), o.heights[o.index++])
        ;-1 == r ? (r = h) : Math.abs(h - r) >= Epsilon && (r = -2)
        let e = new HeightMapText(l, h)
        ;(e.outdated = !1), t.push(e), (i += l + 1)
      }
      i <= s && t.push(null, new HeightMapGap(s - i).updateHeight(n, i))
      var c = HeightMap.of(t)
      return (
        (n.heightChanged =
          a ||
          r < 0 ||
          Math.abs(c.height - this.height) >= Epsilon ||
          Math.abs(r - this.lines(n.doc, e).lineHeight) >= Epsilon),
        c
      )
    }
    return (
      (t || this.outdated) &&
        (this.setHeight(n, n.heightForGap(e, e + this.length)),
        (this.outdated = !1)),
      this
    )
  }
  toString() {
    return `gap(${this.length})`
  }
}
class HeightMapBranch extends HeightMap {
  constructor(e, t, i) {
    super(
      e.length + t + i.length,
      e.height + i.height,
      t | (e.outdated || i.outdated ? 2 : 0)
    ),
      (this.left = e),
      (this.right = i),
      (this.size = e.size + i.size)
  }
  get break() {
    return 1 & this.flags
  }
  blockAt(e, t, i, r) {
    var n = i + this.left.height
    return e < n
      ? this.left.blockAt(e, t, i, r)
      : this.right.blockAt(e, t, n, r + this.left.length + this.break)
  }
  lineAt(e, t, i, r, n) {
    var o = r + this.left.height,
      s = n + this.left.length + this.break,
      a = t == QueryType$1.ByHeight ? e < o : e < s
    let l = a
      ? this.left.lineAt(e, t, i, r, n)
      : this.right.lineAt(e, t, i, o, s)
    if (this.break || (a ? l.to < s : l.from > s)) return l
    e =
      t == QueryType$1.ByPosNoHeight
        ? QueryType$1.ByPosNoHeight
        : QueryType$1.ByPos
    return a
      ? l.join(this.right.lineAt(s, e, i, o, s))
      : this.left.lineAt(s, e, i, r, n).join(l)
  }
  forEachLine(e, t, i, r, n, o) {
    var s,
      a = r + this.left.height,
      l = n + this.left.length + this.break
    this.break
      ? (e < l && this.left.forEachLine(e, t, i, r, n, o),
        l <= t && this.right.forEachLine(e, t, i, a, l, o))
      : (e < (s = this.lineAt(l, QueryType$1.ByPos, i, r, n)).from &&
          this.left.forEachLine(e, s.from - 1, i, r, n, o),
        s.to >= e && s.from <= t && o(s),
        t > s.to && this.right.forEachLine(s.to + 1, t, i, a, l, o))
  }
  replace(e, t, i) {
    var r = this.left.length + this.break
    if (t < r) return this.balanced(this.left.replace(e, t, i), this.right)
    if (e > this.left.length)
      return this.balanced(this.left, this.right.replace(e - r, t - r, i))
    let n = []
    0 < e && this.decomposeLeft(e, n)
    var o,
      r = n.length
    for (o of i) n.push(o)
    return (
      0 < e && mergeGaps(n, r - 1),
      t < this.length &&
        ((i = n.length), this.decomposeRight(t, n), mergeGaps(n, i)),
      HeightMap.of(n)
    )
  }
  decomposeLeft(e, t) {
    let i = this.left.length
    if (e <= i) return this.left.decomposeLeft(e, t)
    t.push(this.left),
      this.break && e >= ++i && t.push(null),
      e > i && this.right.decomposeLeft(e - i, t)
  }
  decomposeRight(e, t) {
    var i = this.left.length,
      r = i + this.break
    if (r <= e) return this.right.decomposeRight(e - r, t)
    e < i && this.left.decomposeRight(e, t),
      this.break && e < r && t.push(null),
      t.push(this.right)
  }
  balanced(e, t) {
    return e.size > 2 * t.size || t.size > 2 * e.size
      ? HeightMap.of(this.break ? [e, null, t] : [e, t])
      : ((this.left = e),
        (this.right = t),
        (this.height = e.height + t.height),
        (this.outdated = e.outdated || t.outdated),
        (this.size = e.size + t.size),
        (this.length = e.length + this.break + t.length),
        this)
  }
  updateHeight(e, t = 0, i = !1, r) {
    let { left: n, right: o } = this,
      s = t + n.length + this.break,
      a = null
    return (
      r && r.from <= t + n.length && r.more
        ? (a = n = n.updateHeight(e, t, i, r))
        : n.updateHeight(e, t, i),
      r && r.from <= s + o.length && r.more
        ? (a = o = o.updateHeight(e, s, i, r))
        : o.updateHeight(e, s, i),
      a
        ? this.balanced(n, o)
        : ((this.height = this.left.height + this.right.height),
          (this.outdated = !1),
          this)
    )
  }
  toString() {
    return this.left + (this.break ? ' ' : '-') + this.right
  }
}
function mergeGaps(e, t) {
  let i, r
  null == e[t] &&
    (i = e[t - 1]) instanceof HeightMapGap &&
    (r = e[t + 1]) instanceof HeightMapGap &&
    e.splice(t - 1, 3, new HeightMapGap(i.length + 1 + r.length))
}
const relevantWidgetHeight = 5
class NodeBuilder {
  constructor(e, t) {
    ;(this.pos = e),
      (this.oracle = t),
      (this.nodes = []),
      (this.lineStart = -1),
      (this.lineEnd = -1),
      (this.covering = null),
      (this.writtenTo = e)
  }
  get isCovered() {
    return this.covering && this.nodes[this.nodes.length - 1] == this.covering
  }
  span(e, i) {
    if (-1 < this.lineStart) {
      let e = Math.min(i, this.lineEnd),
        t = this.nodes[this.nodes.length - 1]
      t instanceof HeightMapText
        ? (t.length += e - this.pos)
        : (e > this.pos || !this.isCovered) &&
          this.nodes.push(new HeightMapText(e - this.pos, -1)),
        (this.writtenTo = e) < i &&
          (this.nodes.push(null), this.writtenTo++, (this.lineStart = -1))
    }
    this.pos = i
  }
  point(t, i, r) {
    if (t < i || r.heightRelevant) {
      let e = r.widget ? r.widget.estimatedHeight : 0
      e < 0 && (e = this.oracle.lineHeight)
      var n = i - t
      r.block
        ? this.addBlock(new HeightMapBlock(n, e, r.type))
        : (n || e >= relevantWidgetHeight) && this.addLineDeco(e, n)
    } else t < i && this.span(t, i)
    ;-1 < this.lineEnd &&
      this.lineEnd < this.pos &&
      (this.lineEnd = this.oracle.doc.lineAt(this.pos).to)
  }
  enterLine() {
    var e, t
    ;-1 < this.lineStart ||
      (({ from: e, to: t } = this.oracle.doc.lineAt(this.pos)),
      (this.lineStart = e),
      (this.lineEnd = t),
      this.writtenTo < e &&
        ((this.writtenTo < e - 1 ||
          null == this.nodes[this.nodes.length - 1]) &&
          this.nodes.push(this.blankContent(this.writtenTo, e - 1)),
        this.nodes.push(null)),
      this.pos > e && this.nodes.push(new HeightMapText(this.pos - e, -1)),
      (this.writtenTo = this.pos))
  }
  blankContent(e, t) {
    let i = new HeightMapGap(t - e)
    return this.oracle.doc.lineAt(e).to == t && (i.flags |= 4), i
  }
  ensureLine() {
    this.enterLine()
    var e = this.nodes.length ? this.nodes[this.nodes.length - 1] : null
    if (e instanceof HeightMapText) return e
    e = new HeightMapText(0, -1)
    return this.nodes.push(e), e
  }
  addBlock(e) {
    this.enterLine(),
      e.type != BlockType.WidgetAfter || this.isCovered || this.ensureLine(),
      this.nodes.push(e),
      (this.writtenTo = this.pos = this.pos + e.length),
      e.type != BlockType.WidgetBefore && (this.covering = e)
  }
  addLineDeco(e, t) {
    let i = this.ensureLine()
    ;(i.length += t),
      (i.collapsed += t),
      (i.widgetHeight = Math.max(i.widgetHeight, e)),
      (this.writtenTo = this.pos = this.pos + t)
  }
  finish(e) {
    var t,
      i = 0 == this.nodes.length ? null : this.nodes[this.nodes.length - 1]
    !(-1 < this.lineStart) || i instanceof HeightMapText || this.isCovered
      ? (this.writtenTo < this.pos || null == i) &&
        this.nodes.push(this.blankContent(this.writtenTo, this.pos))
      : this.nodes.push(new HeightMapText(0, -1))
    let r = e
    for (t of this.nodes)
      t instanceof HeightMapText && t.updateHeight(this.oracle, r),
        (r += t ? t.length : 1)
    return this.nodes
  }
  static build(e, t, i, r) {
    let n = new NodeBuilder(i, e)
    return RangeSet.spans(t, i, r, n, 0), n.finish(i)
  }
}
function heightRelevantDecoChanges(e, t, i) {
  var r = new DecorationComparator()
  return RangeSet.compare(e, t, i, r, 0), r.changes
}
class DecorationComparator {
  constructor() {
    this.changes = []
  }
  compareRange() {}
  comparePoint(e, t, i, r) {
    ;(e < t || (i && i.heightRelevant) || (r && r.heightRelevant)) &&
      addRange(e, t, this.changes, 5)
  }
}
function visiblePixelRange(e, t) {
  var i = e.getBoundingClientRect()
  let r = Math.max(0, i.left),
    n = Math.min(innerWidth, i.right),
    o = Math.max(0, i.top),
    s = Math.min(innerHeight, i.bottom)
  var a = e.ownerDocument.body
  for (let t = e.parentNode; t && t != a; )
    if (1 == t.nodeType) {
      let e = t
      var l,
        h = window.getComputedStyle(e)
      ;(e.scrollHeight > e.clientHeight || e.scrollWidth > e.clientWidth) &&
        'visible' != h.overflow &&
        ((l = e.getBoundingClientRect()),
        (r = Math.max(r, l.left)),
        (n = Math.min(n, l.right)),
        (o = Math.max(o, l.top)),
        (s = Math.min(s, l.bottom))),
        (t =
          'absolute' == h.position || 'fixed' == h.position
            ? e.offsetParent
            : e.parentNode)
    } else {
      if (11 != t.nodeType) break
      t = t.host
    }
  return {
    left: r - i.left,
    right: Math.max(r, n) - i.left,
    top: o - (i.top + t),
    bottom: Math.max(o, s) - (i.top + t),
  }
}
function fullPixelRange(e, t) {
  e = e.getBoundingClientRect()
  return {
    left: 0,
    right: e.right - e.left,
    top: t,
    bottom: e.bottom - (e.top + t),
  }
}
class LineGap {
  constructor(e, t, i) {
    ;(this.from = e), (this.to = t), (this.size = i)
  }
  static same(t, i) {
    if (t.length != i.length) return !1
    for (let e = 0; e < t.length; e++) {
      var r = t[e],
        n = i[e]
      if (r.from != n.from || r.to != n.to || r.size != n.size) return !1
    }
    return !0
  }
  draw(e) {
    return Decoration.replace({
      widget: new LineGapWidget(this.size, e),
    }).range(this.from, this.to)
  }
}
class LineGapWidget extends WidgetType {
  constructor(e, t) {
    super(), (this.size = e), (this.vertical = t)
  }
  eq(e) {
    return e.size == this.size && e.vertical == this.vertical
  }
  toDOM() {
    let e = document.createElement('div')
    return (
      this.vertical
        ? (e.style.height = this.size + 'px')
        : ((e.style.width = this.size + 'px'),
          (e.style.height = '2px'),
          (e.style.display = 'inline-block')),
      e
    )
  }
  get estimatedHeight() {
    return this.vertical ? this.size : -1
  }
}
class ViewState {
  constructor(e) {
    ;(this.state = e),
      (this.pixelViewport = {
        left: 0,
        right: window.innerWidth,
        top: 0,
        bottom: 0,
      }),
      (this.inView = !0),
      (this.paddingTop = 0),
      (this.paddingBottom = 0),
      (this.contentDOMWidth = 0),
      (this.contentDOMHeight = 0),
      (this.editorHeight = 0),
      (this.editorWidth = 0),
      (this.heightOracle = new HeightOracle()),
      (this.scaler = IdScaler),
      (this.scrollTarget = null),
      (this.printing = !1),
      (this.mustMeasureContent = !0),
      (this.defaultTextDirection = Direction.RTL),
      (this.visibleRanges = []),
      (this.mustEnforceCursorAssoc = !1),
      (this.stateDeco = e
        .facet(decorations)
        .filter((e) => 'function' != typeof e)),
      (this.heightMap = HeightMap.empty().applyChanges(
        this.stateDeco,
        Text.empty,
        this.heightOracle.setDoc(e.doc),
        [new ChangedRange(0, 0, 0, e.doc.length)]
      )),
      (this.viewport = this.getViewport(0, null)),
      this.updateViewportLines(),
      this.updateForViewport(),
      (this.lineGaps = this.ensureLineGaps([])),
      (this.lineGapDeco = Decoration.set(this.lineGaps.map((e) => e.draw(!1)))),
      this.computeVisibleRanges()
  }
  updateForViewport() {
    let t = [this.viewport],
      r = this.state.selection['main']
    for (let e = 0; e <= 1; e++) {
      let i = e ? r.head : r.anchor
      var n, o
      t.some(({ from: e, to: t }) => i >= e && i <= t) ||
        (({ from: n, to: o } = this.lineBlockAt(i)), t.push(new Viewport(n, o)))
    }
    ;(this.viewports = t.sort((e, t) => e.from - t.from)),
      (this.scaler =
        this.heightMap.height <= 7e6
          ? IdScaler
          : new BigScaler(
              this.heightOracle.doc,
              this.heightMap,
              this.viewports
            ))
  }
  updateViewportLines() {
    ;(this.viewportLines = []),
      this.heightMap.forEachLine(
        this.viewport.from,
        this.viewport.to,
        this.state.doc,
        0,
        0,
        (e) => {
          this.viewportLines.push(
            1 == this.scaler.scale ? e : scaleBlock(e, this.scaler)
          )
        }
      )
  }
  update(e, t = null) {
    this.state = e.state
    var i = this.stateDeco,
      r =
        ((this.stateDeco = this.state
          .facet(decorations)
          .filter((e) => 'function' != typeof e)),
        e.changedRanges),
      r = ChangedRange.extendWithRanges(
        r,
        heightRelevantDecoChanges(
          i,
          this.stateDeco,
          e ? e.changes : ChangeSet.empty(this.state.doc.length)
        )
      ),
      i = this.heightMap.height
    ;(this.heightMap = this.heightMap.applyChanges(
      this.stateDeco,
      e.startState.doc,
      this.heightOracle.setDoc(this.state.doc),
      r
    )),
      this.heightMap.height != i && (e.flags |= 2)
    let n = r.length
      ? this.mapViewport(this.viewport, e.changes)
      : this.viewport
    ;((t && (t.range.head < n.from || t.range.head > n.to)) ||
      !this.viewportIsAppropriate(n)) &&
      (n = this.getViewport(0, t))
    i =
      !e.changes.empty ||
      2 & e.flags ||
      n.from != this.viewport.from ||
      n.to != this.viewport.to
    ;(this.viewport = n),
      this.updateForViewport(),
      i && this.updateViewportLines(),
      (this.lineGaps.length || 4e3 < this.viewport.to - this.viewport.from) &&
        this.updateLineGaps(
          this.ensureLineGaps(this.mapLineGaps(this.lineGaps, e.changes))
        ),
      (e.flags |= this.computeVisibleRanges()),
      t && (this.scrollTarget = t),
      !this.mustEnforceCursorAssoc &&
        e.selectionSet &&
        e.view.lineWrapping &&
        e.state.selection.main.empty &&
        e.state.selection.main.assoc &&
        (this.mustEnforceCursorAssoc = !0)
  }
  measure(e) {
    var t = e.contentDOM,
      i = window.getComputedStyle(t)
    let r = this.heightOracle
    var n = i.whiteSpace
    this.defaultTextDirection =
      'rtl' == i.direction ? Direction.RTL : Direction.LTR
    let o = this.heightOracle.mustRefreshForWrapping(n),
      s =
        o || this.mustMeasureContent || this.contentDOMHeight != t.clientHeight,
      a =
        ((this.contentDOMHeight = t.clientHeight),
        (this.mustMeasureContent = !1),
        0),
      l = 0
    var h = parseInt(i.paddingTop) || 0,
      i = parseInt(i.paddingBottom) || 0,
      h =
        ((this.paddingTop == h && this.paddingBottom == i) ||
          ((this.paddingTop = h), (this.paddingBottom = i), (a |= 10)),
        this.editorWidth != e.scrollDOM.clientWidth &&
          (r.lineWrapping && (s = !0),
          (this.editorWidth = e.scrollDOM.clientWidth),
          (a |= 8)),
        (this.printing ? fullPixelRange : visiblePixelRange)(
          t,
          this.paddingTop
        )),
      i = h.top - this.pixelViewport.top,
      c = h.bottom - this.pixelViewport.bottom,
      h =
        ((this.pixelViewport = h),
        this.pixelViewport.bottom > this.pixelViewport.top &&
          this.pixelViewport.right > this.pixelViewport.left)
    if ((h != this.inView && (this.inView = h) && (s = !0), !this.inView))
      return 0
    h = t.clientWidth
    if (
      ((this.contentDOMWidth == h &&
        this.editorHeight == e.scrollDOM.clientHeight) ||
        ((this.contentDOMWidth = h),
        (this.editorHeight = e.scrollDOM.clientHeight),
        (a |= 8)),
      s)
    ) {
      var d,
        u,
        f = e.docView.measureVisibleLineHeights(this.viewport)
      ;((o = r.mustRefreshForHeights(f) ? !0 : o) ||
        (r.lineWrapping && Math.abs(h - this.contentDOMWidth) > r.charWidth)) &&
        (({ lineHeight: t, charWidth: d } = e.docView.measureTextSize()),
        (o = r.refresh(n, t, d, h / d, f)) &&
          ((e.docView.minWidth = 0), (a |= 8))),
        0 < i && 0 < c
          ? (l = Math.max(i, c))
          : i < 0 && c < 0 && (l = Math.min(i, c)),
        (r.heightChanged = !1)
      for (u of this.viewports) {
        var p =
          u.from == this.viewport.from
            ? f
            : e.docView.measureVisibleLineHeights(u)
        this.heightMap = this.heightMap.updateHeight(
          r,
          0,
          o,
          new MeasuredHeights(u.from, p)
        )
      }
      r.heightChanged && (a |= 2)
    }
    n =
      !this.viewportIsAppropriate(this.viewport, l) ||
      (this.scrollTarget &&
        (this.scrollTarget.range.head < this.viewport.from ||
          this.scrollTarget.range.head > this.viewport.to))
    return (
      n && (this.viewport = this.getViewport(l, this.scrollTarget)),
      this.updateForViewport(),
      (2 & a || n) && this.updateViewportLines(),
      (this.lineGaps.length || 4e3 < this.viewport.to - this.viewport.from) &&
        this.updateLineGaps(this.ensureLineGaps(o ? [] : this.lineGaps)),
      (a |= this.computeVisibleRanges()),
      this.mustEnforceCursorAssoc &&
        ((this.mustEnforceCursorAssoc = !1), e.docView.enforceCursorAssoc()),
      a
    )
  }
  get visibleTop() {
    return this.scaler.fromDOM(this.pixelViewport.top)
  }
  get visibleBottom() {
    return this.scaler.fromDOM(this.pixelViewport.bottom)
  }
  getViewport(i, r) {
    i = 0.5 - Math.max(-0.5, Math.min(0.5, i / 1e3 / 2))
    let n = this.heightMap,
      o = this.state.doc,
      { visibleTop: e, visibleBottom: t } = this,
      s = new Viewport(
        n.lineAt(e - 1e3 * i, QueryType$1.ByHeight, o, 0, 0).from,
        n.lineAt(t + 1e3 * (1 - i), QueryType$1.ByHeight, o, 0, 0).to
      )
    if (r) {
      i = r.range['head']
      if (i < s.from || i > s.to) {
        var a = Math.min(
          this.editorHeight,
          this.pixelViewport.bottom - this.pixelViewport.top
        )
        let e = n.lineAt(i, QueryType$1.ByPos, o, 0, 0),
          t
        ;(t =
          'center' == r.y
            ? (e.top + e.bottom) / 2 - a / 2
            : 'start' == r.y || ('nearest' == r.y && i < s.from)
            ? e.top
            : e.bottom - a),
          (s = new Viewport(
            n.lineAt(t - 500, QueryType$1.ByHeight, o, 0, 0).from,
            n.lineAt(t + a + 500, QueryType$1.ByHeight, o, 0, 0).to
          ))
      }
    }
    return s
  }
  mapViewport(e, t) {
    var i = t.mapPos(e.from, -1),
      t = t.mapPos(e.to, 1)
    return new Viewport(
      this.heightMap.lineAt(i, QueryType$1.ByPos, this.state.doc, 0, 0).from,
      this.heightMap.lineAt(t, QueryType$1.ByPos, this.state.doc, 0, 0).to
    )
  }
  viewportIsAppropriate({ from: e, to: t }, i = 0) {
    if (!this.inView) return !0
    var r = this.heightMap.lineAt(e, QueryType$1.ByPos, this.state.doc, 0, 0)[
        'top'
      ],
      n = this.heightMap.lineAt(t, QueryType$1.ByPos, this.state.doc, 0, 0)[
        'bottom'
      ],
      { visibleTop: o, visibleBottom: s } = this
    return (
      (0 == e || r <= o - Math.max(10, Math.min(-i, 250))) &&
      (t == this.state.doc.length || n >= s + Math.max(10, Math.min(i, 250))) &&
      o - 2e3 < r &&
      n < s + 2e3
    )
  }
  mapLineGaps(e, t) {
    if (!e.length || t.empty) return e
    let i = []
    for (var r of e)
      t.touchesRange(r.from, r.to) ||
        i.push(new LineGap(t.mapPos(r.from), t.mapPos(r.to), r.size))
    return i
  }
  ensureLineGaps(o) {
    let s = []
    if (this.defaultTextDirection != Direction.LTR) return s
    for (let n of this.viewportLines)
      if (!(n.length < 4e3)) {
        var i,
          a = lineStructure(n.from, n.to, this.stateDeco)
        if (!(a.total < 4e3)) {
          let e, t
          t = this.heightOracle.lineWrapping
            ? ((i =
                (2e3 / this.heightOracle.lineLength) *
                this.heightOracle.lineHeight),
              (e = findPosition(a, (this.visibleTop - n.top - i) / n.height)),
              findPosition(a, (this.visibleBottom - n.top + i) / n.height))
            : ((i = a.total * this.heightOracle.charWidth),
              (l = 2e3 * this.heightOracle.charWidth),
              (e = findPosition(a, (this.pixelViewport.left - l) / i)),
              findPosition(a, (this.pixelViewport.right + l) / i))
          let r = []
          e > n.from && r.push({ from: n.from, to: e }),
            t < n.to && r.push({ from: t, to: n.to })
          var l = this.state.selection.main
          l.from >= n.from &&
            l.from <= n.to &&
            cutRange(r, l.from - 10, l.from + 10),
            !l.empty &&
              l.to >= n.from &&
              l.to <= n.to &&
              cutRange(r, l.to - 10, l.to + 10)
          for (let { from: t, to: i } of r)
            1e3 < i - t &&
              s.push(
                find(
                  o,
                  (e) =>
                    e.from >= n.from &&
                    e.to <= n.to &&
                    Math.abs(e.from - t) < 1e3 &&
                    Math.abs(e.to - i) < 1e3
                ) || new LineGap(t, i, this.gapSize(n, t, i, a))
              )
        }
      }
    return s
  }
  gapSize(e, t, i, r) {
    i = findFraction(r, i) - findFraction(r, t)
    return this.heightOracle.lineWrapping
      ? e.height * i
      : r.total * this.heightOracle.charWidth * i
  }
  updateLineGaps(e) {
    LineGap.same(e, this.lineGaps) ||
      ((this.lineGaps = e),
      (this.lineGapDeco = Decoration.set(
        e.map((e) => e.draw(this.heightOracle.lineWrapping))
      )))
  }
  computeVisibleRanges() {
    let e = this.stateDeco,
      i = (this.lineGaps.length && (e = e.concat(this.lineGapDeco)), [])
    RangeSet.spans(
      e,
      this.viewport.from,
      this.viewport.to,
      {
        span(e, t) {
          i.push({ from: e, to: t })
        },
        point() {},
      },
      20
    )
    var t =
      i.length != this.visibleRanges.length ||
      this.visibleRanges.some((e, t) => e.from != i[t].from || e.to != i[t].to)
    return (this.visibleRanges = i), t ? 4 : 0
  }
  lineBlockAt(t) {
    return (
      (t >= this.viewport.from &&
        t <= this.viewport.to &&
        this.viewportLines.find((e) => e.from <= t && e.to >= t)) ||
      scaleBlock(
        this.heightMap.lineAt(t, QueryType$1.ByPos, this.state.doc, 0, 0),
        this.scaler
      )
    )
  }
  lineBlockAtHeight(e) {
    return scaleBlock(
      this.heightMap.lineAt(
        this.scaler.fromDOM(e),
        QueryType$1.ByHeight,
        this.state.doc,
        0,
        0
      ),
      this.scaler
    )
  }
  elementAtHeight(e) {
    return scaleBlock(
      this.heightMap.blockAt(this.scaler.fromDOM(e), this.state.doc, 0, 0),
      this.scaler
    )
  }
  get docHeight() {
    return this.scaler.toDOM(this.heightMap.height)
  }
  get contentHeight() {
    return this.docHeight + this.paddingTop + this.paddingBottom
  }
}
class Viewport {
  constructor(e, t) {
    ;(this.from = e), (this.to = t)
  }
}
function lineStructure(e, t, i) {
  let r = [],
    n = e,
    o = 0
  return (
    RangeSet.spans(
      i,
      e,
      t,
      {
        span() {},
        point(e, t) {
          e > n && (r.push({ from: n, to: e }), (o += e - n)), (n = t)
        },
      },
      20
    ),
    n < t && (r.push({ from: n, to: t }), (o += t - n)),
    { total: o, ranges: r }
  )
}
function findPosition({ total: e, ranges: t }, i) {
  if (i <= 0) return t[0].from
  if (1 <= i) return t[t.length - 1].to
  let r = Math.floor(e * i)
  for (let e = 0; ; e++) {
    var { from: n, to: o } = t[e],
      o = o - n
    if (r <= o) return n + r
    r -= o
  }
}
function findFraction(e, t) {
  let i = 0
  for (var { from: r, to: n } of e.ranges) {
    if (t <= n) {
      i += t - r
      break
    }
    i += n - r
  }
  return i / e.total
}
function cutRange(i, r, n) {
  for (let t = 0; t < i.length; t++) {
    var o = i[t]
    if (o.from < n && o.to > r) {
      let e = []
      o.from < r && e.push({ from: o.from, to: r }),
        o.to > n && e.push({ from: n, to: o.to }),
        i.splice(t, 1, ...e),
        (t += e.length - 1)
    }
  }
}
function find(e, t) {
  for (var i of e) if (t(i)) return i
}
const IdScaler = {
  toDOM(e) {
    return e
  },
  fromDOM(e) {
    return e
  },
  scale: 1,
}
class BigScaler {
  constructor(n, o, e) {
    let s = 0,
      t = 0,
      i = 0
    ;(this.viewports = e.map(({ from: e, to: t }) => {
      var i = o.lineAt(e, QueryType$1.ByPos, n, 0, 0).top,
        r = o.lineAt(t, QueryType$1.ByPos, n, 0, 0).bottom
      return (
        (s += r - i),
        { from: e, to: t, top: i, bottom: r, domTop: 0, domBottom: 0 }
      )
    })),
      (this.scale = (7e6 - s) / (o.height - s))
    for (var r of this.viewports)
      (r.domTop = i + (r.top - t) * this.scale),
        (i = r.domBottom = r.domTop + (r.bottom - r.top)),
        (t = r.bottom)
  }
  toDOM(r) {
    for (let e = 0, t = 0, i = 0; ; e++) {
      var n = e < this.viewports.length ? this.viewports[e] : null
      if (!n || r < n.top) return i + (r - t) * this.scale
      if (r <= n.bottom) return n.domTop + (r - n.top)
      ;(t = n.bottom), (i = n.domBottom)
    }
  }
  fromDOM(r) {
    for (let e = 0, t = 0, i = 0; ; e++) {
      var n = e < this.viewports.length ? this.viewports[e] : null
      if (!n || r < n.domTop) return t + (r - i) / this.scale
      if (r <= n.domBottom) return n.top + (r - n.domTop)
      ;(t = n.bottom), (i = n.domBottom)
    }
  }
}
function scaleBlock(e, t) {
  if (1 == t.scale) return e
  var i = t.toDOM(e.top),
    r = t.toDOM(e.bottom)
  return new BlockInfo(
    e.from,
    e.length,
    i,
    r - i,
    Array.isArray(e.type) ? e.type.map((e) => scaleBlock(e, t)) : e.type
  )
}
const theme = Facet.define({ combine: (e) => e.join(' ') }),
  darkTheme = Facet.define({ combine: (e) => -1 < e.indexOf(!0) }),
  baseThemeID = StyleModule.newName(),
  baseLightID = StyleModule.newName(),
  baseDarkID = StyleModule.newName(),
  lightDarkIDs = { '&light': '.' + baseLightID, '&dark': '.' + baseDarkID }
function buildTheme(t, e, i) {
  return new StyleModule(e, {
    finish(e) {
      return /&/.test(e)
        ? e.replace(/&\w*/, (e) => {
            if ('&' == e) return t
            if (i && i[e]) return i[e]
            throw new RangeError('Unsupported selector: ' + e)
          })
        : t + ' ' + e
    },
  })
}
const baseTheme$1$1 = buildTheme(
    '.' + baseThemeID,
    {
      '&.cm-editor': {
        position: 'relative !important',
        boxSizing: 'border-box',
        '&.cm-focused': { outline: '1px dotted #212121' },
        display: 'flex !important',
        flexDirection: 'column',
      },
      '.cm-scroller': {
        display: 'flex !important',
        alignItems: 'flex-start !important',
        fontFamily: 'monospace',
        lineHeight: 1.4,
        height: '100%',
        overflowX: 'auto',
        position: 'relative',
        zIndex: 0,
      },
      '.cm-content': {
        margin: 0,
        flexGrow: 2,
        minHeight: '100%',
        display: 'block',
        whiteSpace: 'pre',
        wordWrap: 'normal',
        boxSizing: 'border-box',
        padding: '4px 0',
        outline: 'none',
        '&[contenteditable=true]': {
          WebkitUserModify: 'read-write-plaintext-only',
        },
      },
      '.cm-lineWrapping': {
        whiteSpace_fallback: 'pre-wrap',
        whiteSpace: 'break-spaces',
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
      },
      '&light .cm-content': { caretColor: 'black' },
      '&dark .cm-content': { caretColor: 'white' },
      '.cm-line': { display: 'block', padding: '0 2px 0 4px' },
      '.cm-selectionLayer': { zIndex: -1, contain: 'size style' },
      '.cm-selectionBackground': { position: 'absolute' },
      '&light .cm-selectionBackground': { background: '#d9d9d9' },
      '&dark .cm-selectionBackground': { background: '#222' },
      '&light.cm-focused .cm-selectionBackground': { background: '#d7d4f0' },
      '&dark.cm-focused .cm-selectionBackground': { background: '#233' },
      '.cm-cursorLayer': {
        zIndex: 100,
        contain: 'size style',
        pointerEvents: 'none',
      },
      '&.cm-focused .cm-cursorLayer': {
        animation: 'steps(1) cm-blink 1.2s infinite',
      },
      '@keyframes cm-blink': {
        '0%': {},
        '50%': { visibility: 'hidden' },
        '100%': {},
      },
      '@keyframes cm-blink2': {
        '0%': {},
        '50%': { visibility: 'hidden' },
        '100%': {},
      },
      '.cm-cursor, .cm-dropCursor': {
        position: 'absolute',
        borderLeft: '1.2px solid black',
        marginLeft: '-0.6px',
        pointerEvents: 'none',
      },
      '.cm-cursor': { display: 'none' },
      '&dark .cm-cursor': { borderLeftColor: '#444' },
      '&.cm-focused .cm-cursor': { display: 'block' },
      '&light .cm-activeLine': { backgroundColor: '#f3f9ff' },
      '&dark .cm-activeLine': { backgroundColor: '#223039' },
      '&light .cm-specialChar': { color: 'red' },
      '&dark .cm-specialChar': { color: '#f78' },
      '.cm-gutters': {
        display: 'flex',
        height: '100%',
        boxSizing: 'border-box',
        left: 0,
        zIndex: 200,
      },
      '&light .cm-gutters': {
        backgroundColor: '#f5f5f5',
        color: '#6c6c6c',
        borderRight: '1px solid #ddd',
      },
      '&dark .cm-gutters': { backgroundColor: '#333338', color: '#ccc' },
      '.cm-gutter': {
        display: 'flex !important',
        flexDirection: 'column',
        flexShrink: 0,
        boxSizing: 'border-box',
        minHeight: '100%',
        overflow: 'hidden',
      },
      '.cm-gutterElement': { boxSizing: 'border-box' },
      '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 3px 0 5px',
        minWidth: '20px',
        textAlign: 'right',
        whiteSpace: 'nowrap',
      },
      '&light .cm-activeLineGutter': { backgroundColor: '#e2f2ff' },
      '&dark .cm-activeLineGutter': { backgroundColor: '#222227' },
      '.cm-panels': {
        boxSizing: 'border-box',
        position: 'sticky',
        left: 0,
        right: 0,
      },
      '&light .cm-panels': { backgroundColor: '#f5f5f5', color: 'black' },
      '&light .cm-panels-top': { borderBottom: '1px solid #ddd' },
      '&light .cm-panels-bottom': { borderTop: '1px solid #ddd' },
      '&dark .cm-panels': { backgroundColor: '#333338', color: 'white' },
      '.cm-tab': {
        display: 'inline-block',
        overflow: 'hidden',
        verticalAlign: 'bottom',
      },
      '.cm-widgetBuffer': {
        verticalAlign: 'text-top',
        height: '1em',
        display: 'inline',
      },
      '.cm-placeholder': {
        color: '#888',
        display: 'inline-block',
        verticalAlign: 'top',
      },
      '.cm-button': {
        verticalAlign: 'middle',
        color: 'inherit',
        fontSize: '70%',
        padding: '.2em 1em',
        borderRadius: '1px',
      },
      '&light .cm-button': {
        backgroundImage: 'linear-gradient(#eff1f5, #d9d9df)',
        border: '1px solid #888',
        '&:active': { backgroundImage: 'linear-gradient(#b4b4b4, #d0d3d6)' },
      },
      '&dark .cm-button': {
        backgroundImage: 'linear-gradient(#393939, #111)',
        border: '1px solid #888',
        '&:active': { backgroundImage: 'linear-gradient(#111, #333)' },
      },
      '.cm-textfield': {
        verticalAlign: 'middle',
        color: 'inherit',
        fontSize: '70%',
        border: '1px solid silver',
        padding: '.2em .5em',
      },
      '&light .cm-textfield': { backgroundColor: 'white' },
      '&dark .cm-textfield': {
        border: '1px solid #555',
        backgroundColor: 'inherit',
      },
    },
    lightDarkIDs
  ),
  observeOptions = {
    childList: !0,
    characterData: !0,
    subtree: !0,
    attributes: !0,
    characterDataOldValue: !0,
  },
  useCharData = browser.ie && browser.ie_version <= 11
class DOMObserver {
  constructor(i, e, t) {
    ;(this.view = i),
      (this.onChange = e),
      (this.onScrollChanged = t),
      (this.active = !1),
      (this.selectionRange = new DOMSelectionState()),
      (this.selectionChanged = !1),
      (this.delayedFlush = -1),
      (this.resizeTimeout = -1),
      (this.queue = []),
      (this.delayedAndroidKey = null),
      (this.scrollTargets = []),
      (this.intersection = null),
      (this.resize = null),
      (this.intersecting = !1),
      (this.gapIntersection = null),
      (this.gaps = []),
      (this.parentCheck = -1),
      (this.dom = i.contentDOM),
      (this.observer = new MutationObserver((e) => {
        for (var t of e) this.queue.push(t)
        ;((browser.ie && browser.ie_version <= 11) ||
          (browser.ios && i.composing)) &&
        e.some(
          (e) =>
            ('childList' == e.type && e.removedNodes.length) ||
            ('characterData' == e.type &&
              e.oldValue.length > e.target.nodeValue.length)
        )
          ? this.flushSoon()
          : this.flush()
      })),
      useCharData &&
        (this.onCharData = (e) => {
          this.queue.push({
            target: e.target,
            type: 'characterData',
            oldValue: e.prevValue,
          }),
            this.flushSoon()
        }),
      (this.onSelectionChange = this.onSelectionChange.bind(this)),
      window.addEventListener(
        'resize',
        (this.onResize = this.onResize.bind(this))
      ),
      'function' == typeof ResizeObserver &&
        ((this.resize = new ResizeObserver(() => {
          this.view.docView.lastUpdate < Date.now() - 75 && this.onResize()
        })),
        this.resize.observe(i.scrollDOM)),
      window.addEventListener(
        'beforeprint',
        (this.onPrint = this.onPrint.bind(this))
      ),
      this.start(),
      window.addEventListener(
        'scroll',
        (this.onScroll = this.onScroll.bind(this))
      ),
      'function' == typeof IntersectionObserver &&
        ((this.intersection = new IntersectionObserver((e) => {
          this.parentCheck < 0 &&
            (this.parentCheck = setTimeout(
              this.listenForScroll.bind(this),
              1e3
            )),
            0 < e.length &&
              0 < e[e.length - 1].intersectionRatio != this.intersecting &&
              ((this.intersecting = !this.intersecting),
              this.intersecting != this.view.inView &&
                this.onScrollChanged(document.createEvent('Event')))
        }, {})),
        this.intersection.observe(this.dom),
        (this.gapIntersection = new IntersectionObserver((e) => {
          0 < e.length &&
            0 < e[e.length - 1].intersectionRatio &&
            this.onScrollChanged(document.createEvent('Event'))
        }, {}))),
      this.listenForScroll(),
      this.readSelectionRange(),
      this.dom.ownerDocument.addEventListener(
        'selectionchange',
        this.onSelectionChange
      )
  }
  onScroll(e) {
    this.intersecting && this.flush(!1), this.onScrollChanged(e)
  }
  onResize() {
    this.resizeTimeout < 0 &&
      (this.resizeTimeout = setTimeout(() => {
        ;(this.resizeTimeout = -1), this.view.requestMeasure()
      }, 50))
  }
  onPrint() {
    ;(this.view.viewState.printing = !0),
      this.view.measure(),
      setTimeout(() => {
        ;(this.view.viewState.printing = !1), this.view.requestMeasure()
      }, 500)
  }
  updateGaps(i) {
    if (
      this.gapIntersection &&
      (i.length != this.gaps.length || this.gaps.some((e, t) => e != i[t]))
    ) {
      this.gapIntersection.disconnect()
      for (var e of i) this.gapIntersection.observe(e)
      this.gaps = i
    }
  }
  onSelectionChange(r) {
    if (this.readSelectionRange() && !this.delayedAndroidKey) {
      let t = this['view'],
        i = this.selectionRange
      if (
        t.state.facet(editable)
          ? t.root.activeElement == this.dom
          : hasSelection(t.dom, i)
      ) {
        let e = i.anchorNode && t.docView.nearest(i.anchorNode)
        ;(e && e.ignoreEvent(r)) ||
          (((browser.ie && browser.ie_version <= 11) ||
            (browser.android && browser.chrome)) &&
          !t.state.selection.main.empty &&
          i.focusNode &&
          isEquivalentPosition(
            i.focusNode,
            i.focusOffset,
            i.anchorNode,
            i.anchorOffset
          )
            ? this.flushSoon()
            : this.flush(!1))
      }
    }
  }
  readSelectionRange() {
    var e = this.view['root'],
      t = getSelection(e),
      e =
        (browser.safari &&
          11 == e.nodeType &&
          deepActiveElement() == this.view.contentDOM &&
          safariSelectionRangeHack(this.view)) ||
        t
    return (
      !this.selectionRange.eq(e) &&
      (this.selectionRange.setRange(e), (this.selectionChanged = !0))
    )
  }
  setSelectionRange(e, t) {
    this.selectionRange.set(e.node, e.offset, t.node, t.offset),
      (this.selectionChanged = !1)
  }
  clearSelectionRange() {
    this.selectionRange.set(null, 0, null, 0)
  }
  listenForScroll() {
    this.parentCheck = -1
    let t = 0,
      i = null
    for (let e = this.dom; e; )
      if (1 == e.nodeType)
        !i && t < this.scrollTargets.length && this.scrollTargets[t] == e
          ? t++
          : (i = i || this.scrollTargets.slice(0, t)),
          i && i.push(e),
          (e = e.assignedSlot || e.parentNode)
      else {
        if (11 != e.nodeType) break
        e = e.host
      }
    if (
      (i =
        t < this.scrollTargets.length && !i
          ? this.scrollTargets.slice(0, t)
          : i)
    ) {
      for (var e of this.scrollTargets)
        e.removeEventListener('scroll', this.onScroll)
      for (var r of (this.scrollTargets = i))
        r.addEventListener('scroll', this.onScroll)
    }
  }
  ignore(e) {
    if (!this.active) return e()
    try {
      return this.stop(), e()
    } finally {
      this.start(), this.clear()
    }
  }
  start() {
    this.active ||
      (this.observer.observe(this.dom, observeOptions),
      useCharData &&
        this.dom.addEventListener('DOMCharacterDataModified', this.onCharData),
      (this.active = !0))
  }
  stop() {
    this.active &&
      ((this.active = !1),
      this.observer.disconnect(),
      useCharData &&
        this.dom.removeEventListener(
          'DOMCharacterDataModified',
          this.onCharData
        ))
  }
  clear() {
    this.processRecords(), (this.queue.length = 0), (this.selectionChanged = !1)
  }
  delayAndroidKey(e, t) {
    this.delayedAndroidKey ||
      requestAnimationFrame(() => {
        var e = this.delayedAndroidKey
        ;(this.delayedAndroidKey = null),
          (this.delayedFlush = -1),
          this.flush() || dispatchKey(this.view.contentDOM, e.key, e.keyCode)
      }),
      (this.delayedAndroidKey && 'Enter' != e) ||
        (this.delayedAndroidKey = { key: e, keyCode: t })
  }
  flushSoon() {
    this.delayedFlush < 0 &&
      (this.delayedFlush = window.setTimeout(() => {
        ;(this.delayedFlush = -1), this.flush()
      }, 20))
  }
  forceFlush() {
    0 <= this.delayedFlush &&
      (window.clearTimeout(this.delayedFlush),
      (this.delayedFlush = -1),
      this.flush())
  }
  processRecords() {
    let e = this.queue
    for (var t of this.observer.takeRecords()) e.push(t)
    e.length && (this.queue = [])
    let i = -1,
      r = -1,
      n = !1
    for (var o of e) {
      o = this.readMutation(o)
      o &&
        (o.typeOver && (n = !0),
        -1 == i
          ? ({ from: i, to: r } = o)
          : ((i = Math.min(o.from, i)), (r = Math.max(o.to, r))))
    }
    return { from: i, to: r, typeOver: n }
  }
  flush(e = !0) {
    if (!(0 <= this.delayedFlush || this.delayedAndroidKey)) {
      e && this.readSelectionRange()
      var { from: e, to: t, typeOver: i } = this.processRecords(),
        r = this.selectionChanged && hasSelection(this.dom, this.selectionRange)
      if (!(e < 0) || r)
        return (
          (this.selectionChanged = !1),
          (r = this.view.state),
          (e = this.onChange(e, t, i)),
          this.view.state == r && this.view.update([]),
          e
        )
    }
  }
  readMutation(e) {
    let t = this.view.docView.nearest(e.target)
    return !t || t.ignoreMutation(e)
      ? null
      : (t.markDirty('attributes' == e.type),
        'attributes' == e.type && (t.dirty |= 4),
        'childList' == e.type
          ? ((i = findChild(
              t,
              e.previousSibling || e.target.previousSibling,
              -1
            )),
            (r = findChild(t, e.nextSibling || e.target.nextSibling, 1)),
            {
              from: i ? t.posAfter(i) : t.posAtStart,
              to: r ? t.posBefore(r) : t.posAtEnd,
              typeOver: !1,
            })
          : 'characterData' == e.type
          ? {
              from: t.posAtStart,
              to: t.posAtEnd,
              typeOver: e.target.nodeValue == e.oldValue,
            }
          : null)
    var i, r
  }
  destroy() {
    var e, t
    this.stop(),
      null != (e = this.intersection) && e.disconnect(),
      null != (e = this.gapIntersection) && e.disconnect(),
      null != (e = this.resize) && e.disconnect()
    for (t of this.scrollTargets) t.removeEventListener('scroll', this.onScroll)
    window.removeEventListener('scroll', this.onScroll),
      window.removeEventListener('resize', this.onResize),
      window.removeEventListener('beforeprint', this.onPrint),
      this.dom.ownerDocument.removeEventListener(
        'selectionchange',
        this.onSelectionChange
      ),
      clearTimeout(this.parentCheck),
      clearTimeout(this.resizeTimeout)
  }
}
function findChild(e, t, i) {
  for (; t; ) {
    var r = ContentView.get(t)
    if (r && r.parent == e) return r
    r = t.parentNode
    t = r != e.dom ? r : 0 < i ? t.nextSibling : t.previousSibling
  }
  return null
}
function safariSelectionRangeHack(e) {
  let t = null
  function i(e) {
    e.preventDefault(),
      e.stopImmediatePropagation(),
      (t = e.getTargetRanges()[0])
  }
  if (
    (e.contentDOM.addEventListener('beforeinput', i, !0),
    document.execCommand('indent'),
    e.contentDOM.removeEventListener('beforeinput', i, !0),
    !t)
  )
    return null
  let r = t.startContainer,
    n = t.startOffset,
    o = t.endContainer,
    s = t.endOffset
  e = e.docView.domAtPos(e.state.selection.main.anchor)
  return (
    isEquivalentPosition(e.node, e.offset, o, s) &&
      ([r, n, o, s] = [o, s, r, n]),
    { anchorNode: r, anchorOffset: n, focusNode: o, focusOffset: s }
  )
}
function applyDOMChange(c, n, o, e) {
  let d,
    s,
    u = c.state.selection.main
  if (-1 < n) {
    n = c.docView.domBoundsAround(n, o, 0)
    if (!n || c.state.readOnly) return !1
    var { from: o, to: a } = n,
      l =
        c.docView.impreciseHead || c.docView.impreciseAnchor
          ? []
          : selectionPoints(c)
    let e = new DOMReader(l, c.state),
      t = (e.readRange(n.startDOM, n.endDOM), u.from),
      i = null,
      r =
        (((8 === c.inputState.lastKeyCode &&
          c.inputState.lastKeyTime > Date.now() - 100) ||
          (browser.android && e.text.length < a - o)) &&
          ((t = u.to), (i = 'end')),
        findDiff(
          c.state.doc.sliceString(o, a, LineBreakPlaceholder),
          e.text,
          t - o,
          i
        ))
    r &&
      (browser.chrome &&
        13 == c.inputState.lastKeyCode &&
        r.toB == r.from + 2 &&
        e.text.slice(r.from, r.toB) ==
          LineBreakPlaceholder + LineBreakPlaceholder &&
        r.toB--,
      (d = {
        from: o + r.from,
        to: o + r.toA,
        insert: Text.of(
          e.text.slice(r.from, r.toB).split(LineBreakPlaceholder)
        ),
      })),
      (s = selectionFromPoints(l, o))
  } else
    (!c.hasFocus && c.state.facet(editable)) ||
      ((n = c.observer.selectionRange),
      ({ impreciseHead: a, impreciseAnchor: l } = c.docView),
      (o =
        (a && a.node == n.focusNode && a.offset == n.focusOffset) ||
        !contains(c.contentDOM, n.focusNode)
          ? c.state.selection.main.head
          : c.docView.posFromDOM(n.focusNode, n.focusOffset)),
      (a =
        (l && l.node == n.anchorNode && l.offset == n.anchorOffset) ||
        !contains(c.contentDOM, n.anchorNode)
          ? c.state.selection.main.anchor
          : c.docView.posFromDOM(n.anchorNode, n.anchorOffset)),
      (o == u.head && a == u.anchor) || (s = EditorSelection.single(a, o)))
  if (!d && !s) return !1
  if (
    (!d && e && !u.empty && s && s.main.empty
      ? (d = {
          from: u.from,
          to: u.to,
          insert: c.state.doc.slice(u.from, u.to),
        })
      : d &&
        d.from >= u.from &&
        d.to <= u.to &&
        (d.from != u.from || d.to != u.to) &&
        u.to - u.from - (d.to - d.from) <= 4
      ? (d = {
          from: u.from,
          to: u.to,
          insert: c.state.doc
            .slice(u.from, d.from)
            .append(d.insert)
            .append(c.state.doc.slice(d.to, u.to)),
        })
      : (browser.mac || browser.android) &&
        d &&
        d.from == d.to &&
        d.from == u.head - 1 &&
        '.' == d.insert.toString() &&
        (d = { from: u.from, to: u.to, insert: Text.of([' ']) }),
    d)
  ) {
    let h = c.state
    if (browser.ios && c.inputState.flushIOSKey(c)) return !0
    if (
      browser.android &&
      ((d.from == u.from &&
        d.to == u.to &&
        1 == d.insert.length &&
        2 == d.insert.lines &&
        dispatchKey(c.contentDOM, 'Enter', 13)) ||
        (d.from == u.from - 1 &&
          d.to == u.to &&
          0 == d.insert.length &&
          dispatchKey(c.contentDOM, 'Backspace', 8)) ||
        (d.from == u.from &&
          d.to == u.to + 1 &&
          0 == d.insert.length &&
          dispatchKey(c.contentDOM, 'Delete', 46)))
    )
      return !0
    let t = d.insert.toString()
    if (c.state.facet(inputHandler$1).some((e) => e(c, d.from, d.to, t)))
      return !0
    0 <= c.inputState.composing && c.inputState.composing++
    let e
    if (
      d.from >= u.from &&
      d.to <= u.to &&
      d.to - d.from >= (u.to - u.from) / 3 &&
      (!s || (s.main.empty && s.main.from == d.from + d.insert.length)) &&
      c.inputState.composing < 0
    ) {
      ;(l = u.from < d.from ? h.sliceDoc(u.from, d.from) : ''),
        (n = u.to > d.to ? h.sliceDoc(d.to, u.to) : '')
      e = h.replaceSelection(
        c.state.toText(
          l + d.insert.sliceString(0, void 0, c.state.lineBreak) + n
        )
      )
    } else {
      let a = h.changes(d),
        l =
          s && !h.selection.main.eq(s.main) && s.main.to <= a.newLength
            ? s.main
            : void 0
      if (
        1 < h.selection.ranges.length &&
        0 <= c.inputState.composing &&
        d.to <= u.to &&
        d.to >= u.to - 10
      ) {
        let r = c.state.sliceDoc(d.from, d.to),
          n = compositionSurroundingNode(c) || c.state.doc.lineAt(u.head),
          o = u.to - d.to,
          s = u.to - u.from
        e = h.changeByRange((e) => {
          if (e.from == u.from && e.to == u.to)
            return { changes: a, range: l || e.map(a) }
          var t = e.to - o,
            i = t - r.length
          if (
            e.to - e.from != s ||
            c.state.sliceDoc(i, t) != r ||
            (n && e.to >= n.from && e.from <= n.to)
          )
            return { range: e }
          ;(i = h.changes({ from: i, to: t, insert: d.insert })),
            (t = e.to - u.to)
          return {
            changes: i,
            range: l
              ? EditorSelection.range(
                  Math.max(0, l.anchor + t),
                  Math.max(0, l.head + t)
                )
              : e.map(i),
          }
        })
      } else e = { changes: a, selection: l && h.selection.replaceRange(l) }
    }
    let i = 'input.type'
    return (
      c.composing &&
        ((i += '.compose'),
        c.inputState.compositionFirstChange &&
          ((i += '.start'), (c.inputState.compositionFirstChange = !1))),
      c.dispatch(e, { scrollIntoView: !0, userEvent: i }),
      !0
    )
  }
  if (!s || s.main.eq(u)) return !1
  {
    let e = !1,
      t = 'select'
    return (
      c.inputState.lastSelectionTime > Date.now() - 50 &&
        ('select' == c.inputState.lastSelectionOrigin && (e = !0),
        (t = c.inputState.lastSelectionOrigin)),
      c.dispatch({ selection: s, scrollIntoView: e, userEvent: t }),
      !0
    )
  }
}
function findDiff(e, t, i, r) {
  var n = Math.min(e.length, t.length)
  let o = 0
  for (; o < n && e.charCodeAt(o) == t.charCodeAt(o); ) o++
  if (o == n && e.length == t.length) return null
  let s = e.length,
    a = t.length
  for (; 0 < s && 0 < a && e.charCodeAt(s - 1) == t.charCodeAt(a - 1); )
    s--, a--
  return (
    'end' == r && ((r = Math.max(0, o - Math.min(s, a))), (i -= s + r - o)),
    s < o && e.length < t.length
      ? ((r = i <= o && i >= s ? o - i : 0),
        (o -= r),
        (a = o + (a - s)),
        (s = o))
      : a < o &&
        ((r = i <= o && i >= a ? o - i : 0),
        (o -= r),
        (s = o + (s - a)),
        (a = o)),
    { from: o, toA: s, toB: a }
  )
}
function selectionPoints(e) {
  let t = []
  if (e.root.activeElement != e.contentDOM) return t
  var {
    anchorNode: e,
    anchorOffset: i,
    focusNode: r,
    focusOffset: n,
  } = e.observer.selectionRange
  return (
    e &&
      (t.push(new DOMPoint(e, i)),
      (r == e && n == i) || t.push(new DOMPoint(r, n))),
    t
  )
}
function selectionFromPoints(e, t) {
  if (0 == e.length) return null
  var i = e[0].pos,
    e = 2 == e.length ? e[1].pos : i
  return -1 < i && -1 < e ? EditorSelection.single(i + t, e + t) : null
}
class EditorView {
  constructor(e = {}) {
    ;(this.plugins = []),
      (this.pluginMap = new Map()),
      (this.editorAttrs = {}),
      (this.contentAttrs = {}),
      (this.bidiCache = []),
      (this.destroyed = !1),
      (this.updateState = 2),
      (this.measureScheduled = -1),
      (this.measureRequests = []),
      (this.contentDOM = document.createElement('div')),
      (this.scrollDOM = document.createElement('div')),
      (this.scrollDOM.tabIndex = -1),
      (this.scrollDOM.className = 'cm-scroller'),
      this.scrollDOM.appendChild(this.contentDOM),
      (this.announceDOM = document.createElement('div')),
      (this.announceDOM.style.cssText = 'position: absolute; top: -10000px'),
      this.announceDOM.setAttribute('aria-live', 'polite'),
      (this.dom = document.createElement('div')),
      this.dom.appendChild(this.announceDOM),
      this.dom.appendChild(this.scrollDOM),
      (this._dispatch = e.dispatch || ((e) => this.update([e]))),
      (this.dispatch = this.dispatch.bind(this)),
      (this.root = e.root || getRoot(e.parent) || document),
      (this.viewState = new ViewState(e.state || EditorState.create(e))),
      (this.plugins = this.state
        .facet(viewPlugin)
        .map((e) => new PluginInstance(e)))
    for (var t of this.plugins) t.update(this)
    ;(this.observer = new DOMObserver(
      this,
      (e, t, i) => applyDOMChange(this, e, t, i),
      (e) => {
        this.inputState.runScrollHandlers(this, e),
          this.observer.intersecting && this.measure()
      }
    )),
      (this.inputState = new InputState(this)),
      this.inputState.ensureHandlers(this, this.plugins),
      (this.docView = new DocView(this)),
      this.mountStyles(),
      this.updateAttrs(),
      (this.updateState = 0),
      this.requestMeasure(),
      e.parent && e.parent.appendChild(this.dom)
  }
  get state() {
    return this.viewState.state
  }
  get viewport() {
    return this.viewState.viewport
  }
  get visibleRanges() {
    return this.viewState.visibleRanges
  }
  get inView() {
    return this.viewState.inView
  }
  get composing() {
    return 0 < this.inputState.composing
  }
  get compositionStarted() {
    return 0 <= this.inputState.composing
  }
  dispatch(...e) {
    this._dispatch(
      1 == e.length && e[0] instanceof Transaction
        ? e[0]
        : this.state.update(...e)
    )
  }
  update(t) {
    if (0 != this.updateState)
      throw new Error(
        'Calls to EditorView.update are not allowed while an update is in progress'
      )
    let i = !1,
      r = !1,
      n,
      o = this.state
    for (var e of t) {
      if (e.startState != o)
        throw new RangeError(
          "Trying to update state with a transaction that doesn't start from the previous state."
        )
      o = e.state
    }
    if (this.destroyed) this.viewState.state = o
    else {
      if (
        (this.observer.clear(),
        o.facet(EditorState.phrases) != this.state.facet(EditorState.phrases))
      )
        return this.setState(o)
      n = ViewUpdate.create(this, o, t)
      let e = this.viewState.scrollTarget
      try {
        this.updateState = 2
        for (var s of t) {
          var a, l
          ;(e = e && e.map(s.changes)),
            s.scrollIntoView &&
              ((a = s.state.selection['main']),
              (e = new ScrollTarget(
                a.empty
                  ? a
                  : EditorSelection.cursor(a.head, a.head > a.anchor ? -1 : 1)
              )))
          for (l of s.effects) l.is(scrollIntoView$1) && (e = l.value)
        }
        this.viewState.update(n, e),
          (this.bidiCache = CachedOrder.update(this.bidiCache, n.changes)),
          n.empty || (this.updatePlugins(n), this.inputState.update(n)),
          (i = this.docView.update(n)),
          this.state.facet(styleModule) != this.styleModules &&
            this.mountStyles(),
          (r = this.updateAttrs()),
          this.showAnnouncements(t),
          this.docView.updateSelection(
            i,
            t.some((e) => e.isUserEvent('select.pointer'))
          )
      } finally {
        this.updateState = 0
      }
      if (
        (n.startState.facet(theme) != n.state.facet(theme) &&
          (this.viewState.mustMeasureContent = !0),
        (i ||
          r ||
          e ||
          this.viewState.mustEnforceCursorAssoc ||
          this.viewState.mustMeasureContent) &&
          this.requestMeasure(),
        !n.empty)
      )
        for (var h of this.state.facet(updateListener)) h(n)
    }
  }
  setState(e) {
    if (0 != this.updateState)
      throw new Error(
        'Calls to EditorView.setState are not allowed while an update is in progress'
      )
    if (this.destroyed) this.viewState.state = e
    else {
      this.updateState = 2
      var t = this.hasFocus
      try {
        for (var i of this.plugins) i.destroy(this)
        ;(this.viewState = new ViewState(e)),
          (this.plugins = e
            .facet(viewPlugin)
            .map((e) => new PluginInstance(e))),
          this.pluginMap.clear()
        for (var r of this.plugins) r.update(this)
        ;(this.docView = new DocView(this)),
          this.inputState.ensureHandlers(this, this.plugins),
          this.mountStyles(),
          this.updateAttrs(),
          (this.bidiCache = [])
      } finally {
        this.updateState = 0
      }
      t && this.focus(), this.requestMeasure()
    }
  }
  updatePlugins(i) {
    let e = i.startState.facet(viewPlugin),
      r = i.state.facet(viewPlugin)
    if (e != r) {
      let t = []
      for (var n of r) {
        var o = e.indexOf(n)
        if (o < 0) t.push(new PluginInstance(n))
        else {
          let e = this.plugins[o]
          ;(e.mustUpdate = i), t.push(e)
        }
      }
      for (var s of this.plugins) s.mustUpdate != i && s.destroy(this)
      ;(this.plugins = t),
        this.pluginMap.clear(),
        this.inputState.ensureHandlers(this, this.plugins)
    } else for (var t of this.plugins) t.mustUpdate = i
    for (let e = 0; e < this.plugins.length; e++) this.plugins[e].update(this)
  }
  measure(e = !0) {
    if (!this.destroyed) {
      ;-1 < this.measureScheduled &&
        cancelAnimationFrame(this.measureScheduled),
        (this.measureScheduled = 0),
        e && this.observer.flush()
      let o = null
      try {
        for (let n = 0; ; n++) {
          this.updateState = 1
          var s = this.viewport,
            a = this.viewState.measure(this)
          if (
            !a &&
            !this.measureRequests.length &&
            null == this.viewState.scrollTarget
          )
            break
          if (5 < n) {
            console.warn(
              this.measureRequests.length
                ? 'Measure loop restarted more than 5 times'
                : 'Viewport failed to stabilize'
            )
            break
          }
          let i = []
          4 & a || ([this.measureRequests, i] = [i, this.measureRequests])
          var l = i.map((e) => {
            try {
              return e.read(this)
            } catch (e) {
              return logException(this.state, e), BadMeasure
            }
          })
          let e = ViewUpdate.create(this, this.state, []),
            t = !1,
            r = !1
          ;(e.flags |= a),
            o ? (o.flags |= a) : (o = e),
            (this.updateState = 2),
            e.empty ||
              (this.updatePlugins(e),
              this.inputState.update(e),
              this.updateAttrs(),
              (t = this.docView.update(e)))
          for (let t = 0; t < i.length; t++)
            if (l[t] != BadMeasure)
              try {
                let e = i[t]
                e.write && e.write(l[t], this)
              } catch (e) {
                logException(this.state, e)
              }
          if (
            (this.viewState.scrollTarget &&
              (this.docView.scrollIntoView(this.viewState.scrollTarget),
              (this.viewState.scrollTarget = null),
              (r = !0)),
            t && this.docView.updateSelection(!0),
            this.viewport.from == s.from &&
              this.viewport.to == s.to &&
              !r &&
              0 == this.measureRequests.length)
          )
            break
        }
      } finally {
        ;(this.updateState = 0), (this.measureScheduled = -1)
      }
      if (o && !o.empty) for (var t of this.state.facet(updateListener)) t(o)
    }
  }
  get themeClasses() {
    return (
      baseThemeID +
      ' ' +
      (this.state.facet(darkTheme) ? baseDarkID : baseLightID) +
      ' ' +
      this.state.facet(theme)
    )
  }
  updateAttrs() {
    let i = attrsFromFacet(this, editorAttributes, {
        class:
          'cm-editor' +
          (this.hasFocus ? ' cm-focused ' : ' ') +
          this.themeClasses,
      }),
      r = {
        spellcheck: 'false',
        autocorrect: 'off',
        autocapitalize: 'off',
        translate: 'no',
        contenteditable: this.state.facet(editable) ? 'true' : 'false',
        class: 'cm-content',
        style: browser.tabSize + ': ' + this.state.tabSize,
        role: 'textbox',
        'aria-multiline': 'true',
      }
    this.state.readOnly && (r['aria-readonly'] = 'true'),
      attrsFromFacet(this, contentAttributes, r)
    var e = this.observer.ignore(() => {
      var e = updateAttrs(this.contentDOM, this.contentAttrs, r),
        t = updateAttrs(this.dom, this.editorAttrs, i)
      return e || t
    })
    return (this.editorAttrs = i), (this.contentAttrs = r), e
  }
  showAnnouncements(e) {
    let t = !0
    for (var i of e)
      for (var r of i.effects)
        if (r.is(EditorView.announce)) {
          t && (this.announceDOM.textContent = ''), (t = !1)
          let e = this.announceDOM.appendChild(document.createElement('div'))
          e.textContent = r.value
        }
  }
  mountStyles() {
    ;(this.styleModules = this.state.facet(styleModule)),
      StyleModule.mount(
        this.root,
        this.styleModules.concat(baseTheme$1$1).reverse()
      )
  }
  readMeasured() {
    if (2 == this.updateState)
      throw new Error(
        "Reading the editor layout isn't allowed during an update"
      )
    0 == this.updateState && -1 < this.measureScheduled && this.measure(!1)
  }
  requestMeasure(t) {
    if (
      (this.measureScheduled < 0 &&
        (this.measureScheduled = requestAnimationFrame(() => this.measure())),
      t)
    ) {
      if (null != t.key)
        for (let e = 0; e < this.measureRequests.length; e++)
          if (this.measureRequests[e].key === t.key)
            return void (this.measureRequests[e] = t)
      this.measureRequests.push(t)
    }
  }
  plugin(t) {
    let e = this.pluginMap.get(t)
    return (
      (void 0 === e || (e && e.spec != t)) &&
        this.pluginMap.set(
          t,
          (e = this.plugins.find((e) => e.spec == t) || null)
        ),
      e && e.update(this).value
    )
  }
  get documentTop() {
    return (
      this.contentDOM.getBoundingClientRect().top + this.viewState.paddingTop
    )
  }
  get documentPadding() {
    return {
      top: this.viewState.paddingTop,
      bottom: this.viewState.paddingBottom,
    }
  }
  elementAtHeight(e) {
    return this.readMeasured(), this.viewState.elementAtHeight(e)
  }
  lineBlockAtHeight(e) {
    return this.readMeasured(), this.viewState.lineBlockAtHeight(e)
  }
  get viewportLineBlocks() {
    return this.viewState.viewportLines
  }
  lineBlockAt(e) {
    return this.viewState.lineBlockAt(e)
  }
  get contentHeight() {
    return this.viewState.contentHeight
  }
  moveByChar(e, t, i) {
    return skipAtoms(this, e, moveByChar(this, e, t, i))
  }
  moveByGroup(t, e) {
    return skipAtoms(
      this,
      t,
      moveByChar(this, t, e, (e) => byGroup(this, t.head, e))
    )
  }
  moveToLineBoundary(e, t, i = !0) {
    return moveToLineBoundary(this, e, t, i)
  }
  moveVertically(e, t, i) {
    return skipAtoms(this, e, moveVertically(this, e, t, i))
  }
  domAtPos(e) {
    return this.docView.domAtPos(e)
  }
  posAtDOM(e, t = 0) {
    return this.docView.posFromDOM(e, t)
  }
  posAtCoords(e, t = !0) {
    return this.readMeasured(), posAtCoords(this, e, t)
  }
  coordsAtPos(e, t = 1) {
    this.readMeasured()
    var i = this.docView.coordsAt(e, t)
    if (!i || i.left == i.right) return i
    var r = this.state.doc.lineAt(e),
      n = this.bidiSpans(r)
    return flattenRect(
      i,
      (n[BidiSpan.find(n, e - r.from, -1, t)].dir == Direction.LTR) == 0 < t
    )
  }
  get defaultCharacterWidth() {
    return this.viewState.heightOracle.charWidth
  }
  get defaultLineHeight() {
    return this.viewState.heightOracle.lineHeight
  }
  get textDirection() {
    return this.viewState.defaultTextDirection
  }
  textDirectionAt(e) {
    return !this.state.facet(perLineTextDirection) ||
      e < this.viewport.from ||
      e > this.viewport.to
      ? this.textDirection
      : (this.readMeasured(), this.docView.textDirectionAt(e))
  }
  get lineWrapping() {
    return this.viewState.heightOracle.lineWrapping
  }
  bidiSpans(e) {
    if (e.length > MaxBidiLine) return trivialOrder(e.length)
    var t,
      i = this.textDirectionAt(e.from)
    for (t of this.bidiCache) if (t.from == e.from && t.dir == i) return t.order
    var r = computeOrder(e.text, i)
    return this.bidiCache.push(new CachedOrder(e.from, e.to, i, r)), r
  }
  get hasFocus() {
    var e
    return (
      (document.hasFocus() ||
        (browser.safari &&
          (null == (e = this.inputState) ? void 0 : e.lastContextMenu) >
            Date.now() - 3e4)) &&
      this.root.activeElement == this.contentDOM
    )
  }
  focus() {
    this.observer.ignore(() => {
      focusPreventScroll(this.contentDOM), this.docView.updateSelection()
    })
  }
  destroy() {
    for (var e of this.plugins) e.destroy(this)
    ;(this.plugins = []),
      this.inputState.destroy(),
      this.dom.remove(),
      this.observer.destroy(),
      -1 < this.measureScheduled && cancelAnimationFrame(this.measureScheduled),
      (this.destroyed = !0)
  }
  static scrollIntoView(e, t = {}) {
    return scrollIntoView$1.of(
      new ScrollTarget(
        'number' == typeof e ? EditorSelection.cursor(e) : e,
        t.y,
        t.x,
        t.yMargin,
        t.xMargin
      )
    )
  }
  static domEventHandlers(e) {
    return ViewPlugin.define(() => ({}), { eventHandlers: e })
  }
  static theme(e, t) {
    var i = StyleModule.newName()
    let r = [theme.of(i), styleModule.of(buildTheme('.' + i, e))]
    return t && t.dark && r.push(darkTheme.of(!0)), r
  }
  static baseTheme(e) {
    return Prec.lowest(
      styleModule.of(buildTheme('.' + baseThemeID, e, lightDarkIDs))
    )
  }
  static findFromDOM(e) {
    var t = e.querySelector('.cm-content'),
      t = (t && ContentView.get(t)) || ContentView.get(e)
    return (
      (null == (e = null == t ? void 0 : t.rootView) ? void 0 : e.view) || null
    )
  }
}
;(EditorView.styleModule = styleModule),
  (EditorView.inputHandler = inputHandler$1),
  (EditorView.perLineTextDirection = perLineTextDirection),
  (EditorView.exceptionSink = exceptionSink),
  (EditorView.updateListener = updateListener),
  (EditorView.editable = editable),
  (EditorView.mouseSelectionStyle = mouseSelectionStyle),
  (EditorView.dragMovesSelection = dragMovesSelection$1),
  (EditorView.clickAddsSelectionRange = clickAddsSelectionRange),
  (EditorView.decorations = decorations),
  (EditorView.atomicRanges = atomicRanges),
  (EditorView.scrollMargins = scrollMargins),
  (EditorView.darkTheme = darkTheme),
  (EditorView.contentAttributes = contentAttributes),
  (EditorView.editorAttributes = editorAttributes),
  (EditorView.lineWrapping = EditorView.contentAttributes.of({
    class: 'cm-lineWrapping',
  })),
  (EditorView.announce = StateEffect.define())
const MaxBidiLine = 4096,
  BadMeasure = {}
class CachedOrder {
  constructor(e, t, i, r) {
    ;(this.from = e), (this.to = t), (this.dir = i), (this.order = r)
  }
  static update(t, i) {
    if (i.empty) return t
    let r = [],
      n = t.length ? t[t.length - 1].dir : Direction.LTR
    for (let e = Math.max(0, t.length - 10); e < t.length; e++) {
      var o = t[e]
      o.dir != n ||
        i.touchesRange(o.from, o.to) ||
        r.push(
          new CachedOrder(
            i.mapPos(o.from, 1),
            i.mapPos(o.to, -1),
            o.dir,
            o.order
          )
        )
    }
    return r
  }
}
function attrsFromFacet(n, e, o) {
  for (let i = n.state.facet(e), r = i.length - 1; 0 <= r; r--) {
    let e = i[r],
      t = 'function' == typeof e ? e(n) : e
    t && combineAttrs(t, o)
  }
  return o
}
const currentPlatform = browser.mac
  ? 'mac'
  : browser.windows
  ? 'win'
  : browser.linux
  ? 'linux'
  : 'key'
function normalizeKeyName(e, t) {
  var i = e.split(/-(?!$)/)
  let r = i[i.length - 1]
  'Space' == r && (r = ' ')
  let n, o, s, a
  for (let e = 0; e < i.length - 1; ++e) {
    var l = i[e]
    if (/^(cmd|meta|m)$/i.test(l)) a = !0
    else if (/^a(lt)?$/i.test(l)) n = !0
    else if (/^(c|ctrl|control)$/i.test(l)) o = !0
    else if (/^s(hift)?$/i.test(l)) s = !0
    else {
      if (!/^mod$/i.test(l)) throw new Error('Unrecognized modifier name: ' + l)
      'mac' == t ? (a = !0) : (o = !0)
    }
  }
  return (
    n && (r = 'Alt-' + r),
    o && (r = 'Ctrl-' + r),
    a && (r = 'Meta-' + r),
    (r = s ? 'Shift-' + r : r)
  )
}
function modifiers(e, t, i) {
  return (
    t.altKey && (e = 'Alt-' + e),
    t.ctrlKey && (e = 'Ctrl-' + e),
    t.metaKey && (e = 'Meta-' + e),
    (e = !1 !== i && t.shiftKey ? 'Shift-' + e : e)
  )
}
const handleKeyEvents = EditorView.domEventHandlers({
    keydown(e, t) {
      return runHandlers(getKeymap(t.state), e, t, 'editor')
    },
  }),
  keymap = Facet.define({ enables: handleKeyEvents }),
  Keymaps = new WeakMap()
function getKeymap(e) {
  let t = e.facet(keymap),
    i = Keymaps.get(t)
  return (
    i || Keymaps.set(t, (i = buildKeymap(t.reduce((e, t) => e.concat(t), [])))),
    i
  )
}
function runScopeHandlers(e, t, i) {
  return runHandlers(getKeymap(e.state), t, e, i)
}
let storedPrefix = null
const PrefixTimeout = 4e3
function buildKeymap(e, a = currentPlatform) {
  let l = Object.create(null),
    r = Object.create(null),
    h = (e, t) => {
      var i = r[e]
      if (null == i) r[e] = t
      else if (i != t)
        throw new Error(
          'Key binding ' +
            e +
            ' is used both as a regular binding and as a multi-stroke prefix'
        )
    }
  var t,
    i = (r, e, t, i) => {
      let n = l[r] || (l[r] = Object.create(null)),
        o = e.split(/ (?!$)/).map((e) => normalizeKeyName(e, a))
      for (let e = 1; e < o.length; e++) {
        let i = o.slice(0, e).join(' ')
        h(i, !0),
          n[i] ||
            (n[i] = {
              preventDefault: !0,
              commands: [
                (e) => {
                  let t = (storedPrefix = { view: e, prefix: i, scope: r })
                  return (
                    setTimeout(() => {
                      storedPrefix == t && (storedPrefix = null)
                    }, PrefixTimeout),
                    !0
                  )
                },
              ],
            })
      }
      e = o.join(' ')
      h(e, !1)
      let s = n[e] || (n[e] = { preventDefault: !1, commands: [] })
      s.commands.push(t), i && (s.preventDefault = !0)
    }
  for (t of e) {
    var n = t[a] || t.key
    if (n)
      for (var o of t.scope ? t.scope.split(' ') : ['editor'])
        i(o, n, t.run, t.preventDefault),
          t.shift && i(o, 'Shift-' + n, t.shift, t.preventDefault)
  }
  return l
}
function runHandlers(e, t, i, r) {
  var n = keyName(t),
    o = 1 == n.length && ' ' != n
  let s = '',
    a = !1
  storedPrefix &&
    storedPrefix.view == i &&
    storedPrefix.scope == r &&
    ((s = storedPrefix.prefix + ' '),
    (a = modifierCodes.indexOf(t.keyCode) < 0) && (storedPrefix = null))
  var l = (e) => {
    if (e) {
      for (var t of e.commands) if (t(i)) return !0
      e.preventDefault && (a = !0)
    }
    return !1
  }
  let h = e[r],
    c
  if (h) {
    if (l(h[s + modifiers(n, t, !o)])) return !0
    if (
      o &&
      (t.shiftKey || t.altKey || t.metaKey) &&
      (c = base[t.keyCode]) &&
      c != n
    ) {
      if (l(h[s + modifiers(c, t, !0)])) return !0
    } else if (o && t.shiftKey && l(h[s + modifiers(n, t, !0)])) return !0
  }
  return a
}
const CanHidePrimary = !browser.ios,
  themeSpec = {
    '.cm-line': {
      '& ::selection': { backgroundColor: 'transparent !important' },
      '&::selection': { backgroundColor: 'transparent !important' },
    },
  },
  Outside =
    (CanHidePrimary &&
      (themeSpec['.cm-line'].caretColor = 'transparent !important'),
    '-10000px')
class TooltipViewManager {
  constructor(e, t, i) {
    ;(this.facet = t),
      (this.createTooltipView = i),
      (this.input = e.state.facet(t)),
      (this.tooltips = this.input.filter((e) => e)),
      (this.tooltipViews = this.tooltips.map(i))
  }
  update(n) {
    let e = n.state.facet(this.facet)
    var t,
      o = e.filter((e) => e)
    if (e === this.input) {
      for (var i of this.tooltipViews) i.update && i.update(n)
      return !1
    }
    let s = []
    for (let r = 0; r < o.length; r++) {
      let t = o[r],
        i = -1
      if (t) {
        for (let e = 0; e < this.tooltips.length; e++) {
          var a = this.tooltips[e]
          a && a.create == t.create && (i = e)
        }
        if (i < 0) s[r] = this.createTooltipView(t)
        else {
          let e = (s[r] = this.tooltipViews[i])
          e.update && e.update(n)
        }
      }
    }
    for (t of this.tooltipViews) s.indexOf(t) < 0 && t.dom.remove()
    return (this.input = e), (this.tooltips = o), (this.tooltipViews = s), !0
  }
}
function windowSpace() {
  return { top: 0, left: 0, bottom: innerHeight, right: innerWidth }
}
const tooltipConfig = Facet.define({
    combine: (e) => {
      var t
      return {
        position: browser.ios
          ? 'absolute'
          : (null == (t = e.find((e) => e.position)) ? void 0 : t.position) ||
            'fixed',
        parent:
          (null == (t = e.find((e) => e.parent)) ? void 0 : t.parent) || null,
        tooltipSpace:
          (null == (t = e.find((e) => e.tooltipSpace))
            ? void 0
            : t.tooltipSpace) || windowSpace,
      }
    },
  }),
  tooltipPlugin = ViewPlugin.fromClass(
    class {
      constructor(e) {
        ;(this.view = e),
          (this.inView = !0),
          (this.lastTransaction = 0),
          (this.measureTimeout = -1)
        var t = e.state.facet(tooltipConfig)
        ;(this.position = t.position),
          (this.parent = t.parent),
          (this.classes = e.themeClasses),
          this.createContainer(),
          (this.measureReq = {
            read: this.readMeasure.bind(this),
            write: this.writeMeasure.bind(this),
            key: this,
          }),
          (this.manager = new TooltipViewManager(e, showTooltip, (e) =>
            this.createTooltip(e)
          )),
          (this.intersectionObserver =
            'function' == typeof IntersectionObserver
              ? new IntersectionObserver(
                  (e) => {
                    Date.now() > this.lastTransaction - 50 &&
                      0 < e.length &&
                      e[e.length - 1].intersectionRatio < 1 &&
                      this.measureSoon()
                  },
                  { threshold: [1] }
                )
              : null),
          this.observeIntersection(),
          null != (t = e.dom.ownerDocument.defaultView) &&
            t.addEventListener(
              'resize',
              (this.measureSoon = this.measureSoon.bind(this))
            ),
          this.maybeMeasure()
      }
      createContainer() {
        this.parent
          ? ((this.container = document.createElement('div')),
            (this.container.style.position = 'relative'),
            (this.container.className = this.view.themeClasses),
            this.parent.appendChild(this.container))
          : (this.container = this.view.dom)
      }
      observeIntersection() {
        if (this.intersectionObserver) {
          this.intersectionObserver.disconnect()
          for (var e of this.manager.tooltipViews)
            this.intersectionObserver.observe(e.dom)
        }
      }
      measureSoon() {
        this.measureTimeout < 0 &&
          (this.measureTimeout = setTimeout(() => {
            ;(this.measureTimeout = -1), this.maybeMeasure()
          }, 50))
      }
      update(e) {
        e.transactions.length && (this.lastTransaction = Date.now())
        var t = this.manager.update(e)
        t && this.observeIntersection()
        let i = t || e.geometryChanged
        t = e.state.facet(tooltipConfig)
        if (t.position != this.position) {
          this.position = t.position
          for (var r of this.manager.tooltipViews)
            r.dom.style.position = this.position
          i = !0
        }
        if (t.parent != this.parent) {
          this.parent && this.container.remove(),
            (this.parent = t.parent),
            this.createContainer()
          for (var n of this.manager.tooltipViews)
            this.container.appendChild(n.dom)
          i = !0
        } else
          this.parent &&
            this.view.themeClasses != this.classes &&
            (this.classes = this.container.className = this.view.themeClasses)
        i && this.maybeMeasure()
      }
      createTooltip(e) {
        let t = e.create(this.view)
        if (
          (t.dom.classList.add('cm-tooltip'),
          e.arrow && !t.dom.querySelector('.cm-tooltip > .cm-tooltip-arrow'))
        ) {
          let e = document.createElement('div')
          ;(e.className = 'cm-tooltip-arrow'), t.dom.appendChild(e)
        }
        return (
          (t.dom.style.position = this.position),
          (t.dom.style.top = Outside),
          this.container.appendChild(t.dom),
          t.mount && t.mount(this.view),
          t
        )
      }
      destroy() {
        var e, t
        null != (e = this.view.dom.ownerDocument.defaultView) &&
          e.removeEventListener('resize', this.measureSoon)
        for ({ dom: t } of this.manager.tooltipViews) t.remove()
        null != (e = this.intersectionObserver) && e.disconnect(),
          clearTimeout(this.measureTimeout)
      }
      readMeasure() {
        var e = this.view.dom.getBoundingClientRect()
        return {
          editor: e,
          parent: this.parent ? this.container.getBoundingClientRect() : e,
          pos: this.manager.tooltips.map((e, t) => {
            let i = this.manager.tooltipViews[t]
            return i.getCoords
              ? i.getCoords(e.pos)
              : this.view.coordsAtPos(e.pos)
          }),
          size: this.manager.tooltipViews.map(({ dom: e }) =>
            e.getBoundingClientRect()
          ),
          space: this.view.state.facet(tooltipConfig).tooltipSpace(this.view),
        }
      }
      writeMeasure(s) {
        var { editor: t, space: a } = s
        let l = []
        for (let e = 0; e < this.manager.tooltips.length; e++) {
          let r = this.manager.tooltips[e],
            n = this.manager.tooltipViews[e],
            o = n['dom']
          var h = s.pos[e],
            c = s.size[e]
          if (
            !h ||
            h.bottom <= Math.max(t.top, a.top) ||
            h.top >= Math.min(t.bottom, a.bottom) ||
            h.right < Math.max(t.left, a.left) - 0.1 ||
            h.left > Math.min(t.right, a.right) + 0.1
          )
            o.style.top = Outside
          else {
            let e = r.arrow ? n.dom.querySelector('.cm-tooltip-arrow') : null
            var d = e ? 7 : 0,
              u = c.right - c.left,
              f = c.bottom - c.top,
              p = n.offset || noOffset,
              g = this.view.textDirection == Direction.LTR,
              m =
                c.width > a.right - a.left
                  ? g
                    ? a.left
                    : a.right - c.width
                  : g
                  ? Math.min(h.left - (e ? 14 : 0) + p.x, a.right - u)
                  : Math.max(a.left, h.left - u + (e ? 14 : 0) - p.x)
            let t = !!r.above,
              i = (t =
                !r.strictSide &&
                (t
                  ? h.top - (c.bottom - c.top) - p.y < a.top
                  : h.bottom + (c.bottom - c.top) + p.y > a.bottom) &&
                t == a.bottom - h.bottom > h.top - a.top
                  ? !t
                  : t)
                ? h.top - f - d - p.y
                : h.bottom + d + p.y
            var v = m + u
            if (!0 !== n.overlap)
              for (var y of l)
                y.left < v &&
                  y.right > m &&
                  y.top < i + f &&
                  y.bottom > i &&
                  (i = t ? y.top - f - 2 - d : y.bottom + d + 2)
            'absolute' == this.position
              ? ((o.style.top = i - s.parent.top + 'px'),
                (o.style.left = m - s.parent.left + 'px'))
              : ((o.style.top = i + 'px'), (o.style.left = m + 'px')),
              e &&
                (e.style.left =
                  h.left + (g ? p.x : -p.x) - (m + 14 - 7) + 'px'),
              !0 !== n.overlap &&
                l.push({ left: m, top: i, right: v, bottom: i + f }),
              o.classList.toggle('cm-tooltip-above', t),
              o.classList.toggle('cm-tooltip-below', !t),
              n.positioned && n.positioned()
          }
        }
      }
      maybeMeasure() {
        if (
          this.manager.tooltips.length &&
          (this.view.inView && this.view.requestMeasure(this.measureReq),
          this.inView != this.view.inView &&
            ((this.inView = this.view.inView), !this.inView))
        )
          for (var e of this.manager.tooltipViews) e.dom.style.top = Outside
      }
    },
    {
      eventHandlers: {
        scroll() {
          this.maybeMeasure()
        },
      },
    }
  ),
  baseTheme$4 = EditorView.baseTheme({
    '.cm-tooltip': { zIndex: 100 },
    '&light .cm-tooltip': {
      border: '1px solid #bbb',
      backgroundColor: '#f5f5f5',
    },
    '&light .cm-tooltip-section:not(:first-child)': {
      borderTop: '1px solid #bbb',
    },
    '&dark .cm-tooltip': { backgroundColor: '#333338', color: 'white' },
    '.cm-tooltip-arrow': {
      height: '7px',
      width: '14px',
      position: 'absolute',
      zIndex: -1,
      overflow: 'hidden',
      '&:before, &:after': {
        content: "''",
        position: 'absolute',
        width: 0,
        height: 0,
        borderLeft: '7px solid transparent',
        borderRight: '7px solid transparent',
      },
      '.cm-tooltip-above &': {
        bottom: '-7px',
        '&:before': { borderTop: '7px solid #bbb' },
        '&:after': { borderTop: '7px solid #f5f5f5', bottom: '1px' },
      },
      '.cm-tooltip-below &': {
        top: '-7px',
        '&:before': { borderBottom: '7px solid #bbb' },
        '&:after': { borderBottom: '7px solid #f5f5f5', top: '1px' },
      },
    },
    '&dark .cm-tooltip .cm-tooltip-arrow': {
      '&:before': { borderTopColor: '#333338', borderBottomColor: '#333338' },
      '&:after': {
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
      },
    },
  }),
  noOffset = { x: 0, y: 0 },
  showTooltip = Facet.define({ enables: [tooltipPlugin, baseTheme$4] })
function getTooltip(e, t) {
  let i = e.plugin(tooltipPlugin)
  if (!i) return null
  e = i.manager.tooltips.indexOf(t)
  return e < 0 ? null : i.manager.tooltipViews[e]
}
const panelConfig = Facet.define({
  combine(e) {
    let t, i
    for (var r of e) (t = t || r.topContainer), (i = i || r.bottomContainer)
    return { topContainer: t, bottomContainer: i }
  },
})
function getPanel(e, t) {
  let i = e.plugin(panelPlugin)
  e = i ? i.specs.indexOf(t) : -1
  return -1 < e ? i.panels[e] : null
}
const panelPlugin = ViewPlugin.fromClass(
  class {
    constructor(t) {
      ;(this.input = t.state.facet(showPanel)),
        (this.specs = this.input.filter((e) => e)),
        (this.panels = this.specs.map((e) => e(t)))
      var e,
        i = t.state.facet(panelConfig)
      ;(this.top = new PanelGroup(t, !0, i.topContainer)),
        (this.bottom = new PanelGroup(t, !1, i.bottomContainer)),
        this.top.sync(this.panels.filter((e) => e.top)),
        this.bottom.sync(this.panels.filter((e) => !e.top))
      for (e of this.panels)
        e.dom.classList.add('cm-panel'), e.mount && e.mount()
    }
    update(s) {
      var e = s.state.facet(panelConfig)
      this.top.container != e.topContainer &&
        (this.top.sync([]),
        (this.top = new PanelGroup(s.view, !0, e.topContainer))),
        this.bottom.container != e.bottomContainer &&
          (this.bottom.sync([]),
          (this.bottom = new PanelGroup(s.view, !1, e.bottomContainer))),
        this.top.syncClasses(),
        this.bottom.syncClasses()
      let t = s.state.facet(showPanel)
      if (t != this.input) {
        var a,
          l,
          e = t.filter((e) => e)
        let i = [],
          r = [],
          n = [],
          o = []
        for (a of e) {
          let e = this.specs.indexOf(a),
            t
          e < 0
            ? ((t = a(s.view)), o.push(t))
            : (t = this.panels[e]).update && t.update(s),
            i.push(t),
            (t.top ? r : n).push(t)
        }
        ;(this.specs = e),
          (this.panels = i),
          this.top.sync(r),
          this.bottom.sync(n)
        for (l of o) l.dom.classList.add('cm-panel'), l.mount && l.mount()
      } else for (var i of this.panels) i.update && i.update(s)
    }
    destroy() {
      this.top.sync([]), this.bottom.sync([])
    }
  },
  {
    provide: (i) =>
      EditorView.scrollMargins.of((e) => {
        let t = e.plugin(i)
        return (
          t && { top: t.top.scrollMargin(), bottom: t.bottom.scrollMargin() }
        )
      }),
  }
)
class PanelGroup {
  constructor(e, t, i) {
    ;(this.view = e),
      (this.top = t),
      (this.container = i),
      (this.dom = void 0),
      (this.classes = ''),
      (this.panels = []),
      this.syncClasses()
  }
  sync(e) {
    for (var t of this.panels) t.destroy && e.indexOf(t) < 0 && t.destroy()
    ;(this.panels = e), this.syncDOM()
  }
  syncDOM() {
    if (0 == this.panels.length)
      this.dom && (this.dom.remove(), (this.dom = void 0))
    else {
      if (!this.dom) {
        ;(this.dom = document.createElement('div')),
          (this.dom.className = this.top
            ? 'cm-panels cm-panels-top'
            : 'cm-panels cm-panels-bottom'),
          (this.dom.style[this.top ? 'top' : 'bottom'] = '0')
        let e = this.container || this.view.dom
        e.insertBefore(this.dom, this.top ? e.firstChild : null)
      }
      let e = this.dom.firstChild
      for (var t of this.panels)
        if (t.dom.parentNode == this.dom) {
          for (; e != t.dom; ) e = rm(e)
          e = e.nextSibling
        } else this.dom.insertBefore(t.dom, e)
      for (; e; ) e = rm(e)
    }
  }
  scrollMargin() {
    return !this.dom || this.container
      ? 0
      : Math.max(
          0,
          this.top
            ? this.dom.getBoundingClientRect().bottom -
                Math.max(0, this.view.scrollDOM.getBoundingClientRect().top)
            : Math.min(
                innerHeight,
                this.view.scrollDOM.getBoundingClientRect().bottom
              ) - this.dom.getBoundingClientRect().top
        )
  }
  syncClasses() {
    if (this.container && this.classes != this.view.themeClasses) {
      for (var e of this.classes.split(' '))
        e && this.container.classList.remove(e)
      for (var t of (this.classes = this.view.themeClasses).split(' '))
        t && this.container.classList.add(t)
    }
  }
}
function rm(e) {
  var t = e.nextSibling
  return e.remove(), t
}
const showPanel = Facet.define({ enables: panelPlugin })
class GutterMarker extends RangeValue {
  compare(e) {
    return this == e || (this.constructor == e.constructor && this.eq(e))
  }
  eq(e) {
    return !1
  }
  destroy(e) {}
}
;(GutterMarker.prototype.elementClass = ''),
  (GutterMarker.prototype.toDOM = void 0),
  (GutterMarker.prototype.mapMode = MapMode.TrackBefore),
  (GutterMarker.prototype.startSide = GutterMarker.prototype.endSide = -1),
  (GutterMarker.prototype.point = !0)
const languageDataProp = new NodeProp()
function defineLanguageFacet(t) {
  return Facet.define({ combine: t ? (e) => e.concat(t) : void 0 })
}
class Language {
  constructor(e, t, i = []) {
    ;(this.data = e),
      EditorState.prototype.hasOwnProperty('tree') ||
        Object.defineProperty(EditorState.prototype, 'tree', {
          get() {
            return syntaxTree(this)
          },
        }),
      (this.parser = t),
      (this.extension = [
        language.of(this),
        EditorState.languageData.of((e, t, i) =>
          e.facet(languageDataFacetAt(e, t, i))
        ),
      ].concat(i))
  }
  isActiveAt(e, t, i = -1) {
    return languageDataFacetAt(e, t, i) == this.data
  }
  findRegions(e) {
    var t = e.facet(language)
    if ((null == t ? void 0 : t.data) == this.data)
      return [{ from: 0, to: e.doc.length }]
    if (!t || !t.allowsNesting) return []
    let s = [],
      a = (t, i) => {
        if (t.prop(languageDataProp) == this.data)
          s.push({ from: i, to: i + t.length })
        else {
          let e = t.prop(NodeProp.mounted)
          if (e) {
            if (e.tree.prop(languageDataProp) == this.data) {
              if (e.overlay)
                for (var r of e.overlay)
                  s.push({ from: r.from + i, to: r.to + i })
              else s.push({ from: i, to: i + t.length })
              return
            }
            if (e.overlay) {
              var n = s.length
              if ((a(e.tree, e.overlay[0].from + i), s.length > n)) return
            }
          }
          for (let e = 0; e < t.children.length; e++) {
            var o = t.children[e]
            o instanceof Tree && a(o, t.positions[e] + i)
          }
        }
      }
    return a(syntaxTree(e), 0), s
  }
  get allowsNesting() {
    return !0
  }
}
function languageDataFacetAt(t, i, r) {
  var e = t.facet(language)
  if (!e) return null
  let n = e.data
  if (e.allowsNesting)
    for (
      let e = syntaxTree(t).topNode;
      e;
      e = e.enter(i, r, IterMode.ExcludeBuffers)
    )
      n = e.type.prop(languageDataProp) || n
  return n
}
Language.setState = StateEffect.define()
class LRLanguage extends Language {
  constructor(e, t) {
    super(e, t), (this.parser = t)
  }
  static define(e) {
    let t = defineLanguageFacet(e.languageData)
    return new LRLanguage(
      t,
      e.parser.configure({
        props: [languageDataProp.add((e) => (e.isTop ? t : void 0))],
      })
    )
  }
  configure(e) {
    return new LRLanguage(this.data, this.parser.configure(e))
  }
  get allowsNesting() {
    return this.parser.hasWrappers()
  }
}
function syntaxTree(e) {
  e = e.field(Language.state, !1)
  return e ? e.tree : Tree.empty
}
class DocInput {
  constructor(e, t = e.length) {
    ;(this.doc = e),
      (this.length = t),
      (this.cursorPos = 0),
      (this.string = ''),
      (this.cursor = e.iter())
  }
  syncTo(e) {
    return (
      (this.string = this.cursor.next(e - this.cursorPos).value),
      (this.cursorPos = e + this.string.length),
      this.cursorPos - this.string.length
    )
  }
  chunk(e) {
    return this.syncTo(e), this.string
  }
  get lineChunks() {
    return !0
  }
  read(e, t) {
    var i = this.cursorPos - this.string.length
    return e < i || t >= this.cursorPos
      ? this.doc.sliceString(e, t)
      : this.string.slice(e - i, t - i)
  }
}
let currentContext = null
class ParseContext {
  constructor(e, t, i = [], r, n, o, s, a) {
    ;(this.parser = e),
      (this.state = t),
      (this.fragments = i),
      (this.tree = r),
      (this.treeLen = n),
      (this.viewport = o),
      (this.skipped = s),
      (this.scheduleOn = a),
      (this.parse = null),
      (this.tempSkipped = [])
  }
  static create(e, t, i) {
    return new ParseContext(e, t, [], Tree.empty, 0, i, [], null)
  }
  startParse() {
    return this.parser.startParse(new DocInput(this.state.doc), this.fragments)
  }
  work(i, r) {
    return (
      null != r && r >= this.state.doc.length && (r = void 0),
      this.tree != Tree.empty &&
      this.isDone(null != r ? r : this.state.doc.length)
        ? (this.takeTree(), !0)
        : this.withContext(() => {
            var e
            if ('number' == typeof i) {
              let e = Date.now() + i
              i = () => Date.now() > e
            }
            for (
              this.parse || (this.parse = this.startParse()),
                null != r &&
                  (null == this.parse.stoppedAt || this.parse.stoppedAt > r) &&
                  r < this.state.doc.length &&
                  this.parse.stopAt(r);
              ;

            ) {
              var t = this.parse.advance()
              if (t) {
                if (
                  ((this.fragments = this.withoutTempSkipped(
                    TreeFragment.addTree(
                      t,
                      this.fragments,
                      null != this.parse.stoppedAt
                    )
                  )),
                  (this.treeLen =
                    null != (e = this.parse.stoppedAt)
                      ? e
                      : this.state.doc.length),
                  (this.tree = t),
                  (this.parse = null),
                  !(this.treeLen < (null != r ? r : this.state.doc.length)))
                )
                  return !0
                this.parse = this.startParse()
              }
              if (i()) return !1
            }
          })
    )
  }
  takeTree() {
    let e, t
    this.parse &&
      (e = this.parse.parsedPos) >= this.treeLen &&
      ((null == this.parse.stoppedAt || this.parse.stoppedAt > e) &&
        this.parse.stopAt(e),
      this.withContext(() => {
        for (; !(t = this.parse.advance()); );
      }),
      (this.treeLen = e),
      (this.tree = t),
      (this.fragments = this.withoutTempSkipped(
        TreeFragment.addTree(this.tree, this.fragments, !0)
      )),
      (this.parse = null))
  }
  withContext(e) {
    var t = currentContext
    currentContext = this
    try {
      return e()
    } finally {
      currentContext = t
    }
  }
  withoutTempSkipped(e) {
    for (var t; (t = this.tempSkipped.pop()); )
      e = cutFragments(e, t.from, t.to)
    return e
  }
  changes(e, t) {
    let { fragments: i, tree: r, treeLen: o, viewport: s, skipped: a } = this
    if ((this.takeTree(), !e.empty)) {
      let n = []
      if (
        (e.iterChangedRanges((e, t, i, r) =>
          n.push({ fromA: e, toA: t, fromB: i, toB: r })
        ),
        (i = TreeFragment.applyChanges(i, n)),
        (r = Tree.empty),
        (o = 0),
        (s = { from: e.mapPos(s.from, -1), to: e.mapPos(s.to, 1) }),
        this.skipped.length)
      ) {
        a = []
        for (var l of this.skipped) {
          var h = e.mapPos(l.from, 1),
            l = e.mapPos(l.to, -1)
          h < l && a.push({ from: h, to: l })
        }
      }
    }
    return new ParseContext(this.parser, t, i, r, o, s, a, this.scheduleOn)
  }
  updateViewport(t) {
    if (this.viewport.from == t.from && this.viewport.to == t.to) return !1
    this.viewport = t
    var e = this.skipped.length
    for (let e = 0; e < this.skipped.length; e++) {
      var { from: i, to: r } = this.skipped[e]
      i < t.to &&
        r > t.from &&
        ((this.fragments = cutFragments(this.fragments, i, r)),
        this.skipped.splice(e--, 1))
    }
    return !(this.skipped.length >= e) && (this.reset(), !0)
  }
  reset() {
    this.parse && (this.takeTree(), (this.parse = null))
  }
  skipUntilInView(e, t) {
    this.skipped.push({ from: e, to: t })
  }
  static getSkippingParser(o) {
    return new (class extends Parser {
      createParse(e, t, i) {
        let r = i[0].from,
          n = i[i.length - 1].to
        return {
          parsedPos: r,
          advance() {
            let e = currentContext
            if (e) {
              for (var t of i) e.tempSkipped.push(t)
              o &&
                (e.scheduleOn = e.scheduleOn
                  ? Promise.all([e.scheduleOn, o])
                  : o)
            }
            return (this.parsedPos = n), new Tree(NodeType.none, [], [], n - r)
          },
          stoppedAt: null,
          stopAt() {},
        }
      }
    })()
  }
  isDone(e) {
    e = Math.min(e, this.state.doc.length)
    var t = this.fragments
    return this.treeLen >= e && t.length && 0 == t[0].from && t[0].to >= e
  }
  static get() {
    return currentContext
  }
}
function cutFragments(e, t, i) {
  return TreeFragment.applyChanges(e, [{ fromA: t, toA: i, fromB: t, toB: i }])
}
class LanguageState {
  constructor(e) {
    ;(this.context = e), (this.tree = e.tree)
  }
  apply(e) {
    if (!e.docChanged && this.tree == this.context.tree) return this
    let t = this.context.changes(e.changes, e.state)
    e =
      this.context.treeLen == e.startState.doc.length
        ? void 0
        : Math.max(e.changes.mapPos(this.context.treeLen), t.viewport.to)
    return t.work(20, e) || t.takeTree(), new LanguageState(t)
  }
  static init(e) {
    var t = Math.min(3e3, e.doc.length)
    let i = ParseContext.create(e.facet(language).parser, e, { from: 0, to: t })
    return i.work(20, t) || i.takeTree(), new LanguageState(i)
  }
}
Language.state = StateField.define({
  create: LanguageState.init,
  update(e, t) {
    for (var i of t.effects) if (i.is(Language.setState)) return i.value
    return t.startState.facet(language) != t.state.facet(language)
      ? LanguageState.init(t.state)
      : e.apply(t)
  },
})
let requestIdle = (e) => {
  let t = setTimeout(() => e(), 500)
  return () => clearTimeout(t)
}
'undefined' != typeof requestIdleCallback &&
  (requestIdle = (e) => {
    let t = -1,
      i = setTimeout(() => {
        t = requestIdleCallback(e, { timeout: 400 })
      }, 100)
    return () => (t < 0 ? clearTimeout(i) : cancelIdleCallback(t))
  })
const isInputPending =
    'undefined' != typeof navigator &&
    null != (_a = navigator.scheduling) &&
    _a.isInputPending
      ? () => navigator.scheduling.isInputPending()
      : null,
  parseWorker = ViewPlugin.fromClass(
    class {
      constructor(e) {
        ;(this.view = e),
          (this.working = null),
          (this.workScheduled = 0),
          (this.chunkEnd = -1),
          (this.chunkBudget = -1),
          (this.work = this.work.bind(this)),
          this.scheduleWork()
      }
      update(e) {
        let t = this.view.state.field(Language.state).context
        ;(t.updateViewport(e.view.viewport) ||
          this.view.viewport.to > t.treeLen) &&
          this.scheduleWork(),
          e.docChanged &&
            (this.view.hasFocus && (this.chunkBudget += 50),
            this.scheduleWork()),
          this.checkAsyncSchedule(t)
      }
      scheduleWork() {
        if (!this.working) {
          let e = this.view['state'],
            t = e.field(Language.state)
          ;(t.tree == t.context.tree && t.context.isDone(e.doc.length)) ||
            (this.working = requestIdle(this.work))
        }
      }
      work(n) {
        this.working = null
        var o = Date.now()
        if (
          (this.chunkEnd < o &&
            (this.chunkEnd < 0 || this.view.hasFocus) &&
            ((this.chunkEnd = o + 3e4), (this.chunkBudget = 3e3)),
          !(this.chunkBudget <= 0))
        ) {
          let {
              state: t,
              viewport: { to: i },
            } = this.view,
            r = t.field(Language.state)
          if (r.tree != r.context.tree || !r.context.isDone(i + 1e5)) {
            let e =
              Date.now() +
              Math.min(
                this.chunkBudget,
                100,
                n && !isInputPending ? Math.max(25, n.timeRemaining() - 5) : 1e9
              )
            var n = r.context.treeLen < i && t.doc.length > i + 1e3,
              s = r.context.work(
                () => (isInputPending && isInputPending()) || Date.now() > e,
                i + (n ? 0 : 1e5)
              )
            ;(this.chunkBudget -= Date.now() - o),
              (s || this.chunkBudget <= 0) &&
                (r.context.takeTree(),
                this.view.dispatch({
                  effects: Language.setState.of(new LanguageState(r.context)),
                })),
              0 < this.chunkBudget && (!s || n) && this.scheduleWork(),
              this.checkAsyncSchedule(r.context)
          }
        }
      }
      checkAsyncSchedule(e) {
        e.scheduleOn &&
          (this.workScheduled++,
          e.scheduleOn
            .then(() => this.scheduleWork())
            .catch((e) => logException(this.view.state, e))
            .then(() => this.workScheduled--),
          (e.scheduleOn = null))
      }
      destroy() {
        this.working && this.working()
      }
      isWorking() {
        return !!(this.working || 0 < this.workScheduled)
      }
    },
    {
      eventHandlers: {
        focus() {
          this.scheduleWork()
        },
      },
    }
  ),
  language = Facet.define({
    combine(e) {
      return e.length ? e[0] : null
    },
    enables: [Language.state, parseWorker],
  })
class LanguageSupport {
  constructor(e, t = []) {
    ;(this.language = e), (this.support = t), (this.extension = [e, t])
  }
}
const indentService = Facet.define(),
  indentUnit = Facet.define({
    combine: (e) => {
      if (!e.length) return '  '
      if (/^(?: +|\t+)$/.test(e[0])) return e[0]
      throw new Error('Invalid indent unit: ' + JSON.stringify(e[0]))
    },
  })
function getIndentUnit(e) {
  let t = e.facet(indentUnit)
  return 9 == t.charCodeAt(0) ? e.tabSize * t.length : t.length
}
function indentString(e, t) {
  let i = '',
    r = e.tabSize
  if (9 == e.facet(indentUnit).charCodeAt(0))
    for (; r <= t; ) (i += '\t'), (t -= r)
  for (let e = 0; e < t; e++) i += ' '
  return i
}
function getIndentation(e, t) {
  for (var i of (e =
    e instanceof EditorState ? new IndentContext(e) : e).state.facet(
    indentService
  )) {
    i = i(e, t)
    if (null != i) return i
  }
  var r = syntaxTree(e.state)
  return r ? syntaxIndentation(e, r, t) : null
}
class IndentContext {
  constructor(e, t = {}) {
    ;(this.state = e), (this.options = t), (this.unit = getIndentUnit(e))
  }
  lineAt(e, t = 1) {
    let i = this.state.doc.lineAt(e)
    var { simulateBreak: r, simulateDoubleBreak: n } = this.options
    return null != r && r >= i.from && r <= i.to
      ? n && r == e
        ? { text: '', from: e }
        : (t < 0 ? r < e : r <= e)
        ? { text: i.text.slice(r - i.from), from: r }
        : { text: i.text.slice(0, r - i.from), from: i.from }
      : i
  }
  textAfterPos(e, t = 1) {
    if (this.options.simulateDoubleBreak && e == this.options.simulateBreak)
      return ''
    let { text: i, from: r } = this.lineAt(e, t)
    return i.slice(e - r, Math.min(i.length, e + 100 - r))
  }
  column(e, t = 1) {
    let { text: i, from: r } = this.lineAt(e, t),
      n = this.countColumn(i, e - r)
    t = this.options.overrideIndentation
      ? this.options.overrideIndentation(r)
      : -1
    return -1 < t && (n += t - this.countColumn(i, i.search(/\S|$/))), n
  }
  countColumn(e, t = e.length) {
    return countColumn(e, this.state.tabSize, t)
  }
  lineIndent(e, t = 1) {
    let { text: i, from: r } = this.lineAt(e, t),
      n = this.options.overrideIndentation
    if (n) {
      e = n(r)
      if (-1 < e) return e
    }
    return this.countColumn(i, i.search(/\S|$/))
  }
  get simulatedBreak() {
    return this.options.simulateBreak || null
  }
}
const indentNodeProp = new NodeProp()
function syntaxIndentation(e, t, i) {
  return indentFrom(t.resolveInner(i).enterUnfinishedNodesBefore(i), i, e)
}
function ignoreClosed(e) {
  return e.pos == e.options.simulateBreak && e.options.simulateDoubleBreak
}
function indentStrategy(e) {
  var t = e.type.prop(indentNodeProp)
  if (t) return t
  let i = e.firstChild,
    r
  if (i && (r = i.type.prop(NodeProp.closedBy))) {
    let t = e.lastChild,
      i = t && -1 < r.indexOf(t.name)
    return (e) =>
      delimitedStrategy(
        e,
        !0,
        1,
        void 0,
        i && !ignoreClosed(e) ? t.from : void 0
      )
  }
  return null == e.parent ? topIndent : null
}
function indentFrom(t, i, r) {
  for (; t; t = t.parent) {
    let e = indentStrategy(t)
    if (e) return e(TreeIndentContext.create(r, i, t))
  }
  return null
}
function topIndent() {
  return 0
}
class TreeIndentContext extends IndentContext {
  constructor(e, t, i) {
    super(e.state, e.options), (this.base = e), (this.pos = t), (this.node = i)
  }
  static create(e, t, i) {
    return new TreeIndentContext(e, t, i)
  }
  get textAfter() {
    return this.textAfterPos(this.pos)
  }
  get baseIndent() {
    let t = this.state.doc.lineAt(this.node.from)
    for (;;) {
      let e = this.node.resolve(t.from)
      for (; e.parent && e.parent.from == e.from; ) e = e.parent
      if (isParent(e, this.node)) break
      t = this.state.doc.lineAt(e.from)
    }
    return this.lineIndent(t.from)
  }
  continue() {
    var e = this.node.parent
    return e ? indentFrom(e, this.pos, this.base) : 0
  }
}
function isParent(t, i) {
  for (let e = i; e; e = e.parent) if (t == e) return !0
  return !1
}
function bracketedAligned(e) {
  let t = e.node
  var i = t.childAfter(t.from),
    r = t.lastChild
  if (!i) return null
  var n = e.options.simulateBreak,
    e = e.state.doc.lineAt(i.from),
    o = null == n || n <= e.from ? e.to : Math.min(e.to, n)
  for (let e = i.to; ; ) {
    var s = t.childAfter(e)
    if (!s || s == r) return null
    if (!s.type.isSkipped) return s.from < o ? i : null
    e = s.to
  }
}
function delimitedStrategy(e, t, i, r, n) {
  let o = e.textAfter,
    s = o.match(/^\s*/)[0].length
  ;(r = (r && o.slice(s, s + r.length) == r) || n == e.pos + s),
    (n = t ? bracketedAligned(e) : null)
  return n
    ? r
      ? e.column(n.from)
      : e.column(n.to)
    : e.baseIndent + (r ? 0 : e.unit * i)
}
class FoldMarker extends GutterMarker {
  constructor(e, t) {
    super(), (this.config = e), (this.open = t)
  }
  eq(e) {
    return this.config == e.config && this.open == e.open
  }
  toDOM(e) {
    if (this.config.markerDOM) return this.config.markerDOM(this.open)
    let t = document.createElement('span')
    return (
      (t.textContent = this.open
        ? this.config.openText
        : this.config.closedText),
      (t.title = e.state.phrase(this.open ? 'Fold line' : 'Unfold line')),
      t
    )
  }
}
class HighlightStyle {
  constructor(e, t) {
    let i
    function r(e) {
      var t = StyleModule.newName()
      return ((i = i || Object.create(null))['.' + t] = e), t
    }
    var n = 'string' == typeof t.all ? t.all : t.all ? r(t.all) : void 0
    const o = t.scope
    ;(this.scope =
      o instanceof Language
        ? (e) => e.prop(languageDataProp) == o.data
        : o
        ? (e) => e == o
        : void 0),
      (this.style = tagHighlighter(
        e.map((e) => ({
          tag: e.tag,
          class: e.class || r(Object.assign({}, e, { tag: null })),
        })),
        { all: n }
      ).style),
      (this.module = i ? new StyleModule(i) : null),
      (this.themeType = t.themeType)
  }
  static define(e, t) {
    return new HighlightStyle(e, t || {})
  }
}
const highlighterFacet = Facet.define(),
  fallbackHighlighter = Facet.define({
    combine(e) {
      return e.length ? [e[0]] : null
    },
  })
function getHighlighters(e) {
  var t = e.facet(highlighterFacet)
  return t.length ? t : e.facet(fallbackHighlighter)
}
function syntaxHighlighting(t, e) {
  let i = [treeHighlighter],
    r
  return (
    t instanceof HighlightStyle &&
      (t.module && i.push(EditorView.styleModule.of(t.module)),
      (r = t.themeType)),
    null != e && e.fallback
      ? i.push(fallbackHighlighter.of(t))
      : r
      ? i.push(
          highlighterFacet.computeN([EditorView.darkTheme], (e) =>
            e.facet(EditorView.darkTheme) == ('dark' == r) ? [t] : []
          )
        )
      : i.push(highlighterFacet.of(t)),
    i
  )
}
class TreeHighlighter {
  constructor(e) {
    ;(this.markCache = Object.create(null)),
      (this.tree = syntaxTree(e.state)),
      (this.decorations = this.buildDeco(e, getHighlighters(e.state)))
  }
  update(e) {
    var t = syntaxTree(e.state),
      i = getHighlighters(e.state),
      r = i != getHighlighters(e.startState)
    t.length < e.view.viewport.to && !r && t.type == this.tree.type
      ? (this.decorations = this.decorations.map(e.changes))
      : (t != this.tree || e.viewportChanged || r) &&
        ((this.tree = t), (this.decorations = this.buildDeco(e.view, i)))
  }
  buildDeco(e, t) {
    if (!t || !this.tree.length) return Decoration.none
    let r = new RangeSetBuilder()
    for (var { from: i, to: n } of e.visibleRanges)
      highlightTree(
        this.tree,
        t,
        (e, t, i) => {
          r.add(
            e,
            t,
            this.markCache[i] ||
              (this.markCache[i] = Decoration.mark({ class: i }))
          )
        },
        i,
        n
      )
    return r.finish()
  }
}
const treeHighlighter = Prec.high(
    ViewPlugin.fromClass(TreeHighlighter, { decorations: (e) => e.decorations })
  ),
  baseTheme$3 = EditorView.baseTheme({
    '&.cm-focused .cm-matchingBracket': { backgroundColor: '#328c8252' },
    '&.cm-focused .cm-nonmatchingBracket': { backgroundColor: '#bb555544' },
  }),
  DefaultScanDist = 1e4,
  DefaultBrackets = '()[]{}',
  bracketMatchingConfig = Facet.define({
    combine(e) {
      return combineConfig(e, {
        afterCursor: !0,
        brackets: DefaultBrackets,
        maxScanDistance: DefaultScanDist,
        renderMatch: defaultRenderMatch,
      })
    },
  }),
  matchingMark = Decoration.mark({ class: 'cm-matchingBracket' }),
  nonmatchingMark = Decoration.mark({ class: 'cm-nonmatchingBracket' })
function defaultRenderMatch(e) {
  let t = [],
    i = e.matched ? matchingMark : nonmatchingMark
  return (
    t.push(i.range(e.start.from, e.start.to)),
    e.end && t.push(i.range(e.end.from, e.end.to)),
    t
  )
}
const bracketMatchingState = StateField.define({
    create() {
      return Decoration.none
    },
    update(e, t) {
      if (!t.docChanged && !t.selection) return e
      let i = [],
        r = t.state.facet(bracketMatchingConfig)
      for (var n of t.state.selection.ranges)
        n.empty &&
          (n =
            matchBrackets(t.state, n.head, -1, r) ||
            (0 < n.head && matchBrackets(t.state, n.head - 1, 1, r)) ||
            (r.afterCursor &&
              (matchBrackets(t.state, n.head, 1, r) ||
                (n.head < t.state.doc.length &&
                  matchBrackets(t.state, n.head + 1, -1, r))))) &&
          (i = i.concat(r.renderMatch(n, t.state)))
      return Decoration.set(i, !0)
    },
    provide: (e) => EditorView.decorations.from(e),
  }),
  bracketMatchingUnique = [bracketMatchingState, baseTheme$3]
function bracketMatching(e = {}) {
  return [bracketMatchingConfig.of(e), bracketMatchingUnique]
}
function matchingNodes(e, t, i) {
  var r = e.prop(t < 0 ? NodeProp.openedBy : NodeProp.closedBy)
  if (r) return r
  if (1 == e.name.length) {
    r = i.indexOf(e.name)
    if (-1 < r && r % 2 == (t < 0 ? 1 : 0)) return [i[r + t]]
  }
  return null
}
function matchBrackets(t, i, r, e = {}) {
  var n = e.maxScanDistance || DefaultScanDist,
    o = e.brackets || DefaultBrackets
  let s = syntaxTree(t),
    a = s.resolveInner(i, r)
  for (let e = a; e; e = e.parent) {
    var l = matchingNodes(e.type, r, o)
    if (l && e.from < e.to) return matchMarkedBrackets(t, i, r, e, l, o)
  }
  return matchPlainBrackets(t, i, r, s, a.type, n, o)
}
function matchMarkedBrackets(e, t, i, r, n, o) {
  let s = r.parent,
    a = { from: r.from, to: r.to },
    l = 0,
    h = null === s || void 0 === s ? void 0 : s.cursor()
  if (h && (i < 0 ? h.childBefore(r.from) : h.childAfter(r.to)))
    do {
      if (i < 0 ? h.to <= r.from : h.from >= r.to) {
        if (0 == l && -1 < n.indexOf(h.type.name) && h.from < h.to)
          return { start: a, end: { from: h.from, to: h.to }, matched: !0 }
        if (matchingNodes(h.type, i, o)) l++
        else if (matchingNodes(h.type, -i, o) && 0 == --l)
          return {
            start: a,
            end: h.from == h.to ? void 0 : { from: h.from, to: h.to },
            matched: !1,
          }
      }
    } while (i < 0 ? h.prevSibling() : h.nextSibling())
  return { start: a, matched: !1 }
}
function matchPlainBrackets(e, t, i, r, n, o, s) {
  var a = i < 0 ? e.sliceDoc(t - 1, t) : e.sliceDoc(t, t + 1),
    l = s.indexOf(a)
  if (l < 0 || (l % 2 == 0) != 0 < i) return null
  var h = { from: i < 0 ? t - 1 : t, to: 0 < i ? t + 1 : t }
  let c = e.doc.iterRange(t, 0 < i ? e.doc.length : 0),
    d = 0
  for (let e = 0; !c.next().done && e <= o; ) {
    var u = c.value,
      f = (i < 0 && (e += u.length), t + e * i)
    for (
      let e = 0 < i ? 0 : u.length - 1, t = 0 < i ? u.length : -1;
      e != t;
      e += i
    ) {
      var p = s.indexOf(u[e])
      if (!(p < 0 || r.resolve(f + e, 1).type != n))
        if ((p % 2 == 0) == 0 < i) d++
        else {
          if (1 == d)
            return {
              start: h,
              end: { from: f + e, to: f + e + 1 },
              matched: p >> 1 == l >> 1,
            }
          d--
        }
    }
    0 < i && (e += u.length)
  }
  return c.done ? { start: h, matched: !1 } : null
}
const noTokens = Object.create(null),
  typeArray = [NodeType.none],
  warned = [],
  defaultTable = Object.create(null)
for (let [e, t] of [
  ['variable', 'variableName'],
  ['variable-2', 'variableName.special'],
  ['string-2', 'string.special'],
  ['def', 'variableName.definition'],
  ['tag', 'typeName'],
  ['attribute', 'propertyName'],
  ['type', 'typeName'],
  ['builtin', 'variableName.standard'],
  ['qualifier', 'modifier'],
  ['error', 'invalid'],
  ['header', 'heading'],
  ['property', 'propertyName'],
])
  defaultTable[e] = createTokenType(noTokens, t)
function warnForPart(e, t) {
  ;-1 < warned.indexOf(e) || (warned.push(e), console.warn(t))
}
function createTokenType(t, e) {
  let i = null
  for (var r of e.split('.')) {
    let e = t[r] || tags[r]
    e
      ? 'function' == typeof e
        ? i
          ? (i = e(i))
          : warnForPart(r, `Modifier ${r} used at start of tag`)
        : i
        ? warnForPart(r, `Tag ${r} used as modifier`)
        : (i = e)
      : warnForPart(r, 'Unknown highlighting tag ' + r)
  }
  if (!i) return 0
  ;(e = e.replace(/ /g, '_')),
    (e = NodeType.define({
      id: typeArray.length,
      name: e,
      props: [styleTags({ [e]: i })],
    }))
  return typeArray.push(e), e.id
}
class CompletionContext {
  constructor(e, t, i) {
    ;(this.state = e),
      (this.pos = t),
      (this.explicit = i),
      (this.abortListeners = [])
  }
  tokenBefore(e) {
    let t = syntaxTree(this.state).resolveInner(this.pos, -1)
    for (; t && e.indexOf(t.name) < 0; ) t = t.parent
    return t
      ? {
          from: t.from,
          to: this.pos,
          text: this.state.sliceDoc(t.from, this.pos),
          type: t.type,
        }
      : null
  }
  matchBefore(e) {
    let t = this.state.doc.lineAt(this.pos)
    var i = Math.max(t.from, this.pos - 250)
    let r = t.text.slice(i - t.from, this.pos - t.from)
    e = r.search(ensureAnchor(e, !1))
    return e < 0 ? null : { from: i + e, to: this.pos, text: r.slice(e) }
  }
  get aborted() {
    return null == this.abortListeners
  }
  addEventListener(e, t) {
    'abort' == e && this.abortListeners && this.abortListeners.push(t)
  }
}
function toSet(e) {
  let t = Object.keys(e).join('')
  e = /\w/.test(t)
  return `[${e ? '\\w' : ''}${(t = e ? t.replace(/\w/g, '') : t).replace(
    /[^\w\s]/g,
    '\\$&'
  )}]`
}
function prefixMatch(e) {
  let t = Object.create(null),
    i = Object.create(null)
  for (var { label: r } of e) {
    t[r[0]] = !0
    for (let e = 1; e < r.length; e++) i[r[e]] = !0
  }
  e = toSet(t) + toSet(i) + '*$'
  return [new RegExp('^' + e), new RegExp(e)]
}
function completeFromList(e) {
  let i = e.map((e) => ('string' == typeof e ? { label: e } : e)),
    [r, n] = i.every((e) => /^\w+$/.test(e.label))
      ? [/\w*$/, /\w+$/]
      : prefixMatch(i)
  return (e) => {
    var t = e.matchBefore(n)
    return t || e.explicit
      ? { from: t ? t.from : e.pos, options: i, validFor: r }
      : null
  }
}
function ifNotIn(i, e) {
  return (t) => {
    for (let e = syntaxTree(t.state).resolveInner(t.pos, -1); e; e = e.parent)
      if (-1 < i.indexOf(e.name)) return null
    return e(t)
  }
}
class Option {
  constructor(e, t, i) {
    ;(this.completion = e), (this.source = t), (this.match = i)
  }
}
function cur(e) {
  return e.selection.main.head
}
function ensureAnchor(e, t) {
  var i = e['source'],
    t = t && '^' != i[0],
    r = '$' != i[i.length - 1]
  return t || r
    ? new RegExp(
        `${t ? '^' : ''}(?:${i})` + (r ? '$' : ''),
        null != (t = e.flags) ? t : e.ignoreCase ? 'i' : ''
      )
    : e
}
function insertCompletionText(i, r, n, o) {
  return Object.assign(
    Object.assign(
      {},
      i.changeByRange((e) => {
        if (e == i.selection.main)
          return {
            changes: { from: n, to: o, insert: r },
            range: EditorSelection.cursor(n + r.length),
          }
        var t = o - n
        return !e.empty ||
          (t && i.sliceDoc(e.from - t, e.from) != i.sliceDoc(n, o))
          ? { range: e }
          : {
              changes: { from: e.from - t, to: e.from, insert: r },
              range: EditorSelection.cursor(e.from - t + r.length),
            }
      })
    ),
    { userEvent: 'input.complete' }
  )
}
function applyCompletion(e, t) {
  const i = t.completion.apply || t.completion.label
  var r = t.source
  'string' == typeof i
    ? e.dispatch(insertCompletionText(e.state, i, r.from, r.to))
    : i(e, t.completion, r.from, r.to)
}
const SourceCache = new WeakMap()
function asSource(e) {
  if (!Array.isArray(e)) return e
  let t = SourceCache.get(e)
  return t || SourceCache.set(e, (t = completeFromList(e))), t
}
class FuzzyMatcher {
  constructor(r) {
    ;(this.pattern = r),
      (this.chars = []),
      (this.folded = []),
      (this.any = []),
      (this.precise = []),
      (this.byWord = [])
    for (let i = 0; i < r.length; ) {
      var n = codePointAt(r, i),
        o = codePointSize(n)
      this.chars.push(n)
      let e = r.slice(i, i + o),
        t = e.toUpperCase()
      this.folded.push(codePointAt(t == e ? e.toLowerCase() : t, 0)), (i += o)
    }
    this.astral = r.length != this.chars.length
  }
  match(n) {
    if (0 == this.pattern.length) return [0]
    if (n.length < this.pattern.length) return null
    let { chars: o, folded: s, any: i, precise: a, byWord: l } = this
    var e
    if (1 == o.length)
      return (e = codePointAt(n, 0)) == o[0]
        ? [0, 0, codePointSize(e)]
        : e == s[0]
        ? [-200, 0, codePointSize(e)]
        : null
    var h = n.indexOf(this.pattern)
    if (0 == h) return [0, 0, this.pattern.length]
    let c = o.length,
      r = 0
    if (h < 0) {
      for (let e = 0, t = Math.min(n.length, 200); e < t && r < c; ) {
        var d = codePointAt(n, e)
        ;(d != o[r] && d != s[r]) || (i[r++] = e), (e += codePointSize(d))
      }
      if (r < c) return null
    }
    let u = 0,
      f = 0,
      p = !1,
      g = 0,
      m = -1,
      v = -1,
      y = /[a-z]/.test(n),
      w = !0
    for (let i = 0, e = Math.min(n.length, 200), r = 0; i < e && f < c; ) {
      var b = codePointAt(n, i)
      h < 0 &&
        (u < c && b == o[u] && (a[u++] = i),
        g < c &&
          (b == o[g] || b == s[g]
            ? (0 == g && (m = i), (v = i + 1), g++)
            : (g = 0)))
      let e,
        t =
          b < 255
            ? (48 <= b && b <= 57) || (97 <= b && b <= 122)
              ? 2
              : 65 <= b && b <= 90
              ? 1
              : 0
            : (e = fromCodePoint(b)) != e.toLowerCase()
            ? 1
            : e != e.toUpperCase()
            ? 2
            : 0
      ;(!i || (1 == t && y) || (0 == r && 0 != t)) &&
        (o[f] == b || (s[f] == b && (p = !0))
          ? (l[f++] = i)
          : l.length && (w = !1)),
        (r = t),
        (i += codePointSize(b))
    }
    return f == c && 0 == l[0] && w
      ? this.result((p ? -200 : 0) - 100, l, n)
      : g == c && 0 == m
      ? [-200 - n.length, 0, v]
      : -1 < h
      ? [-700 - n.length, h, h + this.pattern.length]
      : g == c
      ? [-900 - n.length, m, v]
      : f == c
      ? this.result((p ? -200 : 0) - 100 - 700 + (w ? 0 : -1100), l, n)
      : 2 == o.length
      ? null
      : this.result((i[0] ? -700 : 0) - 200 - 1100, i, n)
  }
  result(e, t, i) {
    let r = [e - i.length],
      n = 1
    for (var o of t) {
      var s = o + (this.astral ? codePointSize(codePointAt(i, o)) : 1)
      1 < n && r[n - 1] == o ? (r[n - 1] = s) : ((r[n++] = o), (r[n++] = s))
    }
    return r
  }
}
const completionConfig = Facet.define({
  combine(e) {
    return combineConfig(
      e,
      {
        activateOnTyping: !0,
        override: null,
        closeOnBlur: !0,
        maxRenderedOptions: 100,
        defaultKeymap: !0,
        optionClass: () => '',
        aboveCursor: !1,
        icons: !0,
        addToOptions: [],
      },
      {
        defaultKeymap: (e, t) => e && t,
        closeOnBlur: (e, t) => e && t,
        icons: (e, t) => e && t,
        optionClass: (t, i) => (e) => joinClass(t(e), i(e)),
        addToOptions: (e, t) => e.concat(t),
      }
    )
  },
})
function joinClass(e, t) {
  return e ? (t ? e + ' ' + t : e) : t
}
function optionContent(e) {
  let t = e.addToOptions.slice()
  return (
    e.icons &&
      t.push({
        render(e) {
          let t = document.createElement('div')
          return (
            t.classList.add('cm-completionIcon'),
            e.type &&
              t.classList.add(
                ...e.type.split(/\s+/g).map((e) => 'cm-completionIcon-' + e)
              ),
            t.setAttribute('aria-hidden', 'true'),
            t
          )
        },
        position: 20,
      }),
    t.push(
      {
        render(e, t, i) {
          let r = document.createElement('span'),
            n = ((r.className = 'cm-completionLabel'), e)['label'],
            o = 0
          for (let t = 1; t < i.length; ) {
            var s = i[t++],
              a = i[t++]
            s > o && r.appendChild(document.createTextNode(n.slice(o, s)))
            let e = r.appendChild(document.createElement('span'))
            e.appendChild(document.createTextNode(n.slice(s, a))),
              (e.className = 'cm-completionMatchedText'),
              (o = a)
          }
          return (
            o < n.length && r.appendChild(document.createTextNode(n.slice(o))),
            r
          )
        },
        position: 50,
      },
      {
        render(e) {
          if (!e.detail) return null
          let t = document.createElement('span')
          return (
            (t.className = 'cm-completionDetail'), (t.textContent = e.detail), t
          )
        },
        position: 80,
      }
    ),
    t.sort((e, t) => e.position - t.position).map((e) => e.render)
  )
}
function rangeAroundSelected(e, t, i) {
  if (e <= i) return { from: 0, to: e }
  if (t <= e >> 1) return { from: (r = Math.floor(t / i)) * i, to: (r + 1) * i }
  var r = Math.floor((e - t) / i)
  return { from: e - (r + 1) * i, to: e - r * i }
}
class CompletionTooltip {
  constructor(r, e) {
    ;(this.view = r),
      (this.stateField = e),
      (this.info = null),
      (this.placeInfo = {
        read: () => this.measureInfo(),
        write: (e) => this.positionInfo(e),
        key: this,
      })
    e = r.state.field(e)
    let { options: n, selected: t } = e.open
    var i = r.state.facet(completionConfig)
    ;(this.optionContent = optionContent(i)),
      (this.optionClass = i.optionClass),
      (this.range = rangeAroundSelected(n.length, t, i.maxRenderedOptions)),
      (this.dom = document.createElement('div')),
      (this.dom.className = 'cm-tooltip-autocomplete'),
      this.dom.addEventListener('mousedown', (i) => {
        for (let e = i.target, t; e && e != this.dom; e = e.parentNode)
          if (
            'LI' == e.nodeName &&
            (t = /-(\d+)$/.exec(e.id)) &&
            +t[1] < n.length
          )
            return applyCompletion(r, n[+t[1]]), void i.preventDefault()
      }),
      (this.list = this.dom.appendChild(
        this.createListBox(n, e.id, this.range)
      )),
      this.list.addEventListener('scroll', () => {
        this.info && this.view.requestMeasure(this.placeInfo)
      })
  }
  mount() {
    this.updateSel()
  }
  update(e) {
    e.state.field(this.stateField) != e.startState.field(this.stateField) &&
      this.updateSel()
  }
  positioned() {
    this.info && this.view.requestMeasure(this.placeInfo)
  }
  updateSel() {
    let i = this.view.state.field(this.stateField),
      e = i.open
    if (
      ((e.selected < this.range.from || e.selected >= this.range.to) &&
        ((this.range = rangeAroundSelected(
          e.options.length,
          e.selected,
          this.view.state.facet(completionConfig).maxRenderedOptions
        )),
        this.list.remove(),
        (this.list = this.dom.appendChild(
          this.createListBox(e.options, i.id, this.range)
        )),
        this.list.addEventListener('scroll', () => {
          this.info && this.view.requestMeasure(this.placeInfo)
        })),
      this.updateSelectedOption(e.selected))
    ) {
      this.info && (this.info.remove(), (this.info = null))
      var r = e.options[e.selected]['completion']
      let t = r['info']
      if (t) {
        let e = 'string' == typeof t ? document.createTextNode(t) : t(r)
        e &&
          ('then' in e
            ? e
                .then((e) => {
                  e &&
                    this.view.state.field(this.stateField, !1) == i &&
                    this.addInfoPane(e)
                })
                .catch((e) =>
                  logException(this.view.state, e, 'completion info')
                )
            : this.addInfoPane(e))
      }
    }
  }
  addInfoPane(e) {
    let t = (this.info = document.createElement('div'))
    ;(t.className = 'cm-tooltip cm-completionInfo'),
      t.appendChild(e),
      this.dom.appendChild(t),
      this.view.requestMeasure(this.placeInfo)
  }
  updateSelectedOption(i) {
    let r = null
    for (
      let e = this.list.firstChild, t = this.range.from;
      e;
      e = e.nextSibling, t++
    )
      t == i
        ? e.hasAttribute('aria-selected') ||
          (e.setAttribute('aria-selected', 'true'), (r = e))
        : e.hasAttribute('aria-selected') && e.removeAttribute('aria-selected')
    return r && scrollIntoView(this.list, r), r
  }
  measureInfo() {
    let e = this.dom.querySelector('[aria-selected]')
    if (!e || !this.info) return null
    var t = this.dom.getBoundingClientRect(),
      i = this.info.getBoundingClientRect(),
      r = e.getBoundingClientRect()
    if (
      r.top > Math.min(innerHeight, t.bottom) - 10 ||
      r.bottom < Math.max(0, t.top) + 10
    )
      return null
    r = Math.max(0, Math.min(r.top, innerHeight - i.height)) - t.top
    let n = this.view.textDirection == Direction.RTL
    var o = t.left,
      t = innerWidth - t.right
    return (
      n && o < Math.min(i.width, t)
        ? (n = !1)
        : !n && t < Math.min(i.width, o) && (n = !0),
      { top: r, left: n }
    )
  }
  positionInfo(e) {
    this.info &&
      ((this.info.style.top = (e ? e.top : -1e6) + 'px'),
      e &&
        (this.info.classList.toggle('cm-completionInfo-left', e.left),
        this.info.classList.toggle('cm-completionInfo-right', !e.left)))
  }
  createListBox(t, i, r) {
    const n = document.createElement('ul')
    ;(n.id = i),
      n.setAttribute('role', 'listbox'),
      n.setAttribute('aria-expanded', 'true'),
      n.setAttribute('aria-label', this.view.state.phrase('Completions'))
    for (let e = r.from; e < r.to; e++) {
      var { completion: o, match: s } = t[e]
      const c = n.appendChild(document.createElement('li'))
      ;(c.id = i + '-' + e), c.setAttribute('role', 'option')
      var a,
        l = this.optionClass(o)
      l && (c.className = l)
      for (a of this.optionContent) {
        var h = a(o, this.view.state, s)
        h && c.appendChild(h)
      }
    }
    return (
      r.from && n.classList.add('cm-completionListIncompleteTop'),
      r.to < t.length && n.classList.add('cm-completionListIncompleteBottom'),
      n
    )
  }
}
function completionTooltip(t) {
  return (e) => new CompletionTooltip(e, t)
}
function scrollIntoView(e, t) {
  var i = e.getBoundingClientRect(),
    t = t.getBoundingClientRect()
  t.top < i.top
    ? (e.scrollTop -= i.top - t.top)
    : t.bottom > i.bottom && (e.scrollTop += t.bottom - i.bottom)
}
function score(e) {
  return (
    100 * (e.boost || 0) +
    (e.apply ? 10 : 0) +
    (e.info ? 5 : 0) +
    (e.type ? 1 : 0)
  )
}
function sortOptions(e, i) {
  let r = [],
    n = 0
  for (var o of e)
    if (o.hasResult())
      if (!1 === o.result.filter) {
        let t = o.result.getMatch
        for (var s of o.result.options) {
          let e = [1e9 - n++]
          if (t) for (var a of t(s)) e.push(a)
          r.push(new Option(s, o, e))
        }
      } else {
        let e = new FuzzyMatcher(i.sliceDoc(o.from, o.to)),
          t
        for (var l of o.result.options)
          (t = e.match(l.label)) &&
            (null != l.boost && (t[0] += l.boost), r.push(new Option(l, o, t)))
      }
  let t = [],
    h = null
  for (var c of r.sort(cmpOption))
    !h ||
    h.label != c.completion.label ||
    h.detail != c.completion.detail ||
    (null != h.type &&
      null != c.completion.type &&
      h.type != c.completion.type) ||
    h.apply != c.completion.apply
      ? t.push(c)
      : score(c.completion) > score(h) && (t[t.length - 1] = c),
      (h = c.completion)
  return t
}
class CompletionDialog {
  constructor(e, t, i, r, n) {
    ;(this.options = e),
      (this.attrs = t),
      (this.tooltip = i),
      (this.timestamp = r),
      (this.selected = n)
  }
  setSelected(e, t) {
    return e == this.selected || e >= this.options.length
      ? this
      : new CompletionDialog(
          this.options,
          makeAttrs(t, e),
          this.tooltip,
          this.timestamp,
          e
        )
  }
  static build(e, t, i, r, n) {
    var o = sortOptions(e, t)
    if (!o.length) return null
    let s = 0
    if (r && r.selected) {
      var a = r.options[r.selected].completion
      for (let e = 0; e < o.length; e++)
        if (o[e].completion == a) {
          s = e
          break
        }
    }
    return new CompletionDialog(
      o,
      makeAttrs(i, s),
      {
        pos: e.reduce((e, t) => (t.hasResult() ? Math.min(e, t.from) : e), 1e8),
        create: completionTooltip(completionState),
        above: n.aboveCursor,
      },
      r ? r.timestamp : Date.now(),
      s
    )
  }
  map(e) {
    return new CompletionDialog(
      this.options,
      this.attrs,
      Object.assign(Object.assign({}, this.tooltip), {
        pos: e.mapPos(this.tooltip.pos),
      }),
      this.timestamp,
      this.selected
    )
  }
}
class CompletionState {
  constructor(e, t, i) {
    ;(this.active = e), (this.id = t), (this.open = i)
  }
  static start() {
    return new CompletionState(
      none$1,
      'cm-ac-' + Math.floor(2e6 * Math.random()).toString(36),
      null
    )
  }
  update(i) {
    let e = i['state'],
      r = e.facet(completionConfig),
      t = r.override || e.languageDataAt('autocomplete', cur(e)).map(asSource),
      n = t.map((t) => {
        let e =
          this.active.find((e) => e.source == t) ||
          new ActiveSource(t, this.active.some((e) => 0 != e.state) ? 1 : 0)
        return e.update(i, r)
      }),
      o =
        (n.length == this.active.length &&
          n.every((e, t) => e == this.active[t]) &&
          (n = this.active),
        i.selection ||
        n.some((e) => e.hasResult() && i.changes.touchesRange(e.from, e.to)) ||
        !sameResults(n, this.active)
          ? CompletionDialog.build(n, e, this.id, this.open, r)
          : this.open && i.docChanged
          ? this.open.map(i.changes)
          : this.open)
    !o &&
      n.every((e) => 1 != e.state) &&
      n.some((e) => e.hasResult()) &&
      (n = n.map((e) => (e.hasResult() ? new ActiveSource(e.source, 0) : e)))
    for (var s of i.effects)
      s.is(setSelectedEffect) && (o = o && o.setSelected(s.value, this.id))
    return n == this.active && o == this.open
      ? this
      : new CompletionState(n, this.id, o)
  }
  get tooltip() {
    return this.open ? this.open.tooltip : null
  }
  get attrs() {
    return this.open ? this.open.attrs : baseAttrs
  }
}
function sameResults(i, r) {
  if (i == r) return !0
  for (let e = 0, t = 0; ; ) {
    for (; e < i.length && !i[e].hasResult; ) e++
    for (; t < r.length && !r[t].hasResult; ) t++
    var n = e == i.length,
      o = t == r.length
    if (n || o) return n == o
    if (i[e++].result != r[t++].result) return !1
  }
}
const baseAttrs = { 'aria-autocomplete': 'list' }
function makeAttrs(e, t) {
  return {
    'aria-autocomplete': 'list',
    'aria-haspopup': 'listbox',
    'aria-activedescendant': e + '-' + t,
    'aria-controls': e,
  }
}
const none$1 = []
function cmpOption(e, t) {
  var i = t.match[0] - e.match[0]
  return i || e.completion.label.localeCompare(t.completion.label)
}
function getUserEvent(e) {
  return e.isUserEvent('input.type')
    ? 'input'
    : e.isUserEvent('delete.backward')
    ? 'delete'
    : null
}
class ActiveSource {
  constructor(e, t, i = -1) {
    ;(this.source = e), (this.state = t), (this.explicitPos = i)
  }
  hasResult() {
    return !1
  }
  update(e, t) {
    let i = getUserEvent(e),
      r = this
    i
      ? (r = r.handleUserEvent(e, i, t))
      : e.docChanged
      ? (r = r.handleChange(e))
      : e.selection && 0 != r.state && (r = new ActiveSource(r.source, 0))
    for (var n of e.effects)
      if (n.is(startCompletionEffect))
        r = new ActiveSource(r.source, 1, n.value ? cur(e.state) : -1)
      else if (n.is(closeCompletionEffect)) r = new ActiveSource(r.source, 0)
      else if (n.is(setActiveEffect))
        for (var o of n.value) o.source == r.source && (r = o)
    return r
  }
  handleUserEvent(e, t, i) {
    return 'delete' != t && i.activateOnTyping
      ? new ActiveSource(this.source, 1)
      : this.map(e.changes)
  }
  handleChange(e) {
    return e.changes.touchesRange(cur(e.startState))
      ? new ActiveSource(this.source, 0)
      : this.map(e.changes)
  }
  map(e) {
    return e.empty || this.explicitPos < 0
      ? this
      : new ActiveSource(this.source, this.state, e.mapPos(this.explicitPos))
  }
}
class ActiveResult extends ActiveSource {
  constructor(e, t, i, r, n) {
    super(e, 2, t), (this.result = i), (this.from = r), (this.to = n)
  }
  hasResult() {
    return !0
  }
  handleUserEvent(e, t, i) {
    var r = e.changes.mapPos(this.from),
      n = e.changes.mapPos(this.to, 1),
      o = cur(e.state)
    if (
      (this.explicitPos < 0 ? o <= r : o < this.from) ||
      n < o ||
      ('delete' == t && cur(e.startState) == this.from)
    )
      return new ActiveSource(
        this.source,
        'input' == t && i.activateOnTyping ? 1 : 0
      )
    let s = this.explicitPos < 0 ? -1 : e.changes.mapPos(this.explicitPos),
      a
    return checkValid(this.result.validFor, e.state, r, n)
      ? new ActiveResult(this.source, s, this.result, r, n)
      : this.result.update &&
        (a = this.result.update(
          this.result,
          r,
          n,
          new CompletionContext(e.state, o, 0 <= s)
        ))
      ? new ActiveResult(
          this.source,
          s,
          a,
          a.from,
          null != (t = a.to) ? t : cur(e.state)
        )
      : new ActiveSource(this.source, 1, s)
  }
  handleChange(e) {
    return e.changes.touchesRange(this.from, this.to)
      ? new ActiveSource(this.source, 0)
      : this.map(e.changes)
  }
  map(e) {
    return e.empty
      ? this
      : new ActiveResult(
          this.source,
          this.explicitPos < 0 ? -1 : e.mapPos(this.explicitPos),
          this.result,
          e.mapPos(this.from),
          e.mapPos(this.to, 1)
        )
  }
}
function checkValid(e, t, i, r) {
  if (!e) return !1
  var n = t.sliceDoc(i, r)
  return 'function' == typeof e ? e(n, i, r, t) : ensureAnchor(e, !0).test(n)
}
const startCompletionEffect = StateEffect.define(),
  closeCompletionEffect = StateEffect.define(),
  setActiveEffect = StateEffect.define({
    map(e, t) {
      return e.map((e) => e.map(t))
    },
  }),
  setSelectedEffect = StateEffect.define(),
  completionState = StateField.define({
    create() {
      return CompletionState.start()
    },
    update(e, t) {
      return e.update(t)
    },
    provide: (e) => [
      showTooltip.from(e, (e) => e.tooltip),
      EditorView.contentAttributes.from(e, (e) => e.attrs),
    ],
  }),
  CompletionInteractMargin = 75
function moveCompletionSelection(s, a = 'option') {
  return (e) => {
    var t = e.state.field(completionState, !1)
    if (
      !t ||
      !t.open ||
      Date.now() - t.open.timestamp < CompletionInteractMargin
    )
      return !1
    let i = 1,
      r,
      n =
        ('page' == a &&
          (r = getTooltip(e, t.open.tooltip)) &&
          (i = Math.max(
            2,
            Math.floor(
              r.dom.offsetHeight / r.dom.querySelector('li').offsetHeight
            ) - 1
          )),
        t.open.selected + i * (s ? 1 : -1)),
      o = t.open.options['length']
    return (
      n < 0
        ? (n = 'page' == a ? 0 : o - 1)
        : n >= o && (n = 'page' == a ? o - 1 : 0),
      e.dispatch({ effects: setSelectedEffect.of(n) }),
      !0
    )
  }
}
const acceptCompletion = (e) => {
    var t = e.state.field(completionState, !1)
    return (
      !(
        e.state.readOnly ||
        !t ||
        !t.open ||
        Date.now() - t.open.timestamp < CompletionInteractMargin
      ) && (applyCompletion(e, t.open.options[t.open.selected]), !0)
    )
  },
  startCompletion = (e) => {
    return (
      !!e.state.field(completionState, !1) &&
      (e.dispatch({ effects: startCompletionEffect.of(!0) }), !0)
    )
  },
  closeCompletion = (e) => {
    let t = e.state.field(completionState, !1)
    return (
      !(!t || !t.active.some((e) => 0 != e.state)) &&
      (e.dispatch({ effects: closeCompletionEffect.of(null) }), !0)
    )
  }
class RunningQuery {
  constructor(e, t) {
    ;(this.active = e),
      (this.context = t),
      (this.time = Date.now()),
      (this.updates = []),
      (this.done = void 0)
  }
}
const DebounceTime = 50,
  MaxUpdateCount = 50,
  MinAbortTime = 1e3,
  completionPlugin = ViewPlugin.fromClass(
    class {
      constructor(e) {
        ;(this.view = e),
          (this.debounceUpdate = -1),
          (this.running = []),
          (this.debounceAccept = -1),
          (this.composing = 0)
        for (var t of e.state.field(completionState).active)
          1 == t.state && this.startQuery(t)
      }
      update(i) {
        let e = i.state.field(completionState)
        if (
          i.selectionSet ||
          i.docChanged ||
          i.startState.field(completionState) != e
        ) {
          var r = i.transactions.some(
            (e) => (e.selection || e.docChanged) && !getUserEvent(e)
          )
          for (let t = 0; t < this.running.length; t++) {
            let e = this.running[t]
            if (
              r ||
              (e.updates.length + i.transactions.length > MaxUpdateCount &&
                Date.now() - e.time > MinAbortTime)
            ) {
              for (var n of e.context.abortListeners)
                try {
                  n()
                } catch (e) {
                  logException(this.view.state, e)
                }
              ;(e.context.abortListeners = null), this.running.splice(t--, 1)
            } else e.updates.push(...i.transactions)
          }
          if (
            (-1 < this.debounceUpdate && clearTimeout(this.debounceUpdate),
            (this.debounceUpdate = e.active.some(
              (t) =>
                1 == t.state &&
                !this.running.some((e) => e.active.source == t.source)
            )
              ? setTimeout(() => this.startUpdate(), DebounceTime)
              : -1),
            0 != this.composing)
          )
            for (var t of i.transactions)
              'input' == getUserEvent(t)
                ? (this.composing = 2)
                : 2 == this.composing && t.selection && (this.composing = 3)
        }
      }
      startUpdate() {
        this.debounceUpdate = -1
        let e = this.view['state'],
          i = e.field(completionState)
        for (let t of i.active)
          1 != t.state ||
            this.running.some((e) => e.active.source == t.source) ||
            this.startQuery(t)
      }
      startQuery(e) {
        var t = this.view['state'],
          i = cur(t),
          t = new CompletionContext(t, i, e.explicitPos == i)
        let r = new RunningQuery(e, t)
        this.running.push(r),
          Promise.resolve(e.source(t)).then(
            (e) => {
              r.context.aborted || ((r.done = e || null), this.scheduleAccept())
            },
            (e) => {
              this.view.dispatch({ effects: closeCompletionEffect.of(null) }),
                logException(this.view.state, e)
            }
          )
      }
      scheduleAccept() {
        this.running.every((e) => void 0 !== e.done)
          ? this.accept()
          : this.debounceAccept < 0 &&
            (this.debounceAccept = setTimeout(
              () => this.accept(),
              DebounceTime
            ))
      }
      accept() {
        ;-1 < this.debounceAccept && clearTimeout(this.debounceAccept),
          (this.debounceAccept = -1)
        let i = []
        var r = this.view.state.facet(completionConfig)
        for (let e = 0; e < this.running.length; e++) {
          let t = this.running[e]
          if (void 0 !== t.done) {
            if ((this.running.splice(e--, 1), t.done)) {
              let e = new ActiveResult(
                t.active.source,
                t.active.explicitPos,
                t.done,
                t.done.from,
                null != (o = t.done.to)
                  ? o
                  : cur(
                      t.updates.length
                        ? t.updates[0].startState
                        : this.view.state
                    )
              )
              for (var n of t.updates) e = e.update(n, r)
              if (e.hasResult()) {
                i.push(e)
                continue
              }
            }
            var o = this.view.state
              .field(completionState)
              .active.find((e) => e.source == t.active.source)
            if (o && 1 == o.state)
              if (null == t.done) {
                let e = new ActiveSource(t.active.source, 0)
                for (var s of t.updates) e = e.update(s, r)
                1 != e.state && i.push(e)
              } else this.startQuery(o)
          }
        }
        i.length && this.view.dispatch({ effects: setActiveEffect.of(i) })
      }
    },
    {
      eventHandlers: {
        blur() {
          var e = this.view.state.field(completionState, !1)
          e &&
            e.tooltip &&
            this.view.state.facet(completionConfig).closeOnBlur &&
            this.view.dispatch({ effects: closeCompletionEffect.of(null) })
        },
        compositionstart() {
          this.composing = 1
        },
        compositionend() {
          3 == this.composing &&
            setTimeout(
              () =>
                this.view.dispatch({ effects: startCompletionEffect.of(!1) }),
              20
            ),
            (this.composing = 0)
        },
      },
    }
  ),
  baseTheme$2 = EditorView.baseTheme({
    '.cm-tooltip.cm-tooltip-autocomplete': {
      '& > ul': {
        fontFamily: 'monospace',
        whiteSpace: 'nowrap',
        overflow: 'hidden auto',
        maxWidth_fallback: '700px',
        maxWidth: 'min(700px, 95vw)',
        minWidth: '250px',
        maxHeight: '10em',
        listStyle: 'none',
        margin: 0,
        padding: 0,
        '& > li': {
          overflowX: 'hidden',
          textOverflow: 'ellipsis',
          cursor: 'pointer',
          padding: '1px 3px',
          lineHeight: 1.2,
        },
      },
    },
    '&light .cm-tooltip-autocomplete ul li[aria-selected]': {
      background: '#17c',
      color: 'white',
    },
    '&dark .cm-tooltip-autocomplete ul li[aria-selected]': {
      background: '#347',
      color: 'white',
    },
    '.cm-completionListIncompleteTop:before, .cm-completionListIncompleteBottom:after':
      { content: '"···"', opacity: 0.5, display: 'block', textAlign: 'center' },
    '.cm-tooltip.cm-completionInfo': {
      position: 'absolute',
      padding: '3px 9px',
      width: 'max-content',
      maxWidth: '300px',
    },
    '.cm-completionInfo.cm-completionInfo-left': { right: '100%' },
    '.cm-completionInfo.cm-completionInfo-right': { left: '100%' },
    '&light .cm-snippetField': { backgroundColor: '#00000022' },
    '&dark .cm-snippetField': { backgroundColor: '#ffffff22' },
    '.cm-snippetFieldPosition': {
      verticalAlign: 'text-top',
      width: 0,
      height: '1.15em',
      margin: '0 -0.7px -.7em',
      borderLeft: '1.4px dotted #888',
    },
    '.cm-completionMatchedText': { textDecoration: 'underline' },
    '.cm-completionDetail': { marginLeft: '0.5em', fontStyle: 'italic' },
    '.cm-completionIcon': {
      fontSize: '90%',
      width: '.8em',
      display: 'inline-block',
      textAlign: 'center',
      paddingRight: '.6em',
      opacity: '0.6',
    },
    '.cm-completionIcon-function, .cm-completionIcon-method': {
      '&:after': { content: "'ƒ'" },
    },
    '.cm-completionIcon-class': { '&:after': { content: "'○'" } },
    '.cm-completionIcon-interface': { '&:after': { content: "'◌'" } },
    '.cm-completionIcon-variable': { '&:after': { content: "'𝑥'" } },
    '.cm-completionIcon-constant': { '&:after': { content: "'𝐶'" } },
    '.cm-completionIcon-type': { '&:after': { content: "'𝑡'" } },
    '.cm-completionIcon-enum': { '&:after': { content: "'∪'" } },
    '.cm-completionIcon-property': { '&:after': { content: "'□'" } },
    '.cm-completionIcon-keyword': { '&:after': { content: "'🔑︎'" } },
    '.cm-completionIcon-namespace': { '&:after': { content: "'▢'" } },
    '.cm-completionIcon-text': {
      '&:after': { content: "'abc'", fontSize: '50%', verticalAlign: 'middle' },
    },
  })
class FieldPos {
  constructor(e, t, i, r) {
    ;(this.field = e), (this.line = t), (this.from = i), (this.to = r)
  }
}
class FieldRange {
  constructor(e, t, i) {
    ;(this.field = e), (this.from = t), (this.to = i)
  }
  map(e) {
    var t = e.mapPos(this.from, -1, MapMode.TrackDel),
      e = e.mapPos(this.to, 1, MapMode.TrackDel)
    return null == t || null == e ? null : new FieldRange(this.field, t, e)
  }
}
class Snippet {
  constructor(e, t) {
    ;(this.lines = e), (this.fieldPositions = t)
  }
  instantiate(r, e) {
    let t = [],
      n = [e]
    var o,
      i = r.doc.lineAt(e),
      s = /^\s*/.exec(i.text)[0]
    for (o of this.lines) {
      if (t.length) {
        let t = s,
          i = /^\t*/.exec(o)[0].length
        for (let e = 0; e < i; e++) t += r.facet(indentUnit)
        n.push(e + t.length - i), (o = t + o.slice(i))
      }
      t.push(o), (e += o.length + 1)
    }
    i = this.fieldPositions.map(
      (e) => new FieldRange(e.field, n[e.line] + e.from, n[e.line] + e.to)
    )
    return { text: t, ranges: i }
  }
  static parse(e) {
    let n = [],
      o = [],
      s = [],
      a
    for (var l of e.split(/\r\n?|\n/)) {
      for (; (a = /[#$]\{(?:(\d+)(?::([^}]*))?|([^}]*))\}/.exec(l)); ) {
        let t = a[1] ? +a[1] : null,
          i = a[2] || a[3] || '',
          r = -1
        for (let e = 0; e < n.length; e++)
          (null != t ? n[e].seq == t : i && n[e].name == i) && (r = e)
        if (r < 0) {
          let e = 0
          for (
            ;
            e < n.length && (null == t || (null != n[e].seq && n[e].seq < t));

          )
            e++
          n.splice(e, 0, { seq: t, name: i }), (r = e)
          for (var h of s) h.field >= r && h.field++
        }
        s.push(new FieldPos(r, o.length, a.index, a.index + i.length)),
          (l = l.slice(0, a.index) + i + l.slice(a.index + a[0].length))
      }
      for (var t; (t = /([$#])\\{/.exec(l)); ) {
        l = l.slice(0, t.index) + t[1] + '{' + l.slice(t.index + t[0].length)
        for (var i of s)
          i.line == o.length && i.from > t.index && (i.from--, i.to--)
      }
      o.push(l)
    }
    return new Snippet(o, s)
  }
}
let fieldMarker = Decoration.widget({
    widget: new (class extends WidgetType {
      toDOM() {
        let e = document.createElement('span')
        return (e.className = 'cm-snippetFieldPosition'), e
      }
      ignoreEvent() {
        return !1
      }
    })(),
  }),
  fieldRange = Decoration.mark({ class: 'cm-snippetField' })
class ActiveSnippet {
  constructor(e, t) {
    ;(this.ranges = e),
      (this.active = t),
      (this.deco = Decoration.set(
        e.map((e) =>
          (e.from == e.to ? fieldMarker : fieldRange).range(e.from, e.to)
        )
      ))
  }
  map(e) {
    let t = []
    for (var i of this.ranges) {
      i = i.map(e)
      if (!i) return null
      t.push(i)
    }
    return new ActiveSnippet(t, this.active)
  }
  selectionInsideField(e) {
    return e.ranges.every((t) =>
      this.ranges.some(
        (e) => e.field == this.active && e.from <= t.from && e.to >= t.to
      )
    )
  }
}
const setActive = StateEffect.define({
    map(e, t) {
      return e && e.map(t)
    },
  }),
  moveToField = StateEffect.define(),
  snippetState = StateField.define({
    create() {
      return null
    },
    update(e, t) {
      for (var i of t.effects) {
        if (i.is(setActive)) return i.value
        if (i.is(moveToField) && e) return new ActiveSnippet(e.ranges, i.value)
      }
      return (e =
        (e = e && t.docChanged ? e.map(t.changes) : e) &&
        t.selection &&
        !e.selectionInsideField(t.selection)
          ? null
          : e)
    },
    provide: (e) =>
      EditorView.decorations.from(e, (e) => (e ? e.deco : Decoration.none)),
  })
function fieldSelection(e, t) {
  return EditorSelection.create(
    e
      .filter((e) => e.field == t)
      .map((e) => EditorSelection.range(e.from, e.to))
  )
}
function snippet(e) {
  let a = Snippet.parse(e)
  return (t, e, i, r) => {
    var { text: n, ranges: o } = a.instantiate(t.state, i)
    let s = {
      changes: { from: i, to: r, insert: Text.of(n) },
      scrollIntoView: !0,
    }
    if ((o.length && (s.selection = fieldSelection(o, 0)), 1 < o.length)) {
      i = new ActiveSnippet(o, 0)
      let e = (s.effects = [setActive.of(i)])
      void 0 === t.state.field(snippetState, !1) &&
        e.push(
          StateEffect.appendConfig.of([
            snippetState,
            addSnippetKeymap,
            snippetPointerHandler,
            baseTheme$2,
          ])
        )
    }
    t.dispatch(t.state.update(s))
  }
}
function moveField(o) {
  return ({ state: e, dispatch: t }) => {
    let i = e.field(snippetState, !1)
    if (!i || (o < 0 && 0 == i.active)) return !1
    let r = i.active + o,
      n = 0 < o && !i.ranges.some((e) => e.field == r + o)
    return (
      t(
        e.update({
          selection: fieldSelection(i.ranges, r),
          effects: setActive.of(n ? null : new ActiveSnippet(i.ranges, r)),
        })
      ),
      !0
    )
  }
}
const clearSnippet = ({ state: e, dispatch: t }) => {
    return (
      !!e.field(snippetState, !1) &&
      (t(e.update({ effects: setActive.of(null) })), !0)
    )
  },
  nextSnippetField = moveField(1),
  prevSnippetField = moveField(-1),
  defaultSnippetKeymap = [
    { key: 'Tab', run: nextSnippetField, shift: prevSnippetField },
    { key: 'Escape', run: clearSnippet },
  ],
  snippetKeymap = Facet.define({
    combine(e) {
      return e.length ? e[0] : defaultSnippetKeymap
    },
  }),
  addSnippetKeymap = Prec.highest(
    keymap.compute([snippetKeymap], (e) => e.facet(snippetKeymap))
  )
function snippetCompletion(e, t) {
  return Object.assign(Object.assign({}, t), { apply: snippet(e) })
}
const snippetPointerHandler = EditorView.domEventHandlers({
    mousedown(e, t) {
      let i = t.state.field(snippetState, !1),
        r
      if (!i || null == (r = t.posAtCoords({ x: e.clientX, y: e.clientY })))
        return !1
      let n = i.ranges.find((e) => e.from <= r && e.to >= r)
      return (
        !(!n || n.field == i.active) &&
        (t.dispatch({
          selection: fieldSelection(i.ranges, n.field),
          effects: setActive.of(
            i.ranges.some((e) => e.field > n.field)
              ? new ActiveSnippet(i.ranges, n.field)
              : null
          ),
        }),
        !0)
      )
    },
  }),
  defaults = { brackets: ['(', '[', '{', "'", '"'], before: ')]}:;>' },
  closeBracketEffect = StateEffect.define({
    map(e, t) {
      t = t.mapPos(e, -1, MapMode.TrackAfter)
      return null == t ? void 0 : t
    },
  }),
  skipBracketEffect = StateEffect.define({
    map(e, t) {
      return t.mapPos(e)
    },
  }),
  closedBracket = new (class extends RangeValue {})(),
  bracketState =
    ((closedBracket.startSide = 1),
    (closedBracket.endSide = -1),
    StateField.define({
      create() {
        return RangeSet.empty
      },
      update(e, i) {
        var t, r
        i.selection &&
          ((t = i.state.doc.lineAt(i.selection.main.head).from),
          (r = i.startState.doc.lineAt(i.startState.selection.main.head).from),
          t != i.changes.mapPos(r, -1) && (e = RangeSet.empty)),
          (e = e.map(i.changes))
        for (let t of i.effects)
          t.is(closeBracketEffect)
            ? (e = e.update({
                add: [closedBracket.range(t.value, t.value + 1)],
              }))
            : t.is(skipBracketEffect) &&
              (e = e.update({ filter: (e) => e != t.value }))
        return e
      },
    }))
function closeBrackets() {
  return [inputHandler, bracketState]
}
const definedClosing = '()[]{}<>'
function closing(t) {
  for (let e = 0; e < definedClosing.length; e += 2)
    if (definedClosing.charCodeAt(e) == t) return definedClosing.charAt(e + 1)
  return fromCodePoint(t < 128 ? t : t + 1)
}
function config(e, t) {
  return e.languageDataAt('closeBrackets', t)[0] || defaults
}
const android =
    'object' == typeof navigator && /Android\b/.test(navigator.userAgent),
  inputHandler = EditorView.inputHandler.of((e, t, i, r) => {
    if ((android ? e.composing : e.compositionStarted) || e.state.readOnly)
      return !1
    var n = e.state.selection.main
    if (
      2 < r.length ||
      (2 == r.length && 1 == codePointSize(codePointAt(r, 0))) ||
      t != n.from ||
      i != n.to
    )
      return !1
    t = insertBracket(e.state, r)
    return !!t && (e.dispatch(t), !0)
  })
function insertBracket(e, t) {
  var i,
    r = config(e, e.selection.main.head)
  let n = r.brackets || defaults.brackets
  for (i of n) {
    var o = closing(codePointAt(i, 0))
    if (t == i)
      return o == i
        ? handleSame(e, i, -1 < n.indexOf(i + i + i))
        : handleOpen(e, i, o, r.before || defaults.before)
    if (t == o && closedBracketAt(e, e.selection.main.from))
      return handleClose(e, i, o)
  }
  return null
}
function closedBracketAt(e, t) {
  let i = !1
  return (
    e.field(bracketState).between(0, e.doc.length, (e) => {
      e == t && (i = !0)
    }),
    i
  )
}
function nextChar(e, t) {
  let i = e.sliceString(t, t + 2)
  return i.slice(0, codePointSize(codePointAt(i, 0)))
}
function handleOpen(i, r, n, o) {
  let s = null,
    e = i.changeByRange((e) => {
      if (!e.empty)
        return {
          changes: [
            { insert: r, from: e.from },
            { insert: n, from: e.to },
          ],
          effects: closeBracketEffect.of(e.to + r.length),
          range: EditorSelection.range(e.anchor + r.length, e.head + r.length),
        }
      var t = nextChar(i.doc, e.head)
      return !t || /\s/.test(t) || -1 < o.indexOf(t)
        ? {
            changes: { insert: r + n, from: e.head },
            effects: closeBracketEffect.of(e.head + r.length),
            range: EditorSelection.cursor(e.head + r.length),
          }
        : { range: (s = e) }
    })
  return s ? null : i.update(e, { scrollIntoView: !0, userEvent: 'input.type' })
}
function handleClose(t, e, i) {
  let r = null,
    n = t.selection.ranges.map((e) =>
      e.empty && nextChar(t.doc, e.head) == i
        ? EditorSelection.cursor(e.head + i.length)
        : (r = e)
    )
  return r
    ? null
    : t.update({
        selection: EditorSelection.create(n, t.selection.mainIndex),
        scrollIntoView: !0,
        effects: t.selection.ranges.map(({ from: e }) =>
          skipBracketEffect.of(e)
        ),
      })
}
function handleSame(n, o, s) {
  let a = null,
    e = n.changeByRange((e) => {
      if (!e.empty)
        return {
          changes: [
            { insert: o, from: e.from },
            { insert: o, from: e.to },
          ],
          effects: closeBracketEffect.of(e.to + o.length),
          range: EditorSelection.range(e.anchor + o.length, e.head + o.length),
        }
      var t = e.head,
        i = nextChar(n.doc, t)
      if (i == o) {
        if (nodeStart(n, t))
          return {
            changes: { insert: o + o, from: t },
            effects: closeBracketEffect.of(t + o.length),
            range: EditorSelection.cursor(t + o.length),
          }
        if (closedBracketAt(n, t))
          return (
            (r = s && n.sliceDoc(t, t + 3 * o.length) == o + o + o),
            {
              range: EditorSelection.cursor(t + o.length * (r ? 3 : 1)),
              effects: skipBracketEffect.of(t),
            }
          )
      } else {
        if (
          s &&
          n.sliceDoc(t - 2 * o.length, t) == o + o &&
          nodeStart(n, t - 2 * o.length)
        )
          return {
            changes: { insert: o + o + o + o, from: t },
            effects: closeBracketEffect.of(t + o.length),
            range: EditorSelection.cursor(t + o.length),
          }
        if (n.charCategorizer(t)(i) != CharCategory.Word) {
          var r = n.sliceDoc(t - 1, t)
          if (
            r != o &&
            n.charCategorizer(t)(r) != CharCategory.Word &&
            !probablyInString(n, t, o)
          )
            return {
              changes: { insert: o + o, from: t },
              effects: closeBracketEffect.of(t + o.length),
              range: EditorSelection.cursor(t + o.length),
            }
        }
      }
      return { range: (a = e) }
    })
  return a ? null : n.update(e, { scrollIntoView: !0, userEvent: 'input.type' })
}
function nodeStart(e, t) {
  e = syntaxTree(e).resolveInner(t + 1)
  return e.parent && e.from == t
}
function probablyInString(t, i, r) {
  let n = syntaxTree(t).resolveInner(i, -1)
  for (let e = 0; e < 5; e++) {
    if (t.sliceDoc(n.from, n.from + r.length) == r) return !0
    var o = n.to == i && n.parent
    if (!o) break
    n = o
  }
  return !1
}
function autocompletion(e = {}) {
  return [
    completionState,
    completionConfig.of(e),
    completionPlugin,
    completionKeymapExt,
    baseTheme$2,
  ]
}
const completionKeymap = [
    { key: 'Ctrl-Space', run: startCompletion },
    { key: 'Escape', run: closeCompletion },
    { key: 'ArrowDown', run: moveCompletionSelection(!0) },
    { key: 'ArrowUp', run: moveCompletionSelection(!1) },
    { key: 'PageDown', run: moveCompletionSelection(!0, 'page') },
    { key: 'PageUp', run: moveCompletionSelection(!1, 'page') },
    { key: 'Enter', run: acceptCompletion },
  ],
  completionKeymapExt = Prec.highest(
    keymap.computeN([completionConfig], (e) =>
      e.facet(completionConfig).defaultKeymap ? [completionKeymap] : []
    )
  ),
  toggleComment = (e) => {
    var t = getConfig(e.state)
    return t.line
      ? toggleLineComment(e)
      : !!t.block && toggleBlockCommentByLine(e)
  }
function command(r, n) {
  return ({ state: e, dispatch: t }) => {
    if (e.readOnly) return !1
    var i = r(n, e)
    return !!i && (t(e.update(i)), !0)
  }
}
const toggleLineComment = command(changeLineComment, 0),
  toggleBlockComment = command(changeBlockComment, 0),
  toggleBlockCommentByLine = command(
    (e, t) => changeBlockComment(e, t, selectedLineRanges(t)),
    0
  )
function getConfig(e, t = e.selection.main.head) {
  t = e.languageDataAt('commentTokens', t)
  return t.length ? t[0] : {}
}
const SearchMargin = 50
function findBlockComment(e, { open: t, close: i }, r, n) {
  let o = e.sliceDoc(r - SearchMargin, r),
    s = e.sliceDoc(n, n + SearchMargin)
  var a = /\s*$/.exec(o)[0].length,
    l = /^\s*/.exec(s)[0].length,
    h = o.length - a
  if (o.slice(h - t.length, h) == t && s.slice(l, l + i.length) == i)
    return {
      open: { pos: r - a, margin: a && 1 },
      close: { pos: n + l, margin: l && 1 },
    }
  let c, d
  n - r <= 2 * SearchMargin
    ? (c = d = e.sliceDoc(r, n))
    : ((c = e.sliceDoc(r, r + SearchMargin)),
      (d = e.sliceDoc(n - SearchMargin, n)))
  ;(h = /^\s*/.exec(c)[0].length),
    (a = /\s*$/.exec(d)[0].length),
    (l = d.length - a - i.length)
  return c.slice(h, h + t.length) == t && d.slice(l, l + i.length) == i
    ? {
        open: {
          pos: r + h + t.length,
          margin: /\s/.test(c.charAt(h + t.length)) ? 1 : 0,
        },
        close: {
          pos: n - a - i.length,
          margin: /\s/.test(d.charAt(l - 1)) ? 1 : 0,
        },
      }
    : null
}
function selectedLineRanges(e) {
  let t = []
  for (var i of e.selection.ranges) {
    var r = e.doc.lineAt(i.from),
      i = i.to <= r.to ? r : e.doc.lineAt(i.to),
      n = t.length - 1
    0 <= n && t[n].to > r.from
      ? (t[n].to = i.to)
      : t.push({ from: r.from, to: i.to })
  }
  return t
}
function changeBlockComment(e, i, t = i.selection.ranges) {
  let r = t.map((e) => getConfig(i, e.from).block)
  if (!r.every((e) => e)) return null
  let n = t.map((e, t) => findBlockComment(i, r[t], e.from, e.to))
  if (2 != e && !n.every((e) => e))
    return {
      changes: i.changes(
        t.map((e, t) =>
          n[t]
            ? []
            : [
                { from: e.from, insert: r[t].open + ' ' },
                { from: e.to, insert: ' ' + r[t].close },
              ]
        )
      ),
    }
  if (1 != e && n.some((e) => e)) {
    let i = []
    for (let e = 0, t; e < n.length; e++) {
      var o, s, a
      ;(t = n[e]) &&
        ((o = r[e]),
        ({ open: s, close: a } = t),
        i.push(
          { from: s.pos - o.open.length, to: s.pos + s.margin },
          { from: a.pos - a.margin, to: a.pos + o.close.length }
        ))
    }
    return { changes: i }
  }
  return null
}
function changeLineComment(e, r, t = r.selection.ranges) {
  let n = [],
    o = -1
  for (var { from: s, to: a } of t) {
    let t = n.length,
      i = 1e9
    for (let t = s; t <= a; ) {
      let e = r.doc.lineAt(t)
      if (e.from > o && (s == a || a > e.from)) {
        o = e.from
        var l = getConfig(r, t).line
        if (!l) continue
        var h = /^\s*/.exec(e.text)[0].length,
          c = h == e.length,
          d = e.text.slice(h, h + l.length) == l ? h : -1
        h < e.text.length && h < i && (i = h),
          n.push({
            line: e,
            comment: d,
            token: l,
            indent: h,
            empty: c,
            single: !1,
          })
      }
      t = e.to + 1
    }
    if (i < 1e9)
      for (let e = t; e < n.length; e++)
        n[e].indent < n[e].line.text.length && (n[e].indent = i)
    n.length == t + 1 && (n[t].single = !0)
  }
  if (2 != e && n.some((e) => e.comment < 0 && (!e.empty || e.single))) {
    let e = []
    for (var { line: i, token: u, indent: f, empty: p, single: g } of n)
      (!g && p) || e.push({ from: i.from + f, insert: u + ' ' })
    t = r.changes(e)
    return { changes: t, selection: r.selection.map(t, 1) }
  }
  if (1 != e && n.some((e) => 0 <= e.comment)) {
    let i = []
    for (var { line: m, comment: v, token: y } of n)
      if (0 <= v) {
        let e = m.from + v,
          t = e + y.length
        ' ' == m.text[t - m.from] && t++, i.push({ from: e, to: t })
      }
    return { changes: i }
  }
  return null
}
const fromHistory = Annotation.define(),
  isolateHistory = Annotation.define(),
  invertedEffects = Facet.define(),
  historyConfig = Facet.define({
    combine(e) {
      return combineConfig(
        e,
        { minDepth: 100, newGroupDelay: 500 },
        { minDepth: Math.max, newGroupDelay: Math.min }
      )
    },
  })
function changeEnd(e) {
  let i = 0
  return e.iterChangedRanges((e, t) => (i = t)), i
}
const historyField_ = StateField.define({
  create() {
    return HistoryState.empty
  },
  update(t, i) {
    var r = i.state.facet(historyConfig),
      n = i.annotation(fromHistory)
    if (n) {
      var o = i.docChanged
          ? EditorSelection.single(changeEnd(i.changes))
          : void 0,
        o = HistEvent.fromTransaction(i, o),
        s = n.side
      let e = 0 == s ? t.undone : t.done
      return (
        (e = o
          ? updateBranch(e, e.length, r.minDepth, o)
          : addSelection(e, i.startState.selection)),
        new HistoryState(0 == s ? n.rest : e, 0 == s ? e : n.rest)
      )
    }
    o = i.annotation(isolateHistory)
    if (
      (('full' != o && 'before' != o) || (t = t.isolate()),
      !1 === i.annotation(Transaction.addToHistory))
    )
      return i.changes.empty ? t : t.addMapping(i.changes.desc)
    var s = HistEvent.fromTransaction(i),
      n = i.annotation(Transaction.time),
      e = i.annotation(Transaction.userEvent)
    return (
      s
        ? (t = t.addChanges(s, n, e, r.newGroupDelay, r.minDepth))
        : i.selection &&
          (t = t.addSelection(i.startState.selection, n, e, r.newGroupDelay)),
      (t = 'full' != o && 'after' != o ? t : t.isolate())
    )
  },
  toJSON(e) {
    return {
      done: e.done.map((e) => e.toJSON()),
      undone: e.undone.map((e) => e.toJSON()),
    }
  },
  fromJSON(e) {
    return new HistoryState(
      e.done.map(HistEvent.fromJSON),
      e.undone.map(HistEvent.fromJSON)
    )
  },
})
function history(e = {}) {
  return [
    historyField_,
    historyConfig.of(e),
    EditorView.domEventHandlers({
      beforeinput(e, t) {
        let i =
          'historyUndo' == e.inputType
            ? undo
            : 'historyRedo' == e.inputType
            ? redo
            : null
        return !!i && (e.preventDefault(), i(t))
      },
    }),
  ]
}
function cmd(r, n) {
  return function ({ state: e, dispatch: t }) {
    if (!n && e.readOnly) return !1
    let i = e.field(historyField_, !1)
    if (!i) return !1
    e = i.pop(r, e, n)
    return !!e && (t(e), !0)
  }
}
const undo = cmd(0, !1),
  redo = cmd(1, !1),
  undoSelection = cmd(0, !0),
  redoSelection = cmd(1, !0)
class HistEvent {
  constructor(e, t, i, r, n) {
    ;(this.changes = e),
      (this.effects = t),
      (this.mapped = i),
      (this.startSelection = r),
      (this.selectionsAfter = n)
  }
  setSelAfter(e) {
    return new HistEvent(
      this.changes,
      this.effects,
      this.mapped,
      this.startSelection,
      e
    )
  }
  toJSON() {
    var e
    return {
      changes: null == (e = this.changes) ? void 0 : e.toJSON(),
      mapped: null == (e = this.mapped) ? void 0 : e.toJSON(),
      startSelection: null == (e = this.startSelection) ? void 0 : e.toJSON(),
      selectionsAfter: this.selectionsAfter.map((e) => e.toJSON()),
    }
  }
  static fromJSON(e) {
    return new HistEvent(
      e.changes && ChangeSet.fromJSON(e.changes),
      [],
      e.mapped && ChangeDesc.fromJSON(e.mapped),
      e.startSelection && EditorSelection.fromJSON(e.startSelection),
      e.selectionsAfter.map(EditorSelection.fromJSON)
    )
  }
  static fromTransaction(e, t) {
    let i = none
    for (var r of e.startState.facet(invertedEffects)) {
      r = r(e)
      r.length && (i = i.concat(r))
    }
    return !i.length && e.changes.empty
      ? null
      : new HistEvent(
          e.changes.invert(e.startState.doc),
          i,
          void 0,
          t || e.startState.selection,
          none
        )
  }
  static selection(e) {
    return new HistEvent(void 0, none, void 0, void 0, e)
  }
}
function updateBranch(e, t, i, r) {
  let n = e.slice(i + 20 < t + 1 ? t - i - 1 : 0, t)
  return n.push(r), n
}
function isAdjacent(e, t) {
  let s = [],
    a = !1
  return (
    e.iterChangedRanges((e, t) => s.push(e, t)),
    t.iterChangedRanges((e, t, i, r) => {
      for (let e = 0; e < s.length; ) {
        var n = s[e++],
          o = s[e++]
        n <= r && i <= o && (a = !0)
      }
    }),
    a
  )
}
function eqSelectionShape(e, i) {
  return (
    e.ranges.length == i.ranges.length &&
    0 === e.ranges.filter((e, t) => e.empty != i.ranges[t].empty).length
  )
}
function conc(e, t) {
  return e.length ? (t.length ? e.concat(t) : e) : t
}
const none = [],
  MaxSelectionsPerEvent = 200
function addSelection(i, r) {
  if (i.length) {
    let e = i[i.length - 1],
      t = e.selectionsAfter.slice(
        Math.max(0, e.selectionsAfter.length - MaxSelectionsPerEvent)
      )
    return t.length && t[t.length - 1].eq(r)
      ? i
      : (t.push(r), updateBranch(i, i.length - 1, 1e9, e.setSelAfter(t)))
  }
  return [HistEvent.selection([r])]
}
function popSelection(e) {
  let t = e[e.length - 1],
    i = e.slice()
  return (
    (i[e.length - 1] = t.setSelAfter(
      t.selectionsAfter.slice(0, t.selectionsAfter.length - 1)
    )),
    i
  )
}
function addMappingToBranch(t, e) {
  if (!t.length) return t
  let i = t.length,
    r = none
  for (; i; ) {
    var n = mapEvent(t[i - 1], e, r)
    if ((n.changes && !n.changes.empty) || n.effects.length) {
      let e = t.slice(0, i)
      return (e[i - 1] = n), e
    }
    ;(e = n.mapped), i--, (r = n.selectionsAfter)
  }
  return r.length ? [HistEvent.selection(r)] : none
}
function mapEvent(e, t, i) {
  i = conc(
    e.selectionsAfter.length ? e.selectionsAfter.map((e) => e.map(t)) : none,
    i
  )
  if (!e.changes) return HistEvent.selection(i)
  var r = e.changes.map(t),
    n = t.mapDesc(e.changes, !0),
    o = e.mapped ? e.mapped.composeDesc(n) : n
  return new HistEvent(
    r,
    StateEffect.mapEffects(e.effects, t),
    o,
    e.startSelection.map(n),
    i
  )
}
const joinableUserEvent = /^(input\.type|delete)($|\.)/
class HistoryState {
  constructor(e, t, i = 0, r = void 0) {
    ;(this.done = e),
      (this.undone = t),
      (this.prevTime = i),
      (this.prevUserEvent = r)
  }
  isolate() {
    return this.prevTime ? new HistoryState(this.done, this.undone) : this
  }
  addChanges(e, t, i, r, n) {
    let o = this.done,
      s = o[o.length - 1]
    return (
      (o =
        s &&
        s.changes &&
        !s.changes.empty &&
        e.changes &&
        (!i || joinableUserEvent.test(i)) &&
        ((!s.selectionsAfter.length &&
          t - this.prevTime < r &&
          isAdjacent(s.changes, e.changes)) ||
          'input.type.compose' == i)
          ? updateBranch(
              o,
              o.length - 1,
              n,
              new HistEvent(
                e.changes.compose(s.changes),
                conc(e.effects, s.effects),
                s.mapped,
                s.startSelection,
                none
              )
            )
          : updateBranch(o, o.length, n, e)),
      new HistoryState(o, none, t, i)
    )
  }
  addSelection(e, t, i, r) {
    var n = this.done.length
      ? this.done[this.done.length - 1].selectionsAfter
      : none
    return 0 < n.length &&
      t - this.prevTime < r &&
      i == this.prevUserEvent &&
      i &&
      /^select($|\.)/.test(i) &&
      eqSelectionShape(n[n.length - 1], e)
      ? this
      : new HistoryState(addSelection(this.done, e), this.undone, t, i)
  }
  addMapping(e) {
    return new HistoryState(
      addMappingToBranch(this.done, e),
      addMappingToBranch(this.undone, e),
      this.prevTime,
      this.prevUserEvent
    )
  }
  pop(t, i, e) {
    let r = 0 == t ? this.done : this.undone
    if (0 == r.length) return null
    var n = r[r.length - 1]
    if (e && n.selectionsAfter.length)
      return i.update({
        selection: n.selectionsAfter[n.selectionsAfter.length - 1],
        annotations: fromHistory.of({ side: t, rest: popSelection(r) }),
        userEvent: 0 == t ? 'select.undo' : 'select.redo',
        scrollIntoView: !0,
      })
    if (n.changes) {
      let e = 1 == r.length ? none : r.slice(0, r.length - 1)
      return (
        n.mapped && (e = addMappingToBranch(e, n.mapped)),
        i.update({
          changes: n.changes,
          selection: n.startSelection,
          effects: n.effects,
          annotations: fromHistory.of({ side: t, rest: e }),
          filter: !1,
          userEvent: 0 == t ? 'undo' : 'redo',
          scrollIntoView: !0,
        })
      )
    }
    return null
  }
}
HistoryState.empty = new HistoryState(none, none)
const historyKeymap = [
  { key: 'Mod-z', run: undo, preventDefault: !0 },
  { key: 'Mod-y', mac: 'Mod-Shift-z', run: redo, preventDefault: !0 },
  { key: 'Mod-u', run: undoSelection, preventDefault: !0 },
  { key: 'Alt-u', mac: 'Mod-Shift-u', run: redoSelection, preventDefault: !0 },
]
function updateSel(e, t) {
  return EditorSelection.create(e.ranges.map(t), e.mainIndex)
}
function setSel(e, t) {
  return e.update({ selection: t, scrollIntoView: !0, userEvent: 'select' })
}
function moveSel({ state: e, dispatch: t }, i) {
  let r = updateSel(e.selection, i)
  return !r.eq(e.selection) && (t(setSel(e, r)), !0)
}
function rangeEnd(e, t) {
  return EditorSelection.cursor(t ? e.to : e.from)
}
function cursorByChar(t, i) {
  return moveSel(t, (e) => (e.empty ? t.moveByChar(e, i) : rangeEnd(e, i)))
}
function ltrAtCursor(e) {
  return e.textDirectionAt(e.state.selection.main.head) == Direction.LTR
}
const cursorCharLeft = (e) => cursorByChar(e, !ltrAtCursor(e)),
  cursorCharRight = (e) => cursorByChar(e, ltrAtCursor(e))
function cursorByGroup(t, i) {
  return moveSel(t, (e) => (e.empty ? t.moveByGroup(e, i) : rangeEnd(e, i)))
}
const cursorGroupLeft = (e) => cursorByGroup(e, !ltrAtCursor(e)),
  cursorGroupRight = (e) => cursorByGroup(e, ltrAtCursor(e))
function interestingNode(e, t, i) {
  if (t.type.prop(i)) return !0
  i = t.to - t.from
  return (
    (i && (2 < i || /[^\s,.;:]/.test(e.sliceDoc(t.from, t.to)))) || t.firstChild
  )
}
function moveBySyntax(t, i, r) {
  let n = syntaxTree(t).resolveInner(i.head)
  var o = r ? NodeProp.closedBy : NodeProp.openedBy
  for (let e = i.head; ; ) {
    var s = r ? n.childAfter(e) : n.childBefore(e)
    if (!s) break
    interestingNode(t, s, o) ? (n = s) : (e = r ? s.to : s.from)
  }
  let e = n.type.prop(o),
    a,
    l
  return (
    (l =
      e &&
      (a = r ? matchBrackets(t, n.from, 1) : matchBrackets(t, n.to, -1)) &&
      a.matched
        ? r
          ? a.end.to
          : a.end.from
        : r
        ? n.to
        : n.from),
    EditorSelection.cursor(l, r ? -1 : 1)
  )
}
const cursorSyntaxLeft = (t) =>
    moveSel(t, (e) => moveBySyntax(t.state, e, !ltrAtCursor(t))),
  cursorSyntaxRight = (t) =>
    moveSel(t, (e) => moveBySyntax(t.state, e, ltrAtCursor(t)))
function cursorByLine(i, r) {
  return moveSel(i, (e) => {
    if (!e.empty) return rangeEnd(e, r)
    var t = i.moveVertically(e, r)
    return t.head != e.head ? t : i.moveToLineBoundary(e, r)
  })
}
const cursorLineUp = (e) => cursorByLine(e, !1),
  cursorLineDown = (e) => cursorByLine(e, !0)
function pageHeight(e) {
  return Math.max(
    e.defaultLineHeight,
    Math.min(e.dom.clientHeight, innerHeight) - 5
  )
}
function cursorByPage(t, i) {
  let e = t['state'],
    r = updateSel(e.selection, (e) =>
      e.empty ? t.moveVertically(e, i, pageHeight(t)) : rangeEnd(e, i)
    )
  if (r.eq(e.selection)) return !1
  var n = t.coordsAtPos(e.selection.main.head),
    o = t.scrollDOM.getBoundingClientRect()
  let s
  return (
    n &&
      n.top > o.top &&
      n.bottom < o.bottom &&
      n.top - o.top <=
        t.scrollDOM.scrollHeight -
          t.scrollDOM.scrollTop -
          t.scrollDOM.clientHeight &&
      (s = EditorView.scrollIntoView(r.main.head, {
        y: 'start',
        yMargin: n.top - o.top,
      })),
    t.dispatch(setSel(e, r), { effects: s }),
    !0
  )
}
const cursorPageUp = (e) => cursorByPage(e, !1),
  cursorPageDown = (e) => cursorByPage(e, !0)
function moveByLineBoundary(e, t, i) {
  let r = e.lineBlockAt(t.head),
    n = e.moveToLineBoundary(t, i)
  return (
    n.head == t.head &&
      n.head != (i ? r.to : r.from) &&
      (n = e.moveToLineBoundary(t, i, !1)),
    (n =
      !i &&
      n.head == r.from &&
      r.length &&
      (i = /^\s*/.exec(
        e.state.sliceDoc(r.from, Math.min(r.from + 100, r.to))
      )[0].length) &&
      t.head != r.from + i
        ? EditorSelection.cursor(r.from + i)
        : n)
  )
}
const cursorLineBoundaryForward = (t) =>
    moveSel(t, (e) => moveByLineBoundary(t, e, !0)),
  cursorLineBoundaryBackward = (t) =>
    moveSel(t, (e) => moveByLineBoundary(t, e, !1)),
  cursorLineStart = (t) =>
    moveSel(t, (e) => EditorSelection.cursor(t.lineBlockAt(e.head).from, 1)),
  cursorLineEnd = (t) =>
    moveSel(t, (e) => EditorSelection.cursor(t.lineBlockAt(e.head).to, -1))
function toMatchingBracket(i, e, r) {
  let n = !1,
    t = updateSel(i.selection, (e) => {
      var t =
        matchBrackets(i, e.head, -1) ||
        matchBrackets(i, e.head, 1) ||
        (0 < e.head && matchBrackets(i, e.head - 1, 1)) ||
        (e.head < i.doc.length && matchBrackets(i, e.head + 1, -1))
      if (!t || !t.end) return e
      n = !0
      t = t.start.from == e.head ? t.end.to : t.end.from
      return r ? EditorSelection.range(e.anchor, t) : EditorSelection.cursor(t)
    })
  return !!n && (e(setSel(i, t)), !0)
}
const cursorMatchingBracket = ({ state: e, dispatch: t }) =>
  toMatchingBracket(e, t, !1)
function extendSel(e, i) {
  let t = updateSel(e.state.selection, (e) => {
    var t = i(e)
    return EditorSelection.range(e.anchor, t.head, t.goalColumn)
  })
  return !t.eq(e.state.selection) && (e.dispatch(setSel(e.state, t)), !0)
}
function selectByChar(t, i) {
  return extendSel(t, (e) => t.moveByChar(e, i))
}
const selectCharLeft = (e) => selectByChar(e, !ltrAtCursor(e)),
  selectCharRight = (e) => selectByChar(e, ltrAtCursor(e))
function selectByGroup(t, i) {
  return extendSel(t, (e) => t.moveByGroup(e, i))
}
const selectGroupLeft = (e) => selectByGroup(e, !ltrAtCursor(e)),
  selectGroupRight = (e) => selectByGroup(e, ltrAtCursor(e)),
  selectSyntaxLeft = (t) =>
    extendSel(t, (e) => moveBySyntax(t.state, e, !ltrAtCursor(t))),
  selectSyntaxRight = (t) =>
    extendSel(t, (e) => moveBySyntax(t.state, e, ltrAtCursor(t)))
function selectByLine(t, i) {
  return extendSel(t, (e) => t.moveVertically(e, i))
}
const selectLineUp = (e) => selectByLine(e, !1),
  selectLineDown = (e) => selectByLine(e, !0)
function selectByPage(t, i) {
  return extendSel(t, (e) => t.moveVertically(e, i, pageHeight(t)))
}
const selectPageUp = (e) => selectByPage(e, !1),
  selectPageDown = (e) => selectByPage(e, !0),
  selectLineBoundaryForward = (t) =>
    extendSel(t, (e) => moveByLineBoundary(t, e, !0)),
  selectLineBoundaryBackward = (t) =>
    extendSel(t, (e) => moveByLineBoundary(t, e, !1)),
  selectLineStart = (t) =>
    extendSel(t, (e) => EditorSelection.cursor(t.lineBlockAt(e.head).from)),
  selectLineEnd = (t) =>
    extendSel(t, (e) => EditorSelection.cursor(t.lineBlockAt(e.head).to)),
  cursorDocStart = ({ state: e, dispatch: t }) => (
    t(setSel(e, { anchor: 0 })), !0
  ),
  cursorDocEnd = ({ state: e, dispatch: t }) => (
    t(setSel(e, { anchor: e.doc.length })), !0
  ),
  selectDocStart = ({ state: e, dispatch: t }) => (
    t(setSel(e, { anchor: e.selection.main.anchor, head: 0 })), !0
  ),
  selectDocEnd = ({ state: e, dispatch: t }) => (
    t(setSel(e, { anchor: e.selection.main.anchor, head: e.doc.length })), !0
  ),
  selectAll = ({ state: e, dispatch: t }) => (
    t(
      e.update({
        selection: { anchor: 0, head: e.doc.length },
        userEvent: 'select',
      })
    ),
    !0
  ),
  selectLine = ({ state: i, dispatch: e }) => {
    var t = selectedLineBlocks(i).map(({ from: e, to: t }) =>
      EditorSelection.range(e, Math.min(t + 1, i.doc.length))
    )
    return (
      e(
        i.update({ selection: EditorSelection.create(t), userEvent: 'select' })
      ),
      !0
    )
  },
  selectParentSyntax = ({ state: r, dispatch: e }) => {
    var t = updateSel(r.selection, (e) => {
      var t
      let i = syntaxTree(r).resolveInner(e.head, 1)
      for (
        ;
        !(
          (i.from < e.from && i.to >= e.to) ||
          (i.to > e.to && i.from <= e.from) ||
          null == (t = i.parent)
        ) && t.parent;

      )
        i = i.parent
      return EditorSelection.range(i.to, i.from)
    })
    return e(setSel(r, t)), !0
  },
  simplifySelection = ({ state: e, dispatch: t }) => {
    let i = e.selection,
      r = null
    return (
      1 < i.ranges.length
        ? (r = EditorSelection.create([i.main]))
        : i.main.empty ||
          (r = EditorSelection.create([EditorSelection.cursor(i.main.head)])),
      !!r && (t(setSel(e, r)), !0)
    )
  }
function deleteBy({ state: e, dispatch: t }, n) {
  if (e.readOnly) return !1
  let o = 'delete.selection'
  var i = e.changeByRange((e) => {
    let { from: t, to: i } = e
    var r
    return (
      t == i &&
        ((r = n(t)) < t
          ? (o = 'delete.backward')
          : r > t && (o = 'delete.forward'),
        (t = Math.min(t, r)),
        (i = Math.max(i, r))),
      t == i
        ? { range: e }
        : { changes: { from: t, to: i }, range: EditorSelection.cursor(t) }
    )
  })
  return (
    !i.changes.empty &&
    (t(e.update(i, { scrollIntoView: !0, userEvent: o })), !0)
  )
}
function skipAtomic(t, i, r) {
  if (t instanceof EditorView)
    for (var e of t.state.facet(EditorView.atomicRanges).map((e) => e(t)))
      e.between(i, i, (e, t) => {
        e < i && i < t && (i = r ? t : e)
      })
  return i
}
const deleteByChar = (s, a) =>
    deleteBy(s, (t) => {
      let e = s['state'],
        i = e.doc.lineAt(t),
        r,
        n
      if (
        !a &&
        t > i.from &&
        t < i.from + 200 &&
        !/[^ \t]/.test((r = i.text.slice(0, t - i.from)))
      ) {
        if ('\t' == r[r.length - 1]) return t - 1
        var o = countColumn(r, e.tabSize) % getIndentUnit(e) || getIndentUnit(e)
        for (let e = 0; e < o && ' ' == r[r.length - 1 - e]; e++) t--
        n = t
      } else
        (n = findClusterBreak(i.text, t - i.from, a, a) + i.from) == t &&
          i.number != (a ? e.doc.lines : 1) &&
          (n += a ? 1 : -1)
      return skipAtomic(s, n, a)
    }),
  deleteCharBackward = (e) => deleteByChar(e, !1),
  deleteCharForward = (e) => deleteByChar(e, !0),
  deleteByGroup = (e, h) =>
    deleteBy(e, (t) => {
      let i = t,
        r = e['state'],
        n = r.doc.lineAt(i),
        o = r.charCategorizer(i)
      for (let e = null; ; ) {
        if (i == (h ? n.to : n.from)) {
          i == t && n.number != (h ? r.doc.lines : 1) && (i += h ? 1 : -1)
          break
        }
        var s = findClusterBreak(n.text, i - n.from, h) + n.from,
          a = n.text.slice(Math.min(i, s) - n.from, Math.max(i, s) - n.from),
          l = o(a)
        if (null != e && l != e) break
        ;(' ' == a && i == t) || (e = l), (i = s)
      }
      return skipAtomic(e, i, h)
    }),
  deleteGroupBackward = (e) => deleteByGroup(e, !1),
  deleteGroupForward = (e) => deleteByGroup(e, !0),
  deleteToLineEnd = (i) =>
    deleteBy(i, (e) => {
      var t = i.lineBlockAt(e).to
      return skipAtomic(i, e < t ? t : Math.min(i.state.doc.length, e + 1), !0)
    }),
  deleteToLineStart = (i) =>
    deleteBy(i, (e) => {
      var t = i.lineBlockAt(e).from
      return skipAtomic(i, t < e ? t : Math.max(0, e - 1), !1)
    }),
  splitLine = ({ state: e, dispatch: t }) => {
    if (e.readOnly) return !1
    var i = e.changeByRange((e) => ({
      changes: { from: e.from, to: e.to, insert: Text.of(['', '']) },
      range: EditorSelection.cursor(e.from),
    }))
    return t(e.update(i, { scrollIntoView: !0, userEvent: 'input' })), !0
  },
  transposeChars = ({ state: r, dispatch: e }) => {
    if (r.readOnly) return !1
    var t = r.changeByRange((e) => {
      if (!e.empty || 0 == e.from || e.from == r.doc.length) return { range: e }
      var e = e.from,
        t = r.doc.lineAt(e),
        i =
          e == t.from
            ? e - 1
            : findClusterBreak(t.text, e - t.from, !1) + t.from,
        t =
          e == t.to ? e + 1 : findClusterBreak(t.text, e - t.from, !0) + t.from
      return {
        changes: {
          from: i,
          to: t,
          insert: r.doc.slice(e, t).append(r.doc.slice(i, e)),
        },
        range: EditorSelection.cursor(t),
      }
    })
    return (
      !t.changes.empty &&
      (e(r.update(t, { scrollIntoView: !0, userEvent: 'move.character' })), !0)
    )
  }
function selectedLineBlocks(i) {
  let r = [],
    n = -1
  for (var o of i.selection.ranges) {
    let e = i.doc.lineAt(o.from),
      t = i.doc.lineAt(o.to)
    if (
      (o.empty || o.to != t.from || (t = i.doc.lineAt(o.to - 1)), n >= e.number)
    ) {
      let e = r[r.length - 1]
      ;(e.to = t.to), e.ranges.push(o)
    } else r.push({ from: e.from, to: t.to, ranges: [o] })
    n = t.number + 1
  }
  return r
}
function moveLine(e, t, i) {
  if (e.readOnly) return !1
  let r = [],
    n = []
  for (var o of selectedLineBlocks(e))
    if (i ? o.to != e.doc.length : 0 != o.from) {
      var s = e.doc.lineAt(i ? o.to + 1 : o.from - 1),
        a = s.length + 1
      if (i) {
        r.push(
          { from: o.to, to: s.to },
          { from: o.from, insert: s.text + e.lineBreak }
        )
        for (var l of o.ranges)
          n.push(
            EditorSelection.range(
              Math.min(e.doc.length, l.anchor + a),
              Math.min(e.doc.length, l.head + a)
            )
          )
      } else {
        r.push(
          { from: s.from, to: o.from },
          { from: o.to, insert: e.lineBreak + s.text }
        )
        for (var h of o.ranges)
          n.push(EditorSelection.range(h.anchor - a, h.head - a))
      }
    }
  return (
    !!r.length &&
    (t(
      e.update({
        changes: r,
        scrollIntoView: !0,
        selection: EditorSelection.create(n, e.selection.mainIndex),
        userEvent: 'move.line',
      })
    ),
    !0)
  )
}
const moveLineUp = ({ state: e, dispatch: t }) => moveLine(e, t, !1),
  moveLineDown = ({ state: e, dispatch: t }) => moveLine(e, t, !0)
function copyLine(e, t, i) {
  if (e.readOnly) return !1
  let r = []
  for (var n of selectedLineBlocks(e))
    i
      ? r.push({
          from: n.from,
          insert: e.doc.slice(n.from, n.to) + e.lineBreak,
        })
      : r.push({ from: n.to, insert: e.lineBreak + e.doc.slice(n.from, n.to) })
  return (
    t(
      e.update({ changes: r, scrollIntoView: !0, userEvent: 'input.copyline' })
    ),
    !0
  )
}
const copyLineUp = ({ state: e, dispatch: t }) => copyLine(e, t, !1),
  copyLineDown = ({ state: e, dispatch: t }) => copyLine(e, t, !0),
  deleteLine = (t) => {
    if (t.state.readOnly) return !1
    let i = t['state'],
      e = i.changes(
        selectedLineBlocks(i).map(
          ({ from: e, to: t }) => (
            0 < e ? e-- : t < i.doc.length && t++, { from: e, to: t }
          )
        )
      )
    var r = updateSel(i.selection, (e) => t.moveVertically(e, !0)).map(e)
    return (
      t.dispatch({
        changes: e,
        selection: r,
        scrollIntoView: !0,
        userEvent: 'delete.line',
      }),
      !0
    )
  }
function isBetweenBrackets(e, t) {
  if (/\(\)|\[\]|\{\}/.test(e.sliceDoc(t - 1, t + 1))) return { from: t, to: t }
  let i = syntaxTree(e).resolveInner(t),
    r = i.childBefore(t),
    n = i.childAfter(t),
    o
  return r &&
    n &&
    r.to <= t &&
    n.from >= t &&
    (o = r.type.prop(NodeProp.closedBy)) &&
    -1 < o.indexOf(n.name) &&
    e.doc.lineAt(r.to).from == e.doc.lineAt(n.from).from
    ? { from: r.to, to: n.from }
    : null
}
const insertNewlineAndIndent = newlineAndIndent(!1),
  insertBlankLine = newlineAndIndent(!0)
function newlineAndIndent(l) {
  return ({ state: a, dispatch: e }) => {
    if (a.readOnly) return !1
    var t = a.changeByRange((e) => {
      let { from: t, to: i } = e,
        r = a.doc.lineAt(t)
      e = !l && t == i && isBetweenBrackets(a, t)
      l && (t = i = (i <= r.to ? r : a.doc.lineAt(i)).to)
      let n = new IndentContext(a, {
          simulateBreak: t,
          simulateDoubleBreak: !!e,
        }),
        o = getIndentation(n, t)
      for (
        null == o && (o = /^\s*/.exec(a.doc.lineAt(t).text)[0].length);
        i < r.to && /\s/.test(r.text[i - r.from]);

      )
        i++
      e
        ? ({ from: t, to: i } = e)
        : t > r.from &&
          t < r.from + 100 &&
          !/\S/.test(r.text.slice(0, t)) &&
          (t = r.from)
      let s = ['', indentString(a, o)]
      return (
        e && s.push(indentString(a, n.lineIndent(r.from, -1))),
        {
          changes: { from: t, to: i, insert: Text.of(s) },
          range: EditorSelection.cursor(t + 1 + s[1].length),
        }
      )
    })
    return e(a.update(t, { scrollIntoView: !0, userEvent: 'input' })), !0
  }
}
function changeBySelectedLine(n, o) {
  let s = -1
  return n.changeByRange((t) => {
    var i = []
    for (let e = t.from; e <= t.to; ) {
      var r = n.doc.lineAt(e)
      r.number > s &&
        (t.empty || t.to > r.from) &&
        (o(r, i, t), (s = r.number)),
        (e = r.to + 1)
    }
    let e = n.changes(i)
    return {
      changes: i,
      range: EditorSelection.range(e.mapPos(t.anchor, 1), e.mapPos(t.head, 1)),
    }
  })
}
const indentSelection = ({ state: s, dispatch: e }) => {
    if (s.readOnly) return !1
    let a = Object.create(null),
      l = new IndentContext(s, {
        overrideIndentation: (e) => {
          e = a[e]
          return null == e ? -1 : e
        },
      })
    var t = changeBySelectedLine(s, (e, t, i) => {
      let r = getIndentation(l, e.from)
      var n, o
      null != r &&
        (/\S/.test(e.text) || (r = 0),
        ((n = /^\s*/.exec(e.text)[0]) != (o = indentString(s, r)) ||
          i.from < e.from + n.length) &&
          ((a[e.from] = r),
          t.push({ from: e.from, to: e.from + n.length, insert: o })))
    })
    return t.changes.empty || e(s.update(t, { userEvent: 'indent' })), !0
  },
  indentMore = ({ state: i, dispatch: e }) =>
    !i.readOnly &&
    (e(
      i.update(
        changeBySelectedLine(i, (e, t) => {
          t.push({ from: e.from, insert: i.facet(indentUnit) })
        }),
        { userEvent: 'input.indent' }
      )
    ),
    !0),
  indentLess = ({ state: s, dispatch: e }) =>
    !s.readOnly &&
    (e(
      s.update(
        changeBySelectedLine(s, (r, n) => {
          let o = /^\s*/.exec(r.text)[0]
          if (o) {
            let e = countColumn(o, s.tabSize),
              t = 0,
              i = indentString(s, Math.max(0, e - getIndentUnit(s)))
            for (
              ;
              t < o.length &&
              t < i.length &&
              o.charCodeAt(t) == i.charCodeAt(t);

            )
              t++
            n.push({
              from: r.from + t,
              to: r.from + o.length,
              insert: i.slice(t),
            })
          }
        }),
        { userEvent: 'delete.dedent' }
      )
    ),
    !0),
  emacsStyleKeymap = [
    {
      key: 'Ctrl-b',
      run: cursorCharLeft,
      shift: selectCharLeft,
      preventDefault: !0,
    },
    { key: 'Ctrl-f', run: cursorCharRight, shift: selectCharRight },
    { key: 'Ctrl-p', run: cursorLineUp, shift: selectLineUp },
    { key: 'Ctrl-n', run: cursorLineDown, shift: selectLineDown },
    { key: 'Ctrl-a', run: cursorLineStart, shift: selectLineStart },
    { key: 'Ctrl-e', run: cursorLineEnd, shift: selectLineEnd },
    { key: 'Ctrl-d', run: deleteCharForward },
    { key: 'Ctrl-h', run: deleteCharBackward },
    { key: 'Ctrl-k', run: deleteToLineEnd },
    { key: 'Ctrl-Alt-h', run: deleteGroupBackward },
    { key: 'Ctrl-o', run: splitLine },
    { key: 'Ctrl-t', run: transposeChars },
    { key: 'Ctrl-v', run: cursorPageDown },
  ],
  standardKeymap = [
    {
      key: 'ArrowLeft',
      run: cursorCharLeft,
      shift: selectCharLeft,
      preventDefault: !0,
    },
    {
      key: 'Mod-ArrowLeft',
      mac: 'Alt-ArrowLeft',
      run: cursorGroupLeft,
      shift: selectGroupLeft,
    },
    {
      mac: 'Cmd-ArrowLeft',
      run: cursorLineBoundaryBackward,
      shift: selectLineBoundaryBackward,
    },
    {
      key: 'ArrowRight',
      run: cursorCharRight,
      shift: selectCharRight,
      preventDefault: !0,
    },
    {
      key: 'Mod-ArrowRight',
      mac: 'Alt-ArrowRight',
      run: cursorGroupRight,
      shift: selectGroupRight,
    },
    {
      mac: 'Cmd-ArrowRight',
      run: cursorLineBoundaryForward,
      shift: selectLineBoundaryForward,
    },
    {
      key: 'ArrowUp',
      run: cursorLineUp,
      shift: selectLineUp,
      preventDefault: !0,
    },
    { mac: 'Cmd-ArrowUp', run: cursorDocStart, shift: selectDocStart },
    { mac: 'Ctrl-ArrowUp', run: cursorPageUp, shift: selectPageUp },
    {
      key: 'ArrowDown',
      run: cursorLineDown,
      shift: selectLineDown,
      preventDefault: !0,
    },
    { mac: 'Cmd-ArrowDown', run: cursorDocEnd, shift: selectDocEnd },
    { mac: 'Ctrl-ArrowDown', run: cursorPageDown, shift: selectPageDown },
    { key: 'PageUp', run: cursorPageUp, shift: selectPageUp },
    { key: 'PageDown', run: cursorPageDown, shift: selectPageDown },
    {
      key: 'Home',
      run: cursorLineBoundaryBackward,
      shift: selectLineBoundaryBackward,
      preventDefault: !0,
    },
    { key: 'Mod-Home', run: cursorDocStart, shift: selectDocStart },
    {
      key: 'End',
      run: cursorLineBoundaryForward,
      shift: selectLineBoundaryForward,
      preventDefault: !0,
    },
    { key: 'Mod-End', run: cursorDocEnd, shift: selectDocEnd },
    { key: 'Enter', run: insertNewlineAndIndent },
    { key: 'Mod-a', run: selectAll },
    { key: 'Backspace', run: deleteCharBackward, shift: deleteCharBackward },
    { key: 'Delete', run: deleteCharForward },
    { key: 'Mod-Backspace', mac: 'Alt-Backspace', run: deleteGroupBackward },
    { key: 'Mod-Delete', mac: 'Alt-Delete', run: deleteGroupForward },
    { mac: 'Mod-Backspace', run: deleteToLineStart },
    { mac: 'Mod-Delete', run: deleteToLineEnd },
  ].concat(
    emacsStyleKeymap.map((e) => ({ mac: e.key, run: e.run, shift: e.shift }))
  ),
  defaultKeymap = [
    {
      key: 'Alt-ArrowLeft',
      mac: 'Ctrl-ArrowLeft',
      run: cursorSyntaxLeft,
      shift: selectSyntaxLeft,
    },
    {
      key: 'Alt-ArrowRight',
      mac: 'Ctrl-ArrowRight',
      run: cursorSyntaxRight,
      shift: selectSyntaxRight,
    },
    { key: 'Alt-ArrowUp', run: moveLineUp },
    { key: 'Shift-Alt-ArrowUp', run: copyLineUp },
    { key: 'Alt-ArrowDown', run: moveLineDown },
    { key: 'Shift-Alt-ArrowDown', run: copyLineDown },
    { key: 'Escape', run: simplifySelection },
    { key: 'Mod-Enter', run: insertBlankLine },
    { key: 'Alt-l', mac: 'Ctrl-l', run: selectLine },
    { key: 'Mod-i', run: selectParentSyntax, preventDefault: !0 },
    { key: 'Mod-[', run: indentLess },
    { key: 'Mod-]', run: indentMore },
    { key: 'Mod-Alt-\\', run: indentSelection },
    { key: 'Shift-Mod-k', run: deleteLine },
    { key: 'Shift-Mod-\\', run: cursorMatchingBracket },
    { key: 'Mod-/', run: toggleComment },
    { key: 'Alt-A', run: toggleBlockComment },
  ].concat(standardKeymap),
  indentWithTab = { key: 'Tab', run: indentMore, shift: indentLess }
function crelt() {
  var e,
    t = arguments[0],
    i = ('string' == typeof t && (t = document.createElement(t)), 1),
    r = arguments[1]
  if (r && 'object' == typeof r && null == r.nodeType && !Array.isArray(r)) {
    for (var n in r)
      Object.prototype.hasOwnProperty.call(r, n) &&
        ('string' == typeof (e = r[n])
          ? t.setAttribute(n, e)
          : null != e && (t[n] = e))
    i++
  }
  for (; i < arguments.length; i++) add(t, arguments[i])
  return t
}
function add(e, t) {
  if ('string' == typeof t) e.appendChild(document.createTextNode(t))
  else if (null != t)
    if (null != t.nodeType) e.appendChild(t)
    else {
      if (!Array.isArray(t))
        throw new RangeError('Unsupported child node: ' + t)
      for (var i = 0; i < t.length; i++) add(e, t[i])
    }
}
const basicNormalize =
  'function' == typeof String.prototype.normalize
    ? (e) => e.normalize('NFKD')
    : (e) => e
class SearchCursor {
  constructor(e, t, i = 0, r = e.length, n) {
    ;(this.value = { from: 0, to: 0 }),
      (this.done = !1),
      (this.matches = []),
      (this.buffer = ''),
      (this.bufferPos = 0),
      (this.iter = e.iterRange(i, r)),
      (this.bufferStart = i),
      (this.normalize = n ? (e) => n(basicNormalize(e)) : basicNormalize),
      (this.query = this.normalize(t))
  }
  peek() {
    if (this.bufferPos == this.buffer.length) {
      if (
        ((this.bufferStart += this.buffer.length),
        this.iter.next(),
        this.iter.done)
      )
        return -1
      ;(this.bufferPos = 0), (this.buffer = this.iter.value)
    }
    return codePointAt(this.buffer, this.bufferPos)
  }
  next() {
    for (; this.matches.length; ) this.matches.pop()
    return this.nextOverlapping()
  }
  nextOverlapping() {
    for (;;) {
      var e = this.peek()
      if (e < 0) return (this.done = !0), this
      let i = fromCodePoint(e),
        r = this.bufferStart + this.bufferPos,
        n = ((this.bufferPos += codePointSize(e)), this.normalize(i))
      for (let e = 0, t = r; ; e++) {
        var o = n.charCodeAt(e),
          s = this.match(o, t)
        if (s) return (this.value = s), this
        if (e == n.length - 1) break
        t == r && e < i.length && i.charCodeAt(e) == o && t++
      }
    }
  }
  match(r, n) {
    let o = null
    for (let i = 0; i < this.matches.length; i += 2) {
      let e = this.matches[i],
        t = !1
      this.query.charCodeAt(e) == r &&
        (e == this.query.length - 1
          ? (o = { from: this.matches[i + 1], to: n + 1 })
          : (this.matches[i]++, (t = !0))),
        t || (this.matches.splice(i, 2), (i -= 2))
    }
    return (
      this.query.charCodeAt(0) == r &&
        (1 == this.query.length
          ? (o = { from: n, to: n + 1 })
          : this.matches.push(1, n)),
      o
    )
  }
}
'undefined' != typeof Symbol &&
  (SearchCursor.prototype[Symbol.iterator] = function () {
    return this
  })
const empty = { from: -1, to: -1, match: /.*/.exec('') },
  baseFlags = 'gm' + (null == /x/.unicode ? '' : 'u')
class RegExpCursor {
  constructor(e, t, i, r = 0, n = e.length) {
    if (
      ((this.to = n),
      (this.curLine = ''),
      (this.done = !1),
      (this.value = empty),
      /\\[sWDnr]|\n|\r|\[\^/.test(t))
    )
      return new MultilineRegExpCursor(e, t, i, r, n)
    ;(this.re = new RegExp(
      t,
      baseFlags + (null != i && i.ignoreCase ? 'i' : '')
    )),
      (this.iter = e.iter())
    n = e.lineAt(r)
    ;(this.curLineStart = n.from),
      (this.matchPos = r),
      this.getLine(this.curLineStart)
  }
  getLine(e) {
    this.iter.next(e),
      this.iter.lineBreak
        ? (this.curLine = '')
        : ((this.curLine = this.iter.value),
          this.curLineStart + this.curLine.length > this.to &&
            (this.curLine = this.curLine.slice(0, this.to - this.curLineStart)),
          this.iter.next())
  }
  nextLine() {
    ;(this.curLineStart = this.curLineStart + this.curLine.length + 1),
      this.curLineStart > this.to ? (this.curLine = '') : this.getLine(0)
  }
  next() {
    for (let e = this.matchPos - this.curLineStart; ; ) {
      this.re.lastIndex = e
      var t = this.matchPos <= this.to && this.re.exec(this.curLine)
      if (t) {
        var i = this.curLineStart + t.index,
          r = i + t[0].length
        if (
          ((this.matchPos = r + (i == r ? 1 : 0)),
          i == this.curLine.length && this.nextLine(),
          i < r || i > this.value.to)
        )
          return (this.value = { from: i, to: r, match: t }), this
        e = this.matchPos - this.curLineStart
      } else {
        if (!(this.curLineStart + this.curLine.length < this.to))
          return (this.done = !0), this
        this.nextLine(), (e = 0)
      }
    }
  }
}
const flattened = new WeakMap()
class FlattenedDoc {
  constructor(e, t) {
    ;(this.from = e), (this.text = t)
  }
  get to() {
    return this.from + this.text.length
  }
  static get(e, t, i) {
    var r,
      n = flattened.get(e)
    if (!n || n.from >= i || n.to <= t)
      return (
        (r = new FlattenedDoc(t, e.sliceString(t, i))), flattened.set(e, r), r
      )
    if (n.from == t && n.to == i) return n
    let { text: o, from: s } = n
    return (
      s > t && ((o = e.sliceString(t, s) + o), (s = t)),
      n.to < i && (o += e.sliceString(n.to, i)),
      flattened.set(e, new FlattenedDoc(s, o)),
      new FlattenedDoc(t, o.slice(t - s, i - s))
    )
  }
}
class MultilineRegExpCursor {
  constructor(e, t, i, r, n) {
    ;(this.text = e),
      (this.to = n),
      (this.done = !1),
      (this.value = empty),
      (this.matchPos = r),
      (this.re = new RegExp(
        t,
        baseFlags + (null != i && i.ignoreCase ? 'i' : '')
      )),
      (this.flat = FlattenedDoc.get(e, r, this.chunkEnd(r + 5e3)))
  }
  chunkEnd(e) {
    return (e >= this.to ? this : this.text.lineAt(e)).to
  }
  next() {
    for (;;) {
      var t,
        i = (this.re.lastIndex = this.matchPos - this.flat.from)
      let e = this.re.exec(this.flat.text)
      if (
        (e &&
          !e[0] &&
          e.index == i &&
          ((this.re.lastIndex = 1 + i), (e = this.re.exec(this.flat.text))),
        (e =
          e &&
          this.flat.to < this.to &&
          e.index + e[0].length > this.flat.text.length - 10
            ? null
            : e))
      )
        return (
          (t = (i = this.flat.from + e.index) + e[0].length),
          (this.value = { from: i, to: t, match: e }),
          (this.matchPos = t + (i == t ? 1 : 0)),
          this
        )
      if (this.flat.to == this.to) return (this.done = !0), this
      this.flat = FlattenedDoc.get(
        this.text,
        this.flat.from,
        this.chunkEnd(this.flat.from + 2 * this.flat.text.length)
      )
    }
  }
}
function validRegExp(e) {
  try {
    return new RegExp(e, baseFlags), !0
  } catch (e) {
    return !1
  }
}
function createLineDialog(h) {
  let e = crelt('input', { class: 'cm-textfield', name: 'line' })
  function t() {
    var a = /^([+-])?(\d+)?(:\d+)?(%)?$/.exec(e.value)
    if (a) {
      let t = h['state'],
        i = t.doc.lineAt(t.selection.main.head),
        [, r, e, n, o] = a
      a = n ? +n.slice(1) : 0
      let s = e ? +e : i.number
      if (e && o) {
        let e = s / 100
        r && (e = e * ('-' == r ? -1 : 1) + i.number / t.doc.lines),
          (s = Math.round(t.doc.lines * e))
      } else e && r && (s = s * ('-' == r ? -1 : 1) + i.number)
      var l = t.doc.line(Math.max(1, Math.min(t.doc.lines, s)))
      h.dispatch({
        effects: dialogEffect.of(!1),
        selection: EditorSelection.cursor(
          l.from + Math.max(0, Math.min(a, l.length))
        ),
        scrollIntoView: !0,
      }),
        h.focus()
    }
  }
  return {
    dom: crelt(
      'form',
      {
        class: 'cm-gotoLine',
        onkeydown: (e) => {
          27 == e.keyCode
            ? (e.preventDefault(),
              h.dispatch({ effects: dialogEffect.of(!1) }),
              h.focus())
            : 13 == e.keyCode && (e.preventDefault(), t())
        },
        onsubmit: (e) => {
          e.preventDefault(), t()
        },
      },
      crelt('label', h.state.phrase('Go to line'), ': ', e),
      ' ',
      crelt(
        'button',
        { class: 'cm-button', type: 'submit' },
        h.state.phrase('go')
      )
    ),
  }
}
'undefined' != typeof Symbol &&
  (RegExpCursor.prototype[Symbol.iterator] = MultilineRegExpCursor.prototype[
    Symbol.iterator
  ] =
    function () {
      return this
    })
const dialogEffect = StateEffect.define(),
  dialogField = StateField.define({
    create() {
      return !0
    },
    update(e, t) {
      for (var i of t.effects) i.is(dialogEffect) && (e = i.value)
      return e
    },
    provide: (e) => showPanel.from(e, (e) => (e ? createLineDialog : null)),
  }),
  gotoLine = (t) => {
    let i = getPanel(t, createLineDialog)
    if (!i) {
      let e = [dialogEffect.of(!0)]
      null == t.state.field(dialogField, !1) &&
        e.push(StateEffect.appendConfig.of([dialogField, baseTheme$1])),
        t.dispatch({ effects: e }),
        (i = getPanel(t, createLineDialog))
    }
    return i && i.dom.querySelector('input').focus(), !0
  },
  baseTheme$1 = EditorView.baseTheme({
    '.cm-panel.cm-gotoLine': {
      padding: '2px 6px 4px',
      '& label': { fontSize: '80%' },
    },
  }),
  selectWord = ({ state: t, dispatch: e }) => {
    let i = t['selection'],
      r = EditorSelection.create(
        i.ranges.map((e) => t.wordAt(e.head) || EditorSelection.cursor(e.head)),
        i.mainIndex
      )
    return !r.eq(i) && (e(t.update({ selection: r })), !0)
  }
function findNextOccurrence(i, r) {
  let { main: e, ranges: n } = i.selection
  var t = i.wordAt(e.head),
    o = t && t.from == e.from && t.to == e.to
  for (let e = !1, t = new SearchCursor(i.doc, r, n[n.length - 1].to); ; )
    if ((t.next(), t.done)) {
      if (e) return null
      ;(t = new SearchCursor(
        i.doc,
        r,
        0,
        Math.max(0, n[n.length - 1].from - 1)
      )),
        (e = !0)
    } else if (!e || !n.some((e) => e.from == t.value.from)) {
      if (o) {
        var s = i.wordAt(t.value.from)
        if (!s || s.from != t.value.from || s.to != t.value.to) continue
      }
      return t.value
    }
}
const selectNextOccurrence = ({ state: t, dispatch: e }) => {
    let i = t.selection['ranges']
    if (i.some((e) => e.from === e.to))
      return selectWord({ state: t, dispatch: e })
    let r = t.sliceDoc(i[0].from, i[0].to)
    if (t.selection.ranges.some((e) => t.sliceDoc(e.from, e.to) != r)) return !1
    var n = findNextOccurrence(t, r)
    return (
      !!n &&
      (e(
        t.update({
          selection: t.selection.addRange(
            EditorSelection.range(n.from, n.to),
            !1
          ),
          effects: EditorView.scrollIntoView(n.to),
        })
      ),
      !0)
    )
  },
  searchConfigFacet = Facet.define({
    combine(e) {
      return {
        top: e.reduce((e, t) => (null != e ? e : t.top), void 0) || !1,
        caseSensitive:
          e.reduce((e, t) => (null != e ? e : t.caseSensitive), void 0) || !1,
        createPanel:
          (null == (e = e.find((e) => e.createPanel))
            ? void 0
            : e.createPanel) || ((e) => new SearchPanel(e)),
      }
    },
  })
function search(e) {
  return e ? [searchConfigFacet.of(e), searchExtensions] : searchExtensions
}
class SearchQuery {
  constructor(e) {
    ;(this.search = e.search),
      (this.caseSensitive = !!e.caseSensitive),
      (this.regexp = !!e.regexp),
      (this.replace = e.replace || ''),
      (this.valid =
        !!this.search && (!this.regexp || validRegExp(this.search))),
      (this.unquoted = e.literal
        ? this.search
        : this.search.replace(/\\([nrt\\])/g, (e, t) =>
            'n' == t ? '\n' : 'r' == t ? '\r' : 't' == t ? '\t' : '\\'
          ))
  }
  eq(e) {
    return (
      this.search == e.search &&
      this.replace == e.replace &&
      this.caseSensitive == e.caseSensitive &&
      this.regexp == e.regexp
    )
  }
  create() {
    return new (this.regexp ? RegExpQuery : StringQuery)(this)
  }
  getCursor(e, t = 0, i = e.length) {
    return (this.regexp ? regexpCursor : stringCursor)(this, e, t, i)
  }
}
class QueryType {
  constructor(e) {
    this.spec = e
  }
}
function stringCursor(e, t, i, r) {
  return new SearchCursor(
    t,
    e.unquoted,
    i,
    r,
    e.caseSensitive ? void 0 : (e) => e.toLowerCase()
  )
}
class StringQuery extends QueryType {
  constructor(e) {
    super(e)
  }
  nextMatch(e, t, i) {
    let r = stringCursor(this.spec, e, i, e.length).nextOverlapping()
    return (r = r.done ? stringCursor(this.spec, e, 0, t).nextOverlapping() : r)
      .done
      ? null
      : r.value
  }
  prevMatchInRange(r, n, e) {
    for (let i = e; ; ) {
      var o = Math.max(n, i - 1e4 - this.spec.unquoted.length)
      let e = stringCursor(this.spec, r, o, i),
        t = null
      for (; !e.nextOverlapping().done; ) t = e.value
      if (t) return t
      if (o == n) return null
      i -= 1e4
    }
  }
  prevMatch(e, t, i) {
    return (
      this.prevMatchInRange(e, 0, t) || this.prevMatchInRange(e, i, e.length)
    )
  }
  getReplacement(e) {
    return this.spec.replace
  }
  matchAll(e, t) {
    let i = stringCursor(this.spec, e, 0, e.length),
      r = []
    for (; !i.next().done; ) {
      if (r.length >= t) return null
      r.push(i.value)
    }
    return r
  }
  highlight(e, t, i, r) {
    let n = stringCursor(
      this.spec,
      e,
      Math.max(0, t - this.spec.unquoted.length),
      Math.min(i + this.spec.unquoted.length, e.length)
    )
    for (; !n.next().done; ) r(n.value.from, n.value.to)
  }
}
function regexpCursor(e, t, i, r) {
  return new RegExpCursor(
    t,
    e.search,
    e.caseSensitive ? void 0 : { ignoreCase: !0 },
    i,
    r
  )
}
class RegExpQuery extends QueryType {
  nextMatch(e, t, i) {
    let r = regexpCursor(this.spec, e, i, e.length).next()
    return (r = r.done ? regexpCursor(this.spec, e, 0, t).next() : r).done
      ? null
      : r.value
  }
  prevMatchInRange(r, n, o) {
    for (let i = 1; ; i++) {
      var s = Math.max(n, o - 1e4 * i)
      let e = regexpCursor(this.spec, r, s, o),
        t = null
      for (; !e.next().done; ) t = e.value
      if (t && (s == n || t.from > s + 10)) return t
      if (s == n) return null
    }
  }
  prevMatch(e, t, i) {
    return (
      this.prevMatchInRange(e, 0, t) || this.prevMatchInRange(e, i, e.length)
    )
  }
  getReplacement(i) {
    return this.spec.replace.replace(/\$([$&\d+])/g, (e, t) =>
      '$' == t
        ? '$'
        : '&' == t
        ? i.match[0]
        : '0' != t && +t < i.match.length
        ? i.match[t]
        : e
    )
  }
  matchAll(e, t) {
    let i = regexpCursor(this.spec, e, 0, e.length),
      r = []
    for (; !i.next().done; ) {
      if (r.length >= t) return null
      r.push(i.value)
    }
    return r
  }
  highlight(e, t, i, r) {
    let n = regexpCursor(
      this.spec,
      e,
      Math.max(0, t - 250),
      Math.min(i + 250, e.length)
    )
    for (; !n.next().done; ) r(n.value.from, n.value.to)
  }
}
const setSearchQuery = StateEffect.define(),
  togglePanel = StateEffect.define(),
  searchState = StateField.define({
    create(e) {
      return new SearchState(defaultQuery(e).create(), null)
    },
    update(e, t) {
      for (var i of t.effects)
        i.is(setSearchQuery)
          ? (e = new SearchState(i.value.create(), e.panel))
          : i.is(togglePanel) &&
            (e = new SearchState(e.query, i.value ? createSearchPanel : null))
      return e
    },
    provide: (e) => showPanel.from(e, (e) => e.panel),
  })
class SearchState {
  constructor(e, t) {
    ;(this.query = e), (this.panel = t)
  }
}
const matchMark = Decoration.mark({ class: 'cm-searchMatch' }),
  selectedMatchMark = Decoration.mark({
    class: 'cm-searchMatch cm-searchMatch-selected',
  }),
  searchHighlighter = ViewPlugin.fromClass(
    class {
      constructor(e) {
        ;(this.view = e),
          (this.decorations = this.highlight(e.state.field(searchState)))
      }
      update(e) {
        var t = e.state.field(searchState)
        ;(t != e.startState.field(searchState) ||
          e.docChanged ||
          e.selectionSet ||
          e.viewportChanged) &&
          (this.decorations = this.highlight(t))
      }
      highlight({ query: o, panel: e }) {
        if (!e || !o.spec.valid) return Decoration.none
        let s = this['view'],
          a = new RangeSetBuilder()
        for (let i = 0, r = s.visibleRanges, n = r.length; i < n; i++) {
          let { from: e, to: t } = r[i]
          for (; i < n - 1 && t > r[i + 1].from - 500; ) t = r[++i].to
          o.highlight(s.state.doc, e, t, (t, i) => {
            var e = s.state.selection.ranges.some(
              (e) => e.from == t && e.to == i
            )
            a.add(t, i, e ? selectedMatchMark : matchMark)
          })
        }
        return a.finish()
      }
    },
    { decorations: (e) => e.decorations }
  )
function searchCommand(i) {
  return (e) => {
    var t = e.state.field(searchState, !1)
    return t && t.query.spec.valid ? i(e, t) : openSearchPanel(e)
  }
}
const findNext = searchCommand((e, { query: t }) => {
    var { from: i, to: r } = e.state.selection.main,
      t = t.nextMatch(e.state.doc, i, r)
    return (
      !(!t || (t.from == i && t.to == r)) &&
      (e.dispatch({
        selection: { anchor: t.from, head: t.to },
        scrollIntoView: !0,
        effects: announceMatch(e, t),
        userEvent: 'select.search',
      }),
      !0)
    )
  }),
  findPrevious = searchCommand((e, { query: t }) => {
    var i = e['state'],
      { from: r, to: n } = i.selection.main,
      t = t.prevMatch(i.doc, r, n)
    return (
      !!t &&
      (e.dispatch({
        selection: { anchor: t.from, head: t.to },
        scrollIntoView: !0,
        effects: announceMatch(e, t),
        userEvent: 'select.search',
      }),
      !0)
    )
  }),
  selectMatches = searchCommand((e, { query: t }) => {
    let i = t.matchAll(e.state.doc, 1e3)
    return (
      !(!i || !i.length) &&
      (e.dispatch({
        selection: EditorSelection.create(
          i.map((e) => EditorSelection.range(e.from, e.to))
        ),
        userEvent: 'select.search.matches',
      }),
      !0)
    )
  }),
  selectSelectionMatches = ({ state: t, dispatch: e }) => {
    var i = t.selection
    if (1 < i.ranges.length || i.main.empty) return !1
    var { from: r, to: i } = i.main
    let n = [],
      o = 0
    for (let e = new SearchCursor(t.doc, t.sliceDoc(r, i)); !e.next().done; ) {
      if (1e3 < n.length) return !1
      e.value.from == r && (o = n.length),
        n.push(EditorSelection.range(e.value.from, e.value.to))
    }
    return (
      e(
        t.update({
          selection: EditorSelection.create(n, o),
          userEvent: 'select.search.matches',
        })
      ),
      !0
    )
  },
  replaceNext = searchCommand((e, { query: t }) => {
    let i = e['state'],
      { from: r, to: n } = i.selection.main
    if (i.readOnly) return !1
    let o = t.nextMatch(i.doc, r, r)
    if (!o) return !1
    let s = [],
      a,
      l,
      h = []
    return (
      o.from == r &&
        o.to == n &&
        ((l = i.toText(t.getReplacement(o))),
        s.push({ from: o.from, to: o.to, insert: l }),
        (o = t.nextMatch(i.doc, o.from, o.to)),
        h.push(
          EditorView.announce.of(
            i.phrase('replaced match on line $', i.doc.lineAt(r).number) + '.'
          )
        )),
      o &&
        ((t =
          0 == s.length || s[0].from >= o.to ? 0 : o.to - o.from - l.length),
        (a = { anchor: o.from - t, head: o.to - t }),
        h.push(announceMatch(e, o))),
      e.dispatch({
        changes: s,
        selection: a,
        scrollIntoView: !!a,
        effects: h,
        userEvent: 'input.replace',
      }),
      !0
    )
  }),
  replaceAll = searchCommand((e, { query: r }) => {
    if (e.state.readOnly) return !1
    var t = r.matchAll(e.state.doc, 1e9).map((e) => {
      var { from: t, to: i } = e
      return { from: t, to: i, insert: r.getReplacement(e) }
    })
    if (!t.length) return !1
    var i = e.state.phrase('replaced $ matches', t.length) + '.'
    return (
      e.dispatch({
        changes: t,
        effects: EditorView.announce.of(i),
        userEvent: 'input.replace.all',
      }),
      !0
    )
  })
function createSearchPanel(e) {
  return e.state.facet(searchConfigFacet).createPanel(e)
}
function defaultQuery(e, t) {
  var i = e.selection.main
  let r = i.empty || i.to > i.from + 100 ? '' : e.sliceDoc(i.from, i.to)
  i =
    null != (i = null == t ? void 0 : t.caseSensitive)
      ? i
      : e.facet(searchConfigFacet).caseSensitive
  return t && !r
    ? t
    : new SearchQuery({ search: r.replace(/\n/g, '\\n'), caseSensitive: i })
}
const openSearchPanel = (i) => {
    var r,
      n = i.state.field(searchState, !1)
    if (n && n.panel) {
      let e = getPanel(i, createSearchPanel)
      if (!e) return !1
      let t = e.dom.querySelector('[main-field]')
      t &&
        t != i.root.activeElement &&
        ((r = defaultQuery(i.state, n.query.spec)).valid &&
          i.dispatch({ effects: setSearchQuery.of(r) }),
        t.focus(),
        t.select())
    } else
      i.dispatch({
        effects: [
          togglePanel.of(!0),
          n
            ? setSearchQuery.of(defaultQuery(i.state, n.query.spec))
            : StateEffect.appendConfig.of(searchExtensions),
        ],
      })
    return !0
  },
  closeSearchPanel = (e) => {
    var t = e.state.field(searchState, !1)
    if (!t || !t.panel) return !1
    let i = getPanel(e, createSearchPanel)
    return (
      i && i.dom.contains(e.root.activeElement) && e.focus(),
      e.dispatch({ effects: togglePanel.of(!1) }),
      !0
    )
  },
  searchKeymap = [
    { key: 'Mod-f', run: openSearchPanel, scope: 'editor search-panel' },
    {
      key: 'F3',
      run: findNext,
      shift: findPrevious,
      scope: 'editor search-panel',
      preventDefault: !0,
    },
    {
      key: 'Mod-g',
      run: findNext,
      shift: findPrevious,
      scope: 'editor search-panel',
      preventDefault: !0,
    },
    { key: 'Escape', run: closeSearchPanel, scope: 'editor search-panel' },
    { key: 'Mod-Shift-l', run: selectSelectionMatches },
    { key: 'Alt-g', run: gotoLine },
    { key: 'Mod-d', run: selectNextOccurrence, preventDefault: !0 },
  ]
class SearchPanel {
  constructor(e) {
    this.view = e
    var t = (this.query = e.state.field(searchState).query.spec)
    function i(e, t, i) {
      return crelt(
        'button',
        { class: 'cm-button', name: e, onclick: t, type: 'button' },
        i
      )
    }
    ;(this.commit = this.commit.bind(this)),
      (this.searchField = crelt('input', {
        value: t.search,
        placeholder: phrase(e, 'Find'),
        'aria-label': phrase(e, 'Find'),
        class: 'cm-textfield',
        name: 'search',
        'main-field': 'true',
        onchange: this.commit,
        onkeyup: this.commit,
      })),
      (this.replaceField = crelt('input', {
        value: t.replace,
        placeholder: phrase(e, 'Replace'),
        'aria-label': phrase(e, 'Replace'),
        class: 'cm-textfield',
        name: 'replace',
        onchange: this.commit,
        onkeyup: this.commit,
      })),
      (this.caseField = crelt('input', {
        type: 'checkbox',
        name: 'case',
        checked: t.caseSensitive,
        onchange: this.commit,
      })),
      (this.reField = crelt('input', {
        type: 'checkbox',
        name: 're',
        checked: t.regexp,
        onchange: this.commit,
      })),
      (this.dom = crelt(
        'div',
        { onkeydown: (e) => this.keydown(e), class: 'cm-search' },
        [
          this.searchField,
          i('next', () => findNext(e), [phrase(e, 'next')]),
          i('prev', () => findPrevious(e), [phrase(e, 'previous')]),
          i('select', () => selectMatches(e), [phrase(e, 'all')]),
          crelt('label', null, [this.caseField, phrase(e, 'match case')]),
          crelt('label', null, [this.reField, phrase(e, 'regexp')]),
          ...(e.state.readOnly
            ? []
            : [
                crelt('br'),
                this.replaceField,
                i('replace', () => replaceNext(e), [phrase(e, 'replace')]),
                i('replaceAll', () => replaceAll(e), [
                  phrase(e, 'replace all'),
                ]),
                crelt(
                  'button',
                  {
                    name: 'close',
                    onclick: () => closeSearchPanel(e),
                    'aria-label': phrase(e, 'close'),
                    type: 'button',
                  },
                  ['×']
                ),
              ]),
        ]
      ))
  }
  commit() {
    let e = new SearchQuery({
      search: this.searchField.value,
      caseSensitive: this.caseField.checked,
      regexp: this.reField.checked,
      replace: this.replaceField.value,
    })
    e.eq(this.query) ||
      ((this.query = e), this.view.dispatch({ effects: setSearchQuery.of(e) }))
  }
  keydown(e) {
    runScopeHandlers(this.view, e, 'search-panel')
      ? e.preventDefault()
      : 13 == e.keyCode && e.target == this.searchField
      ? (e.preventDefault(), (e.shiftKey ? findPrevious : findNext)(this.view))
      : 13 == e.keyCode &&
        e.target == this.replaceField &&
        (e.preventDefault(), replaceNext(this.view))
  }
  update(e) {
    for (var t of e.transactions)
      for (var i of t.effects)
        i.is(setSearchQuery) &&
          !i.value.eq(this.query) &&
          this.setQuery(i.value)
  }
  setQuery(e) {
    ;(this.query = e),
      (this.searchField.value = e.search),
      (this.replaceField.value = e.replace),
      (this.caseField.checked = e.caseSensitive),
      (this.reField.checked = e.regexp)
  }
  mount() {
    this.searchField.select()
  }
  get pos() {
    return 80
  }
  get top() {
    return this.view.state.facet(searchConfigFacet).top
  }
}
function phrase(e, t) {
  return e.state.phrase(t)
}
const AnnounceMargin = 30,
  Break = /[\s\.,:;?!]/
function announceMatch(e, { from: t, to: i }) {
  var r = e.state.doc.lineAt(t),
    n = e.state.doc.lineAt(i).to,
    t = Math.max(r.from, t - AnnounceMargin),
    i = Math.min(n, i + AnnounceMargin)
  let o = e.state.sliceDoc(t, i)
  if (t != r.from)
    for (let e = 0; e < AnnounceMargin; e++)
      if (!Break.test(o[e + 1]) && Break.test(o[e])) {
        o = o.slice(e)
        break
      }
  if (i != n)
    for (let e = o.length - 1; e > o.length - AnnounceMargin; e--)
      if (!Break.test(o[e - 1]) && Break.test(o[e])) {
        o = o.slice(0, e)
        break
      }
  return EditorView.announce.of(
    `${e.state.phrase('current match')}. ${o} ${e.state.phrase('on line')} ${
      r.number
    }.`
  )
}
const baseTheme = EditorView.baseTheme({
    '.cm-panel.cm-search': {
      padding: '2px 6px 4px',
      position: 'relative',
      '& [name=close]': {
        position: 'absolute',
        top: '0',
        right: '4px',
        backgroundColor: 'inherit',
        border: 'none',
        font: 'inherit',
        padding: 0,
        margin: 0,
      },
      '& input, & button, & label': { margin: '.2em .6em .2em 0' },
      '& input[type=checkbox]': { marginRight: '.2em' },
      '& label': { fontSize: '80%', whiteSpace: 'pre' },
    },
    '&light .cm-searchMatch': { backgroundColor: '#ffff0054' },
    '&dark .cm-searchMatch': { backgroundColor: '#00ffff8a' },
    '&light .cm-searchMatch-selected': { backgroundColor: '#ff6a0054' },
    '&dark .cm-searchMatch-selected': { backgroundColor: '#ff00ff8a' },
  }),
  searchExtensions = [searchState, Prec.lowest(searchHighlighter), baseTheme],
  parser = LRParser.deserialize({
    version: 14,
    states:
      "!WQYQPOOOnQPO'#CaOOQO'#Ck'#CkOOQO'#Cg'#CgQYQPOOOOQO,58{,58{OuQPO,58{OOQO-E6e-E6eOOQO1G.g1G.g",
    stateData: '|~O^OSPOS~OSPOUQOVQOWQOXQOYQO~ORTO~PYORWO~PYO',
    goto: 'w`PPPPPaPPPPPgPPPqXQOPSUQSOQUPTVSUXROPSU',
    nodeNames:
      '⚠ LineComment Module ] [ Application Operator Identifier Keyword Number String',
    maxTerm: 15,
    nodeProps: [
      ['openedBy', 3, '['],
      ['closedBy', 4, ']'],
      ['group', -5, 5, 7, 8, 9, 10, 'Expression', 6, 'Expression Expression'],
    ],
    skippedNodes: [0, 1],
    repeatNodeCount: 1,
    tokenData:
      "*x~RqXY#YYZ#Y]^#Ypq#Yqr#_rs#dtu$Ruv#_vw#_wx#_z{#_{|#_}!O#_!O!P#_!P!Q#_!Q!R$g!R![&d![!]#_!]!^*Q!^!_#_!_!`#_!`!a#_!a!b#_!b!c#_!c!}*c!}#O*n#P#Q*s#Q#R#_#R#S#_#S#T#_#T#o*c#p#q#_#r#s#_~#_O^~~#dOU~~#gTOr#drs#vs#O#d#O#P#{#P~#d~#{OY~~$OPO~#d~$UQ!c!}$[#T#o$[~$aQW~!c!}$[#T#o$[~$lUX~!O!P%O!Q![&d!g!h%o#R#S&x#X#Y%o#l#m'O~%TRX~!Q![%^!g!h%o#X#Y%o~%cSX~!Q![%^!g!h%o#R#S&^#X#Y%o~%rR{|%{}!O%{!Q![&R~&OP!Q![&R~&WQX~!Q![&R#R#S%{~&aP!Q![%^~&iTX~!O!P%O!Q![&d!g!h%o#R#S&x#X#Y%o~&{P!Q![&d~'RR!Q!['[!c!i'[#T#Z'[~'aVX~!O!P'v!Q!['[!c!i'[!r!s(s#R#S'O#T#Z'[#d#e(s~'{TX~!Q![([!c!i([!r!s(s#T#Z([#d#e(s~(aUX~!Q![([!c!i([!r!s(s#R#S)t#T#Z([#d#e(s~(vT{|)V}!O)V!Q![)c!c!i)c#T#Z)c~)YR!Q![)c!c!i)c#T#Z)c~)hSX~!Q![)c!c!i)c#R#S)V#T#Z)c~)wR!Q![([!c!i([#T#Z([~*TP!]!^*W~*]QP~OY*WZ~*W~*hQV~!c!}*c#T#o*c~*sOS~~*xOR~",
    tokenizers: [0],
    topRules: { Module: [0, 2] },
    tokenPrec: 0,
  }),
  cellLanguage = LRLanguage.define({
    parser: parser.configure({
      props: [
        styleTags({
          Keyword: tags.keyword,
          spec_Keyword: tags.definition,
          Operator: tags.operator,
          Identifier: tags.variableName,
          String: tags.string,
          LineComment: tags.lineComment,
          Number: tags.number,
          ';': tags.separator,
          '[ ]': tags.squareBracket,
        }),
      ],
    }),
    languageData: {
      closeBrackets: { brackets: ['[', '"'] },
      commentTokens: { line: ';;' },
    },
  }),
  CustomKeywords = [],
  snippets = [
    ...CustomKeywords.map((e) =>
      snippetCompletion(e, { label: e, type: 'keyword' })
    ),
    snippetCompletion(':= [${name}; -> [${arg}; : [\n\t${}\n]]]', {
      label: 'function',
      detail: 'definition',
      type: 'type',
    }),
    snippetCompletion(':= [${p}; log []];', {
      label: 'logger',
      detail: 'log',
      type: 'type',
    }),
    snippetCompletion('-> [${x}; ${}]', {
      label: 'f(x)',
      detail: 'anonymous',
      type: 'type',
    }),
    snippetCompletion('-> [${arg}; : [\n\t${}\n]]', {
      label: 'lambda',
      detail: 'anonymous',
      type: 'type',
    }),
    snippetCompletion(':= [${name}; ${value}]', {
      label: 'def var',
      detail: 'define variable',
      type: 'keyword',
    }),
    snippetCompletion('<- .: [${first}; ${rest}; ${array}]', {
      label: 'destructure array',
      detail: 'definition',
      type: 'keyword',
    }),
    snippetCompletion('<- :: [${key}; ${object}]', {
      label: 'destructure object',
      detail: 'definition',
      type: 'keyword',
    }),
    snippetCompletion(':: . [${map}; ${key}]', {
      label: 'get map',
      detail: 'getter',
      type: 'keyword',
    }),
    snippetCompletion(':: .= [${map}; ${key}; ${value}]', {
      label: 'set map',
      detail: 'setter',
      type: 'keyword',
    }),
    snippetCompletion(':: .!= [${map}; ${key}]', {
      label: 'remove map',
      detail: 'setter',
      type: 'keyword',
    }),
    snippetCompletion(':: .? [${map}; ${key}]', {
      label: 'has map',
      detail: 'predicate',
      type: 'keyword',
    }),
    snippetCompletion(':. difference [${a}; ${b}]', {
      label: 'difference set',
      detail: 'filter',
      type: 'type',
    }),
    snippetCompletion(':. xor [${a}; ${b}]', {
      label: 'xor set',
      detail: 'filter',
      type: 'type',
    }),
    snippetCompletion(':. intersection [${a}; ${b}]', {
      label: 'intersection set',
      detail: 'filter',
      type: 'type',
    }),
    snippetCompletion(':. union [${a}; ${b}]', {
      label: 'union set',
      detail: 'filter',
      type: 'type',
    }),
    snippetCompletion(':. .= [${set}; ${value}]', {
      label: 'add set',
      detail: 'setter',
      type: 'keyword',
    }),
    snippetCompletion(':. .!= [${set}; ${value}]', {
      label: 'remove set',
      detail: 'setter',
      type: 'keyword',
    }),
    snippetCompletion(':. .? [${set}; ${value}]', {
      label: 'has set',
      detail: 'predicate',
      type: 'keyword',
    }),
    snippetCompletion('.: [${}]', {
      label: 'def arr',
      detail: 'define array',
      type: 'keyword',
    }),
    snippetCompletion(':. [${}]', {
      label: 'def set',
      detail: 'define set',
      type: 'keyword',
    }),
    snippetCompletion('.: matrix [${}]', {
      label: 'def matrix',
      detail: 'define matrix',
      type: 'keyword',
    }),
    snippetCompletion(':: ["${key}"; ${value}]', {
      label: 'def map',
      detail: 'define map object',
      type: 'keyword',
    }),
    snippetCompletion('` [${value}]', {
      label: 'cast',
      detail: 'cast string <-> number',
      type: 'type',
    }),
    snippetCompletion(':= [${name}; -> [${arg}; ${}]]', {
      label: 'def fn',
      detail: 'define function',
      type: 'keyword',
    }),
    snippetCompletion('-> [${x}; ${i}; ${a}; : [\n\t${}\n]]', {
      label: 'arrow',
      detail: 'iterator function multi-line',
      type: 'type',
    }),
    snippetCompletion('-> [${acc}; ${x}; ${i}; ${a}; : [\n\t${}\n]]', {
      label: 'arrow',
      detail: 'reducer function multi-line',
      type: 'type',
    }),
    snippetCompletion(
      `;; HLP (Hyper Link Program) is a programming language
;; for writting ultra compressed code
;; that fits in a link

;; here is an example program:


:= [p; log[]];
;; cmd/ctrl + s to run or tap on the drone
p ["Hello World"]`,
      { label: 'help', detail: 'starter help with the language', type: 'type' }
    ),
    snippetCompletion(
      `;; log
;; HLP is a turing complete programming language
;; that can run/interpret in the browser
;; and also compile to JavaScript

;; It gets compressed to a tiny base64 encoded query paramter
;; and concatinated to a link that when clicked
;; loads a page that will 
;; decompress & compile the code in the query paramter

;; Here is the entire language spec:
;; everything is an expression 
;; expressions are separated with ;
;; applicable expressions can be invoked with a pair of brackets
;; brackets can nest other expressions
;; there are 5 data types

;; numbers 1.0
;; strings "hello"
;; dynamic arrays .: [1; 2; "3"];  
;; set :. [1; 2; 3; "x"; "y"];
;; map :: ["x"; 10; "y"; 20];
;; functions -> [x; + [x; 2]];
;; no booleans use 0 and 1
;; no null / undefined use 0

;; snake case is prefered
;; if you are using the hlp editor
;; select stuff and (cmd + s or tap the drone)

;; define variables:
:= [my_favorite_number; 29];
my_favorite_number;
;; re-assign a variable 
= [my_favorite_number; 25];
my_favorite_number;
;; operators
;; + - * / %
;; the following reads as (1 + 2 + 3) * 10
* [+ [1; 2; 3]; 10];

;; control flow
;; ! && || ? > < >= <= == != === !==

:= [x; 10];
? [> [x; 9]; "greather than 9"; "less than 9"];

;; |> is a pipe operator
;; it's a shorthand for function compositions
;; this reads as minus(mult(add(input(20)), 23), 4)
|> [10; + [20]; * [23]; - [4]];
;; pipe array methods 
:= [sum_even_powers; |> [.: [1; 2; 3; 4];
.: filter [-> [x; == [% [x; 2]; 0]]];
.: map >> [-> [x; * [x; x]]];
.: reduce >> [-> [acc; x; + [acc; x]]; 0]
]];
sum_even_powers;
;; reads as 
;; var sumEvenPowers = [1, 2, 3, 4]
;;                         .map((x) => x * x)
;;                         .reduce((acc, x) => acc + x, 0)
;;                         .filter(x => x % 2 === 0)


;; functiosn are declared with -> [];
:= [is_even; -> [x; == [% [x; 2]; 0]]];
;; and called with [];
is_even [1]; ;; will return 0 because it's false
is_even [2]; ;; will return 1 because it's true

;; multiline functions and other comples expressions need a block : [];
;; the block is a set of expressions that get evaluated in order
;; and only last is returned
:= [make_coords; -> [x; y; operation; : [
  := [coordinates; :: ["x"; x; "y"; y; "history"; .: []]];
  ? [operation; : [
          ;; take the history array
          := [his; :: . [coordinates; "history"]]; 
          ;; push the current coordinates in the history
          .: >= [his; :: ["x"; x; "y"; y]];
          ;; apply the operation
          operation [coordinates]]];
  ;; return coordinates
  coordinates]]];
:= [apply_force; -> [f; -> [coord; : [:: .= [coord; "x"; * [:: . [coord; "x"]; f]]; :: .= [coord; "y"; * [:: . [coord; "y"]; f]]]]]];
:= [coords; make_coords [10; 20; apply_force [3]]];
;; current 
coords; 
;; previous
|> [coords; :: . ["history"]; .: . [-1]]    
  `,
      { label: 'spec', detail: 'detailed language spec', type: 'type' }
    ),
    snippetCompletion(
      `;; app
;; dom_load_milligram [1; 4; 1]; 
;; dom_load_bulma [0; 9; 4]; 
:= [
    ;; aliases=
    element; dom_create_element; 
    value; dom_get_value;
    set; dom_set_attribute;
    get; dom_get_attribute;
    class; dom_add_class; 
    attribute; dom_set_attributes;
    style; dom_set_style;
    text; dom_set_text_content;
    attach; dom_append_to;
    detach; dom_detach;
    insert; dom_insert;
    clear; dom_clear;
    add; dom_add_to_box;
    box; dom_box;
    click; dom_click
];
:= [root; |> [dom_get_root []]];`,
      { label: 'dom boiler plate', detail: 'ui boilerplate', type: 'keyword' }
    ),
    snippetCompletion('-> [${crates}; : [\n\t${}\n]]', {
      label: 'creates on drop',
      detail: 'callback for package imports',
      type: 'type',
    }),
    snippetCompletion(': [${}]', {
      label: 'block',
      detail: 'scope body',
      type: 'type',
    }),
    snippetCompletion('-> [${x}; ${i}; ${a}; ${}]', {
      label: 'fn',
      detail: 'iterator function single-line',
      type: 'type',
    }),
    snippetCompletion('-> [${acc}; ${x}; ${i}; ${a}; ${}]', {
      label: 'arrow',
      detail: 'reducer function single-line',
      type: 'type',
    }),
    snippetCompletion(
      ':= [loop; -> [count;  : [\n\t${}\n? [> [count; 0]; loop [-= [count]]]]]];\nloop[${1}]',
      {
        label: 'loop times',
        detail: 'recursive loop (backwards)',
        type: 'type',
      }
    ),
    snippetCompletion(
      ':= [${loop}; -> [${i};  : [\n\t${}\n? [> [${i}; 0]; ${loop} [-= [${i}]]]]]][${1}]',
      {
        label: 'loop immediate',
        detail: 'recursive loop (backwards)',
        type: 'type',
      }
    ),
    snippetCompletion(
      ':= [${loop}; -> [${i}; bounds; : [\n\t${}\n? [> [bounds; ${i}]; ${loop} [+= [${i}]; bounds]]]]][${0}; ${1}]',
      {
        label: 'loop immediate',
        detail: 'recursive loop (range)',
        type: 'type',
      }
    ),
    snippetCompletion(
      ':= [loop; -> [count; bounds; : [\n\t${}\n? [> [bounds; count]; loop [+= [count]; bounds]]]]];\nloop[${0}; ${1}]',
      { label: 'loop range', detail: 'recursive loop (range)', type: 'type' }
    ),
    snippetCompletion('|> [${data}; \n\t ${}\n]', {
      label: 'pipe',
      detail: 'block',
      type: 'type',
    }),
    snippetCompletion('? [${condition}; ${if}; ${else}]', {
      label: 'ifelse',
      detail: 'block',
      type: 'type',
    }),
    snippetCompletion('? [${condition}; ${do}]', {
      label: 'if',
      detail: 'block',
      type: 'type',
    }),
    snippetCompletion('<- [${}] [${LIBRARY}];\n', {
      label: 'import',
      detail: 'named',
      type: 'keyword',
    }),
    snippetCompletion('.: find >> [${callback}]', {
      label: 'find array',
      detail: 'iterator',
      type: 'type',
    }),
    snippetCompletion('.: find << [${callback}]', {
      label: 'find backwards array',
      detail: 'iterator',
      type: 'type',
    }),
    snippetCompletion('.: find_index >> [${callback}]', {
      label: 'find index array',
      detail: 'iterator',
      type: 'type',
    }),
    snippetCompletion('.: find_index << [${callback}]', {
      label: 'find index backwards array',
      detail: 'iterator',
      type: 'type',
    }),
    snippetCompletion('.: map >> [${callback}]', {
      label: 'map array',
      detail: 'iterator',
      type: 'type',
    }),
    snippetCompletion('.: map << [${callback}]', {
      label: 'map backwards array',
      detail: 'iterator',
      type: 'type',
    }),
    snippetCompletion('.: flatten [${callback}]', {
      label: 'flat map array',
      detail: 'iterator',
      type: 'type',
    }),
    snippetCompletion('>> [${callback}]', {
      label: 'iterate array',
      detail: 'iterator',
      type: 'type',
    }),
    snippetCompletion('<< [${callback}]', {
      label: 'iterate backwards array',
      detail: 'iterator',
      type: 'type',
    }),
    snippetCompletion('.: reduce >> [${callback}; ${output}]', {
      label: 'reduce array',
      detail: 'iterator',
      type: 'type',
    }),
    snippetCompletion('.: reduce << [${callback}; ${output}]', {
      label: 'reduce backwards array',
      detail: 'iterator',
      type: 'type',
    }),
    snippetCompletion('.: < [${array}]', {
      label: 'first array',
      detail: 'getter',
      type: 'keyword',
    }),
    snippetCompletion('.: > [${array}]', {
      label: 'last array',
      detail: 'getter',
      type: 'keyword',
    }),
    snippetCompletion('.: length [${array}]', {
      label: 'length array',
      detail: 'getter',
      type: 'keyword',
    }),
    snippetCompletion('.: ... [${n}]', {
      label: 'array of',
      detail: 'define array',
      type: 'keyword',
    }),
    snippetCompletion(':: size [${map}]', {
      label: 'size map',
      detail: 'getter',
      type: 'keyword',
    }),
    snippetCompletion('.: >= [${value}]', {
      label: 'append array',
      detail: 'setter',
      type: 'keyword',
    }),
    snippetCompletion('.: <= [${value}]', {
      label: 'prepend array',
      detail: 'setter',
      type: 'keyword',
    }),
    snippetCompletion('.: filter [${predicate}]', {
      label: 'filter array',
      detail: 'filter',
      type: 'type',
    }),
    snippetCompletion('.: some [${predicate}]', {
      label: 'some array',
      detail: 'filter',
      type: 'type',
    }),
    snippetCompletion('.: every [${predicate}]', {
      label: 'every array',
      detail: 'filter',
      type: 'type',
    }),
    snippetCompletion('.: >!= [${}]', {
      label: 'head array',
      detail: 'setter',
      type: 'keyword',
    }),
    snippetCompletion('.: <!= [${}]', {
      label: 'tail array',
      detail: 'setter',
      type: 'keyword',
    }),
    snippetCompletion('.: >!=. [${}]', {
      label: 'cut array',
      detail: 'getter',
      type: 'keyword',
    }),
    snippetCompletion('.: <!=. [${}]', {
      label: 'chop array',
      detail: 'getter',
      type: 'keyword',
    }),
    snippetCompletion('.: . [${array}; ${index}]', {
      label: 'at array',
      detail: 'getter',
      type: 'keyword',
    }),
    snippetCompletion('.: .= [${index}; ${value}]', {
      label: 'set array',
      detail: 'setter',
      type: 'keyword',
    }),
    snippetCompletion('* loop [${times}; ${callback}]', {
      label: 'routine',
      detail: 'loop',
      type: 'type',
    }),
    snippetCompletion('~* [${links}; ${callback}]', {
      label: 'flare',
      detail: 'drop crate',
      type: 'keyword',
    }),
    snippetCompletion('.: from_string [${string}; ${separator}]', {
      label: 'split array',
      detail: 'transform',
      type: 'type',
    }),
    snippetCompletion('.: chunks [${n}]', {
      label: 'chunks array',
      detail: 'transform',
      type: 'type',
    }),
    snippetCompletion('.: add_at [${index}; ${item}]', {
      label: 'add at array',
      detail: 'setter',
      type: 'keyword',
    }),
    snippetCompletion('.: remove_from [${index}; ${amount}]', {
      label: 'remove from array',
      detail: 'setter',
      type: 'keyword',
    }),
    snippetCompletion('.: to_string [${separator}]', {
      label: 'join array',
      detail: 'transform',
      type: 'type',
    }),
    snippetCompletion('.: rotate [${n}; ${dir}]', {
      label: 'rotate array',
      detail: 'transform',
      type: 'type',
    }),
    snippetCompletion('.: slice [${start}; ${end}]', {
      label: 'slice array',
      detail: 'transform',
      type: 'type',
    }),
    snippetCompletion('.: quick_sort [${dir}]', {
      label: 'quick sort array',
      detail: 'transform',
      type: 'type',
    }),
    snippetCompletion('.: merge_sort [${callback}]', {
      label: 'merge sort array',
      detail: 'transform',
      type: 'type',
    }),
    snippetCompletion('.: flat [${level}]', {
      label: 'flat array',
      detail: 'transform',
      type: 'type',
    }),
    snippetCompletion(':: entries [${map}]', {
      label: 'entries map',
      detail: 'transform',
      type: 'type',
    }),
    snippetCompletion('::keys [${map}]', {
      label: 'keys map',
      detail: 'transform',
      type: 'type',
    }),
    snippetCompletion('=== [${a}; ${b}]', {
      label: 'equal array',
      detail: 'predicate',
      type: 'type',
    }),
    snippetCompletion('!== [${a}; ${b}]', {
      label: 'not equal array',
      detail: 'predicate',
      type: 'type',
    }),
    snippetCompletion(':: -> .: [${map}]', {
      label: 'map to array',
      detail: 'transform',
      type: 'type',
    }),
    snippetCompletion('.: -> :. [${array}]', {
      label: 'array to set',
      detail: 'transform',
      type: 'type',
    }),
    snippetCompletion('.: -> :: [${array}; ${callback}]', {
      label: 'array to map',
      detail: 'transform',
      type: 'type',
    }),
    snippetCompletion(':. -> .: [${set}]', {
      label: 'set to array',
      detail: 'transform',
      type: 'type',
    }),
  ]
function theLanguage(e = 0) {
  return new LanguageSupport(
    cellLanguage,
    cellLanguage.data.of({
      autocomplete: ifNotIn(
        ['LineComment', 'String'],
        completeFromList(snippets)
      ),
    })
  )
}
const myHighlightStyle = HighlightStyle.define([
    { tag: tags.variableName, color: 'var(--keyword)' },
    { tag: tags.definition, color: 'var(--def)' },
    { tag: tags.number, color: 'var(--number)' },
    { tag: tags.string, color: 'var(--string)' },
    { tag: tags.operator, color: 'var(--operator)' },
    { tag: tags.operatorKeyword, color: 'var(--special)' },
    { tag: tags.typeName, color: 'var(--type)' },
    { tag: tags.keyword, color: 'var(--keyword)' },
    { tag: tags.atom, color: 'var(--atom)' },
    { tag: tags.null, color: 'var(--atom)' },
    { tag: tags.bool, color: 'var(--atom)' },
    { tag: tags.lineComment, color: 'var(--comment)' },
    { tag: tags.comment, color: 'var(--comment)' },
    { tag: tags.tagName, color: 'var(--string)' },
    { tag: tags.className, color: 'var(--def)' },
    { tag: tags.propertyName, color: 'var(--def)' },
    { tag: tags.attributeName, color: 'var(--def)' },
    { tag: tags.labelName, color: 'var(--def)' },
    { tag: tags.separator, color: 'var(--separator)' },
    { tag: tags.contentSeparator, color: 'var(--def)' },
    { tag: tags.url, color: 'var(--def)' },
    { tag: tags.literal, color: 'var(--def)' },
    { tag: tags.inserted, color: 'var(--def)' },
    { tag: tags.deleted, color: 'var(--def)' },
    { tag: tags.meta, color: 'var(--def)' },
    { tag: tags.regexp, color: 'var(--operator)' },
    { tag: tags.escape, color: 'var(--operator)' },
    { tag: tags.squareBracket, color: 'var(--bracket)' },
  ]),
  customDefaultKeymap = defaultKeymap.filter((e) => 'Escape' !== e.key),
  CodeMirror = (e = document.body) => {
    var t = [
      EditorView.theme(
        {
          '&': {
            fontFamily: 'var(--font-primary)',
            color: 'var(--color-primary)',
            backgroundColor: 'var(--background-primary)',
            border: '1px solid var(--border)',
            paddingTop: '5px',
          },
          '.cm-search': { fontSize: '16px' },
          '.cm-panel.cm-search [name=close]': { color: 'var(--comment)' },
          '.cm-matchingBracket > *': {
            color: 'var(--color-fourtly) !important',
          },
          '.cm-completionIcon': {
            fontSize: '90%',
            width: '0.8em',
            content: 'url(./assets/images/key.svg)',
          },
          '.cm-completionIcon-constant': {
            fontSize: '90%',
            width: '0.8em',
            content: 'url(./assets/images/key.svg)',
          },
          '.cm-completionIcon-property': {
            fontSize: '90%',
            width: '0.8em',
            content: 'url(./assets/images/key.svg)',
          },
          '.cm-completionIcon-type': {
            fontSize: '90%',
            width: '0.8em',
            content: 'url(./assets/images/chip.svg)',
          },
          '.cm-completionIcon-type:after': {
            fontSize: '90%',
            width: '0.8em',
            content: 'url(./assets/images/chip.svg)',
          },
          '.cm-completionIcon-keyword:after': {
            fontSize: '90%',
            width: '0.8em',
            content: 'url(./assets/images/chip.svg)',
          },
          '.cm-tooltip-autocomplete': {
            backgroundColor: 'var(--background-secondary)',
            color: 'var(--color-primary)',
          },
          '.cm-panel': {
            fontFamily: 'var(--font-primary)',
            backgroundColor: 'var(--background-primary)',
            color: 'var(--color-primary)',
            border: '1px solid var(--border)',
          },
          '.cm-textfield': {
            fontFamily: 'var(--font-primary)',
            backgroundColor: 'var(--background-primary)',
            color: 'var(--color-primary)',
            border: '1px solid var(--border)',
          },
          '.cm-button': {
            fontFamily: 'var(--font-primary)',
            backgroundColor: 'var(--background-primary)',
            color: 'var(--color-primary)',
            border: '1px solid var(--border)',
            backgroundImage: 'none',
          },
          '.cm-tooltip': {
            fontFamily: 'var(--font-primary)',
            padding: '3px',
            backgroundColor: 'var(--background-primary)',
            color: 'var(--color-primary)',
            border: '1px solid var(--border)',
          },
          '.cm-content': {
            fontFamily: 'var(--font-primary)',
            caretColor: 'var(--color-thirdly)',
          },
          '.cm-focused': { borderLeftColor: 'var(--color-thirdly)' },
          '.cm-cursor': { borderLeftColor: 'var(--color-thirdly)' },
          '.cm-selectionBackground, ::selection': {
            backgroundColor: 'var(--background-secondary)',
          },
          '.cm-gutters': {
            fontFamily: 'var(--font-primary)',
            backgroundColor: 'var(--background-primary)',
            color: 'var(--linenumbers)',
            border: 'none',
          },
        },
        { dark: !0 }
      ),
      EditorView.lineWrapping,
      theLanguage(),
      syntaxHighlighting(myHighlightStyle),
      history(),
      bracketMatching(),
      closeBrackets(),
      autocompletion(),
      search(),
      keymap.of([
        ...customDefaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
        indentWithTab,
      ]),
    ]
    const r = new EditorView({ extensions: t, parent: e })
    return {
      cm: r,
      posToOffset: (e, t = r.state.doc) => t.line(e.line + 1).from + e.ch,
      offsetToPos: (e, t = r.state.doc) => {
        t = t.lineAt(e)
        return { line: t.number - 1, ch: e - t.from }
      },
      getWrapperElement: () => r.dom,
      getScrollerElement: () => r.scrollDOM,
      getInputField: () => r.contentDOM,
      addValue: (e) => {
        r.dispatch({
          changes: {
            from: r.state.doc.length,
            to: r.state.doc.length,
            insert: e,
          },
        })
      },
      setValue: (e) => {
        r.dispatch({ changes: { from: 0, to: r.state.doc.length, insert: e } })
      },
      getValue: () => r.state.doc.toString(),
      getRange: (e, t) => r.state.sliceDoc(e, t),
      getLine: (e) => r.state.doc.line(e + 1).text,
      getSelection: () =>
        r.state.sliceDoc(
          r.state.selection.main.from,
          r.state.selection.main.to
        ),
      focus: () => r.focus(),
      hasFocus: () => r.hasFocus,
      lineCount: () => r.state.doc.lines,
      getCursor: () => r.state.selection.main.head,
      setSize: (e, t) => {
        e && (r.dom.style.width = e + 'px'),
          t && (r.dom.style.height = t + 'px')
      },
      replaceRange: (e, t, i) =>
        r.dispatch({ changes: { from: t, to: i, insert: e } }),
      replaceSelection: (e) => r.dispatch(r.state.replaceSelection(e)),
      setCursor: (e, t = !1) =>
        r.dispatch({ selection: { anchor: e }, scrollIntoView: t }),
      setSelection: (e, t) => r.dispatch({ selection: { anchor: e, head: t } }),
      getDoc: () => r.getDoc(),
    }
  }
export { CodeMirror }
