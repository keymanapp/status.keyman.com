import { environment } from '../../environments/environment';

export class DataSocket {
  private client = null;
  private _isConnected: boolean = false;
  public onMessage;

  constructor() {
    // WebSockHop.logger = function(type, message) {
    //   console.log("WebSockHop: " + type + "-" + message);
    // };

    this.reconnect();
  }

  isConnected() {
    return this._isConnected;
  }

  reconnect = () => {
    this.client = new WebSockHop(environment.webSocketUrl);

    this.client.on('opened', () => {
      console.log('WebSocket: connected to server');
      this._isConnected = true;
    });

    this.client.on('opening', () => {
      // this happens immediately after a disconnection for network or other
      // reasons, and 'closed' does not appear to be issued except for a
      // disconnect from client code.
      console.log('WebSocket: disconnected from server, will attempt reconnection');
      this._isConnected = false;
    });

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