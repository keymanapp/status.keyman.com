// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,

  // When running in development with ng watch on 4200 and nodemon on 3000, otherwise
  // assume we are on the same host as the status backend
  statusUrl: window.location.host == 'localhost:4200' ? '//localhost:3000/status' : '/status',
  webSocketUrl: window.location.host == 'localhost:4200' ? 'ws://localhost:3000' : 'ws://'+window.location.host,
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
