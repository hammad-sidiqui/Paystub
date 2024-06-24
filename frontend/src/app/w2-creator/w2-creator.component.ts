import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { DataService } from '../data.service';

@Component({
  selector: 'app-w2-creator',
  templateUrl: './w2-creator.component.html',
  styleUrls: ['./w2-creator.component.css']
})

export class W2CreatorComponent implements OnInit {

  w2CreatorForm: FormGroup;

  constructor(private formBuilder: FormBuilder, private data: DataService) { }

  ngOnInit(): void {
    this.w2CreatorFormData();
  }

  w2CreatorFormData() {
    this.w2CreatorForm = this.formBuilder.group({
      w2TaxYear: '2019',
      w2Ein: '',
      w2State: 'new_york'
    });
  }

  onChange( field ) {
    if( field == 'state' ) this.data.changew2State( this.w2CreatorForm.value.w2State )
    else if( field == 'taxYear' ) this.data.changeW2TaxYear( this.w2CreatorForm.value.w2TaxYear )
    else if( field == 'w2Ein' ) this.data.changeW2Ein( this.w2CreatorForm.value.w2Ein )
  }

  onSubmit() {
    console.log('submit!');
  }
}
