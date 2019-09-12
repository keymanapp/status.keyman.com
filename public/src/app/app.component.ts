import { Component } from '@angular/core';
import { StatusService } from './status/status.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  providers: [ StatusService ],
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  status: any;
  statusJson: string;
  error: any;
  JSON: any;
  title = 'Keyman Status';

  platforms = {
    'windows': {
      id:'windows',
      name:'Windows',
      configs:{"alpha": "Keyman_Build", "beta": "KeymanDesktop_Beta", "stable": "KeymanDesktop_Stable", prs: "KeymanDesktop_TestPullRequests"},
      context: "Test: Pull Requests (Keyman Desktop and Keyman Developer)"
    },
    'ios': {
      id:'ios',
      name:'iOS',
      configs:{"alpha": "Keyman_iOS_Master", "beta": "Keyman_iOS_Beta", "stable": "Keyman_iOS_Stable", prs: "Keyman_iOS_TestPullRequests"},
      context: "Test:  Pull Requests (Keyman iOS)"
    },
    'android': {
      id:'android',
      name:'Android',
      configs:{"alpha": "KeymanAndroid_Build", "beta": "KeymanAndroid_Beta", "stable": "KeymanAndroid_Stable", prs: "KeymanAndroid_TestPullRequests"},
      context: "Test: Pull Requests (Keyman Android)"
    },
    'web': {
      id:'web',
      name:'KeymanWeb',
      configs:{"alpha": "Keymanweb_Build", "beta": "Keymanweb_Beta", "stable": "Keymanweb_Stable", prs: "Keymanweb_TestPullRequests"},
      context: "Test: Pull Requests (Keymanweb)"
    },
    'mac': {
      id:'mac',
      name:'macOS',
      configs:{"alpha": "KeymanMac_Master", "beta": "KeymanMac_Beta", "stable": "KeymanMac_Stable", prs: "Keyman_KeymanMac_PullRequests"},
      context: "Test: Pull Requests (Keyman Mac)"
    },
    'linux': {
      id:'linux',
      name:'Linux',
      configs:{"alpha": "KeymanLinux_Master", "beta": "KeymanLinux_Beta", "stable": "KeymanLinux_Stable", prs: "KeymanLinux_TestPullRequests"},
      context: "Test: Pull Requests : Beta (Keyman for Linux)"
    },
    'developer': {
      id:'developer',
      name:'Developer Tools',
      configs:{"alpha": "Keyman_Build", "beta": "KeymanDesktop_Beta", "stable": "KeymanDesktop_Stable", prs: "KeymanDesktop_TestPullRequests"},
      context: "Test: Pull Requests (Keyman Desktop and Keyman Developer)"
    },
  };

  constructor(private statusService: StatusService) {
    this.JSON = JSON;

    // Suck in Keyman Status from localhost:3000

    this.statusService.getStatus()
      .subscribe(
        (data: Object) => {
          this.status = { ...data };
          this.statusJson = JSON.stringify(this.status, null, 2);
          for(let p in this.platforms) {
            let platform = this.platforms[p];
            platform.pulls = [];
            //console.log(this.status.github.data.repository.pullRequests.edges);
            for(let q in this.status.github.data.repository.pullRequests.edges) {
              let pull=this.status.github.data.repository.pullRequests.edges[q];
              //console.log(pull);
              let labels = pull.node.labels.edges;
              let contexts = pull.node.commits.edges[0].node.commit.status.contexts;
              for(let l in labels) {
                let label = labels[l].node;
                if(label.name == platform.id) {
                  let foundContext = null;
                  for(let r in contexts) {
                    let context=contexts[r];
                    //
                    if(context.context == platform.context) {
                      foundContext = context;
                      break;
                    }
                  }
                  platform.pulls.push({pull: pull, state: foundContext});
                }
              }
            }
          }
        }, // success path
        error => this.error = error // error path
      );
  };

  getStatus(platform, tier) {
    return this.status ? this.status.teamCity[this.platforms[platform].configs[tier]] : null;
  }

  statusClass(platform, tier) {
    let b = this.getStatus(platform, tier);
    if(!b || !b.builds || !b.builds.length) return 'missing';
    return b.builds[0].status == 'SUCCESS' ? 'success' : 'failure';
  }

  statusText(platform, tier) {
    let b = this.getStatus(platform, tier);
    if(!b || !b.builds || !b.builds.length) return 'Unreported';
    return b.builds[0].number;
  }

  statusTip(platform, tier) {
    let b = this.getStatus(platform, tier);
    if(!b || !b.builds || !b.builds.length) return '';
    return b.builds[0].statusText;
  }

  statusLink(platform, tier) {
    let b = this.getStatus(platform, tier);
    if(!b || !b.builds || !b.builds.length) return '';

    return `https://build.palaso.org/viewLog.html?buildId=${b.builds[0].id}&buildTypeId=${b.id}`;
    //return b.builds[0].number;
  }

  releaseDate(platform, tier) {
    if(!this.status) return '';
    let files = this.status.keyman[platform][tier].files;
    let items = Object.keys(files);
    if(items.length == 0) return '';
    return files[items[0]].date;
  }

  pullClass(pull) {
    console.log(pull);
    return pull.state ? pull.state.state == 'SUCCESS' ? 'success' : 'failure' : 'missing';
  }
}
