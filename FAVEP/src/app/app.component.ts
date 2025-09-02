import { Component } from '@angular/core'; 
import { RouterOutlet } from '@angular/router';
import { VLibrasService } from '../services/vlibras.service';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet 
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent { 
  constructor(private vlibras: VLibrasService) {}

  ngOnInit() {
    this.vlibras.initVLibras();
}
}