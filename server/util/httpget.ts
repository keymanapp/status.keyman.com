import * as https from "https";

type resolver = (a: {data: string; res: any}) => void;

export default function httpget(hostname, path, headers?) {
  return new Promise((resolve: resolver) => {
    const options: https.RequestOptions = {
      hostname: hostname,
      port: 443,
      path: path,
      method: 'GET'
    }

    if(headers) options.headers = headers;

    let chunk = '';

    const req = https.request(options, res => {
      if(res.statusCode != 200) {
        console.error(`statusCode for ${hostname}${path}: ${res.statusCode}`);
      }

      res.on('data', d => {
        chunk += d;
        });

      res.on('end', () => {
        resolve({data: chunk, res: res});
      });
    });

    req.on('error', error => {
      console.error(error);
    });

    req.end();
  });
};