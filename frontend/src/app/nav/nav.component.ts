import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.css']
})
export class NavComponent implements OnInit {

  activeHome = 'active';
  activeContact = '';
  activeReview = '';

  constructor() { }

  ngOnInit(): void {
  }

  resetNav() {
    this.activeHome = this.activeReview = this.activeContact = '';
  }

  activeNav(item) {
    this.resetNav();
    if( item === 'home' ) this.activeHome = 'active';
    else if( item === 'review' ) this.activeReview = 'active';
    else if( item === 'contact' ) this.activeContact = 'active';
  }

}
