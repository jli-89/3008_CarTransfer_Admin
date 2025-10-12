import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { DailyReportService, CreateDailyReportPayload, DailyReportClientPayload } from './daily-report.service';
import { TimesheetManagementService, StaffOption } from '../timesheets/timesheet-management.service';

interface ClientFormState {
  client_name: string;
  details: string;
  notes: string;
  action_required: string;
  status: 'Solved' | 'Not Solved' | 'Complete';
}

@Component({
  selector: 'app-daily-report-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './daily-report-form.html',
  styleUrls: ['./daily-report-form.css'],
})
export class DailyReportFormComponent implements OnInit {
  reportDate = '';
  startTime = '';
  endTime = '';
  staffUserId = '';
  staffName = '';

  clients: ClientFormState[] = [this.createEmptyClient()];

  staffOptions: StaffOption[] = [];

  isSubmitting = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    private readonly dailyReportService: DailyReportService,
    private readonly staffService: TimesheetManagementService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.staffService.listStaffOptions().subscribe({
      next: (options) => (this.staffOptions = options),
      error: () => (this.staffOptions = []),
    });
  }

  addClient(): void {
    this.clients.push(this.createEmptyClient());
  }

  removeClient(index: number): void {
    if (this.clients.length === 1) {
      return;
    }
    this.clients.splice(index, 1);
  }

  async submit(): Promise<void> {
    this.errorMessage = null;
    this.successMessage = null;

    const staffId = Number(this.staffUserId || 0);
    if (!this.reportDate) {
      this.errorMessage = 'Report date is required.';
      return;
    }
    if (!Number.isInteger(staffId) || staffId <= 0) {
      this.errorMessage = 'Please select a staff member.';
      return;
    }

    const payload: CreateDailyReportPayload = {
      report_date: this.reportDate,
      start_time: this.startTime || undefined,
      end_time: this.endTime || undefined,
      staff_user_id: staffId,
      staff_name: this.staffName.trim() || undefined,
      clients: this.clients.map<DailyReportClientPayload>((client, index) => ({
        ordinal_no: index + 1,
        client_name: client.client_name.trim() || undefined,
        details: client.details.trim() || undefined,
        notes: client.notes.trim() || undefined,
        action_required: client.action_required.trim() || undefined,
        status: client.status,
      })),
    };

    if (!payload.clients.length || !payload.clients[0].client_name) {
      this.errorMessage = 'At least one client entry with a name is required.';
      return;
    }

    this.isSubmitting = true;
    this.dailyReportService.createReport(payload).subscribe({
      next: (detail) => {
        this.successMessage = `Daily report #${detail.report_id} created.`;
        this.resetForm();
      },
      error: (err) => {
        this.errorMessage = err instanceof Error ? err.message : 'Failed to create report.';
      },
      complete: () => {
        this.isSubmitting = false;
      }
    });
  }

  navigateToList(): void {
    this.router.navigate(['/admin/daily-reports']);
  }

  private resetForm(): void {
    this.reportDate = '';
    this.startTime = '';
    this.endTime = '';
    this.staffUserId = '';
    this.staffName = '';
    this.clients = [this.createEmptyClient()];
  }

  private createEmptyClient(): ClientFormState {
    return {
      client_name: '',
      details: '',
      notes: '',
      action_required: '',
      status: 'Not Solved',
    };
  }
}

