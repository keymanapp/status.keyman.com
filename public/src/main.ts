import { ApplicationRef, enableProdMode, provideZoneChangeDetection } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

import * as Sentry from "@sentry/angular";
import { enableDebugTools } from '@angular/platform-browser';

Sentry.init({
  dsn: "https://4ed13a2db1294bb695765ebe2f98171d@o1005580.ingest.sentry.io/5983526",
  environment: environment.production ? 'production' : 'development'
});

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule, { applicationProviders: [provideZoneChangeDetection()], })
  .then(module => { if(!environment.production) { enableDebugTools(module.injector.get(ApplicationRef).components[0]) } })
  .catch(err => {
    console.error(err);
    Sentry.captureMessage(err);
  });

