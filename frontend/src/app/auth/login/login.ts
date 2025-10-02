import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router'; // Added RouterModule for routerLink

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule], // Added RouterModule
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  error: string | null = null;

  constructor(private http: HttpClient, private router: Router) {}

  login() {
    this.error = null;
    if (!this.username || !this.password) {
      this.error = 'Please enter both username and password.';
      return;
    }

    // --- MOCK LOGIN LOGIC (Replace with backend API later) ---
    if (this.username === 'admin' && this.password === 'adminpass') {
      console.log('Admin Login Successful (Mock)');
      this.router.navigate(['/admin/dashboard']);
    } else if (this.username === 'staff1' && this.password === 'staffpass1') {
      console.log('Staff Login 1 Successful (Mock)');
      this.router.navigate(['/staff/dashboard']);
    } else if (this.username === 'staff2' && this.password === 'staffpass2') {
      console.log('Staff Login 2 Successful (Mock)');
      this.router.navigate(['/staff/dashboard']);
    } else if (this.username === 'Tesla_420.com' && this.password === 'Temu_123') {
      console.log('Tejinder Successful Login (Mock)');
      this.router.navigate(['/staff/dashboard']);
    } else {
      this.error = 'Invalid username or password.';
    }
    // --- END MOCK LOGIN LOGIC ---
  }
}
