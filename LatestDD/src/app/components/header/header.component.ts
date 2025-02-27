import { Component } from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-header',
  imports: [MatSlideToggleModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  reload(){
    const logo = document.getElementById("imgtag");

if (logo) {
  logo.addEventListener("click", () => {
    window.location.reload(); // Reloads the page
  });
}
}
}
