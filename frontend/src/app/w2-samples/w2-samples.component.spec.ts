import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { W2SamplesComponent } from './w2-samples.component';

describe('W2SamplesComponent', () => {
  let component: W2SamplesComponent;
  let fixture: ComponentFixture<W2SamplesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ W2SamplesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(W2SamplesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
