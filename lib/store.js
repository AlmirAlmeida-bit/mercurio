// Leitura/gravação de JSON. A gravação é atômica (arquivo temporário + rename),
// então um desligamento no meio nunca deixa o arquivo pela metade.
const fs = require('node:fs');

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function writeJSON(file, value) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value));
  fs.renameSync(tmp, file);
}

// Agrupa gravações frequentes: save() agenda, flush() grava já (usar ao sair).
function debounced(file, getValue, ms = 500) {
  let timer = null;
  const flush = () => {
    clearTimeout(timer);
    timer = null;
    try { writeJSON(file, getValue()); } catch (err) { console.error('Falha ao gravar', file, err.message); }
  };
  return { save: () => { clearTimeout(timer); timer = setTimeout(flush, ms); }, flush };
}

module.exports = { readJSON, writeJSON, debounced };
