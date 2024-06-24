import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderResendComponent } from './order-resend.component';

describe('OrderResendComponent', () => {
  let component: OrderResendComponent;
  let fixture: ComponentFixture<OrderResendComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OrderResendComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OrderResendComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
