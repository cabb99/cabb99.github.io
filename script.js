document.addEventListener('DOMContentLoaded', () => {
    // Add smooth scrolling to nav links
    const navLinks = document.querySelectorAll('.nav-links a');

    for (const link of navLinks) {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }
});