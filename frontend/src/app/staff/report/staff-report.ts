import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-staff-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
      solved: '',
      photo: null
    }
  ];

  // ✅ Only keep local form data
  constructor() {}

  addClient() {
    this.clients.push({
      clientName: '',
      details: '',
      notes: '',
      actionRequired: '',
      solved: '',
      photo: null
    });
  }

  removeClient(index: number) {
    this.clients.splice(index, 1);
  }

  onPhotoSelected(event: any, client: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        client.photo = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removePhoto(client: any) {
    client.photo = null;
  }

  // ✅ Submit → Save only to Work History
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
      { clientName: '', details: '', notes: '', actionRequired: '', solved: '', photo: null }
    ];

    alert('Report submitted successfully! It is now available in Work History.');
  }
}
