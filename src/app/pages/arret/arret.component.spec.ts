import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArretComponent } from './arret.component';

describe('ArretComponent', () => {
  let component: ArretComponent;
  let fixture: ComponentFixture<ArretComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArretComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ArretComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
