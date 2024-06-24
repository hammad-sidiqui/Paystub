import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { PersistenceService } from 'angular-persistence';

@Injectable()
export class DataService {
  
  private templateSource = new BehaviorSubject('a');
  private stubPaidSource = new BehaviorSubject('salary');
  private stubEmploymentSource = new BehaviorSubject('employee');
  private stubStateSource = new BehaviorSubject('new_york');

  private w2templateSource = new BehaviorSubject('a');
  private w2StateSource = new BehaviorSubject('new_york');
  private w2TaxYearSource = new BehaviorSubject('2019');
  private w2EinSource = new BehaviorSubject('');

  stubTemplate = this.templateSource.asObservable();
  stubPaid = this.stubPaidSource.asObservable();
  stubEmployment = this.stubEmploymentSource.asObservable();
  stubState = this.stubStateSource.asObservable();

  w2Template = this.w2templateSource.asObservable();
  w2State = this.w2StateSource.asObservable();
  w2TaxYear = this.w2TaxYearSource.asObservable();
  w2Ein = this.w2EinSource.asObservable();

  constructor( private persistenceService: PersistenceService ) { }

  changeTemplate(template: string) {
    this.templateSource.next( template )
    this.persistenceService.set('template', template, { type: 3 });
  }

  changeStubPaid(stubPaid: string) {
    this.stubPaidSource.next( stubPaid )
    this.persistenceService.set('employmentStatus', stubPaid, { type: 3 });
  }

  changeStubEmployment(stubEmployment: string) {
    this.stubEmploymentSource.next( stubEmployment );
    this.persistenceService.set('empStatus', stubEmployment, { type: 3 });
  }

  changeStubState(stubState: string) {
    this.stubStateSource.next( stubState );
    this.persistenceService.set('employeeState', stubState, { type: 3 });
  }

  changeW2Template(template: string) {
    this.w2templateSource.next( template )
    this.persistenceService.set('w2.template', template, { type: 3 });
  }

  changew2State(w2State: string) {
    this.w2StateSource.next( w2State )
    this.persistenceService.set('w2.employeeState', w2State, { type: 3 });
  }

  changeW2TaxYear(w2TaxYear: string) {
    this.w2TaxYearSource.next( w2TaxYear )
    this.persistenceService.set('w2.companyTaxYear', w2TaxYear, { type: 3 });
  }

  changeW2Ein(w2Ein: string) {
    this.w2EinSource.next( w2Ein )
    this.persistenceService.set('w2.employerIdentificationNumber', w2Ein, { type: 3 });
  }

}