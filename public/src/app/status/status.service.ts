import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { StatusSource } from '../../../../shared/status-source';

@Injectable()
export class StatusService {
  statusUrl = environment.statusUrl;


  constructor(private http: HttpClient) { }

  getStatus(source: StatusSource, sprint?: string, sprintStartDate?: Date) {
    const url = this.statusUrl + '/' + source;
    let params:any = {};
    if(sprint) params.sprint = sprint;
    if(sprintStartDate) params.sprintStartDate = sprintStartDate.toISOString();
    return this.http.get(url, {params: params});
  }

  refreshBackend() {
    const o = this.http.post(environment.refreshBackendUrl, {});
    o.subscribe( (data: any) => {
      console.log(data);
    });
    return o;
  }
};
