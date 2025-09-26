import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MenuCentralComponent } from './menu-central.component';

describe('MenuCentralComponent', () => {
  let component: MenuCentralComponent;
  let fixture: ComponentFixture<MenuCentralComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuCentralComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MenuCentralComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
