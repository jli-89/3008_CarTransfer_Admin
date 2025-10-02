import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="search-page-container">
      <h1>Search Our Website</h1>
      <div class="search-input-wrapper">
        <input 
          type="text" 
          placeholder="Search for a page or service..." 
          [(ngModel)]="searchTerm" 
          (input)="filterResults()" 
          class="full-width-search-bar"
        />
        <img src="assets/searchicon.gif" alt="Search" class="search-icon-inside-bar" />
      </div>

      <div class="search-results-list">
        <a 
          *ngFor="let result of filteredResults" 
          [routerLink]="result.link" 
          class="search-result-item"
        >
          {{ result.text }}
        </a>
        
        <div *ngIf="filteredResults.length === 0 && searchTerm.length > 0" class="no-results">
          <p>{{ noResultsMessage }}</p>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./search.css']
})
export class SearchComponent {
  searchTerm = '';
  noResultsMessage = 'We could not find any matches for your search. Please try a different keyword.';
  allSearchResults = [
    { text: 'Home Page', link: '/' },
    { text: 'Quote & Booking Form', link: '/quote' },
    { text: 'Terms and Conditions', link: '/terms' },
    { text: 'Privacy Policy', link: '/privacy' },
    { text: 'Driver Tracking', link: '/track/driver' },
    { text: 'Customer Tracking', link: '/track/customer' },
  ];
  filteredResults = this.allSearchResults;

  filterResults() {
    if (!this.searchTerm) {
      this.filteredResults = [];
      return;
    }
    const lowerCaseTerm = this.searchTerm.toLowerCase();
    this.filteredResults = this.allSearchResults.filter(result =>
      result.text.toLowerCase().includes(lowerCaseTerm)
    );
  }
}