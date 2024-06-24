import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validator, Validators } from '@angular/forms';
import { DataService } from '../data.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})

export class HomeComponent implements OnInit {

  homeForm: FormGroup;
  constructor(private formBuilder: FormBuilder, private data: DataService) { }
  
  ngOnInit(): void {
    /* this.configServer.getTestData().subscribe(contact => {
      console.log(contact);
    }) */
    this.homeFormData();
  }

  homeFormData() {
    this.homeForm = this.formBuilder.group({
      state: 'new_york',
      status: 'employee',
      paid: 'salary',
    });
  }
  
  onChange( field ) {
    if( field == 'state' ) this.data.changeStubState( this.homeForm.value.state )
    else if( field == 'status' ) this.data.changeStubEmployment( this.homeForm.value.status )
    else if( field == 'paid' ) this.data.changeStubPaid( this.homeForm.value.paid )    
  }

  onSubmit() {
    console.log(this.homeForm);
  }
}
