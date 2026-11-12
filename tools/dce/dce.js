// node dce.js FILE OTHER... : remove declarations at the top of the game's wrapper function that nothing refers to (to a fixpoint)
const acorn = require('acorn'), walk = require('acorn-walk'), fs = require('fs');
const FILE = process.argv[2]; let src = fs.readFileSync(FILE, 'utf8'); const others = process.argv.slice(3).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
const otherWords = new Set(others.match(/[A-Za-z_$][\w$]*/g) || []); const gone = [];
const pure = (x) => !x || ['ArrowFunctionExpression', 'FunctionExpression', 'Literal', 'Identifier'].includes(x.type) || (x.type === 'TemplateLiteral' && x.expressions.every(pure)) || (x.type === 'ArrayExpression' && x.elements.every((e) => !e || (e.type === 'SpreadElement' ? pure(e.argument) : pure(e))))
  || (x.type === 'ObjectExpression' && x.properties.every((p) => p.type === 'SpreadElement' ? pure(p.argument) : (!p.computed || pure(p.key)) && pure(p.value))) || (x.type === 'UnaryExpression' && x.operator !== 'delete' && pure(x.argument)) || ((x.type === 'BinaryExpression' || x.type === 'LogicalExpression') && pure(x.left) && pure(x.right))
  || (x.type === 'ConditionalExpression' && pure(x.test) && pure(x.consequent) && pure(x.alternate)) || (x.type === 'MemberExpression' && pure(x.object) && (!x.computed || pure(x.property)))
  || (x.type === 'NewExpression' && x.callee.type === 'Identifier' && ['Set', 'Map', 'Array', 'Image', 'Float32Array', 'Uint8Array', 'WeakMap'].includes(x.callee.name) && x.arguments.every(pure))
  || (x.type === 'CallExpression' && x.callee.type === 'MemberExpression' && x.callee.object.type === 'Identifier' && ['Object', 'Math', 'Array'].includes(x.callee.object.name) && x.arguments.every(pure))
  || (x.type === 'CallExpression' && x.callee.type === 'Identifier' && PUREFN.has(x.callee.name) && x.arguments.every(pure));
const PUREFN = new Set(['SH']);
for (let round = 0; round < 40; round++) { const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script' });
  let body = ast.body; if (body.length === 1 && body[0].type === 'ExpressionStatement') { let e = body[0].expression; if (e.type === 'CallExpression') e = e.callee; if (e.type === 'ArrowFunctionExpression' || e.type === 'FunctionExpression') body = e.body.body; }
  const decl = new Map();   // name -> { node (range to exclude), kind, stmt, d }
  for (const st of body) { if (st.type === 'FunctionDeclaration') decl.set(st.id.name, { range: st, stmt: st, fn: true }); else if (st.type === 'VariableDeclaration') for (const d of st.declarations) if (d.id.type === 'Identifier') decl.set(d.id.name, { range: d, stmt: st, d }); }
  const refs = new Map(); for (const k of decl.keys()) refs.set(k, 0);
  const strWords = new Set(); walk.simple(ast, { Literal(n) { if (typeof n.value === 'string') for (const w of n.value.match(/[A-Za-z_$][\w$]*/g) || []) strWords.add(w); }, TemplateElement(n) { for (const w of n.value.raw.match(/[A-Za-z_$][\w$]*/g) || []) strWords.add(w); } });
  walk.ancestor(ast, { Identifier(n, st, anc) { const D = decl.get(n.name); if (!D) return; const par = anc[anc.length - 2];
    if (par.type === 'MemberExpression' && par.property === n && !par.computed) return; if (par.type === 'Property' && par.key === n && !par.computed && !par.shorthand) return; if (par.type === 'MethodDefinition' && par.key === n) return;
    if (n.start >= D.range.start && n.end <= D.range.end) return; refs.set(n.name, refs.get(n.name) + 1); },
    // patterns: acorn-walk reports binding identifiers as VariablePattern
    VariablePattern(n) { const D = decl.get(n.name); if (!D) return; if (n.start >= D.range.start && n.end <= D.range.end) return; refs.set(n.name, refs.get(n.name) + 1); } });
  const dead = [...decl.entries()].filter(([k, D]) => refs.get(k) === 0 && !strWords.has(k) && (D.fn || pure(D.d.init)));
  if (!dead.length) break; const eds = [], byStmt = new Map(); for (const [k, D] of dead) { if (D.fn) eds.push([D.stmt.start, D.stmt.end]); else { if (!byStmt.has(D.stmt)) byStmt.set(D.stmt, []); byStmt.get(D.stmt).push(D.d); } gone.push(k); }
  for (const [st, ds] of byStmt) { if (ds.length === st.declarations.length) { eds.push([st.start, st.end]); continue; }
    for (const d of ds) { const i = st.declarations.indexOf(d); if (i < st.declarations.length - 1) { eds.push([d.start, st.declarations[i + 1].start]); } else { let j = i - 1; while (j >= 0 && ds.includes(st.declarations[j])) j--; eds.push([st.declarations[j].end, d.end]); } } }
  eds.sort((a, b) => a[0] - b[0]); const pick = []; let end = -1; for (const e of eds) if (e[0] >= end) { pick.push(e); end = e[1]; }
  for (const [s, e] of pick.reverse()) src = src.slice(0, s) + src.slice(e); }
fs.writeFileSync(FILE, src); console.log('removed', gone.length); fs.writeFileSync(FILE + '.gone.txt', gone.join('\n'));
