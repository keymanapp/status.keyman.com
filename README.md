## Quick Start ##

Clone the repo

```
git clone https://github.com/keymanapp/status.keyman.com
cd status.keyman.com/
```

Build status.keyman.com

```
npm install
cd public/
npm install
npm run-script build
cd ..
```

Before running the node server, you need to have two API tokens set as environment variables.  You might want to add these to a shell script.

```
export KEYMANSTATUS_TEAMCITY_TOKEN=[your personal auth token here]
export KEYMANSTATUS_GITHUB_TOKEN=[your personal auth token here]
```

On Windows, you'll also need npm setup to use bash as its shell:

```
npm config set script-shell "C:\\Program Files\\git\\bin\\bash.exe"
```

## Running the server ##

For a simple run, you can just run on localhost:3000. Start the Node Server:

```
node code.js
```

You should see the following output in the console:
```
$ node code.js
Starting app listening on 3000
```

Point your browser to `http://localhost:3000` to view the application

## Development server ##

This repo is configured for live build and reload of both the client and server. You'll need two terminals open. In the first, run:

```
npm run start-server
```

and in the second, run:

```
npm run start-client
```

* Point your browser to `http://localhost:4200` to view the live reload version of the application.
* The query parameter `?c=1` adds a contributions view which is not visible by default.
