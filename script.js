document.addEventListener('DOMContentLoaded', () => {
  const iframe = document.querySelector('iframe.embedded-project') || document.querySelector('iframe');
  const storage = window.localStorage;
  const sectionIds = [
    'home',
    'about','education','experience','projects',
    'publications','awards','mentoring','skills'
  ];

  // Send locale & theme to iframe
  const postSettings = () => {
    const locale = document.documentElement.lang || 'en';
    const theme  = document.documentElement.getAttribute('data-theme') || 'light';
    iframe?.contentWindow.postMessage({ locale, theme }, '*');
  };

  // Init locale & theme from localStorage
  if (storage.getItem('locale')) {
    document.documentElement.lang = storage.getItem('locale');
  }
  if (storage.getItem('theme')) {
    const th = storage.getItem('theme');
    document.documentElement.setAttribute('data-theme', th);
    document.body.classList.toggle('dark-theme', th === 'dark');
  }

  // Language dropdown toggle & selection
  const dropdown = document.querySelector('.dropdown');
  if (dropdown) {
    const btn  = dropdown.querySelector('button');
    const menu = dropdown.querySelector('.menu');

    btn.addEventListener('click', e => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
      btn.setAttribute('aria-expanded', dropdown.classList.contains('open'));
    });

    document.addEventListener('click', () => {
      if (dropdown.classList.contains('open')) {
        dropdown.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });

    menu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const img = a.querySelector('img');
        btn.querySelector('img').src = img.src;
        btn.querySelector('img').alt = img.alt;
        dropdown.classList.remove('open');
        btn.setAttribute('aria-expanded','false');
        // ...locale logic here if needed...
        const lang = a.textContent.includes('Español') ? 'es' : 'en';
        document.documentElement.lang = lang;
        storage.setItem('locale', lang);
        render(window.config.sections);
        renderHeader(window.config.header);
        postSettings();
      });
    });
  }

  // Theme toggle
  document.getElementById('theme-toggle')
    ?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', current);
      document.body.classList.toggle('dark-theme', current === 'dark');
      storage.setItem('theme', current);
      postSettings();
    });

  // Fetch config and render once
  fetch('config.json')
    .then(r => r.json())
    .then(cfg => {
      window.config = cfg;
      renderHeader(cfg.header);
      render(cfg.sections);
      postSettings();
    })
    .catch(console.error);

  // Render header logo and nav links
  function renderHeader(headerCfg) {
    const locale = document.documentElement.lang || 'en';
    // logo
    const logoEl = document.querySelector('header .logo');
    if (logoEl) logoEl.textContent = headerCfg.logo;
    // nav links
    document.querySelectorAll('header .nav-links a').forEach((link, i) => {
      const item = headerCfg.navLinks[i];
      if (!item) return;
      link.textContent = item.label[locale] ?? item.label.en;
      link.href = `#${item.id}`;
    });
  }

  // --- Unified Card Style Skills Viewer Renderer ---
  function renderSkillsViewer(skillsData, lang) {
    const container = document.getElementById('skills-container');
    if (!container) return;
    container.innerHTML = '';
    const cards = document.createElement('div');
    cards.className = 'cards';
    (skillsData || []).forEach(section => {
      // Always use English for data-category
      let categoryEn = section.category?.en || section.category;
      let items = [];
      if (section.subcategories) {
        section.subcategories.forEach(sub => {
          (sub.items || []).forEach(item => {
            items.push({
              label: item[lang] || item.en || item,
              category: categoryEn
            });
          });
        });
      } else if (section.items) {
        (section.items || []).forEach(item => {
          items.push({
            label: item[lang] || item.en || item,
            category: categoryEn
          });
        });
      }
      items.forEach(skill => {
        const card = document.createElement('div');
        card.className = 'card';
        card.setAttribute('data-category', skill.category); // always English
        const span = document.createElement('span');
        span.textContent = skill.label;
        card.appendChild(span);
        cards.appendChild(card);
      });
    });
    container.appendChild(cards);
  }

  // Generic renderer for all sections
  function render(sectionsCfg) {
    const lang = document.documentElement.lang || 'en';
    sectionIds.forEach(id => {
      const secCfg = sectionsCfg[id];
      const secEl  = document.getElementById(id);
      if (!secCfg || !secEl) return;

      // Update title
      const titleEl = secEl.querySelector('h2');
      if (titleEl) {
        titleEl.textContent =
          secCfg.title?.[lang] ?? secCfg.title?.en;
      }

      // Update subtitle for home section
      if (id === 'home' && secCfg.subtitle) {
        const subtitleEl = secEl.querySelector('.home-subtitle');
        if (subtitleEl) {
          subtitleEl.textContent = secCfg.subtitle[lang] ?? secCfg.subtitle.en;
        }
      }

      // --- Render skills viewer before list/entries check ---
      if (id === 'skills') {
        renderSkillsViewer(sectionsCfg.skills, lang);
        return;
      }

      if (id === 'about') {
        // Update <p> for about section
        const pEl = secEl.querySelector('p');
        if (pEl) {
          pEl.innerHTML = secCfg.content?.[lang] ?? secCfg.content?.en;
        }
        return;
      }

      // Update list‐type content
      const list = secEl.querySelector('ul');
      if (!list || !secCfg.entries) return;
      list.innerHTML = '';

      secCfg.entries.forEach(entry => {
        switch (id) {
          case 'about': {
            const li = document.createElement('li');
            li.innerHTML = secCfg.content?.[lang] ?? secCfg.content?.en;
            list.appendChild(li);
            break;
          }
          case 'education': {
            // Remove any existing .education-list
            let eduList = secEl.querySelector('.education-list');
            if (eduList) eduList.remove();
            eduList = document.createElement('div');
            eduList.className = 'education-list';
            (sectionsCfg.education.entries || []).forEach(entry => {
              const card = document.createElement('div');
              card.className = 'education-card';
              let degree = entry.degree[lang] || entry.degree.en || entry.degree;
              let inst = entry.institution;
              let date = entry.date;
              let diss = '';
              if (entry.dissertation && entry.dissertation.title) {
                let dissTitle = entry.dissertation.title[lang] || entry.dissertation.title.en || entry.dissertation.title;
                if (entry.dissertation.url) {
                  diss = `<span class="edu-diss">Dissertation: <a class="dissertation-link" href="${entry.dissertation.url}" target="_blank">${dissTitle}</a></span>`;
                } else {
                  diss = `<span class="edu-diss">Dissertation: ${dissTitle}</span>`;
                }
              } else if (entry.details && entry.details[lang]) {
                diss = `<span class="edu-diss">${entry.details[lang]}</span>`;
              }
              card.innerHTML = `
                <span class="edu-degree">${degree}</span>
                <span class="edu-inst">${inst}</span>
                <span class="edu-date">${date}</span>
                ${diss}
              `;
              eduList.appendChild(card);
            });
            // Remove all children except h2
            Array.from(secEl.children).forEach(child => {
              if (child.tagName !== 'H2') secEl.removeChild(child);
            });
            secEl.appendChild(eduList);
            break;
          }
          case 'experience': {
            // Remove any existing .experience-list
            let expList = secEl.querySelector('.experience-list');
            if (expList) expList.remove();
            // Build the card-based HTML as in index.html
            expList = document.createElement('div');
            expList.className = 'experience-list';
            // Loop through all entries and all roles
            (sectionsCfg.experience.entries || []).forEach(entry => {
              (entry.roles || []).forEach(role => {
                const card = document.createElement('div');
                card.className = 'experience-card';
                card.innerHTML = `
                  <span class="exp-title">${role.title[lang]}</span>
                  <span class="exp-org">${entry.institution}</span>
                  <span class="exp-date">${role.dates[lang]}</span>
                  <ul>
                    ${role.responsibilities[lang].map(item => `<li>${item}</li>`).join('')}
                  </ul>
                `;
                expList.appendChild(card);
              });
            });
            // Remove all children except h2
            Array.from(secEl.children).forEach(child => {
              if (child.tagName !== 'H2') secEl.removeChild(child);
            });
            secEl.appendChild(expList);
            break;
          }
          case 'projects': {
            // Only add AWSEM ecosystem project link ONCE at the top
            if (Array.isArray(sectionsCfg.projects.entries)) {
              const awsem = sectionsCfg.projects.entries.find(e => e.title && e.title.en === 'AWSEM ecosystem');
              if (awsem && list.childElementCount === 0) {
                const li = document.createElement('li');
                li.innerHTML = `<a href="${awsem.url}" target="_blank">${awsem.title[lang] || awsem.title.en}</a> – ${awsem.description[lang] || awsem.description.en}`;
                list.appendChild(li);
              }
            }
            if (entry.year && Array.isArray(entry.entries)) {
              const yearLi = document.createElement('li');
              yearLi.innerHTML = `<strong>${entry.year}</strong>`;
              const subUl = document.createElement('ul');
              entry.entries.forEach(proj => {
                const projLi = document.createElement('li');
                projLi.innerHTML = `<a href="${proj.url}" target="_blank">${proj.title}</a> – ${proj.description}`;
                subUl.appendChild(projLi);
              });
              yearLi.appendChild(subUl);
              list.appendChild(yearLi);
            }
            break;
          }
          case 'publications': {
            if (entry.year && Array.isArray(entry.entries)) {
              const yearLi = document.createElement('li');
              yearLi.innerHTML = `<strong>${entry.year}</strong>`;
              const subUl = document.createElement('ul');
              entry.entries.forEach(pub => {
                // Bold 'Bueno C' in the authors string
                const authors = pub.authors.replace(/Bueno C/g, '<strong>Bueno C</strong>');
                let pubHtml = `${authors}. <em>${pub.title}</em>. ${pub.journal} ${pub.volume ? pub.volume + ':' : ''}${pub.pages}.`;
                if (pub.doi) {
                  // Only show the DOI text as the link
                  const doiText = pub.doi.replace(/^https?:\/\//, '');
                  pubHtml += ` <a href="${pub.doi}" target="_blank">${doiText}</a>`;
                }
                const pubLi = document.createElement('li');
                pubLi.innerHTML = pubHtml;
                subUl.appendChild(pubLi);
              });
              yearLi.appendChild(subUl);
              list.appendChild(yearLi);
            }
            break;
          }
          case 'awards': {
            const li = document.createElement('li');
            // Support localized title and issuer
            let titleText = entry.title && typeof entry.title === 'object' ? (entry.title[lang] ?? entry.title['en']) : entry.title;
            let issuerText = entry.issuer && typeof entry.issuer === 'object' ? (entry.issuer[lang] ?? entry.issuer['en']) : entry.issuer;
            let titleHtml = titleText;
            if (entry.link) {
              titleHtml = `<a class="award-title" href="${entry.link}" target="_blank">${titleText}</a>`;
            } else {
              titleHtml = `<span class="award-title">${titleText}</span>`;
            }
            let html = `<strong>${entry.year}</strong>: ${titleHtml}.`;
            if (issuerText) html += `<span class='award-issuer'>${issuerText}</span>`;
            if (entry.description) {
              if (typeof entry.description === 'object') {
                html += `<br><span class='award-description'>${entry.description[lang] ?? entry.description['en']}</span>`;
              } else {
                html += `<br><span class='award-description'>${entry.description}</span>`;
              }
            }
            li.innerHTML = html;
            list.appendChild(li);
            break;
          }
          case 'mentoring': {
            const li = document.createElement('li');
            let details = `<strong>${entry.year}</strong>: ${entry.role}`;
            if (entry.program) details += `, <em>${entry.program}</em>`;
            if (entry.institution) details += `, ${entry.institution}`;
            if (entry.organization) details += `, ${entry.organization}`;
            if (entry.department) details += `, ${entry.department}`;
            if (entry.lab) details += `, ${entry.lab}`;
            if (entry.location) details += `, ${entry.location}`;
            li.innerHTML = details;
            list.appendChild(li);
            break;
          }
        }
      });
    });
  }

  // // Smooth scroll for nav links
  // document.querySelectorAll('.nav-links a').forEach(link => {
  //   link.addEventListener('click', e => {
  //     e.preventDefault();
  //     document.querySelector(link.getAttribute('href'))
  //       ?.scrollIntoView({ behavior: 'smooth' });
  //   });
  // });

  // Auto‐resize iframe on load
  iframe?.addEventListener('load', () => {
    try {
      iframe.style.height = iframe.contentWindow.document.body.scrollHeight + 'px';
    } catch {}
  });
});

// Hamburger menu toggle for mobile nav
const menuBtn = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
if (menuBtn && navLinks) {
  menuBtn.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });
}

window.onload = function() {
      const form   = document.getElementById('contact-form');
      const status = document.getElementById('form-status');
      
      form.addEventListener('submit', function(event) {
        event.preventDefault();
        
        // service ID, template ID, and the form element ("this")
        emailjs.sendForm('service_r9rvim5', 'template_8dhhg3m', this)
          .then(() => {
            status.textContent = 'Message sent! Thanks for reaching out.';
            form.reset();
          })
          .catch((err) => {
            console.error('FAILED...', err);
            status.textContent = 'Oops—something went wrong. Please try again later.';
          });
      });
    };

