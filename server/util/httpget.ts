import * as https from "node:https";
import * as http from "node:http";

type resolver = (a: {data: string; res: http.IncomingMessage}) => void;

export default function httpget(hostname, path, headers?, head?: boolean, httpOnly?: boolean) {
  return new Promise((resolve: resolver, reject) => {
    const options: https.RequestOptions = {
      hostname: hostname,
      port: httpOnly ? 80 : 443,
      path: path,
      method: head ? 'HEAD' : 'GET'
    }

    if(headers) options.headers = headers;

    let chunk = '';

    try {
      const req = (httpOnly ? http : https).request(options, res => {
        if(res.statusCode != 200) {
          const error = `statusCode for ${hostname}${path}: ${res.statusCode}`;
          console.error(error);
          //Sentry.captureMessage(`statusCode for ${hostname}${path}: ${res.statusCode}`);
          reject(error);
          return;
        }

        res.on('data', d => {
          chunk += d;
          });

        res.on('end', () => {
          resolve({data: chunk, res: res});
        });
      });

      req.on('error', error => {
        reject(error);
      });

      req.end();
    } catch(e) {
      console.log(e);
      reject(e);
    }
  });
};