import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable()
export class StatusService {
  statusUrl = '/status';

  constructor(private http: HttpClient) { }

  getStatus() {
    let data = this.http.get(this.statusUrl);

    // Keyman version data is already pretty clean.

    // But we want to transform the data returned from the TeamCity JSON.

    // console.log(data);
    return data; //data.teamCity
  }
}
