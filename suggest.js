// Lista de sugestões que aparece sob a barra de endereço (main.js: showSuggest). Texto de páginas só via textContent.
const list = document.getElementById('list');
const CLOCK = 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0';

window.suggest.onList(({ items, sel, q, accent }) => {
  applyAccent(accent);
  list.replaceChildren(...items.map((s, i) => {
    const row = document.createElement('div');
    row.className = 'row' + (i === sel ? ' on' : '');
    row.setAttribute('role', 'option');
    row.setAttribute('aria-selected', i === sel);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', CLOCK);
    svg.append(p);
    const u = document.createElement('span');
    u.className = 'u';
    const at = s.text.toLowerCase().indexOf(q.toLowerCase());
    if (at >= 0 && q) {
      const b = document.createElement('b');
      b.textContent = s.text.slice(at, at + q.length);
      u.append(s.text.slice(0, at), b, s.text.slice(at + q.length));
    } else u.textContent = s.text;
    const t = document.createElement('span');
    t.className = 't';
    t.textContent = s.title;
    row.append(svg, u, t);
    row.onmousedown = e => { e.preventDefault(); window.suggest.pick(i); };
    return row;
  }));
});
