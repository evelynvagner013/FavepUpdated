import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent {

  isPrivacyModalOpen: boolean = false;
  isTermsModalOpen: boolean = false;

  openPrivacyPolicyModal(): void {
    this.isPrivacyModalOpen = true;
  }

  closePrivacyPolicyModal(): void {
    this.isPrivacyModalOpen = false;
  }

  openTermsAndConditionsModal(): void {
    this.isTermsModalOpen = true;
  }

  closeTermsAndConditionsModal(): void {
    this.isTermsModalOpen = false;
  }
}