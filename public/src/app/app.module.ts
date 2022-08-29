import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { AppComponent } from './app.component';
import { PullRequestComponent } from './pull-request/pull-request.component';
import { FilterObjectByDatePipe } from './pipes/filter-object-by-date.pipe';
import { CountBoxComponent } from './count-box/count-box.component';
import { SentryComponent } from './sentry/sentry.component';
import { IssueListComponent } from './issue-list/issue-list.component';
import { ClipboardComponent } from './clipboard/clipboard.component';
import { DeployBoxComponent } from './deploy-box/deploy-box.component';
import { ManualTestComponent } from './manual-test/manual-test.component';
import { HomeComponent } from './home/home.component';
import { PopupComponent } from './popup/popup.component';
import { VisibilityService } from './visibility/visibility.service';
import { PullRequestListComponent } from './pull-request-list/pull-request-list.component';
import { AgentDetailComponent } from './agent-detail/agent-detail.component';
import { BuildQueueComponent } from './build-queue/build-queue.component';
import { IssueComponent } from './issue/issue.component';
import { FilterIssueByLabelPipe } from './pipes/filter-issue-by-label.pipe';
import { PlatformTierBoxComponent } from './platform-tier-box/platform-tier-box.component';

@NgModule({
  declarations: [
    AppComponent,
    ClipboardComponent,
    PullRequestComponent,
    PullRequestListComponent,
    CountBoxComponent,
    FilterObjectByDatePipe,
    FilterIssueByLabelPipe,
    SentryComponent,
    IssueListComponent,
    DeployBoxComponent,
    ManualTestComponent,
    HomeComponent,
    PopupComponent,
    AgentDetailComponent,
    BuildQueueComponent,
    IssueComponent,
    PlatformTierBoxComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    // Remark: because we haven't defined any routes, have to pass an empty
    // route collection to forRoot, as the first parameter is mandatory.
    RouterModule.forRoot([
      {path: '', component: HomeComponent},
      {path: 'manual-test', component: ManualTestComponent},
    ]),
  ],
  providers: [VisibilityService],
  bootstrap: [AppComponent]
})
export class AppModule { }
