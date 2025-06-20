document.addEventListener('DOMContentLoaded', () => {
  const iframe = document.querySelector('iframe.embedded-project') || document.querySelector('iframe');
  const storage = window.localStorage;
  const sectionIds = [
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

  // Language menu toggle & selection
  document.getElementById('language-switch-footer')
    ?.addEventListener('click', () => {
      const menu = document.querySelector('#language-switch-footer + .origin-top-right');
      menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    });
  document.querySelectorAll('#language-switch-footer + .origin-top-right a')
    .forEach(a => a.addEventListener('click', e => {
      e.preventDefault();
      const lang = a.textContent.includes('Español') ? 'es' : 'en';
      document.documentElement.lang = lang;
      storage.setItem('locale', lang);
      render(window.config.sections);
      renderHeader(window.config.header);
      postSettings();
    }));

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
            const li = document.createElement('li');
            li.innerHTML = `<strong>${entry.degree[lang]}</strong>, ${entry.institution} (${entry.date})<br>${entry.details[lang]}`;
            list.appendChild(li);
            break;
          }
          case 'experience': {
            entry.roles.forEach(role => {
              const li = document.createElement('li');
              li.innerHTML = `<strong>${role.title[lang]}</strong>, ${entry.institution} (${role.dates[lang]})<br>${role.responsibilities[lang].join('<br>')}`;
              list.appendChild(li);
            });
            break;
          }
          case 'projects': {
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
            let titleHtml = entry.title;
            if (entry.link) {
              titleHtml = `<a class="award-title" href="${entry.link}" target="_blank">${entry.title}</a>`;
            } else {
              titleHtml = `<span class="award-title">${entry.title}</span>`;
            }
            let html = `<strong>${entry.year}</strong>: ${titleHtml}.`;
            if (entry.issuer) html += `<span class='award-issuer'>${entry.issuer}</span>`;
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
          case 'skills': {
            const li = document.createElement('li');
            li.textContent = entry;
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
