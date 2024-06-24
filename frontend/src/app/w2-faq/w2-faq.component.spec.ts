import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { W2FaqComponent } from './w2-faq.component';

describe('W2FaqComponent', () => {
  let component: W2FaqComponent;
  let fixture: ComponentFixture<W2FaqComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ W2FaqComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(W2FaqComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
