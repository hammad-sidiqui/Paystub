import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validator, Validators } from '@angular/forms';
import { ConfigService } from '../config.service';
import { DataService } from '../data.service';
import { PersistenceService } from 'angular-persistence';
import { Router } from '@angular/router';
import * as jQuery from 'jquery';

declare let paypal: any;

@Component({
  selector: 'app-stub-form',
  templateUrl: './stub-form.component.html',
  styleUrls: ['./stub-form.component.css']
})

export class StubFormComponent implements OnInit {
  @ViewChild('closePaypalModal') paypalModal;
  
  payStubForm: FormGroup;
  companySubmitted = false; employeeSubmitted = false; salarySubmitted = false;
  success = false;
  showLocation: Boolean = false;
  obervableZipcode = '';
  showStep_1 = true; showStep_2 = false; showStep_3 = false; showStep_4 = false;
  completeStep_1 = false; completeStep_2 = false; completeStep_3 = false; completeStep_4 = false;
  hourly = false; salary = true;
  hourlyIsChecked = false; employeeHireDateIsChecked = false;
  fixedIsChecked = true; variedIsChecked = false;
  paystubImageSrc = '';
  template = 'a';
  stubFile = '';
  state = 'new_york'; empStatus = 'employee'; empPaidStatus = 'salary';    
  curr_date: Date;

  // mask
  maskComPh = false; maskComSsn = false;
  maskEmpSsn = false;

  // upload image
  fileData: File = null;
  previewUrl: any = null;
  fileName = '';

  // paypal
  addScript: Boolean = false;
  addDownloadImageHref: Boolean = false;
  finalAmount = 8.99;

  // additions: FormArray;
  public additions: any[] = [];
  public deductions: any[] = [];
  sameDate: Date;

  constructor(
    private formBuilder: FormBuilder, 
    private configServer: ConfigService, 
    private data: DataService, 
    private persistenceService: PersistenceService,
    private router: Router
  ) {
    this.loadScripts();
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
        console.log('payment done successfully', this.paystubImageSrc);

        // generate image without watermark
        // this.generateImageWithoutWaterMark();

        this.configServer.generateHtmlToImage(this.payStubForm.value, this.template, this.stubFile).subscribe(stubFile => {
          // download paystub image and clear persist data
          this.addDownloadHref();
          console.log('paystub downloaded');
          this.paypalModal.nativeElement.click();

          let dataPersistKeys = Object.keys(this.payStubForm.value);
          dataPersistKeys.forEach(dataPersistKey => {
            this.persistenceService.remove(dataPersistKey, 3);
          });

          this.router.navigate(['/', '/']);
        });

      })
    }
  };

  // for testing
  testDownload() {    
    this.addDownloadHref().then(() => {
      console.log('paystub downloaded');
      this.paypalModal.nativeElement.click();
      let dataPersistKeys = Object.keys(this.payStubForm.value);
      
      dataPersistKeys.forEach(dataPersistKey => {
        this.persistenceService.remove(dataPersistKey, 3);
      });
    })
  }

  ngOnInit(): void {    

    (function ($) {
      
      $(document).ready(function () {
        
        var navListItems = $('ul.setup-panel li a'), allWells = $('.createstub-content');
        allWells.hide();
        
        navListItems.click(function (e) {
          e.preventDefault();
          var $target = $($(this).attr('href')), $item = $(this).closest('li');
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
      
    this.curr_date = new Date();
    this.data.stubState.subscribe( stubState => this.state = stubState );
    this.data.stubEmployment.subscribe( stubEmployment => this.empStatus = stubEmployment );
    this.data.stubPaid.subscribe(stubPaid => {
      this.empPaidStatus = stubPaid;
      this.employmentStatus( stubPaid, false );
    });
    this.data.stubTemplate.subscribe( stubTemplate => this.template = stubTemplate );

    this.paystubFormData();
    
    this.payStubForm.patchValue({ payDate: {
        'year': this.curr_date.getFullYear(),
        'month': this.curr_date.getMonth() + 1,
        'day': this.curr_date.getDate()
      },
      checkNoDate: this.curr_date.getFullYear() + '-' + ('0' + (this.curr_date.getMonth() + 1)).toString().slice(-2) + '-' + ('0' + this.curr_date.getDate()).toString().slice(-2)
    });
    this.sameDate = this.payStubForm.value.checkNoDate;

    this.fetchComapnyInfoPersistence();
    this.fetchEmployeeInfoPersistence();
    this.fetchSalaryInfoPersistence();

    if(!this.addScript) {
      this.addPaypalScript().then(() => {
        paypal.Button.render(this.paypalConfig, '#paypal-checkout-btn');
      })
    }
  }

  addDownloadHref() {    
    // this.addDownloadImageHref = true;
    return new Promise((resolve, reject) => {
      let scriptElem = document.createElement('a');
      scriptElem.href = this.configServer.base_url + '/download/paystub?template=' + this.paystubImageSrc;
      // scriptElem.href = this.configServer.base_url + '/download/paystub?template=assets/media/stubs/samplestub.jpg';
      scriptElem.id = 'download-paystub';
      scriptElem.onload = resolve;
      console.log(scriptElem);
      document.body.appendChild(scriptElem);

      // click to download
      let downloadElement = document.getElementById('download-paystub');
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

  paystubFormData() {
    /* unamePattern = "^[a-z0-9_-]{8,15}$";
    pwdPattern = "^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?!.*\s).{6,12}$";
    mobnumPattern = "^((\\+91-?)|0)?[0-9]{10}$";
    emailPattern = "^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$"; 
    numPattern = "^[0-9]$"; */
    this.payStubForm = this.formBuilder.group({
      companyName: ['', Validators.required],
      companyLogo: '',
      companyAddress: ['', Validators.required],
      companyZipCode: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(5)]],
      companyLocation: [''],
      // Validators.pattern("^((\\+91-?)|0)?[0-9]{10}$"), 
      companyPhoneNumber: ['', [Validators.minLength(10), Validators.maxLength(14)]],
      companyEinSsn: ['', [Validators.minLength(9), Validators.maxLength(10)]],

      employeeState: [ this.state, Validators.required ],
      employeeName: ['', Validators.required],
      employeeSSN: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(11)]],
      employeeAddress: ['', Validators.required],
      employeeZipCode: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(5)]],
      employeeId: '',
      employeeMaritalStatus: '',
      employeeNoOfDependants: '',
      employeeAgeBlind: '',
      
      employmentStatus: this.empPaidStatus,
      salaryAnnual: [ '', [Validators.pattern("^[0-9]*$")] ],
      hourlyRate: [ '', [Validators.pattern("^[0-9]*$")] ],
      email: ['', [Validators.required, Validators.email, Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$')]],
      payFrequency: ['weekly', Validators.required],
      payRecord: '',
      payDate: ['', Validators.required],
      employeeHireDate: '',
      showHourlyRate: false,
      hourlyRatePerPayPeriod: 80,
      checkNoDate: ['', Validators.required],
      checkNo: [Math.floor(1000 + Math.random() * 9000), Validators.required],
      fixHrs: 80,
      variedMinHrs: 80,
      variedMaxHrs: 120,
      additions: this.formBuilder.array([]),
      deductions: this.formBuilder.array([]),
      waterMarkUrl: this.configServer.base_url
    });    
  }

  addAdditions() {
    this.additions.push({
      id: this.additions.length + 1,
      description: '',
      payDate: '',
      currentAmount: '',
      ytdAmount: '',
    });

    // this.demoArray.push(this.createItem());

  }
  
  additionDesc( value, i ) {
    this.additions[i].description = value;
    this.additions[i].payDate = this.sameDate;
  }

  /* additionPayDate( value, i ) {
    this.additions[i].payDate = value;
  } */

  additionCurrAmount( value, i ) {
    this.additions[i].currentAmount = (value) ?? parseInt(value);
  }

  additionYtdAmount( value, i ) {
    this.additions[i].ytdAmount = (value) ?? parseInt(value);
  }

  deductionDesc( value, i ) {
    this.deductions[i].description = value;
    this.deductions[i].payDate = this.sameDate;
  }

  /* deductionPayDate( value, i ) {
    this.deductions[i].payDate = value;
  } */

  deductionCurrAmount( value, i ) {
    this.deductions[i].currentAmount = (value) ?? parseInt(value);
  }

  deductionYtdAmount( value, i ) {
    this.deductions[i].ytdAmount = (value) ?? parseInt(value);
  }

  get demoArray() {
    return this.payStubForm.get('additions') as FormArray;
  }

  createItem(): FormGroup {
    return this.formBuilder.group({
      description: ['', Validators.required],
      payDate: ['', Validators.required],
      currentAmount: ['', Validators.required],
      ytdAmount: ['', Validators.required]
    });
  }

  /* addAdditions(): void {
    this.additions = this.payStubForm.get('additions') as FormArray;
    this.additions.push(this.createItem());
  } */

  removeAdditions(i: number) {
    this.additions.splice(i, 1);
  }

  addDeductions() {
    this.deductions.push({
      id: this.deductions.length + 1,
      description: '',
      payDate: '',
      currentAmount: '',
      ytdAmount: '',
    });
  }

  removeDeductions(i: number) {
    this.deductions.splice(i, 1);
  }

  handleCompanyInfo(response = false) {
    this.companySubmitted = true;
    let companyControls = this.payStubForm.controls;
    
    if( companyControls.companyName.status == 'VALID'
      && companyControls.companyAddress.status == 'VALID'
      && companyControls.companyZipCode.status == 'VALID'
      && companyControls.companyEinSsn.status == 'VALID'
      && companyControls.companyPhoneNumber.status == 'VALID'
    ) {

      if( this.obervableZipcode == '' || ( this.obervableZipcode != this.payStubForm.value.companyZipCode ) ) {
        this.configServer.locationByZipCode({'zipcode': this.payStubForm.value.companyZipCode}).subscribe(response => {
          if( response['status'] ) {
            this.showLocation = true;
            this.payStubForm.patchValue({ companyLocation: response['location'] });
            this.obervableZipcode = this.payStubForm.value.companyZipCode;
          } else {
            this.showLocation = false;
          }
        });
      }
      
      this.payStubForm.patchValue({
        companyEinSsn: this.payStubForm.value.companyEinSsn.replace(/^(\d{2})(\d{7}).*/, '$1-$2'),
        companyPhoneNumber: this.payStubForm.value.companyPhoneNumber.replace(/^(\d{3})(\d{3})(\d{4}).*/, '($1) $2-$3') 
      });

      if(this.obervableZipcode == this.payStubForm.value.companyZipCode) {
        this.showStep_1 = false;
        this.completeStep_1 = this.showStep_2 = true;
      }      
      
      this.saveComapnyInfo();      

      if(response) return true;      
    } 
    if(response) return false;
  }

  saveComapnyInfo() {
    this.persistenceService.set('companyName', this.payStubForm.value.companyName, { type: 3 });
    this.persistenceService.set('companyLogo', this.payStubForm.value.companyLogo, { type: 3 });
    this.persistenceService.set('companyAddress', this.payStubForm.value.companyAddress, { type: 3 });
    this.persistenceService.set('companyZipCode', this.payStubForm.value.companyZipCode, { type: 3 });
    this.persistenceService.set('companyEinSsn', this.payStubForm.value.companyEinSsn, { type: 3 });
    this.persistenceService.set('companyPhoneNumber', this.payStubForm.value.companyPhoneNumber, { type: 3 });
  }

  fetchComapnyInfoPersistence() {
    if( this.persistenceService.get('companyName', 3) ) {
      this.payStubForm.patchValue({ companyName: this.persistenceService.get('companyName', 3) });
    }
    if( this.persistenceService.get('companyLogo', 3) ) {
      this.payStubForm.patchValue({ companyLogo: this.persistenceService.get('companyLogo', 3) });
    }
    if( this.persistenceService.get('companyAddress', 3) ) {
      this.payStubForm.patchValue({ companyAddress: this.persistenceService.get('companyAddress', 3) });
    }
    if( this.persistenceService.get('companyZipCode', 3) ) {
      this.payStubForm.patchValue({ companyZipCode: this.persistenceService.get('companyZipCode', 3) });
    }
    if( this.persistenceService.get('companyEinSsn', 3) ) {
      this.payStubForm.patchValue({ companyEinSsn: this.persistenceService.get('companyEinSsn', 3) });
    }
    if( this.persistenceService.get('companyPhoneNumber', 3) ) {
      this.payStubForm.patchValue({ companyPhoneNumber: this.persistenceService.get('companyPhoneNumber', 3) });
    }
  }

  handleEmployeeInfo(response = false) {
    this.employeeSubmitted = true;
    let employeeControls = this.payStubForm.controls;
    if( employeeControls.employeeState.status == 'VALID'
      && employeeControls.employeeName.status == 'VALID'
      && employeeControls.employeeSSN.status == 'VALID'
      && employeeControls.employeeZipCode.status == 'VALID'
      && employeeControls.employeeAddress.status == 'VALID'
    ) {

      this.payStubForm.patchValue({ 
        employeeSSN: this.payStubForm.value.employeeSSN.replace(/^(\w{3})(\w{2})(\d{4}).*/, '$1-$2-$3')
      });
      
      this.completeStep_2 = this.showStep_3 = true;
      this.showStep_2 = false;
      this.saveEmployeeInfo();
      if(response) return true;
    }
    if(response) return false;
  }

  empSsnDefault() {
    this.maskEmpSsn = true;
    /* if( this.payStubForm.value.employeeSSN.length === 0 ) {
      this.payStubForm.patchValue({ employeeSSN: 'xxxxx-' });
    } */
  }

  saveEmployeeInfo() {
    this.persistenceService.set('employeeState', this.payStubForm.value.employeeState, { type: 3 });
    this.persistenceService.set('employeeName', this.payStubForm.value.employeeName, { type: 3 });
    this.persistenceService.set('employeeSSN', this.payStubForm.value.employeeSSN, { type: 3 });
    this.persistenceService.set('employeeAddress', this.payStubForm.value.employeeAddress, { type: 3 });
    this.persistenceService.set('employeeZipCode', this.payStubForm.value.employeeZipCode, { type: 3 });
    this.persistenceService.set('employeeId', this.payStubForm.value.employeeId, { type: 3 });
    this.persistenceService.set('employeeMaritalStatus', this.payStubForm.value.employeeMaritalStatus, { type: 3 });
    this.persistenceService.set('employeeNoOfDependants', this.payStubForm.value.employeeNoOfDependants, { type: 3 });
    this.persistenceService.set('employeeAgeBlind', this.payStubForm.value.employeeAgeBlind, { type: 3 });
    this.persistenceService.set('empStatus', this.empStatus, { type: 3 });
  }

  fetchEmployeeInfoPersistence() {
    if( this.persistenceService.get('employeeState', 3) ) {
      this.payStubForm.patchValue({ employeeState: this.persistenceService.get('employeeState', 3) });
    }
    if( this.persistenceService.get('employeeName', 3) ) {
      this.payStubForm.patchValue({ employeeName: this.persistenceService.get('employeeName', 3) });
    }
    if( this.persistenceService.get('employeeSSN', 3) ) {
      this.payStubForm.patchValue({ employeeSSN: this.persistenceService.get('employeeSSN', 3) });
    }
    if( this.persistenceService.get('employeeAddress', 3) ) {
      this.payStubForm.patchValue({ employeeAddress: this.persistenceService.get('employeeAddress', 3) });
    }
    if( this.persistenceService.get('employeeZipCode', 3) ) {
      this.payStubForm.patchValue({ employeeZipCode: this.persistenceService.get('employeeZipCode', 3) });
    }
    if( this.persistenceService.get('employeeId', 3) ) {
      this.payStubForm.patchValue({ employeeId: this.persistenceService.get('employeeId', 3) });
    }
    if( this.persistenceService.get('employeeMaritalStatus', 3) ) {
      this.payStubForm.patchValue({ employeeMaritalStatus: this.persistenceService.get('employeeMaritalStatus', 3) });
    }
    if( this.persistenceService.get('employeeNoOfDependants', 3) ) {
      this.payStubForm.patchValue({ employeeNoOfDependants: this.persistenceService.get('employeeNoOfDependants', 3) });
    }
    if( this.persistenceService.get('employeeAgeBlind', 3) ) {
      this.payStubForm.patchValue({ employeeAgeBlind: this.persistenceService.get('employeeAgeBlind', 3) });
    }
    if( this.persistenceService.get('empStatus', 3) ) {
      this.empStatus = this.persistenceService.get('empStatus', 3);
    }
  }

  resetSteps(except = '') {
    this.showStep_1 = this.showStep_2 = this.showStep_3 = this.showStep_4 = false;
    // if(except) { this["expect"] = true; }
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
    console.log(this.payStubForm);
    if(this.payStubForm.invalid) {
      return;
    }
    this.success = true;
  }

  employmentStatus( empStatus, updatePatch = true ) {
    if( empStatus == 'hourly' ) {
      if(updatePatch) this.payStubForm.patchValue({ salaryAnnual: '' });
      this.salary = false; this.hourly = true;
      this.empPaidStatus = 'hourly';
    } else if( empStatus == 'salary' ) {
      if(updatePatch) this.payStubForm.patchValue({ hourlyRate: '' });
      this.hourly = false; this.salary = true;
      this.empPaidStatus = 'salary';
    }
  }
  
  workSchedule( workSchedule ) {
    if( workSchedule == '1' ) {
      this.variedIsChecked = false; this.fixedIsChecked = true;
    } else if( workSchedule == '2' ) {
      this.fixedIsChecked = false; this.variedIsChecked = true;
    }          
  }
  
  sameAsCheckDate() {    
    let payDate = this.payStubForm.value.payDate;
    this.payStubForm.patchValue({
      checkNoDate: payDate.year + '-' + ('0' + payDate.month).toString().slice(-2) + '-' + ('0' + payDate.day).toString().slice(-2)
    });
    this.sameDate = this.payStubForm.value.checkNoDate;    
  }

  handleReviewStub() {
    this.salarySubmitted = true;
    if( this.handleCompanyInfo(true) &&  this.handleEmployeeInfo(true) ) {
      
      let salaryControls = this.payStubForm.controls;
      if(
        (
          (this.salary && salaryControls.salaryAnnual.status == 'VALID')
          || (this.hourly && salaryControls.hourlyRate.status == 'VALID')
        )
        && salaryControls.email.status == 'VALID'
        && salaryControls.payFrequency.status == 'VALID' 
        && salaryControls.payDate.status == 'VALID' 
        && salaryControls.checkNo.status == 'VALID' 
      ) {

        let process = true;

        this.additions.forEach(addition => {
          if(!addition.description) process = false;
          else if(!addition.payDate) process = false;
          else if(!addition.currentAmount) process = false;
          else if(!addition.ytdAmount) process = false;
        });
        
        this.deductions.forEach(deduction => {
          if(!deduction.description) process = false;
          else if(!deduction.payDate) process = false;
          else if(!deduction.currentAmount) process = false;
          else if(!deduction.ytdAmount) process = false;
        });
        
        if( process ) {
          
          this.completeStep_3 = this.showStep_4 = true; this.showStep_3 = false;

          if( this.hourlyIsChecked ) {
            this.payStubForm.value.showHourlyRate = true;
          }
          this.saveSalaryInfo();
          // this.initConfig();
          this.generateHtmlToImage();
        }

      }

    } else {
      window.alert('Please fill out all required fields');
    }

  }

  saveSalaryInfo() {
    this.persistenceService.set('employmentStatus', this.empPaidStatus, { type: 3 });
    this.persistenceService.set('salaryAnnual', this.payStubForm.value.salaryAnnual, { type: 3 });
    this.persistenceService.set('hourlyRate', this.payStubForm.value.hourlyRate, { type: 3 });
    this.persistenceService.set('email', this.payStubForm.value.email, { type: 3 });
    this.persistenceService.set('payFrequency', this.payStubForm.value.payFrequency, { type: 3 });
    this.persistenceService.set('payDate', this.payStubForm.value.payDate, { type: 3 });
    this.persistenceService.set('employeeHireDateIsChecked', this.employeeHireDateIsChecked, { type: 3 });
    this.persistenceService.set('hourlyIsChecked', this.hourlyIsChecked, { type: 3 });
    this.persistenceService.set('employeeHireDate', this.payStubForm.value.employeeHireDate, { type: 3 });
    this.persistenceService.set('showHourlyRate', this.payStubForm.value.showHourlyRate, { type: 3 });
    this.persistenceService.set('hourlyRatePerPayPeriod', this.payStubForm.value.hourlyRatePerPayPeriod, { type: 3 });
    this.persistenceService.set('checkNoDate', this.payStubForm.value.checkNoDate, { type: 3 });
    this.persistenceService.set('checkNo', this.payStubForm.value.checkNo, { type: 3 });
    this.persistenceService.set('fixedIsChecked', this.fixedIsChecked, { type: 3 });
    this.persistenceService.set('fixHrs', this.payStubForm.value.fixHrs, { type: 3 });
    this.persistenceService.set('variedIsChecked', this.variedIsChecked, { type: 3 });
    this.persistenceService.set('variedMinHrs', this.payStubForm.value.variedMinHrs, { type: 3 });
    this.persistenceService.set('variedMaxHrs', this.payStubForm.value.variedMaxHrs, { type: 3 });
  }

  fetchSalaryInfoPersistence() {
    if( this.persistenceService.get('employmentStatus', 3) ) {
      this.empPaidStatus = this.persistenceService.get('employmentStatus', 3);      
      this.employmentStatus( this.empPaidStatus );
    }
    if( this.empPaidStatus == 'salary' && this.persistenceService.get('salaryAnnual', 3) ) {
      this.payStubForm.patchValue({ salaryAnnual: this.persistenceService.get('salaryAnnual', 3) });
    }
    if( this.empPaidStatus == 'hourly' && this.persistenceService.get('hourlyRate', 3) ) {
      this.payStubForm.patchValue({ hourlyRate: this.persistenceService.get('hourlyRate', 3) });
    }
    if( this.persistenceService.get('email', 3) ) {
      this.payStubForm.patchValue({ email: this.persistenceService.get('email', 3) });
    }
    if( this.persistenceService.get('payFrequency', 3) ) {
      this.payStubForm.patchValue({ payFrequency: this.persistenceService.get('payFrequency', 3) });
    }
    if( this.persistenceService.get('payDate', 3) ) {
      this.payStubForm.patchValue({ payDate: this.persistenceService.get('payDate', 3) });
    }
    if( this.persistenceService.get('employeeHireDateIsChecked', 3) ) {
      this.employeeHireDateIsChecked = this.persistenceService.get('employeeHireDateIsChecked', 3);
    }
    if( this.employeeHireDateIsChecked && this.persistenceService.get('employeeHireDate', 3) ) {
      this.payStubForm.patchValue({ employeeHireDate: this.persistenceService.get('employeeHireDate', 3) });
    }
    if( this.persistenceService.get('hourlyIsChecked', 3) ) {
      this.hourlyIsChecked = this.persistenceService.get('hourlyIsChecked', 3);
    }    
    if( this.persistenceService.get('showHourlyRate', 3) ) {
      this.payStubForm.patchValue({ showHourlyRate: this.persistenceService.get('showHourlyRate', 3) });
    }
    if( this.persistenceService.get('hourlyRatePerPayPeriod', 3) ) {
      this.payStubForm.patchValue({ hourlyRatePerPayPeriod: this.persistenceService.get('hourlyRatePerPayPeriod', 3) });
    }
    if( this.persistenceService.get('checkNoDate', 3) ) {
      this.payStubForm.patchValue({ checkNoDate: this.persistenceService.get('checkNoDate', 3) });
    }
    if( this.persistenceService.get('checkNo', 3) ) {
      this.payStubForm.patchValue({ checkNo: this.persistenceService.get('checkNo', 3) });
    }
    if( this.persistenceService.get('fixedIsChecked', 3) ) {
      this.fixedIsChecked = this.persistenceService.get('fixedIsChecked', 3);
      if( this.persistenceService.get('fixHrs', 3) ) {
        this.payStubForm.patchValue({ fixHrs: this.persistenceService.get('fixHrs', 3) });
      }
      this.workSchedule(1);
    }
    if( this.persistenceService.get('variedIsChecked', 3) ) {
      this.variedIsChecked = this.persistenceService.get('variedIsChecked', 3);
      if( this.persistenceService.get('variedMinHrs', 3) ) {
        this.payStubForm.patchValue({ variedMinHrs: this.persistenceService.get('variedMinHrs', 3) });
      }
      if( this.persistenceService.get('variedMaxHrs', 3) ) {
        this.payStubForm.patchValue({ variedMaxHrs: this.persistenceService.get('variedMaxHrs', 3) });
      }            
      this.workSchedule(2);
    }
  }

  generateHtmlToImage() {
    /* let stubFile = 'paystub';
    this.paystubImageSrc = `assets/media/stubs/${stubFile}.png`;
    this.showStep_4 = true; */

    // update employee ssn value
    let empSsn = this.payStubForm.value.employeeSSN;
    empSsn = empSsn.replace('xxx-xx-', '');
    this.payStubForm.patchValue({
      employeeSSN: 'xxx-xx-' + empSsn
    });

    // upadte addition deduction in request body
    this.payStubForm.value.additions = this.additions;
    this.payStubForm.value.deductions = this.deductions;

    this.paystubImageSrc = '';
    
    this.configServer.generateHtmlToImage(this.payStubForm.value, this.template).subscribe(filename => {
      if( typeof filename === 'object' ) {
        let stubFile = this.stubFile = Object.values(filename)[0];
        this.paystubImageSrc = `/assets/media/stubs/${stubFile}`;
        // this.paystubImageSrc = __dirname + `/frontend/dist/thepaystubs/assets/media/stubs/${stubFile}`;
        console.log(this.paystubImageSrc);
        this.showStep_4 = true;
      }
    })
  }

  generateImageWithoutWaterMark() {
    this.configServer.generateHtmlToImage(this.payStubForm.value, this.template, this.stubFile).subscribe();
  }

  previewFile(fileInput: any) {
    this.fileData = <File>fileInput.target.files[0];
    this.preview();
  }

  preview() {
    // Show preview 
    var mimeType = this.fileData.type;
    this.fileName = this.fileData.name;    
    if (mimeType.match(/image\/*/) == null) {
      return;
    }

    var reader = new FileReader();      
    reader.readAsDataURL(this.fileData); 
    reader.onload = (_event) => {
      this.previewUrl = reader.result;
      // this.payStubForm.value.companyLogo = this.previewUrl;
      this.payStubForm.patchValue({
        companyLogo: reader.result
      });
      console.log(this.previewUrl);
    }
  }

  loadScripts() {

    /* const externalScriptArray = [
      'https://cdnjs.cloudflare.com/ajax/libs/bootstrap-validator/0.5.3/js/bootstrapValidator.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.3/umd/popper.min.js'
    ];

    for (let i = 0; i < externalScriptArray.length; i++) {
      const scriptTag = document.createElement('script');
      scriptTag.src = externalScriptArray[i];
      scriptTag.type = 'text/javascript';
      scriptTag.async = false;
      scriptTag.charset = 'utf-8';
      document.getElementsByTagName('footer')[0].appendChild(scriptTag);
    } */

  }
}