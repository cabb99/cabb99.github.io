document.addEventListener('DOMContentLoaded', () => {
  const langSwitcher = document.getElementById('language-switch-footer');
  const themeToggle = document.getElementById('theme-toggle');
  const aboutSection = document.querySelector("#about");
  const educationSection = document.querySelector("#education");
  const experienceSection = document.querySelector("#experience");
  const projectsSection = document.querySelector("#projects");
  const publicationsSection = document.querySelector("#publications");
  const awardsSection = document.querySelector("#awards");
  const mentoringSection = document.querySelector("#mentoring");
  const skillsSection = document.querySelector("#skills");

  if (langSwitcher) {
    langSwitcher.addEventListener('click', () => {
      const dropdown = langSwitcher.nextElementSibling;
      dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    });

    const languageOptions = document.querySelectorAll("#language-switch-footer + .origin-top-right a");
    languageOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        e.preventDefault();
        const selectedLang = option.textContent.includes("Español") ? "es" : "en";
        document.documentElement.lang = selectedLang;
        localStorage.setItem('locale', selectedLang);
        updateContent();
      });
    });
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
    });

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }

  fetch('config.json')
    .then(response => {
      if (!response.ok) {
        console.error('Failed to fetch config.json:', response.status, response.statusText);
      }
      return response.json();
    })
    .then(config => {
      console.log('Fetched config.json:', config);
      window.config = config;
      updateContent();
    })
    .catch(error => {
      console.error('Error fetching config.json:', error);
    });

  function updateContent() {
    const locale = document.documentElement.lang || 'en';
    console.log('Updating content with locale:', locale);

    // Update header dynamically
    const headerLogo = document.querySelector('header .logo');
    if (headerLogo) {
      headerLogo.textContent = config.header?.logo || 'Default Logo';
      console.log('Updated header logo:', headerLogo.textContent);
    }

    const navLinks = document.querySelectorAll('header .nav-links a');
    navLinks.forEach((link, index) => {
      const navItem = config.header?.navLinks?.[index];
      if (navItem) {
        link.textContent = navItem.label?.[locale] || navItem.label?.en || 'Link';
        link.href = `#${navItem.id}`;
        console.log('Updated nav link:', link.textContent, link.href);
      }
    });

    // Update sections dynamically
    updateAboutContent(aboutSection, locale);
    updateSectionTitles(educationSection, 'education', locale);
    updateEducationContent(educationSection, locale);
    updateSectionTitles(experienceSection, 'experience', locale);
    updateExperienceContent(experienceSection, locale);
    updateSectionTitles(projectsSection, 'projects', locale);
    updateProjectsContent(projectsSection, locale);
    updateSectionTitles(publicationsSection, 'publications', locale);
    updatePublicationsContent(publicationsSection, locale);
    updateSectionTitles(awardsSection, 'awards', locale);
    updateAwardsContent(awardsSection, locale);
    updateSectionTitles(mentoringSection, 'mentoring', locale);
    updateMentoringContent(mentoringSection, locale);
    updateSectionTitles(skillsSection, 'skills', locale);
    updateSkillsContent(skillsSection, locale);
  }

  function updateAboutContent(section, locale) {
    const sectionConfig = config.sections?.about;
    if (sectionConfig) {
      const title = section.querySelector('h2');
      if (title) {
        title.textContent = sectionConfig.title?.[locale] || sectionConfig.title?.en || 'Section Title';
      }

      const content = section.querySelector('p, .content');
      if (content) {
        content.innerHTML = sectionConfig.content?.[locale] || sectionConfig.content?.en || 'Section Content';
      }
    }
  }

  function updateSectionTitles(section, sectionId, locale) {
    const sectionConfig = config.sections?.[sectionId];
    if (sectionConfig) {
      const title = section.querySelector('h2');
      if (title) {
        title.textContent = sectionConfig.title?.[locale] || sectionConfig.title?.en || 'Section Title';
      }
    }
  }

  function updateEducationContent(section, locale) {
    const educationEntries = config.sections.education.entries;
    const educationList = section.querySelector("ul");
    educationList.innerHTML = ""; // Clear existing content
    educationEntries.forEach((entry) => {
      const listItem = document.createElement("li");
      listItem.innerHTML = `<strong>${entry.degree[locale]}</strong>, ${entry.institution} (${entry.date})<br>${entry.details[locale]}`;
      educationList.appendChild(listItem);
    });
  }

  function updateExperienceContent(section, locale) {
    const experienceEntries = config.sections.experience.entries;
    const experienceList = section.querySelector("ul");
    experienceList.innerHTML = ""; // Clear existing content
    experienceEntries.forEach((entry) => {
      entry.roles.forEach(role => {
        const listItem = document.createElement("li");
        listItem.innerHTML = `<strong>${role.title[locale]}</strong>, ${entry.institution} (${role.dates[locale]})<br>${role.responsibilities[locale].join("<br>")}`;
        experienceList.appendChild(listItem);
      });
    });
  }

  function updateProjectsContent(section, locale) {
    const projectsEntries = config.sections.projects.entries;
    const projectsList = section.querySelector("ul");
    projectsList.innerHTML = ""; // Clear existing content

    projectsEntries.forEach((yearEntry) => {
      const yearItem = document.createElement("li");
      yearItem.innerHTML = `<strong>${yearEntry.year}</strong>`;
      const yearList = document.createElement("ul");

      yearEntry.entries.forEach((entry) => {
        const listItem = document.createElement("li");
        listItem.innerHTML = `<a href="${entry.url}" target="_blank" class="project-link">${entry.title}</a>: ${entry.description}`;
        yearList.appendChild(listItem);
      });

      yearItem.appendChild(yearList);
      projectsList.appendChild(yearItem);
    });
  }

  function updatePublicationsContent(section, locale) {
    const publicationsEntries = config.sections.publications.entries;
    if (!publicationsEntries) {
      console.error('Publications entries are missing in config.json');
      return;
    }

    const publicationsList = section.querySelector("ul");
    publicationsList.innerHTML = ""; // Clear existing content

    publicationsEntries.forEach((yearEntry) => {
      const yearItem = document.createElement("li");
      yearItem.innerHTML = `<strong>${yearEntry.year}</strong>`;
      const yearList = document.createElement("ul");

      yearEntry.entries.forEach((entry) => {
        const listItem = document.createElement("li");
        listItem.innerHTML = `${entry.authors}. <em>${entry.title}</em>. ${entry.journal} ${entry.volume}:${entry.pages}.`;
        yearList.appendChild(listItem);
      });

      yearItem.appendChild(yearList);
      publicationsList.appendChild(yearItem);
    });
  }

  function updateAwardsContent(section, locale) {
    const awardsEntries = config.sections.awards.entries;
    const awardsList = section.querySelector("ul");
    awardsList.innerHTML = ""; // Clear existing content
    awardsEntries.forEach((entry) => {
      const listItem = document.createElement("li");
      listItem.textContent = `${entry.year}: ${entry.title}`;
      awardsList.appendChild(listItem);
    });
  }

  function updateMentoringContent(section, locale) {
    const mentoringEntries = config.sections.mentoring.entries;
    const mentoringList = section.querySelector("ul");
    mentoringList.innerHTML = ""; // Clear existing content
    mentoringEntries.forEach((entry) => {
      const listItem = document.createElement("li");
      listItem.textContent = `${entry.year}: ${entry.role}, ${entry.program}`;
      mentoringList.appendChild(listItem);
    });
  }

  function updateSkillsContent(section, locale) {
    const skillsEntries = config.sections.skills.entries;
    const skillsList = section.querySelector("ul");
    skillsList.innerHTML = ""; // Clear existing content
    skillsEntries.forEach((skill) => {
      const listItem = document.createElement("li");
      listItem.textContent = skill;
      skillsList.appendChild(listItem);
    });
  }

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