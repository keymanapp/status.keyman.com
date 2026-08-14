import * as https from "node:https";
import { consoleLog, consoleError } from "./console-log.js";
import { reportSiteErrorToSentry } from '../code.js';
import { github_token } from "../identity/github.js";

type resolver = (a: string) => void;

export function postToHttp(hostname, path, headers, data) {
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
          if(timeoutId) {
            clearTimeout(timeoutId);
          }
          reject(`statusCode for ${hostname}${path}: ${res.statusCode} ${res.statusMessage}`);
          return;
        }

        res.on('data', d => {
          chunk += d;
        });

        res.on('end', () => {
          //console.log(chunk);
          if(timeoutId) {
            clearTimeout(timeoutId);
          }
          resolve(chunk);
        });
      });

      req.on('error', error => {
        consoleError('http-post', hostname, `error: ${error?.name}: ${error?.message}`);
        reject(error);
      });

      const timeoutId = setTimeout(() => {
        consoleError('http-post', hostname, `timeout after 3 minutes on ${hostname}${path}`);
        req?.destroy();
        reject(`timeout after 3 minutes on ${hostname}${path}`);
      }, 180000);

      // req.setTimeout(180000, () => {
      //   consoleError('http-post', hostname, `timeout after 3 minutes on ${hostname}${path}`);
      //   req.destroy();
      // })

      req.write(data);
      req.end();
    } catch(e) {
      consoleError('http-post', hostname, e);
      reject(e);
    }
  });
};


export async function fetchFromGitHubGraphQlWithRetry(query: string, key: string) {
  let retries = 0;
  do {
    try {
      const result = await fetchFromGitHubGraphQl(query, key);
      return result;
    } catch(e) {
      reportSiteErrorToSentry(e);
    }
    consoleError('services', `github-${key}`, `fetchFromGitHub failed on try number ${retries+1} of 5`);
  } while(++retries < 5);
  return null;
}

/**
 * Request wrapper for GitHub GraphQL
 * @param query   GraphQL query string (without `query:{}` wrapper)
 * @param key     name of request for logging
 * @returns       JSON object
 */
export async function fetchFromGitHubGraphQl(query: string, key: string) {
  consoleLog('services', `github-${key}`, '  starting refresh');
  try {
    let response;
    try {
      response = await fetch('https://api.github.com/graphql', {
        method: "POST",
        headers: {
          Authorization: `Bearer ${github_token}`,
          Accept: 'application/vnd.github.antiope-preview+json, application/vnd.github.shadow-cat-preview+json'
        },
        body: JSON.stringify({query: '{' + query + '}'})
      });
    } catch(e) {
      throw e;
    }
    if(!response.ok) {
      throw new Error(`Failed to query github graphql ${query} for ${key}: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } finally {
    consoleLog('services', `github-${key}`, '  finishing refresh');
  }
}
