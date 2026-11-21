// Teste real de internet. Não confia em net.isOnline()/navigator.onLine: com adaptadores
// virtuais sempre ligados (Hyper-V, WSL, VPN, Docker) o sistema diz "online" mesmo sem Wi-Fi.
// Também não usa só DNS: o cache do sistema responde nomes conhecidos mesmo offline.
// Faz o mesmo que o Windows/Android para detectar conexão: abre um endereço leve de verificação.

// Erros de rede que podem significar "sem internet" (ou só endereço errado — o teste decide).
const NETWORK_ERRORS = new Set([
  -106, // INTERNET_DISCONNECTED
  -105, // NAME_NOT_RESOLVED
  -137, // NAME_RESOLUTION_FAILED
  -21,  // NETWORK_CHANGED
  -109, // ADDRESS_UNREACHABLE
  -118, // CONNECTION_TIMED_OUT
  -7,   // TIMED_OUT
  -130, // PROXY_CONNECTION_FAILED
]);

// Endereços de verificação de conectividade (respondem vazio, existem para isso).
const PROBES = [
  'http://www.msftconnecttest.com/connecttest.txt',
  'https://www.gstatic.com/generate_204',
  'https://cp.cloudflare.com/generate_204',
];

// true se algum endereço responder dentro do prazo. `fetch` é injetável (no app: net.fetch do Electron).
async function hasInternet({ fetch = globalThis.fetch, probes = PROBES, timeout = 2500 } = {}) {
  try {
    await Promise.any(probes.map(async url => {
      const res = await fetch(url, { method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(timeout) });
      if (res.status >= 500) throw new Error(`status ${res.status}`);
    }));
    return true;
  } catch {
    return false;
  }
}

module.exports = { hasInternet, NETWORK_ERRORS };

// Autoteste: endereço inalcançável (192.0.2.1 é reservado para documentação) = "sem internet".
if (require.main === module) {
  const assert = require('node:assert');
  (async () => {
    const t = Date.now();
    assert.strictEqual(await hasInternet({ probes: ['http://192.0.2.1/'], timeout: 800 }), false);
    assert.ok(Date.now() - t < 3000, 'o teste offline precisa ser rápido');
    assert.ok(NETWORK_ERRORS.has(-105) && !NETWORK_ERRORS.has(-3));
    console.log(`connectivity ok (offline detectado em ${Date.now() - t} ms; internet real agora: ${await hasInternet()})`);
  })();
}
