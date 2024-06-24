import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { StubFaqComponent } from './stub-faq.component';

describe('StubFaqComponent', () => {
  let component: StubFaqComponent;
  let fixture: ComponentFixture<StubFaqComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ StubFaqComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StubFaqComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
