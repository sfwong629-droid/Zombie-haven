// node fold.js FILE : fold the constant G3D (= true) out of the source, by exact source ranges (formatting and comments elsewhere untouched)
const acorn = require('acorn'), walk = require('acorn-walk'), fs = require('fs');
const FILE = process.argv[2]; let src = fs.readFileSync(FILE, 'utf8'), rounds = 0, total = 0;
const K = { G3D: true, COZY_HUD: true, C64: false, HD: false, HD0: false };
const val = (n) => {   // static truthiness: true / false / undefined (unknown)
  if (!n) return undefined;
  if (n.type === 'Identifier' && n.name in K) return K[n.name];
  if (n.type === 'Literal' && typeof n.value === 'boolean') return n.value;
  if (n.type === 'UnaryExpression' && n.operator === '!') { const v = val(n.argument); return v === undefined ? undefined : !v; }
  return undefined; };
for (;;) { const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', ranges: false }); const eds = [];
  const txt = (n) => src.slice(n.start, n.end), add = (s, e, t) => eds.push([s, e, t]);
  const stmts = (list) => { const ends = (s) => s.type === 'ReturnStatement' || s.type === 'ThrowStatement' || (s.type === 'BlockStatement' && s.body.some(ends)); const i = list.findIndex(ends); if (i < 0 || i === list.length - 1) return;   // code after an unconditional return: gone (function declarations are hoisted, keep them)
    let s = null, e = null; for (const q of list.slice(i + 1)) { if (q.type === 'FunctionDeclaration') { if (s !== null) { add(s, e, ''); s = null; } continue; } if (s === null) s = q.start; e = q.end; } if (s !== null) add(s, e, ''); };
  walk.ancestor(ast, {
    IfStatement(n, st, anc) { const v = val(n.test); if (v === undefined) return; const par = anc[anc.length - 2], keep = v ? n.consequent : n.alternate;
      const inList = par && (par.type === 'BlockStatement' || par.type === 'Program' || par.type === 'SwitchCase');
      if (!keep) { add(n.start, n.end, inList ? '' : ';'); return; }
      // a block with let/const/function inside must stay a block; otherwise unwrap when the parent is a statement list
      if (keep.type === 'BlockStatement') { const scoped = keep.body.some((b) => (b.type === 'VariableDeclaration' && b.kind !== 'var') || b.type === 'FunctionDeclaration' || b.type === 'ClassDeclaration'); add(n.start, n.end, inList && !scoped ? src.slice(keep.start + 1, keep.end - 1).trim() : txt(keep)); }
      else add(n.start, n.end, txt(keep)); },
    ConditionalExpression(n) { const v = val(n.test); if (v === undefined) return; const k = v ? n.consequent : n.alternate; add(n.start, n.end, '(' + txt(k) + ')'); },
    LogicalExpression(n) { const l = val(n.left), r = val(n.right);
      const pure = (x) => x.type === 'Identifier' || x.type === 'Literal' || (x.type === 'MemberExpression' && !x.computed && pure(x.object)) || (x.type === 'UnaryExpression' && x.operator === '!' && pure(x.argument)) || (x.type === 'LogicalExpression' && pure(x.left) && pure(x.right));
      if (n.operator === '&&' && r === false && pure(n.left)) { add(n.start, n.end, 'false'); return; } if (n.operator === '||' && r === true && pure(n.left)) { add(n.start, n.end, 'true'); return; }
      if (n.operator === '&&') { if (l === true) add(n.start, n.end, '(' + txt(n.right) + ')'); else if (l === false) add(n.start, n.end, 'false'); else if (r === true) add(n.start, n.end, '(' + txt(n.left) + ')'); }
      else if (n.operator === '||') { if (l === false) add(n.start, n.end, '(' + txt(n.right) + ')'); else if (l === true) add(n.start, n.end, 'true'); else if (r === false) add(n.start, n.end, '(' + txt(n.left) + ')'); } },
    BlockStatement(n) { stmts(n.body); }, SwitchCase(n) { stmts(n.consequent); },
    ExpressionStatement(n) { if (n.expression.type === 'Literal' && typeof n.expression.value === 'boolean') add(n.start, n.end, ''); },
  });
  // outermost, non-overlapping edits only; the rest are picked up next round
  eds.sort((a, b) => a[0] - b[0] || b[1] - a[1]); const pick = []; let end = -1; for (const e of eds) if (e[0] >= end) { pick.push(e); end = e[1]; }
  if (!pick.length) break; for (const [s, e, t] of pick.reverse()) src = src.slice(0, s) + t + src.slice(e); total += pick.length; if (++rounds > 30) break; }
// redundant parens around simple things: ((x)) left by the folding -> tidy the commonest shapes
fs.writeFileSync(FILE, src); console.log('folded', total, 'sites in', rounds, 'rounds');
