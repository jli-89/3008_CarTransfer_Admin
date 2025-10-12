import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-staff-timesheet',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './staff-timesheet.html',
  styleUrls: ['./staff-timesheet.css']
})
export class StaffTimesheetComponent implements OnInit, AfterViewInit {
  @ViewChild('sigPad', { static: false }) sigPad!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private drawing = false;

  staffName: string = '';
  startDate: string = '';
  endDate: string = '';
  start: string = '';
  end: string = '';

  ngOnInit() {}

  ngAfterViewInit() {
    const canvas = this.sigPad.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.strokeStyle = '#000';

    // Mouse events
    canvas.addEventListener('mousedown', (e) => this.startDraw(e));
    canvas.addEventListener('mousemove', (e) => this.draw(e));
    canvas.addEventListener('mouseup', () => this.stopDraw());
    canvas.addEventListener('mouseleave', () => this.stopDraw());

    // Touch events
    canvas.addEventListener('touchstart', (e) => this.startDraw(e));
    canvas.addEventListener('touchmove', (e) => this.draw(e));
    canvas.addEventListener('touchend', () => this.stopDraw());
  }

  startDraw(event: MouseEvent | TouchEvent) {
    this.drawing = true;
    this.ctx.beginPath();
    const pos = this.getPosition(event);
    this.ctx.moveTo(pos.x, pos.y);
  }

  draw(event: MouseEvent | TouchEvent) {
    if (!this.drawing) return;
    event.preventDefault(); // ✅ stop page scrolling on mobile
    const pos = this.getPosition(event);
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
  }

  stopDraw() {
    this.drawing = false;
    this.ctx.beginPath();
  }

  getPosition(event: MouseEvent | TouchEvent): { x: number; y: number } {
    const rect = this.sigPad.nativeElement.getBoundingClientRect();
    if (event instanceof MouseEvent) {
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    } else {
      return { x: event.touches[0].clientX - rect.left, y: event.touches[0].clientY - rect.top };
    }
  }

  clearSignature() {
    this.ctx.clearRect(0, 0, this.sigPad.nativeElement.width, this.sigPad.nativeElement.height);
  }

  calculateHours(): string {
    if (!this.startDate || !this.endDate || !this.start || !this.end) return '0h 0m';

    const startDateTime = new Date(`${this.startDate}T${this.start}:00`);
    const endDateTime = new Date(`${this.endDate}T${this.end}:00`);

    // allow negative values
    const diffMs = endDateTime.getTime() - startDateTime.getTime();
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.trunc(totalMinutes / 60);
    const minutes = Math.abs(totalMinutes % 60);

    return `${hours}h ${minutes}m`;
  }

  submitTimesheet() {
    if (!this.staffName || !this.startDate || !this.endDate || !this.start || !this.end) {
      alert('⚠ Please fill in all fields before submitting.');
      return;
    }

    const sheet = {
      staffName: this.staffName,
      startDate: this.startDate,
      start: this.start,
      endDate: this.endDate,
      end: this.end,
      totalHours: this.calculateHours(),
      signature: this.sigPad.nativeElement.toDataURL()
    };

    const saved = localStorage.getItem('staffTimesheets');
    const sheets = saved ? JSON.parse(saved) : [];
    sheets.push(sheet);
    localStorage.setItem('staffTimesheets', JSON.stringify(sheets));

    alert('✅ Timesheet submitted successfully!');
    this.clearSignature();
    this.staffName = this.startDate = this.endDate = this.start = this.end = '';
  }
}