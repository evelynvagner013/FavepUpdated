import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class VLibrasService {
  constructor() {}

  initVLibras() {
  if (typeof document !== 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
    script.onload = () => {
      new (window as any).VLibras.Widget('https://vlibras.gov.br/app');
    };
    document.body.appendChild(script);

    const div = document.createElement('div');
    div.innerHTML = `
      <div vw class="enabled">
        <div vw-access-button class="active"></div>
        <div vw-plugin-wrapper>
          <div class="vw-plugin-top-wrapper"></div>
        </div>
      </div>
    `;
    document.body.appendChild(div);
  }
}
}