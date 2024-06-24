import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validator, Validators } from '@angular/forms';

@Component({
  selector: 'app-order-resend',
  templateUrl: './order-resend.component.html',
  styleUrls: ['./order-resend.component.css']
})
export class OrderResendComponent implements OnInit {

  orderResendForm: FormGroup;
  maskEmpSsn = false;

  constructor(
    private formBuilder: FormBuilder, 
  ) { }

  ngOnInit(): void {
    this.orderResendFormData();
  }

  orderResendFormData() {
    this.orderResendForm = this.formBuilder.group({
      form: ['paystub', Validators.required],
      email: ['', Validators.required],
      employeeSSN: ['', [Validators.required, Validators.minLength(9), Validators.maxLength(11)]],
    });
  }

  empSsnDefault() {
    this.maskEmpSsn = true;
    if( this.orderResendForm.value.employeeSSN.length === 0 ) {
      this.orderResendForm.patchValue({ employeeSSN: 'xxxxx-' });
    }
  }

}
