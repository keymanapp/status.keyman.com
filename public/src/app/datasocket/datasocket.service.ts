import { environment } from '../../environments/environment';

export class DataSocket {
  private client = null;
  public onMessage;

  constructor() {
    this.reconnect();
  }

  reconnect = () => {
    this.client = new WebSockHop(environment.webSocketUrl);

    this.client.formatter = new WebSockHop.StringFormatter();
    this.client.formatter.pingMessage = 'ping';
    this.client.formatter.handlePong = function (message) {
      return message == 'pong';
    };

    this.client.on('message', (message) => {
      console.log('WebSocket: '+message);
      if(this.onMessage) {
        this.onMessage(message);
      }
    });
  }
}