import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-staff-activity',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './staff-activity.html',
  styleUrls: ['./staff-activity.css']
})
export class StaffActivityComponent implements OnInit {
  logs: any[] = [];

  ngOnInit() {
    const saved = localStorage.getItem('staffActivityLogs');
    this.logs = saved ? JSON.parse(saved) : [];
  }
}
