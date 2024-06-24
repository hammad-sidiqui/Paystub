import { Component, OnInit } from '@angular/core';
import * as $ from 'jquery';

@Component({
  selector: 'app-stub-faq',
  templateUrl: './stub-faq.component.html',
  styleUrls: ['./stub-faq.component.css']
})
export class StubFaqComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
    $( document ).ready(function() {
    function toggleIcon(e) {
      $(e.target)
          .prev('.panel-heading')
          .find(".more-less")
          .toggleClass('fa-plus fa-minus');
  }
  $('.panel-group').on('hidden.bs.collapse', toggleIcon);
  $('.panel-group').on('shown.bs.collapse', toggleIcon);
  });


  }

}
