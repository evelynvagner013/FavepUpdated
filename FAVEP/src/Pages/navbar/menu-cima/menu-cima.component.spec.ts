import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MenuCimaComponent } from './menu-cima.component';

describe('MenuCimaComponent', () => {
  let component: MenuCimaComponent;
  let fixture: ComponentFixture<MenuCimaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuCimaComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MenuCimaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
