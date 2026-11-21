import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTaskGraph, transitiveReduction, topoOrder } from '../lib/task-graph.js';

const seqs = [
  { sourceId: 'v1', seq: ['siap', 'buka', 'pakan', 'rapat'] },
  { sourceId: 'v2', seq: ['siap', 'buka', 'pakan', 'rapat', 'hias'] },
  { sourceId: 'v3', seq: ['siap', 'pakan', 'buka', 'rapat'] },   // urutan buka/pakan ditukar
  { sourceId: 'v4', seq: ['siap', 'buka', 'pakan', 'rapat'] },
  { sourceId: 'v5', seq: ['siap', 'pakan', 'buka', 'rapat'] },
];

test('task graph: wajib vs opsional, prasyarat, pasangan boleh ditukar', () => {
  const g = buildTaskGraph(seqs);
  const node = (id) => g.nodes.find((n) => n.id === id);
  assert.equal(node('siap').required, true);
  assert.equal(node('hias').required, false, 'hanya 1 dari 5 video → opsional');
  assert.ok(g.swaps.some((s) => [s.a, s.b].sort().join() === 'buka,pakan'), 'buka & pakan urutannya bervariasi');
  assert.ok(!g.edges.some((e) => [e.from, e.to].sort().join() === 'buka,pakan'), 'tidak boleh mengklaim prasyarat di antara pasangan yang bervariasi');
  assert.deepEqual(node('rapat').prerequisites.sort(), ['buka', 'pakan']);
  assert.equal(g.order[0], 'siap');
  assert.equal(g.order.at(-2), 'rapat');
});

test('task graph: sisi butuh dukungan minimal 2 video', () => {
  const g = buildTaskGraph([{ sourceId: 'a', seq: ['x', 'y'] }]);
  assert.equal(g.edges.length, 0);
});

test('reduksi transitif membuang sisi tersirat', () => {
  const e = transitiveReduction(['a', 'b', 'c'], [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'a', to: 'c' }]);
  assert.deepEqual(e.map((x) => `${x.from}${x.to}`).sort(), ['ab', 'bc']);
});

test('siklus diputus pada sisi terlemah', () => {
  const { order, edges } = topoOrder(['a', 'b'], [{ from: 'a', to: 'b', p: 0.9, support: 5 }, { from: 'b', to: 'a', p: 0.8, support: 2 }]);
  assert.deepEqual(order, ['a', 'b']);
  assert.equal(edges.length, 1);
});
