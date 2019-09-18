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

Start the Node Server

```
node code.js
```

You should see the following output in the console:
```
$ node code.js
Starting app listening on 3000
```

Point your browser to `http://localhost:3000` to view the application
