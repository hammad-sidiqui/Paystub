import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { W2CreatorComponent } from './w2-creator.component';

describe('W2CreatorComponent', () => {
  let component: W2CreatorComponent;
  let fixture: ComponentFixture<W2CreatorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ W2CreatorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(W2CreatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
