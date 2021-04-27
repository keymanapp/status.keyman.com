import { Component, OnInit, Input } from '@angular/core';
import { StatusSource } from '../../../../shared/status-source';
import { compare as versionCompare } from "compare-versions";

interface DeployTarget {
  name: string;
  url: string;
  version?: string;
  date?: string;
}

@Component({
  selector: 'app-deploy-box',
  templateUrl: './deploy-box.component.html',
  styleUrls: ['./deploy-box.component.css']
})
export class DeployBoxComponent implements OnInit {
  @Input() tier: string;
  @Input() platform: any;
  @Input() status: any;
  @Input() downloadClass: string;
  @Input() builtVersion: string;
  @Input() releaseDate: string;
  @Input() gravityX?: string;
  @Input() gravityY?: string;

  pinned: boolean = false;

  targets: DeployTarget[] = [];

  constructor() { }

  ngOnInit() {
    if(!this.gravityX) this.gravityX = 'right';
    if(!this.gravityY) this.gravityY = 'bottom';

    switch(this.platform) {
      case 'android':
        if(this.tier == 'stable')
          this.targets.push({
            name: 'Play Store',
            url: 'https://play.google.com/store/apps/details?id=com.tavultesoft.kmapro',
            version: this.status?.deployment?.['play-store']?.version
          });
        break;
      case 'ios':
        if(this.tier == 'stable')
          this.targets.push({
            name: 'App Store',
            url: 'https://itunes.apple.com/us/app/keyman/id933676545?ls=1&mt=8',
            version: this.status?.deployment?.['itunes']?.version,
            date: this.status?.deployment?.['itunes']?.releaseDate?.substr(0,10)
          });
        break;
      case 'linux':
        if(this.tier == 'stable')
          this.targets.push({
            name: 'Launchpad',
            url: 'https://launchpad.net/~keymanapp/+archive/ubuntu/keyman',
            version: this.status?.deployment?.['launch-pad']?.version,
            date:this.status?.deployment?.['launch-pad']?.date_published.substr(0,10)
          }, {
            name: 'packages.sil.org',
            url: '#',
            version: this.status?.deployment?.['packages-sil-org']?.version
          });
        break;
      case 'web':
        this.targets.push({
          name: 's.keyman.com',
          url: 'https://s.keyman.com/kmw/engine/'+this.builtVersion+'/keymanweb.js',
          version: this.getLatestKeymanWebFromSKeymanCom(this.builtVersion),
        },
        {
          name: 'keymanweb.com',
          url: 'https://keymanweb.com/?version='+this.builtVersion
        });
        break;
      case 'developer':
        this.targets.push({
          name: '@keymanapp/lexical-model-compiler',
          url: 'https://npmjs.com/package/@keymanapp/lexical-model-compiler',
          version: this.status?.deployment?.['npm-lexical-model-compiler']?.[this.tier]
        }, {
          name: '@keymanapp/models-types',
          url: 'https://npmjs.com/package/@keymanapp/models-types',
          version: this.status?.deployment?.['npm-models-types']?.[this.tier]
        });
        break;
    }
  }

  pin() {
    this.pinned = !this.pinned;
  }

  getLatestKeymanWebFromSKeymanCom(version: string) {
    if(!this.status || !this.status.deployment || !this.status.deployment[StatusSource.SKeymanCom])
      return null;

    const web = this.platform;
    if(!web || !version.match(/^\d+\.\d+\.\d+$/))
      return null;
    const versions: string[] = this.status.deployment[StatusSource.SKeymanCom].versions;
    if(!versions)
      return null;

    const foundVersion = versions.reduce( (prev, curr) =>
      curr == version ? version :
      versionCompare(curr, version, '>') ? prev :
      versionCompare(curr, prev, '>') ? curr : prev, '0');
    return foundVersion == '0' ? null : foundVersion;
  }

  getVersionClass(version) {
    if(version == this.builtVersion) return 'tier-release-version-equal';
    return 'tier-release-version-error';
  }

}
