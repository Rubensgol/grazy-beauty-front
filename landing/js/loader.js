async function loadSections() {
  const sections = [
    { id: 'header-placeholder', file: 'landing/sections/header.html' },
    { id: 'hero-placeholder', file: 'landing/sections/hero.html' },
    { id: 'about-placeholder', file: 'landing/sections/about.html' },
    { id: 'courses-placeholder', file: 'landing/sections/courses.html' },
    { id: 'booking-placeholder', file: 'landing/sections/servicos.html' },
    { id: 'portfolio-placeholder', file: 'landing/sections/portfolio.html' },
    { id: 'contact-placeholder', file: 'landing/sections/contact.html' },
    { id: 'footer-placeholder', file: 'landing/sections/footer.html' }
  ];

  try {
    const promises = sections.map(async (section) => {
      try {
        const response = await fetch(section.file);
        if (!response.ok) throw new Error(`Failed to load ${section.file}: ${response.statusText}`);
        const html = await response.text();
        return { id: section.id, html };
      } catch (error) {
        console.error(error);
        return null;
      }
    });

    const results = await Promise.all(promises);

    results.forEach(result => {
      if (result) {
        const placeholder = document.getElementById(result.id);
        if (placeholder) {
          placeholder.outerHTML = result.html;
        }
      }
    });

  } catch (error) {
    console.error('Error loading sections:', error);
  }

  window.dispatchEvent(new Event('sectionsLoaded'));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadSections);
} else {
  loadSections();
}
