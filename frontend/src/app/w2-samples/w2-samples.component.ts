import { Component, OnInit } from '@angular/core';
import { DataService } from '../data.service';

@Component({
  selector: 'app-w2-samples',
  templateUrl: './w2-samples.component.html',
  styleUrls: ['./w2-samples.component.css']
})
export class W2SamplesComponent implements OnInit {

  constructor( private data: DataService ) { }

  ngOnInit(): void {
  }

  changeTemplate( template ) {
    this.data.changeW2Template( template )
  }

}
