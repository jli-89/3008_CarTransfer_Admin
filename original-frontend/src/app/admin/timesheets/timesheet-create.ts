import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  CreateTimesheetPayload,
  SignTimesheetPayload,
  StaffOption,
  TimesheetManagementService,
} from './timesheet-management.service';

interface TimesheetFormState {
  staff_user_id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  location: string;
  notes: string;
}

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
      throw new Error('Unable to initialise signature pad context');
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
  selector: 'app-timesheet-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './timesheet-create.html',
  styleUrls: ['./timesheet-create.css'],
})
export class TimesheetCreateComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('employeeSigCanvas') employeeSigCanvas?: ElementRef<HTMLCanvasElement>;

  staffOptions: StaffOption[] = [];
  form: TimesheetFormState = this.createDefaultForm();

  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  private employeePad?: SignaturePadController;
  constructor(
    private readonly timesheetService: TimesheetManagementService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadStaffOptions();
  }

  ngAfterViewInit(): void {
    if (this.employeeSigCanvas) {
      this.employeePad = new SignaturePadController(this.employeeSigCanvas);
      this.employeePad.init();
    }
  }

  ngOnDestroy(): void {
    this.employeePad?.destroy();
  }

  async submit(): Promise<void> {
    this.errorMessage = null;
    this.successMessage = null;

    const staffId = Number(this.form.staff_user_id);
    if (!Number.isInteger(staffId) || staffId <= 0) {
      this.errorMessage = 'Please choose a staff member.';
      return;
    }
    if (!this.form.work_date) {
      this.errorMessage = 'Work date is required.';
      return;
    }

    const payload: CreateTimesheetPayload = {
      staff_user_id: staffId,
      work_date: this.form.work_date,
      start_time: this.form.start_time || undefined,
      end_time: this.form.end_time || undefined,
      location: this.form.location.trim() ? this.form.location.trim() : undefined,
      notes: this.form.notes.trim() ? this.form.notes.trim() : undefined,
    };

    const total = this.calculateTotalMinutes(this.form.work_date, this.form.start_time, this.form.end_time);
    if (total !== null) {
      payload.total_minutes = total;
    }

    this.isLoading = true;

    try {
      const created = await firstValueFrom(this.timesheetService.createTimesheet(payload));

      const employeeDataUrl = this.employeePad?.toDataUrl();
      if (employeeDataUrl) {
        await firstValueFrom(
          this.timesheetService.signTimesheet(created.timesheet_id, {
            signer_role: 'employee',
            signature_data_url: employeeDataUrl,
          })
        );
      }

      this.successMessage = 'Timesheet created successfully.';
      this.resetForm();
      this.employeePad?.clear();
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : 'Failed to create timesheet.';
    } finally {
      this.isLoading = false;
    }
  }

  clearEmployeeSignature(): void {
    this.employeePad?.clear();
  }

  navigateToList(): void {
    this.router.navigate(['/admin/timesheets']);
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

  private calculateTotalMinutes(date: string, start: string, end: string): number | null {
    if (!date || !start || !end) {
      return null;
    }
    const startDateTime = new Date(`${date}T${start}:00`);
    const endDateTime = new Date(`${date}T${end}:00`);
    if (Number.isNaN(startDateTime.getTime()) || Number.isNaN(endDateTime.getTime())) {
      return null;
    }
    const diffMs = endDateTime.getTime() - startDateTime.getTime();
    return Math.round(diffMs / 60000);
  }

  private createDefaultForm(): TimesheetFormState {
    return {
      staff_user_id: '',
      work_date: '',
      start_time: '',
      end_time: '',
      location: '',
      notes: '',
    };
  }

  resetForm(): void {
    this.form = this.createDefaultForm();
  }
}
