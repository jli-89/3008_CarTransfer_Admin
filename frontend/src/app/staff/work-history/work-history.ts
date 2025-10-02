import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-work-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './work-history.html',
  styleUrls: ['./work-history.css']
})
export class WorkHistoryComponent implements OnInit {
  history: any[] = [];
  searchTerm: string = '';

  ngOnInit() {
    const saved = localStorage.getItem('workHistory');
    this.history = saved ? JSON.parse(saved) : [];
  }

  filterHistory() {
    if (!this.searchTerm) return this.history;
    const term = this.searchTerm.toLowerCase();

    return this.history.filter(item =>
      item.staffName?.toLowerCase().includes(term) ||
      item.clients?.some((c: any) =>
        c.clientName?.toLowerCase().includes(term) ||
        c.notes?.toLowerCase().includes(term) ||
        c.actionRequired?.toLowerCase().includes(term)
      ) ||
      item.date?.toLowerCase().includes(term)
    );
  }

  deleteReport(index: number) {
    if (confirm('Are you sure you want to delete this report?')) {
      this.history.splice(index, 1);
      localStorage.setItem('workHistory', JSON.stringify(this.history));
    }
  }
}
