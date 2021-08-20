import { NgZone, Component, PlatformRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { StatusService } from './status/status.service';
import { StatusSource } from '../../../shared/status-source';
import { platforms, PlatformSpec } from './platforms';
import { sites, siteSentryNames } from './sites';
import { repoShortNameFromGithubUrl } from './utility/repoShortNameFromGithubUrl';
import { escapeHtml } from './utility/escapeHtml';
import { DataSocket } from './datasocket/datasocket.service';
import emojiRegex from 'emoji-regex/es2015/RGI_Emoji';

interface Status {
  currentSprint: any;
  github: any;
  issues: any;
  contributions: any;
  keyman: any[];
  sentryIssues: any;
  teamCity: any[];
  teamCityRunning: any[];
  deployment: {
  }
};

interface OtherSites {
  repos: string[];
  pulls: any[];
  milestones: any[];
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  providers: [ StatusService ],
  styleUrls: ['./app.component.css']
})
export class AppComponent {
}
