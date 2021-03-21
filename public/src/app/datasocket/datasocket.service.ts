import { environment } from '../../environments/environment';

export class DataSocket {
  private client = null;
  public onMessage;

  constructor() {
    this.client = new WebSocket(environment.webSocketUrl);

    //this.client.addEventListener('open', () => {
    //});

    this.client.addEventListener('message', (message) => {
      console.log('WebSocket: '+message.data);
      if(this.onMessage) {
        this.onMessage(message.data);
      }
    });
  }


}