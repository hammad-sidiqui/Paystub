import { Component, OnInit } from '@angular/core';
import * as jQuery from 'jquery';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {

    (function ($) {
      
      $(function() {
        $('.body-overlay').on('mouseover', function() {
            $('.overlay').show();
        });
        $('.body-overlay').on('mouseout', function() {
            $('.overlay').hide();
        });
      });

    })(jQuery);    

  }

}