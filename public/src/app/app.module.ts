import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { AppComponent } from './app.component';
import { PullRequestComponent } from './pull-request/pull-request.component';
import { FilterObjectByDatePipe } from './pipes/filter-object-by-date.pipe';

@NgModule({
  declarations: [
    AppComponent,
    PullRequestComponent,
    FilterObjectByDatePipe,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    // Remark: because we haven't defined any routes, have to pass an empty
    // route collection to forRoot, as the first parameter is mandatory.
    RouterModule.forRoot([]),
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
