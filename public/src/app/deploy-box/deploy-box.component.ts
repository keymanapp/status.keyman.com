import { Component, OnInit, OnChanges, Input } from '@angular/core';
import { StatusSource } from '../../../../shared/status-source';
import { compare as versionCompare } from "compare-versions";
import { PopupComponent } from '../popup/popup.component';

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
export class DeployBoxComponent extends PopupComponent implements OnInit, OnChanges {
  @Input() tier: string;
  @Input() platform: any;
  @Input() status: any;
  @Input() downloadClass: string;
  @Input() builtVersion: string;
  @Input() releaseDate: string;
  @Input() changeCounter: number;

  targets: DeployTarget[] = [];

  ngOnInit() {
    this.popupId = 'deploy-box-'+this.platform?.value?.id+'-'+this.tier;
    if(!this.gravityX) this.gravityX = 'right';
    if(!this.gravityY) this.gravityY = 'bottom';
    this.prepareData();
    super.ngOnInit();
  }

  ngOnChanges() {
    this.prepareData();
  }

  prepareData() {
    this.targets = [];

    const tier = this.tier;
    const platform = this.platform?.value?.id;
    const version = this.status?.keyman?.[platform]?.[tier]?.version;

    this.targets.push({
      name: 'Default download from downloads.keyman.com',
      url: this.status?.keyman?.[this.platform?.value?.id]?.[this.tier]?.downloadUrl,
      version: this.status?.keyman?.[this.platform?.value?.id]?.[this.tier]?.version,
      date: this.releaseDate
    });

    this.targets.push({
      name: 'All downloads on downloads.keyman.com',
      url: `https://downloads.keyman.com/${platform}/${tier}/${version}/`,
      version: version,
      date: this.releaseDate
    });

    switch(this.platform.value.id) {
      case 'android':
        if(this.tier == 'stable')
          this.targets.push({
            name: 'Play Store',
            url: 'https://play.google.com/store/apps/details?id=com.tavultesoft.kmapro',
            version: this.status?.deployment?.['play-store']?.version
          });
        break;
      case 'ios':
        if(this.tier == 'stable') {
          this.targets.push({
            name: 'App Store',
            url: 'https://itunes.apple.com/us/app/keyman/id933676545?ls=1&mt=8',
            version: this.status?.deployment?.['itunes']?.version,
            date: this.status?.deployment?.['itunes']?.releaseDate?.substr(0,10)
          });
        }
        this.targets.push({
          name: 'iOS Simulator image (Keyman)',
          url: `https://downloads.keyman.com/ios/${tier}/${version}/keyman-ios-simulator-${version}.app.zip`,
          version: version,
          date: this.releaseDate
        });
        this.targets.push({
          name: 'iOS Simulator image (FirstVoices)',
          url: `https://downloads.keyman.com/ios/${tier}/${version}/firstvoices-ios-simulator-${version}.app.zip`,
          version: version,
          date: this.releaseDate
        });
        break;
      case 'linux':
        if (this.tier == 'stable') {
          this.targets.push({
            name: 'Launchpad',
            url: 'https://launchpad.net/~keymanapp/+archive/ubuntu/keyman',
            version: this.status?.deployment?.[StatusSource.LaunchPadStable]?.version,
            date: this.status?.deployment?.[StatusSource.LaunchPadStable]?.date_published.substr(0, 10)
          }, {
            name: 'packages.sil.org',
            url: 'https://packages.sil.org/ubuntu/?prefix=ubuntu/pool/main/k/keyman-config/',
            version: this.status?.deployment?.['packages-sil-org']?.version
          }, {
            name: 'linux.lsdev.sil.org',
            url: 'http://linux.lsdev.sil.org/ubuntu/pool/main/k/keyman-config/',
            version: this.status?.deployment?.['linux-lsdev-sil-org-stable']?.version
          });
        } else if (this.tier == 'beta' || this.tier == 'alpha') {
          this.targets.push({
            name: 'Launchpad',
            url: `https://launchpad.net/~keymanapp/+archive/ubuntu/keyman-${this.tier}`,
            version: this.status?.deployment?.[`launch-pad-${this.tier}`]?.version,
            date: this.status?.deployment?.[`launch-pad-${this.tier}`]?.date_published.substr(0, 10)
          }, {
            name: 'linux.lsdev.sil.org',
            url: 'http://linux.lsdev.sil.org/ubuntu/pool/main/k/keyman/',
            version: this.status?.deployment?.[`linux-lsdev-sil-org-${this.tier}`]?.version
          });
        }
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
          version: this.status?.deployment?.['npm-lexical-model-compiler']?.[this.tier]?.split('-')[0]
        }, {
          name: '@keymanapp/models-types',
          url: 'https://npmjs.com/package/@keymanapp/models-types',
          version: this.status?.deployment?.['npm-models-types']?.[this.tier]?.split('-')[0]
        });
        break;
    }
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

  getDownloadClass() {
    if(!this.targets.length) return 'tier-release-version-equal';
    return this.targets.find(target => target.version != undefined && target.version != this.builtVersion) == undefined ? 'tier-release-version-equal' : 'tier-release-version-error';
  }

  getVersionClass(version) {
    if(version == this.builtVersion || version == undefined) return 'tier-release-version-equal';
    return 'tier-release-version-error';
  }

}
