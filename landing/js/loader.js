async function loadSections() {
  const sections = [
    { id: 'header-placeholder', file: 'landing/sections/header.html' },
    { id: 'hero-placeholder', file: 'landing/sections/hero.html' },
    { id: 'about-placeholder', file: 'landing/sections/about.html' },
    { id: 'courses-placeholder', file: 'landing/sections/courses.html' },
    { id: 'booking-placeholder', file: 'landing/sections/booking.html' },
    { id: 'portfolio-placeholder', file: 'landing/sections/portfolio.html' },
    { id: 'contact-placeholder', file: 'landing/sections/contact.html' },
    { id: 'footer-placeholder', file: 'landing/sections/footer.html' }
  ];

  for (const section of sections) {
    try {
      const response = await fetch(section.file);
      if (response.ok) {
        const html = await response.text();
        const placeholder = document.getElementById(section.id);
        if (placeholder) {
          placeholder.outerHTML = html;
        }
      } else {
        console.error(`Failed to load ${section.file}:`, response.statusText);
      }
    } catch (error) {
      console.error(`Error loading ${section.file}:`, error);
    }
  }

  window.dispatchEvent(new Event('sectionsLoaded'));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadSections);
} else {
  loadSections();
}
