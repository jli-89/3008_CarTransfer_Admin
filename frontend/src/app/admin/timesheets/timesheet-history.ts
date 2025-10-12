import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  TimesheetListMeta,
  TimesheetManagementService,
  TimesheetQuery,
  TimesheetSummary,
} from './timesheet-management.service';

@Component({
  selector: 'app-timesheet-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './timesheet-history.html',
  styleUrls: ['./timesheet-history.css'],
})
export class TimesheetHistoryComponent implements OnInit {
  filters: Pick<TimesheetQuery, 'date_from' | 'date_to'> = {};

  timesheets: TimesheetSummary[] = [];
  meta: TimesheetListMeta | null = null;
  currentPage = 1;
  pageSize = 20;
  showApproved = false;

  isLoading = false;
  errorMessage: string | null = null;

  constructor(
    private readonly timesheetService: TimesheetManagementService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadTimesheets();
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadTimesheets();
  }

  clearFilters(): void {
    this.filters = {};
    this.currentPage = 1;
    this.loadTimesheets();
  }

  goToPage(page: number): void {
    if (!this.meta) {
      return;
    }
    const totalPages = this.meta.totalPages || 1;
    const target = Math.min(Math.max(page, 1), totalPages);
    if (target === this.currentPage) {
      return;
    }
    this.currentPage = target;
    this.loadTimesheets();
  }

  nextPage(): void {
    if (this.meta && this.currentPage < this.meta.totalPages) {
      this.currentPage += 1;
      this.loadTimesheets();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage -= 1;
      this.loadTimesheets();
    }
  }

  navigateToDashboard(): void {
    const target = this.router.url.startsWith('/staff') ? '/staff/dashboard' : '/admin/dashboard';
    this.router.navigate([target]);
  }

  private loadTimesheets(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.timesheetService
      .listMyTimesheets(this.currentPage, this.pageSize, this.filters, this.showApproved)
      .subscribe({
        next: (result) => {
          this.timesheets = result.data;
          this.meta = result.meta;
          this.currentPage = result.meta.page;
          this.pageSize = result.meta.pageSize;
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = err instanceof Error ? err.message : 'Unable to load timesheets.';
          this.isLoading = false;
        }
      });
  }
}
