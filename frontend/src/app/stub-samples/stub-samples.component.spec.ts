import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { StubSamplesComponent } from './stub-samples.component';

describe('StubSamplesComponent', () => {
  let component: StubSamplesComponent;
  let fixture: ComponentFixture<StubSamplesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ StubSamplesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StubSamplesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
