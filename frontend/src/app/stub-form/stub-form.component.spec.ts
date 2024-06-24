import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { StubFormComponent } from './stub-form.component';

describe('StubFormComponent', () => {
  let component: StubFormComponent;
  let fixture: ComponentFixture<StubFormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ StubFormComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StubFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
