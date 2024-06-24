import { Component, OnInit } from '@angular/core';
import { DataService } from '../data.service';

@Component({
  selector: 'app-stub-samples',
  templateUrl: './stub-samples.component.html',
  styleUrls: ['./stub-samples.component.css']
})
export class StubSamplesComponent implements OnInit {

  constructor(private data: DataService) { }

  ngOnInit(): void {
    
  }  

  changeTemplate( template ) {
    this.data.changeTemplate( template )
  }

}
