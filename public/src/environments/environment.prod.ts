export const environment = {
  production: true,
  statusUrl: '/status',
  refreshBackendUrl: '/refresh',
  webSocketUrl: (window.location.protocol == 'http:' ? 'ws' : 'wss') + '://'+window.location.host
};
