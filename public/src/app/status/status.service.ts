import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable()
export class StatusService {
  // When running in development, we point the host to the nodemon instance on port 3000
  // When running in production, we use the same host
  statusUrl = window.location.host == 'localhost:4200' ? '//localhost:3000/status' : '/status';

  constructor(private http: HttpClient) { }

  getStatus() {
    let data = this.http.get(this.statusUrl);

    // Keyman version data is already pretty clean.

    // But we want to transform the data returned from the TeamCity JSON.

    // console.log(data);
    return data; //data.teamCity
  }
}
