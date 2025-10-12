import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import {
  SignTimesheetPayload,
  StaffOption,
  TimesheetDetail,
  TimesheetListMeta,
  TimesheetManagementService,
  TimesheetQuery,
  TimesheetStatus,
  TimesheetSummary,
} from './timesheet-management.service';

class SignaturePadController {
  private ctx: CanvasRenderingContext2D | null = null;
  private drawing = false;
  private hasStroke = false;
  private listeners: Array<() => void> = [];

  constructor(private readonly canvasRef: ElementRef<HTMLCanvasElement>) {}

  init() {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) {
      throw new Error('Unable to initialise signature pad');
    }
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.strokeStyle = '#000000';

    const startDraw = (event: MouseEvent | TouchEvent) => {
      this.drawing = true;
      this.ctx!.beginPath();
      const pos = this.getPosition(event);
      this.ctx!.moveTo(pos.x, pos.y);
      this.hasStroke = true;
    };

    const draw = (event: MouseEvent | TouchEvent) => {
      if (!this.drawing) return;
      if (event instanceof TouchEvent) {
        event.preventDefault();
      }
      const pos = this.getPosition(event);
      this.ctx!.lineTo(pos.x, pos.y);
      this.ctx!.stroke();
    };

    const stopDraw = () => {
      this.drawing = false;
      this.ctx!.beginPath();
    };

    const mouseDown = (e: MouseEvent) => startDraw(e);
    const mouseMove = (e: MouseEvent) => draw(e);
    const mouseUp = () => stopDraw();
    const mouseLeave = () => stopDraw();
    const touchStart = (e: TouchEvent) => startDraw(e);
    const touchMove = (e: TouchEvent) => draw(e);
    const touchEnd = () => stopDraw();

    canvas.addEventListener('mousedown', mouseDown);
    canvas.addEventListener('mousemove', mouseMove);
    canvas.addEventListener('mouseup', mouseUp);
    canvas.addEventListener('mouseleave', mouseLeave);
    canvas.addEventListener('touchstart', touchStart);
    canvas.addEventListener('touchmove', touchMove);
    canvas.addEventListener('touchend', touchEnd);

    this.listeners = [
      () => canvas.removeEventListener('mousedown', mouseDown),
      () => canvas.removeEventListener('mousemove', mouseMove),
      () => canvas.removeEventListener('mouseup', mouseUp),
      () => canvas.removeEventListener('mouseleave', mouseLeave),
      () => canvas.removeEventListener('touchstart', touchStart),
      () => canvas.removeEventListener('touchmove', touchMove),
      () => canvas.removeEventListener('touchend', touchEnd),
    ];
  }

  destroy() {
    this.listeners.forEach((unhook) => unhook());
    this.listeners = [];
  }

  clear() {
    if (!this.ctx) return;
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.ctx.beginPath();
    this.hasStroke = false;
  }

  toDataUrl(): string | null {
    if (!this.hasStroke) {
      return null;
    }
    return this.canvasRef.nativeElement.toDataURL('image/png');
  }

  private getPosition(event: MouseEvent | TouchEvent): { x: number; y: number } {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    if (event instanceof MouseEvent) {
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }
    const touch = event.touches[0];
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  }
}

@Component({
  selector: 'app-timesheet-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './timesheet-list.html',
  styleUrls: ['./timesheet-list.css'],
})
export class TimesheetListComponent implements OnInit, OnDestroy {
  @ViewChild('managerSignCanvas')
  set managerSignCanvas(ref: ElementRef<HTMLCanvasElement> | undefined) {
    if (ref) {
      this.managerPad?.destroy();
      this.managerPad = new SignaturePadController(ref);
      this.managerPad.init();
    }
  }

  filters: TimesheetQuery = {};
  staffOptions: StaffOption[] = [];
  statuses: TimesheetStatus[] = ['draft', 'submitted', 'approved', 'rejected'];

  timesheets: TimesheetSummary[] = [];
  selectedTimesheet: TimesheetDetail | null = null;
  meta: TimesheetListMeta | null = null;
  currentPage = 1;
  pageSize = 20;
  showApproved = false;

  isLoadingList = false;
  isLoadingDetail = false;
  isSigning = false;
  errorMessage: string | null = null;
  detailError: string | null = null;
  signError: string | null = null;
  statusSuccessMessage: string | null = null;

  private managerPad?: SignaturePadController;

  constructor(private readonly timesheetService: TimesheetManagementService) {}

  ngOnInit(): void {
    this.loadStaffOptions();
    this.fetchTimesheets();
  }

  ngOnDestroy(): void {
    this.managerPad?.destroy();
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.fetchTimesheets();
  }

  clearFilters(): void {
    this.filters = {};
    this.currentPage = 1;
    this.fetchTimesheets();
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
    this.fetchTimesheets(false);
  }

  nextPage(): void {
    if (this.meta && this.currentPage < this.meta.totalPages) {
      this.currentPage += 1;
      this.fetchTimesheets(false);
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage -= 1;
      this.fetchTimesheets(false);
    }
  }

  selectTimesheet(timesheet: TimesheetSummary): void {
    if (this.selectedTimesheet?.timesheet_id === timesheet.timesheet_id) {
      return;
    }
    this.loadDetail(timesheet.timesheet_id);
  }

  refreshDetail(): void {
    if (!this.selectedTimesheet) {
      return;
    }
    this.loadDetail(this.selectedTimesheet.timesheet_id);
  }

  updateStatus(status: TimesheetStatus): void {
    if (!this.selectedTimesheet) {
      return;
    }
    this.signError = null;
    this.detailError = null;
    this.statusSuccessMessage = null;
    this.isSigning = true;

    this.timesheetService
      .updateTimesheet(this.selectedTimesheet.timesheet_id, { status })
      .subscribe({
        next: (detail) => {
          this.selectedTimesheet = detail;
          this.mergeSummary(detail);
          this.statusSuccessMessage = `Status updated to ${detail.status}.`;
          this.isSigning = false;
        },
        error: (err) => {
          this.detailError = err instanceof Error ? err.message : 'Failed to update timesheet.';
          this.isSigning = false;
        }
      });
  }

  submitManagerSignature(): void {
    if (!this.selectedTimesheet || !this.managerPad) {
      return;
    }
    const dataUrl = this.managerPad.toDataUrl();
    if (!dataUrl) {
      this.signError = 'Please draw a signature before submitting.';
      return;
    }
    const payload: SignTimesheetPayload = {
      signer_role: 'manager',
      signature_data_url: dataUrl,
    };
    this.signError = null;
    this.isSigning = true;

    this.timesheetService
      .signTimesheet(this.selectedTimesheet.timesheet_id, payload)
      .subscribe({
        next: (detail) => {
          this.selectedTimesheet = detail;
          this.mergeSummary(detail);
          this.managerPad?.clear();
          this.isSigning = false;
        },
        error: (err) => {
          this.signError = err instanceof Error ? err.message : 'Failed to record signature.';
          this.isSigning = false;
        }
      });
  }

  clearManagerSignature(): void {
    this.managerPad?.clear();
    this.signError = null;
  }

  private fetchTimesheets(resetSelection: boolean = true): void {
    this.isLoadingList = true;
    this.errorMessage = null;
    this.timesheetService
      .listTimesheets(this.filters, this.currentPage, this.pageSize, this.showApproved)
      .subscribe({
        next: (result) => {
          this.timesheets = result.data;
          this.meta = result.meta;
          this.currentPage = result.meta.page;
          this.pageSize = result.meta.pageSize;
          this.isLoadingList = false;

          if (resetSelection) {
            this.selectedTimesheet = result.data.length ? null : this.selectedTimesheet;
          } else if (this.selectedTimesheet) {
            const match = result.data.find(
              (row) => row.timesheet_id === this.selectedTimesheet!.timesheet_id
            );
            if (!match) {
              this.selectedTimesheet = null;
            } else if (this.selectedTimesheet) {
              this.selectedTimesheet = {
                ...this.selectedTimesheet,
                work_date: match.work_date,
                start_time: match.start_time,
                end_time: match.end_time,
                total_minutes: match.total_minutes,
                location: match.location,
                notes: match.notes,
                status: match.status,
                approved_by_user_id: match.approved_by_user_id,
                approved_by_display_name: match.approved_by_display_name,
                approved_at: match.approved_at,
              };
              this.mergeSummary(this.selectedTimesheet);
            }
          }
        },
        error: (err) => {
          this.errorMessage = err instanceof Error ? err.message : 'Unable to load timesheets.';
          this.isLoadingList = false;
        }
      });
  }

  private loadDetail(timesheetId: number): void {
    this.isLoadingDetail = true;
    this.detailError = null;
    this.statusSuccessMessage = null;
    this.timesheetService.getTimesheet(timesheetId).subscribe({
      next: (detail) => {
        this.selectedTimesheet = detail;
        this.isLoadingDetail = false;
      },
      error: (err) => {
        this.detailError = err instanceof Error ? err.message : 'Unable to load timesheet.';
        this.selectedTimesheet = null;
        this.isLoadingDetail = false;
      }
    });
  }

  private loadStaffOptions(): void {
    this.timesheetService.listStaffOptions().subscribe({
      next: (options) => {
        this.staffOptions = options;
      },
      error: () => {
        this.staffOptions = [];
      }
    });
  }

  private mergeSummary(detail: TimesheetDetail): void {
    this.timesheets = this.timesheets.map((summary) =>
      summary.timesheet_id === detail.timesheet_id
        ? {
            ...summary,
            work_date: detail.work_date,
            status: detail.status,
            total_minutes: detail.total_minutes,
            location: detail.location,
            notes: detail.notes,
            approved_by_user_id: detail.approved_by_user_id,
            approved_by_display_name: detail.approved_by_display_name,
            approved_at: detail.approved_at,
            has_employee_signature: detail.signatures.some((sig) => sig.signer_role === 'employee'),
            has_manager_signature: detail.signatures.some((sig) => sig.signer_role === 'manager'),
          }
        : summary
    );
  }
}
