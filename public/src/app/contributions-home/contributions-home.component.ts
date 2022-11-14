import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { StatusSource } from '../../../../shared/status-source';
import { Status, EMPTY_STATUS } from '../status/status.interface';
import { StatusService } from '../status/status.service';

@Component({
  selector: 'app-contributions-home',
  templateUrl: './contributions-home.component.html',
  styleUrls: ['./contributions-home.component.css'],
  providers: [ StatusService ],
})
export class ContributionsHomeComponent implements OnInit {
  status: Status = EMPTY_STATUS;
  sprint: string = null;
  error: any = null;
  sprintDays = [];
  sprintStartDate = null;
  milestone: any = null;
  milestones: any = null;

  constructor(private statusService: StatusService, private route: ActivatedRoute, private http: HttpClient) { }

  ngOnInit(): void {
    this.route.queryParamMap
      .subscribe(queryParams => {
        // This runs twice when params are included.
        // Inelegant workaround based on: https://github.com/angular/angular/issues/12157#issuecomment-396979118.
        // Note how this uses location.href so it's no longer mockable. Too bad so sad.
        if(queryParams.keys.length == 0 && location.href.includes('?')) return;
        this.sprint = queryParams.get('sprint');
      });

    this.statusService.getStatus(StatusSource.GitHubMilestones).subscribe((data:any) => {
      console.log('getStatus.data for '+StatusSource.GitHubMilestones);
      this.milestones = data.milestones;

      this.milestone = this.milestones.find(m => m.title == this.sprint);
      if(this.milestone) {
        this.sprintStartDate = new Date(this.milestone.due_on);
        this.sprintStartDate.setUTCDate(this.sprintStartDate.getUTCDate()-13);  // Unofficial start date is the Sat before the start of sprint (which is a Monday)
        // TODO: sort out timezones one day ...

        let dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        let monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        this.sprintDays = new Array(14);
        for(let n = 0; n < 14; n++) {
          let dt = new Date(this.sprintStartDate.valueOf()+n*86400*1000);
          this.sprintDays[n] = {
              date: dt,
              dayText: dayName[dt.getUTCDay()],
              monthText: monthName[dt.getUTCMonth()],
              dateText: dt.getUTCDate().toString(),
              ghdate: dt.toISOString().substr(0,10)
            };
        }

        this.refreshStatus(StatusSource.GitHubContributions);
        this.refreshStatus(StatusSource.CommunitySite);
      }
    });
  }

  refreshStatus(source: StatusSource) {
    this.statusService.getStatus(source, this.sprint, this.sprintStartDate)
      .subscribe(
        (data: any) => {
          console.log('getStatus.data for '+source);
          this.status.currentSprint = data.currentSprint;
          switch(source) {
            case StatusSource.GitHubContributions:
              this.status.contributions = data.contributions;
              break;
            case StatusSource.CommunitySite:
              this.status.communitySite = this.transformCommunitySiteData(data.contributions);
              break;
          }
        }, // success path
        error => this.error = error // error path
      );
  }

  transformCommunitySiteData(data) {
    // TODO: merge with home.component.ts
    let result = {};
    Object.keys(data).forEach(user => {
      result[user] = data[user].map(post => {
        return {
          // Top three are provided for consistency with github issue node data
          title: post.title,
          url: `https://community.software.sil.org/t/${post.slug}/${post.topic_id}/${post.post_number}`,
          occurredAt: post.created_at,
          ...post
        }
      });
    });
    return result;
  }

}
