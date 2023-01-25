import * as https from "https";

type resolver = (a: string) => void;

export default function httppost(hostname, path, headers, data) {
  return new Promise((resolve: resolver, reject) => {
    const options: https.RequestOptions = {
      hostname: hostname,
      port: 443,
      path: path,
      method: 'POST',
      headers: headers
    }

    headers['User-Agent'] = 'Keyman Status App/1.0';
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = data.length;

    let chunk = '';

    try {
      const req = https.request(options, res => {
        if(res.statusCode != 200) {
          console.error(`statusCode for ${hostname}${path}: ${res.statusCode} ${res.statusMessage}`);
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
        reject(error);
      });

      req.write(data);
      req.end();
    } catch(e) {
      console.log(e);
      reject(e);
    }
  });
};
