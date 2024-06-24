import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validator, Validators } from '@angular/forms';
import { ConfigService } from '../config.service';
import { DataService } from '../data.service';
import { PersistenceService } from 'angular-persistence';
import { Router } from '@angular/router';
import * as jQuery from 'jquery';

declare let paypal: any;

@Component({
  selector: 'app-w2-form',
  templateUrl: './w2-form.component.html',
  styleUrls: ['./w2-form.component.css']
})

export class W2FormComponent implements OnInit {
  @ViewChild('closePaypalModal') paypalModal;

  w2Form: FormGroup;
  success = false;
  showLocation: Boolean = false;
  obervableZipcode = '';
  companySubmitted = false; employeeSubmitted = false; salarySubmitted = false;
  showStep_1 = true; showStep_2 = false; showStep_3 = false; showStep_4 = false;
  completeStep_1 = false; completeStep_2 = false; completeStep_3 = false; completeStep_4 = false;
  taxCode12a = false; taxCode12b = false; taxCode12c = false; taxCode12d = false; 
  w2ImageSrc = '';
  state = 'new_york'; taxYear = '2019'; ein = '';
  template = 'a';
  w2File = '';
  
  // mask 
  maskEmpSsn = false;

  addScript: Boolean = false;
  addDownloadImageHref: Boolean = false;
  finalAmount = 8.99;

  constructor( 
    private formBuilder: FormBuilder, 
    private configServer: ConfigService, 
    private data: DataService,
    private persistenceService: PersistenceService,
    private router: Router
  ) { }

  ngOnInit(): void {
    
    (function ($) {

      $(document).ready(function () {

        var navListItems = $('ul.setup-panel li a'),
        allWells = $('.createstub-content');
        allWells.hide();
        navListItems.click(function (e) {
          e.preventDefault();
          var $target = $($(this).attr('href')),
          $item = $(this).closest('li');
          if (!$item.hasClass('disabled')) {
            navListItems.closest('li').removeClass('active');
            $item.addClass('active');
            allWells.hide();
            $target.show();
          }
        });
  
        $('ul.setup-panel li.active a').trigger('click');

        $(window).scroll(function () {   
         
          if($(window).scrollTop() > 100) {
             $('#sticky-steps').css('position','fixed');
             $('#sticky-steps').css('top','160px'); 
          }
         
          else if ($(window).scrollTop() <= 100) {
             $('#sticky-steps').css('position','');
             $('#sticky-steps').css('top','');
          }  
             if ($('#sticky-steps').offset().top + $("#sticky-steps").height() > $("#footer").offset().top) {
                 $('#sticky-steps').css('top',-($("#sticky-steps").offset().top + $("#sticky-steps").height() - $("#footer").offset().top));
             }
         });         
      });

      window.addEventListener('load', function () {
        var forms = document.getElementsByClassName('needs-validation');
        var validateGroup = document.getElementsByClassName('validate-me');
        var validation = Array.prototype.filter.call(forms, function (form) {
          form.addEventListener('submit', function (event) {
            if (form.checkValidity() === false) {
              event.preventDefault();
              event.stopPropagation();
            }
            for (var i = 0; i < validateGroup.length; i++) {
              validateGroup[i].classList.add('was-validated');
            }
          }, false);
        });
      }, false);
      
    })(jQuery);    

    this.data.w2State.subscribe(w2State => this.state = w2State );
    this.data.w2TaxYear.subscribe(w2TaxYear => this.taxYear = w2TaxYear );
    this.data.w2Ein.subscribe(w2Ein => this.ein = w2Ein );
    this.data.w2Template.subscribe( w2Template => this.template = w2Template );

    this.w2FormData();

    this.fetchComapanyInfoFromPersistence();
    this.fetchEmployeeInfoFromPersistence();
    this.fetchSalaryInfoFromPersistence();

    if(!this.addScript) {
      this.addPaypalScript().then(() => {
        paypal.Button.render(this.paypalConfig, '#paypal-checkout-btn');
      })
    }
    console.log(this.template);
  }
  
  w2FormData() {
    this.w2Form = this.formBuilder.group({
      companyTaxYear: [ this.taxYear, Validators.required ],
      employerIdentificationNumber: [ this.ein, Validators.required ],
      businessName: ['', Validators.required],
      companyStreetAddress: ['', Validators.required],
      companyZipCode: ['', Validators.required],
      location: [''],
      controlNumber: '',
      stateIDNumber: '',

      employeeFirstName: ['', Validators.required],
      employeeLastName: ['', Validators.required],
      socialSecurityNumber: ['', [Validators.required, Validators.minLength(9), Validators.maxLength(12)]],
      employeeStreetAddress: ['', Validators.required],
      employeeState: [ this.state, Validators.required ],
      employeeZipCode: ['', Validators.required],
      noOfDependants: '',
      noOfExemptions: '',
      annualSalary: ['', Validators.required],

      statutoryEmployee: '',
      retirementPlan: '',
      thirdPartySickPay: '',
      taxCode12a: '',
      amountTaxCode12a: (this.taxCode12a) ? ['', Validators.required] : '',
      taxCode12b: '',
      amountTaxCode12b: (this.taxCode12b) ? ['', Validators.required] : '',
      taxCode12c: '',
      amountTaxCode12c: (this.taxCode12c) ? ['', Validators.required] : '',
      taxCode12d: '',
      amountTaxCode12d: (this.taxCode12d) ? ['', Validators.required] : '',
      email: ['', [Validators.required, Validators.email, Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$')]]
    });
  }

  private paypalConfig = {
    env: 'sandbox',
    client: {
      sandbox: this.configServer.sandboxPaypalSecret,
      propduction: '<your-production-key-here>'
    },
    commit: true,
    payment: (data, actions) => {
      return actions.payment.create({
        payment: {
          transactions: [
            { 
              amount: { total: this.finalAmount, currency: 'USD' } 
            }
          ]
        }
      })
    },
    onAuthorize: (data, actions) => {
      return actions.payment.execute().then((payment) => {
        console.log('payment done successfully', this.w2ImageSrc);

        this.configServer.generateW2HtmlToImage(this.w2Form.value, this.template, this.w2File).subscribe(w2File => {
          // download paystub image and clear persist data
          this.addDownloadHref();
          console.log('w2 paystub downloaded');
          this.paypalModal.nativeElement.click();

          let dataPersistKeys = Object.keys(this.w2Form.value);
          dataPersistKeys.forEach(dataPersistKey => {
            this.persistenceService.remove('w2.' + dataPersistKey, 3);
          });
          
          this.router.navigate(['/', 'w2-creator']);
        });

      })
    }
  };

  addDownloadHref() {    
    // this.addDownloadImageHref = true;
    return new Promise((resolve, reject) => {
      let scriptElem = document.createElement('a');
      scriptElem.href = this.configServer.base_url + '/download/paystub?template=' + this.w2ImageSrc;
      // scriptElem.href = this.configServer.base_url + '/download/paystub?template=assets/media/stubs/samplestub.jpg';
      scriptElem.id = 'download-w2-paystub-' + this.template;
      scriptElem.onload = resolve;
      console.log(scriptElem);
      document.body.appendChild(scriptElem);

      // click to download
      let downloadElement = document.getElementById('download-w2-paystub-' + this.template);
      downloadElement.click();
    })
  }

  addPaypalScript() {
    this.addScript = true;
    return new Promise((resolve, reject) => {
      let scriptElem = document.createElement('script');
      scriptElem.src = 'https://www.paypalobjects.com/api/checkout.js';
      scriptElem.onload = resolve;
      document.body.appendChild(scriptElem);
    })
  }
  
  handleCompanyInfo(response = false) {   
    this.companySubmitted = true; 
    let companyControls = this.w2Form.controls;
    if( companyControls.companyTaxYear.status == 'VALID' 
      && companyControls.employerIdentificationNumber.status == 'VALID'
      && companyControls.businessName.status == 'VALID'
      && companyControls.companyStreetAddress.status == 'VALID'
      && companyControls.companyZipCode.status == 'VALID'
    ) {
      
      if( this.obervableZipcode == '' || ( this.obervableZipcode != this.w2Form.value.companyZipCode ) ) {
        this.configServer.locationByZipCode({'zipcode': this.w2Form.value.companyZipCode}).subscribe(response => {
          if( response['status'] ) {
            this.showLocation = true;
            this.w2Form.patchValue({ location: response['location'] });
            this.obervableZipcode = this.w2Form.value.companyZipCode;
          } else {
            this.showLocation = false;
          }
        });
      }

      if(this.obervableZipcode == this.w2Form.value.companyZipCode) {
        this.showStep_1 = false;
        this.completeStep_1 = this.showStep_2 = true;
      }

      this.saveComapanyInfo();      

      if(response) return true;
    } 
    if(response) return false;
  }

  saveComapanyInfo() {
    this.persistenceService.set('w2.companyTaxYear', this.w2Form.value.companyTaxYear, { type: 3 });
    this.persistenceService.set('w2.employerIdentificationNumber', this.w2Form.value.employerIdentificationNumber, { type: 3 });
    this.persistenceService.set('w2.businessName', this.w2Form.value.businessName, { type: 3 });
    this.persistenceService.set('w2.companyStreetAddress', this.w2Form.value.companyStreetAddress, { type: 3 });
    this.persistenceService.set('w2.companyZipCode', this.w2Form.value.companyZipCode, { type: 3 });
    this.persistenceService.set('w2.controlNumber', this.w2Form.value.controlNumber, { type: 3 });
    this.persistenceService.set('w2.stateIDNumber', this.w2Form.value.stateIDNumber, { type: 3 });
  }

  fetchComapanyInfoFromPersistence() {
    if( this.persistenceService.get('w2.companyTaxYear', 3) ) {
      this.w2Form.patchValue({ companyTaxYear: this.persistenceService.get('w2.companyTaxYear', 3) });
    }
    if( this.persistenceService.get('w2.employerIdentificationNumber', 3) ) {
      this.w2Form.patchValue({ employerIdentificationNumber: this.persistenceService.get('w2.employerIdentificationNumber', 3) });
    }
    if( this.persistenceService.get('w2.businessName', 3) ) {
      this.w2Form.patchValue({ businessName: this.persistenceService.get('w2.businessName', 3) });
    }
    if( this.persistenceService.get('w2.companyStreetAddress', 3) ) {
      this.w2Form.patchValue({ companyStreetAddress: this.persistenceService.get('w2.companyStreetAddress', 3) });
    }
    if( this.persistenceService.get('w2.companyZipCode', 3) ) {
      this.w2Form.patchValue({ companyZipCode: this.persistenceService.get('w2.companyZipCode', 3) });
    }
    if( this.persistenceService.get('w2.controlNumber', 3) ) {
      this.w2Form.patchValue({ controlNumber: this.persistenceService.get('w2.controlNumber', 3) });
    }
    if( this.persistenceService.get('w2.stateIDNumber', 3) ) {
      this.w2Form.patchValue({ stateIDNumber: this.persistenceService.get('w2.stateIDNumber', 3) });
    }
  }

  handleEmployeeInfo(response = false) {    
    this.employeeSubmitted = true;
    let companyControls = this.w2Form.controls;
    if( companyControls.employeeFirstName.status == 'VALID' 
      && companyControls.employeeLastName.status == 'VALID'
      && companyControls.socialSecurityNumber.status == 'VALID'
      && companyControls.employeeStreetAddress.status == 'VALID'
      && companyControls.employeeState.status == 'VALID'
      && companyControls.employeeZipCode.status == 'VALID'
      && companyControls.annualSalary.status == 'VALID'
    ) {
      this.showStep_2 = false;
      this.completeStep_2 = this.showStep_3 = true;
      this.saveEmployeeInfo();
      if(response) return true;
    } 
    if(response) return false;
  }
  
  saveEmployeeInfo() {
    this.persistenceService.set('w2.employeeFirstName', this.w2Form.value.employeeFirstName, { type: 3 });
    this.persistenceService.set('w2.employeeLastName', this.w2Form.value.employeeLastName, { type: 3 });
    this.persistenceService.set('w2.socialSecurityNumber', this.w2Form.value.socialSecurityNumber, { type: 3 });
    this.persistenceService.set('w2.employeeStreetAddress', this.w2Form.value.employeeStreetAddress, { type: 3 });
    this.persistenceService.set('w2.w2.employeeState', this.w2Form.value.employeeState, { type: 3 });
    this.persistenceService.set('w2.employeeZipCode', this.w2Form.value.employeeZipCode, { type: 3 });
    this.persistenceService.set('w2.noOfDependants', this.w2Form.value.noOfDependants, { type: 3 });
    this.persistenceService.set('w2.noOfExemptions', this.w2Form.value.noOfExemptions, { type: 3 });
    this.persistenceService.set('w2.annualSalary', this.w2Form.value.annualSalary, { type: 3 });
  }

  fetchEmployeeInfoFromPersistence() {
    if( this.persistenceService.get('w2.employeeFirstName', 3) ) {
      this.w2Form.patchValue({ employeeFirstName: this.persistenceService.get('w2.employeeFirstName', 3) });
    }
    if( this.persistenceService.get('w2.employeeLastName', 3) ) {
      this.w2Form.patchValue({ employeeLastName: this.persistenceService.get('w2.employeeLastName', 3) });
    }
    if( this.persistenceService.get('w2.socialSecurityNumber', 3) ) {
      this.w2Form.patchValue({ socialSecurityNumber: this.persistenceService.get('w2.socialSecurityNumber', 3) });
    }
    if( this.persistenceService.get('w2.employeeStreetAddress', 3) ) {
      this.w2Form.patchValue({ employeeStreetAddress: this.persistenceService.get('w2.employeeStreetAddress', 3) });
    }
    if( this.persistenceService.get('w2.employeeState', 3) ) {
      this.w2Form.patchValue({ employeeState: this.persistenceService.get('w2.employeeState', 3) });
    }
    if( this.persistenceService.get('w2.employeeZipCode', 3) ) {
      this.w2Form.patchValue({ employeeZipCode: this.persistenceService.get('w2.employeeZipCode', 3) });
    }
    if( this.persistenceService.get('w2.noOfDependants', 3) ) {
      this.w2Form.patchValue({ noOfDependants: this.persistenceService.get('w2.noOfDependants', 3) });
    }
    if( this.persistenceService.get('w2.noOfExemptions', 3) ) {
      this.w2Form.patchValue({ noOfExemptions: this.persistenceService.get('w2.noOfExemptions', 3) });
    }
    if( this.persistenceService.get('w2.annualSalary', 3) ) {
      this.w2Form.patchValue({ annualSalary: this.persistenceService.get('w2.annualSalary', 3) });
    }
  }

  taxCode(targetValue, code) {
    if( code == '12a' ) {
      this.taxCode12a = (targetValue) ? true : false;
    }
    else if( code == '12b' ) {
      this.taxCode12b = (targetValue) ? true : false;
    }
    else if( code == '12c' ) {
      this.taxCode12c = (targetValue) ? true : false;
    }
    else if( code == '12d' ) {
      this.taxCode12d = (targetValue) ? true : false;
    }
  }

  handleReviewStub() {
    this.salarySubmitted = true;
    if( this.handleCompanyInfo(true) &&  this.handleEmployeeInfo(true) ) {
      
      let salaryControls = this.w2Form.controls;
      if( salaryControls.email.status == 'VALID' 
        && salaryControls.amountTaxCode12a.status == 'VALID'
        && salaryControls.amountTaxCode12b.status == 'VALID'
        && salaryControls.amountTaxCode12c.status == 'VALID'
        && salaryControls.amountTaxCode12d.status == 'VALID'
      ) {
        this.showStep_3 = false;
        this.completeStep_3 = this.showStep_4 = true;
        this.saveSalaryInfo();
        this.generateW2HtmlToImage();
      }

    } else {
      window.alert('Please fill out all required fields');
    }
  }

  saveSalaryInfo() {
    this.persistenceService.set('w2.statutoryEmployee', this.w2Form.value.statutoryEmployee, { type: 3 });
    this.persistenceService.set('w2.retirementPlan', this.w2Form.value.retirementPlan, { type: 3 });
    this.persistenceService.set('w2.thirdPartySickPay', this.w2Form.value.thirdPartySickPay, { type: 3 });
    this.persistenceService.set('w2.taxCode12a', this.w2Form.value.taxCode12a, { type: 3 });
    this.persistenceService.set('w2.amountTaxCode12a', this.w2Form.value.amountTaxCode12a, { type: 3 });
    this.persistenceService.set('w2.taxCode12b', this.w2Form.value.taxCode12b, { type: 3 });
    this.persistenceService.set('w2.amountTaxCode12b', this.w2Form.value.amountTaxCode12b, { type: 3 });
    this.persistenceService.set('w2.taxCode12c', this.w2Form.value.taxCode12c, { type: 3 });
    this.persistenceService.set('w2.amountTaxCode12c', this.w2Form.value.amountTaxCode12c, { type: 3 });
    this.persistenceService.set('w2.taxCode12d', this.w2Form.value.taxCode12d, { type: 3 });
    this.persistenceService.set('w2.amountTaxCode12d', this.w2Form.value.amountTaxCode12d, { type: 3 });
    this.persistenceService.set('w2.email', this.w2Form.value.email, { type: 3 });
  }

  fetchSalaryInfoFromPersistence() {
    if( this.persistenceService.get('w2.statutoryEmployee', 3) ) {
      this.w2Form.patchValue({ statutoryEmployee: this.persistenceService.get('w2.statutoryEmployee', 3) });
    }
    if( this.persistenceService.get('w2.retirementPlan', 3) ) {
      this.w2Form.patchValue({ retirementPlan: this.persistenceService.get('w2.retirementPlan', 3) });
    }
    if( this.persistenceService.get('w2.thirdPartySickPay', 3) ) {
      this.w2Form.patchValue({ thirdPartySickPay: this.persistenceService.get('w2.thirdPartySickPay', 3) });
    }
    if( this.persistenceService.get('w2.taxCode12a', 3) ) {
      this.w2Form.patchValue({ taxCode12a: this.persistenceService.get('w2.taxCode12a', 3) });
    }
    if( this.persistenceService.get('w2.amountTaxCode12a', 3) ) {
      this.w2Form.patchValue({ amountTaxCode12a: this.persistenceService.get('w2.amountTaxCode12a', 3) });
    }
    if( this.persistenceService.get('w2.taxCode12b', 3) ) {
      this.w2Form.patchValue({ taxCode12b: this.persistenceService.get('w2.taxCode12b', 3) });
    }
    if( this.persistenceService.get('w2.amountTaxCode12b', 3) ) {
      this.w2Form.patchValue({ amountTaxCode12b: this.persistenceService.get('w2.amountTaxCode12b', 3) });
    }
    if( this.persistenceService.get('w2.taxCode12c', 3) ) {
      this.w2Form.patchValue({ taxCode12c: this.persistenceService.get('w2.taxCode12c', 3) });
    }
    if( this.persistenceService.get('w2.amountTaxCode12c', 3) ) {
      this.w2Form.patchValue({ amountTaxCode12c: this.persistenceService.get('w2.amountTaxCode12c', 3) });
    }
    if( this.persistenceService.get('w2.taxCode12d', 3) ) {
      this.w2Form.patchValue({ taxCode12d: this.persistenceService.get('w2.taxCode12d', 3) });
    }
    if( this.persistenceService.get('w2.amountTaxCode12d', 3) ) {
      this.w2Form.patchValue({ amountTaxCode12d: this.persistenceService.get('w2.amountTaxCode12d', 3) });
    }
    if( this.persistenceService.get('w2.email', 3) ) {
      this.w2Form.patchValue({ email: this.persistenceService.get('w2.email', 3) });
    }
  }

  resetSteps(except = '') {
    this.showStep_1 = this.showStep_2 = this.showStep_3 = this.showStep_4 = false;
    // if(except) { this["expect"] = true; }
  }

  generateW2HtmlToImage() {
    this.w2ImageSrc = '';
    this.configServer.generateW2HtmlToImage(this.w2Form.value, this.template).subscribe(filename => {
      if( typeof filename === 'object' ) {
        let stubFile = this.w2File = Object.values(filename)[0];
        this.w2ImageSrc = `/assets/media/w2/${stubFile}`;
        console.log(this.w2ImageSrc);
      }
    })
  }

  showTab(stepCompleted, tab) {
    if( stepCompleted ) {
      this.resetSteps();
      if(tab == '1') this.showStep_1 = true;
      else if(tab == '2') this.showStep_2 = true;
      else if(tab == '3') this.showStep_3 = true;
      else if(tab == '4') this.showStep_4 = true;
    }    
  }

  onSubmit() {    
    console.log(this.w2Form);
    if(this.w2Form.invalid) {
      return;
    }
    this.success = true;    
  }

}
