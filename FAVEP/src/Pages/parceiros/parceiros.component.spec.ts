import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common'; // Import CommonModule for *ngFor, etc.
import { ParceirosComponent } from './parceiros.component';
import { MenuCimaComponent } from '../navbar/menu-cima/menu-cima.component'; // Ajuste o caminho
import { FooterComponent } from '../footer/footer.component'; // Ajuste o caminho

// Mock para componentes filhos, se necessário para testes mais isolados
// ou se eles tiverem dependências complexas que dificultem o teste.
// Para este caso, como são componentes de layout, podemos permitir que sejam compilados.

describe('ParceirosComponent', () => {
  let component: ParceirosComponent;
  let fixture: ComponentFixture<ParceirosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule, // Necessário para diretivas como *ngFor, *ngIf
        ParceirosComponent, // Importando o componente standalone
        // MenuCimaComponent, // Se não mockado, o Angular tentará compilar
        // FooterComponent    // Se não mockado, o Angular tentará compilar
      ],
      // Se MenuCimaComponent ou FooterComponent não forem standalone e tiverem dependências,
      // pode ser necessário declará-los ou usar NO_ERRORS_SCHEMA (menos ideal).
      // Como eles são standalone no contexto do pedido, importá-los diretamente em
      // ParceirosComponent já resolve suas dependências.
    })
    .compileComponents();

    fixture = TestBed.createComponent(ParceirosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize com lista de parceiros', () => {
    component.ngOnInit(); // Chama ngOnInit para popular os dados
    expect(component.parceiros.length).toBeGreaterThan(0);
    // Você pode adicionar mais testes para verificar o conteúdo dos parceiros
    expect(component.parceiros[0].nome).toEqual('AgroTech Solutions');
  });

  it('should render partner cards', () => {
    component.ngOnInit();
    fixture.detectChanges(); // Atualiza o DOM com os dados dos parceiros
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('.partner-card').length).toEqual(component.parceiros.length);
    expect(compiled.querySelector('.partner-card .partner-name')?.textContent).toContain('AgroTech Solutions');
  });

  it('should display no partners message if partners array is empty', () => {
    component.parceiros = []; // Limpa os parceiros
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.partner-card')).toBeNull();
    expect(compiled.querySelector('.col-12.text-center p')?.textContent).toContain('Nenhum parceiro encontrado no momento.');
  });

});
