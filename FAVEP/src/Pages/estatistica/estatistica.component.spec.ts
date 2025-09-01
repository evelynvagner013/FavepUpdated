import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstatisticaComponent } from './estatistica.component';

describe('EstatisticaComponent', () => {
  let component: EstatisticaComponent;
  let fixture: ComponentFixture<EstatisticaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EstatisticaComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EstatisticaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
