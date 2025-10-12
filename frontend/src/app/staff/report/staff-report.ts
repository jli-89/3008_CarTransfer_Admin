import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StaffHeaderComponent } from '../../shared/staff-header/staff-header';

@Component({
  selector: 'app-staff-report',
  standalone: true,
  imports: [CommonModule, FormsModule,StaffHeaderComponent],
  templateUrl: './staff-report.html',
  styleUrls: ['./staff-report.css']
})
export class StaffReportComponent {
  date: string = '';
  start: string = '';
  end: string = '';
  staffName: string = '';

  clients: any[] = [
    {
      clientName: '',
      details: '',
      notes: '',
      actionRequired: '',
      solved: ''
    }
  ];

  // Local-only stub until API integration
  constructor() {}

  addClient() {
    this.clients.push({
      clientName: '',
      details: '',
      notes: '',
      actionRequired: '',
      solved: ''
    });
  }

  removeClient(index: number) {
    this.clients.splice(index, 1);
  }
  // Attach Photo temporarily disabled (?????)
  // onPhotoSelected(event: any, client: any) {}
  // removePhoto(client: any) {}

  // Submit and store locally until daily reports API is wired for staff
  submitReport() {
    const newReport = {
      date: this.date,
      start: this.start,
      end: this.end,
      staffName: this.staffName || 'Unknown Staff', // later: from login session
      clients: [...this.clients]
    };

    const saved = localStorage.getItem('workHistory');
    const history = saved ? JSON.parse(saved) : [];
    history.push(newReport);
    localStorage.setItem('workHistory', JSON.stringify(history));

    // Reset form
    this.date = '';
    this.start = '';
    this.end = '';
    this.staffName = '';
    this.clients = [
      { clientName: '', details: '', notes: '', actionRequired: '', solved: '' }
    ];

    alert('Report submitted successfully! It is now available in Work History.');
  }
}


