import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { StatusSource } from '../../../../shared/status-source';

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

  refreshBackend() {
    return this.http.post(environment.refreshBackendUrl, {});
  }
};
