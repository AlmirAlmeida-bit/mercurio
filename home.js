// Buscador escolhido nas preferências chega como ?e=<nome>
const ACTIONS = {
  duckduckgo: 'https://duckduckgo.com/',
  google: 'https://www.google.com/search',
  bing: 'https://www.bing.com/search',
  brave: 'https://search.brave.com/search',
};
const params = new URLSearchParams(location.search);
const e = params.get('e');
if (ACTIONS[e]) document.querySelector('form').action = ACTIONS[e];
applyAccent(params.get('a'));
