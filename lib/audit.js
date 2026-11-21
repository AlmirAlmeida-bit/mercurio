// Registro de eventos da sessão efêmera: navegações e requisições de rede.
// Fica só na memória, com limite; dispose() remove os ganchos e descarta tudo.
const LIMIT = 2000;
const isWeb = u => /^(https?|wss?):/.test(u);

function createAudit(ses, limit = LIMIT) {
  const startedAt = Date.now();
  const events = [];
  const push = e => {
    events.push({ t: Date.now(), ...e });
    if (events.length > limit) events.splice(0, events.length - limit);
  };
  const net = (d, error) => isWeb(d.url) && push({
    kind: 'rede', method: d.method, url: d.url, type: d.resourceType,
    status: d.statusCode ?? 0, cache: !!d.fromCache, error,
  });
  // onCompleted também traz error: "net::OK"; erro de verdade só vem de onErrorOccurred
  ses.webRequest.onCompleted(d => net(d));
  ses.webRequest.onErrorOccurred(d => net(d, d.error));

  return {
    startedAt,
    events,
    navigation: url => isWeb(url) && push({ kind: 'navegação', url }),
    dispose() {
      ses.webRequest.onCompleted(null);
      ses.webRequest.onErrorOccurred(null);
      events.length = 0;
    },
  };
}

module.exports = { createAudit, LIMIT };
