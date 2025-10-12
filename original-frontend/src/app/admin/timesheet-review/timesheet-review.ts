import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-timesheet-review',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './timesheet-review.html',
  styleUrls: ['./timesheet-review.css']
})
export class TimesheetReviewComponent implements OnInit {
  timesheets: any[] = [];
  searchTerm: string = '';

  ngOnInit() {
    const saved = localStorage.getItem('staffTimesheets');
    this.timesheets = saved ? JSON.parse(saved) : [];
  }

  filterTimesheets(items: any[]) {
    if (!this.searchTerm) return items;

    const term = this.searchTerm.toLowerCase();

    return items.filter(sheet =>
      (sheet.staffName && sheet.staffName.toLowerCase().includes(term)) ||
      (sheet.date && sheet.date.toLowerCase().includes(term)) ||
      (sheet.start && sheet.start.toLowerCase().includes(term)) ||
      (sheet.end && sheet.end.toLowerCase().includes(term)) ||
      (sheet.totalHours && sheet.totalHours.toString().includes(term))
    );
  }
}
