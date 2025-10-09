import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { AuthService } from '../../auth/auth.service';


@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css']
})
export class AdminDashboardComponent implements OnInit {
  searchTerm: string = '';
  selectedField: string = '';

  currentUserName: string = '';
  currentUserId: number | null = null;

  enquiries: any[] = [];
  quotesBookings: any[] = [];
  recycleBin: any[] = [];
  activeStaff: number = 0;

   constructor(private auth: AuthService) {}

  ngOnInit() {
    this.loadData();
    this.cleanRecycleBin();

    // Placeholder until backend is ready
    this.activeStaff = 5;
    const authUser = this.auth.getUser<any>();
    if (authUser) {
            const maybeId = Number(authUser.user_id);
      this.currentUserId = Number.isInteger(maybeId) && maybeId > 0 ? maybeId : null;
      const real = typeof authUser.real_name === 'string' ? authUser.real_name.trim() : '';
      const uname = typeof authUser.user_name === 'string' ? authUser.user_name.trim() : '';
      this.currentUserName = real || uname;
    }
    
  }

  loadData() {
    const savedEnquiries = localStorage.getItem('staffEnquiries');
    this.enquiries = savedEnquiries ? JSON.parse(savedEnquiries) : [];

    const savedQuotes = localStorage.getItem('customerEnquiries');
    this.quotesBookings = savedQuotes ? JSON.parse(savedQuotes) : [];

    const savedBin = localStorage.getItem('recycleBin');
    this.recycleBin = savedBin ? JSON.parse(savedBin) : [];
  }

  saveData() {
    localStorage.setItem('staffEnquiries', JSON.stringify(this.enquiries));
    localStorage.setItem('customerEnquiries', JSON.stringify(this.quotesBookings));
    localStorage.setItem('recycleBin', JSON.stringify(this.recycleBin));
  }

  filterItems(items: any[]) {
    if (!this.searchTerm) return items;
    const query = this.searchTerm.trim().toLowerCase();

    if (this.selectedField) {
      return items.filter(item =>
        item[this.selectedField]?.toString().toLowerCase().includes(query)
      );
    }

    return items.filter(item =>
      Object.values(item).some(val =>
        val ? val.toString().toLowerCase().includes(query) : false
      )
    );
  }

  updateStatus(item: any, status: string) {
    item.status = status;
    this.saveData();
  }

  getPendingCount(): number {
    return this.quotesBookings.filter(q => q.status !== 'Resolved').length;
  }

  getTotalClients(): number {
    const emails = this.quotesBookings.map(q => q.email).concat(this.enquiries.map(e => e.email));
    const unique = new Set(emails.filter(e => e));
    return unique.size;
  }

  deleteEntry(item: any, type: 'enquiry' | 'quote') {
    this.recycleBin.push({ ...item, type, deletedAt: new Date().toISOString() });
    if (type === 'enquiry') {
      this.enquiries = this.enquiries.filter(e => e.id !== item.id);
    } else {
      this.quotesBookings = this.quotesBookings.filter(q => q.id !== item.id);
    }
    this.saveData();
  }

  restoreItem(item: any) {
    if (item.type === 'enquiry') {
      this.enquiries.push(item);
    } else {
      this.quotesBookings.push(item);
    }
    this.recycleBin = this.recycleBin.filter(i => i !== item);
    this.saveData();
  }

  permanentDelete(item: any) {
    this.recycleBin = this.recycleBin.filter(i => i !== item);
    this.saveData();
  }

  cleanRecycleBin() {
    const now = new Date();
    this.recycleBin = this.recycleBin.filter(item => {
      const deletedAt = new Date(item.deletedAt);
      const diffDays = (now.getTime() - deletedAt.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 30;
    });
    this.saveData();
  }

  exportToExcel(type: 'enquiry' | 'quote') {
    const data = type === 'enquiry' ? this.enquiries : this.quotesBookings;
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, type === 'enquiry' ? 'Enquiries' : 'Quotes');
    XLSX.writeFile(workbook, `${type}-export.xlsx`);
  }

  exportToCSV(type: 'enquiry' | 'quote') {
    const data = type === 'enquiry' ? this.enquiries : this.quotesBookings;
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${type}-export.csv`);
  }

  exportToPDF(type: 'enquiry' | 'quote') {
    const data = type === 'enquiry' ? this.enquiries : this.quotesBookings;
    const doc: any = new jsPDF();
    const columns = Object.keys(data[0] || {}).map(key => ({ header: key, dataKey: key }));
    doc.autoTable({ columns, body: data });
    doc.save(`${type}-export.pdf`);
  }
}
