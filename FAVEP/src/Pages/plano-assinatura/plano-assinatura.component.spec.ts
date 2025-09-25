import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanoAssinaturaComponent } from './plano-assinatura.component';

describe('PlanoAssinaturaComponent', () => {
  let component: PlanoAssinaturaComponent;
  let fixture: ComponentFixture<PlanoAssinaturaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanoAssinaturaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlanoAssinaturaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
