// node prune.js FILE USERS... : drop names from the window.ZH / window.ZHG export lists that no other file (and no ZH.x in this file) reads
const acorn = require('acorn'), walk = require('acorn-walk'), fs = require('fs');
const FILE = process.argv[2]; let src = fs.readFileSync(FILE, 'utf8'); const users = process.argv.slice(3).map((f) => fs.readFileSync(f, 'utf8')).join('\n') + '\n' + src;
const used = new Set((users.match(/\.\s*[A-Za-z_$][\w$]*/g) || []).map((s) => s.replace(/^\.\s*/, '')));
for (const m of users.matchAll(/(?:const|let|var)\s*\{([^}]*)\}\s*=\s*(?:window\.)?(?:ZH|ZHG|G)\b/g)) for (const w of m[1].match(/[A-Za-z_$][\w$]*/g) || []) used.add(w);   // destructured reads
const ast = acorn.parse(src, { ecmaVersion: 'latest' }), eds = [], gone = [];
const isZH = (n) => n && n.type === 'MemberExpression' && n.object.type === 'Identifier' && n.object.name === 'window' && ['ZH', 'ZHG'].includes(n.property.name);
const prune = (obj) => { if (!obj || obj.type !== 'ObjectExpression') return; const ps = obj.properties; ps.forEach((p, i) => { if (p.type !== 'Property' || p.computed || p.kind !== 'init' || p.key.type !== 'Identifier') return; if (!(p.shorthand || p.value.type === 'Identifier')) return; if (used.has(p.key.name)) return;
  gone.push(p.key.name); if (i < ps.length - 1) eds.push([p.start, ps[i + 1].start]); else { let j = i - 1; while (j >= 0 && gone.includes(ps[j].key && ps[j].key.name) && !used.has(ps[j].key.name)) j--; eds.push([j >= 0 ? ps[j].end : p.start, p.end]); } }); };
walk.simple(ast, { AssignmentExpression(n) { if (isZH(n.left)) prune(n.right); }, CallExpression(n) { if (n.callee.type === 'MemberExpression' && n.callee.object.name === 'Object' && n.callee.property.name === 'assign' && isZH(n.arguments[0])) prune(n.arguments[1]); } });
eds.sort((a, b) => a[0] - b[0]); const pick = []; let end = -1; for (const e of eds) if (e[0] >= end) { pick.push(e); end = e[1]; }
for (const [s, e] of pick.reverse()) src = src.slice(0, s) + src.slice(e); fs.writeFileSync(FILE, src); console.log('exports dropped', gone.length, gone.join(' '));
