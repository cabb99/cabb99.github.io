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

    // Adjust iframe height dynamically
    const iframe = document.querySelector('.embedded-project');
    if (iframe) {
        iframe.addEventListener('load', () => {
            try {
                const iframeContent = iframe.contentWindow.document.body;
                iframe.style.height = iframeContent.scrollHeight + 'px';
            } catch (error) {
                console.error('Unable to access iframe content:', error);
            }
        });
    }
});