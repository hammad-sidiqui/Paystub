import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { W2FormComponent } from './w2-form.component';

describe('W2FormComponent', () => {
  let component: W2FormComponent;
  let fixture: ComponentFixture<W2FormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ W2FormComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(W2FormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
