// Página "sem internet": jogo simples (a gota de mercúrio alada pula torres e nuvens).
// A volta para o site quando a internet retorna é feita pelo processo principal (main.js: watchOffline).
const canvas = document.getElementById('game');
const g = canvas.getContext('2d');
const W = 800, H = 220, GROUND = 186;
const GRAVITY = 0.62, JUMP = -11.2;
const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

let best = 0;
try { best = Number(localStorage.getItem('mercurio-recorde')) || 0; } catch {}

const drop = { x: 90, y: GROUND, vy: 0, r: 12 };
let obstacles = [], speed, score, nextGap, state = 'ready', last = 0, groundShift = 0, flap = 0;

function reset() {
  obstacles = [];
  speed = 6;
  score = 0;
  nextGap = 420;
  drop.y = GROUND;
  drop.vy = 0;
}

function jump() {
  if (state !== 'running') { reset(); state = 'running'; return; }
  if (drop.y >= GROUND) drop.vy = JUMP;
}

addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); }
});
canvas.addEventListener('pointerdown', jump);

function spawn() {
  const cloud = score > 400 && Math.random() < 0.3;
  obstacles.push(cloud
    ? { cloud: true, x: W + 20, w: 42, h: 18, y: GROUND - 58 - Math.random() * 18 }
    : { cloud: false, x: W + 20, w: 16 + Math.random() * 16, h: 26 + Math.random() * 30 });
  nextGap = 260 + Math.random() * 260 + speed * 12;
}

// colisão com uma pequena folga (o jogo perdoa raspões)
function hits(o) {
  const top = o.cloud ? o.y : GROUND + drop.r - o.h;
  const bottom = o.cloud ? o.y + o.h : GROUND + drop.r;
  const cx = drop.x, cy = drop.y, r = drop.r - 3;
  const nx = Math.max(o.x, Math.min(cx, o.x + o.w));
  const ny = Math.max(top, Math.min(cy, bottom));
  return (cx - nx) ** 2 + (cy - ny) ** 2 < r * r;
}

function update(k) {
  drop.vy += GRAVITY * k;
  drop.y = Math.min(GROUND, drop.y + drop.vy * k);
  if (drop.y >= GROUND) drop.vy = 0;
  groundShift = (groundShift + speed * k) % 24;
  flap += k * (drop.y < GROUND ? 0.5 : 0.15);

  nextGap -= speed * k;
  if (nextGap <= 0) spawn();
  for (const o of obstacles) o.x -= speed * k;
  obstacles = obstacles.filter(o => o.x + o.w > -10);

  score += speed * k * 0.08;
  speed = Math.min(14, 6 + score / 260);
  if (obstacles.some(hits)) {
    state = 'over';
    best = Math.max(best, Math.floor(score));
    try { localStorage.setItem('mercurio-recorde', String(best)); } catch {}
  }
}

function drawDrop() {
  const { x, y, r } = drop;
  // asas (o mensageiro): batem mais rápido no ar
  const a = Math.sin(flap) * 0.5;
  g.strokeStyle = css('--wing');
  g.lineWidth = 2.4;
  g.lineCap = 'round';
  for (const side of [-1, 1]) {
    g.beginPath();
    g.moveTo(x + side * 6, y - 6);
    g.quadraticCurveTo(x + side * 16, y - 14 - a * 8, x + side * 22, y - 20 - a * 10);
    g.moveTo(x + side * 7, y - 2);
    g.quadraticCurveTo(x + side * 15, y - 7 - a * 6, x + side * 19, y - 11 - a * 7);
    g.stroke();
  }
  // gota prateada
  const grad = g.createRadialGradient(x - 4, y - 5, 2, x, y, r);
  grad.addColorStop(0, css('--drop1'));
  grad.addColorStop(1, css('--drop2'));
  g.fillStyle = grad;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}

function draw() {
  g.clearRect(0, 0, W, H);
  // chão tracejado em movimento
  g.strokeStyle = css('--line');
  g.lineWidth = 2;
  g.setLineDash([14, 10]);
  g.lineDashOffset = groundShift;
  g.beginPath();
  g.moveTo(0, GROUND + drop.r + 1);
  g.lineTo(W, GROUND + drop.r + 1);
  g.stroke();
  g.setLineDash([]);

  g.fillStyle = css('--obstacle');
  for (const o of obstacles) {
    g.beginPath();
    if (o.cloud) g.roundRect(o.x, o.y, o.w, o.h, 2);
    else g.roundRect(o.x, GROUND + drop.r - o.h, o.w, o.h, [2, 2, 0, 0]);
    g.fill();
  }
  drawDrop();

  g.fillStyle = css('--dim');
  g.font = '600 14px "Segoe UI", system-ui, sans-serif';
  g.textAlign = 'right';
  g.fillText(`${best ? `RECORDE ${best}   ` : ''}${Math.floor(score ?? 0)}`, W - 10, 22);
  g.textAlign = 'center';
  g.fillStyle = css('--fg');
  if (state === 'ready') g.fillText('Pressione espaço ou clique para começar', W / 2, 90);
  if (state === 'over') g.fillText('Fim de jogo — espaço ou clique para jogar de novo', W / 2, 90);
}

function loop(t) {
  const k = Math.min(3, (t - (last || t)) / 16.67); // normaliza para 60 fps; limita saltos após pausa
  last = t;
  if (state === 'running') update(k);
  draw();
  requestAnimationFrame(loop);
}

reset();
canvas.focus();
requestAnimationFrame(loop);
