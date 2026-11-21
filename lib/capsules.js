// Cápsulas de contexto: dados persistidos (nome, anotações, abas guardadas).
// A parte "viva" (sessão e abas abertas) é gerenciada pelo main.js.
const { randomUUID } = require('node:crypto');

const NAME_MAX = 60;
const NOTES_MAX = 5000;
const cleanName = s => String(s ?? '').trim().slice(0, NAME_MAX);

function create(list, name) {
  const now = Date.now();
  const cap = {
    id: randomUUID(),
    name: cleanName(name) || `Cápsula ${list.length + 1}`,
    notes: '',
    tabs: [],      // abas guardadas quando pausada: [{ url, title }]
    active: 0,
    createdAt: now,
    updatedAt: now,
  };
  list.push(cap);
  return cap;
}

const find = (list, id) => list.find(c => c.id === id);

function update(list, id, changes) {
  const cap = find(list, id);
  if (!cap) throw new Error('Cápsula não encontrada');
  if ('name' in changes) cap.name = cleanName(changes.name) || cap.name;
  if ('notes' in changes) cap.notes = String(changes.notes ?? '').slice(0, NOTES_MAX);
  if ('tabs' in changes) cap.tabs = changes.tabs;
  if ('active' in changes) cap.active = changes.active;
  cap.updatedAt = Date.now();
  return cap;
}

const remove = (list, id) => list.filter(c => c.id !== id);

module.exports = { create, find, update, remove };
