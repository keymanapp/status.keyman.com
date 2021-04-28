import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

import * as Sentry from "@sentry/angular";

Sentry.init({
  dsn: "https://4ed13a2db1294bb695765ebe2f98171d@sentry.keyman.com/13",
  environment: environment.production ? 'production' : 'development'
});

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));

