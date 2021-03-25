import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable()
export class StatusService {
  statusUrl = environment.statusUrl;


  constructor(private http: HttpClient) { }

  getStatus(source: StatusSource, sprint?: string) {
    const url = this.statusUrl + '/' + source;
    return sprint ?
      this.http.get(url, {params:{sprint:sprint}}) :
      this.http.get(url);
  }
};

// TODO share this between client and server
export enum StatusSource {
  Keyman = "keyman",
  GitHub = "github",
  GitHubIssues = "github-issues",
  GitHubContributions = "github-contributions",
  TeamCity = "teamcity",
  SentryIssues = "sentry-issues"
};
