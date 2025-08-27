import * as https from "node:https";
import { consoleError } from "./console-log.js";

type resolver = (a: string) => void;

export default function httppost(hostname, path, headers, data) {
  return new Promise((resolve: resolver, reject) => {
    const options: https.RequestOptions = {
      hostname: hostname,
      port: 443,
      path: path,
      method: 'POST',
      headers: headers,
      timeout: 10000, // timeout for connection
    }

    headers['User-Agent'] = 'Keyman Status App/1.0';
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = data.length;

    let chunk = '';

    try {
      const req = https.request(options, res => {
        if(res.statusCode != 200) {
          consoleError('http-post', hostname, `statusCode for ${hostname}${path}: ${res.statusCode} ${res.statusMessage}`);
          reject(`statusCode for ${hostname}${path}: ${res.statusCode} ${res.statusMessage}`);
          return;
        }

        res.on('data', d => {
          chunk += d;
          });

        res.on('end', () => {
          //console.log(chunk);
          resolve(chunk);
        });
      });

      req.on('error', error => {
        consoleError('http-post', hostname, `error: ${error?.name}: ${error?.message}`);
        reject(error);
      });

      req.setTimeout(180000, () => {
        consoleError('http-post', hostname, `timeout after 3 minutes on ${hostname}${path}`);
        req.destroy();
      })

      req.write(data);
      req.end();
    } catch(e) {
      consoleError('http-post', hostname, e);
      reject(e);
    }
  });
};
