import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DailyReportListComponent } from '../daily-reports/daily-report-list';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';

@Component({
  selector: 'app-staff-activity',
  standalone: true,
  imports: [CommonModule, DailyReportListComponent,AdminHeaderComponent],
  templateUrl: './staff-activity.html',
  styleUrls: ['./staff-activity.css'],
})
export class StaffActivityComponent {}
