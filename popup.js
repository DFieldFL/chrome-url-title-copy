const DEFAULTS = {
  plainTemplate: '{title} \u2014 {url}',
  markdownTemplate: '[{title}]({url})',
  htmlTemplate: '<a href="{url}">{title}</a>'
};

function applyTemplate(template, title, url) {
  return template.replace('{title}', title).replace('{url}', url);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(message = 'Copied!') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 1500);
}

function showError(message) {
  const err = document.getElementById('error-msg');
  err.textContent = message;
  err.hidden = false;
  document.getElementById('btn-plain').disabled = true;
  document.getElementById('btn-markdown').disabled = true;
  document.getElementById('btn-html').disabled = true;
}

async function getTemplates() {
  try {
    const result = await chrome.storage.sync.get(['plainTemplate', 'markdownTemplate', 'htmlTemplate']);
    return {
      plain: result.plainTemplate || DEFAULTS.plainTemplate,
      markdown: result.markdownTemplate || DEFAULTS.markdownTemplate,
      html: result.htmlTemplate || DEFAULTS.htmlTemplate
    };
  } catch {
    return {
      plain: DEFAULTS.plainTemplate,
      markdown: DEFAULTS.markdownTemplate,
      html: DEFAULTS.htmlTemplate
    };
  }
}

async function doCopy(format, title, url) {
  const templates = await getTemplates();
  let plainText;
  if (format === 'plain') {
    plainText = applyTemplate(templates.plain, title, url);
  } else if (format === 'markdown') {
    plainText = applyTemplate(templates.markdown, title, url);
  } else if (format === 'html') {
    plainText = applyTemplate(templates.html, title, url);
  }

  // Always write an HTML anchor as the rich-text flavour so that messaging apps
  // (Slack, Teams, Gmail, etc.) render a clickable hyperlink on paste.
  // The plain-text fallback carries the format-specific string for plain editors.
  const htmlLink = `<a href="${url}">${escapeHtml(title)}</a>`;

  await navigator.clipboard.write([
    new ClipboardItem({
      'text/html':  new Blob([htmlLink],  { type: 'text/html'  }),
      'text/plain': new Blob([plainText], { type: 'text/plain' })
    })
  ]);
  showToast('Copied!');
}

document.addEventListener('DOMContentLoaded', async () => {
  // Settings link
  document.getElementById('settings-link').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  // Get active tab
  let tab;
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab) {
      showError('No active tab found.');
      return;
    }
    tab = activeTab;
  } catch (err) {
    showError('Failed to get tab info.');
    return;
  }

  const title = tab.title || '';
  const url = tab.url || '';

  document.getElementById('field-title').value = title;
  document.getElementById('field-url').value = url;

  // Wire up buttons
  document.getElementById('btn-plain').addEventListener('click', async () => {
    try {
      await doCopy('plain', title, url);
    } catch (err) {
      showToast('Cannot copy on this page.');
    }
  });

  document.getElementById('btn-markdown').addEventListener('click', async () => {
    try {
      await doCopy('markdown', title, url);
    } catch (err) {
      showToast('Cannot copy on this page.');
    }
  });

  document.getElementById('btn-html').addEventListener('click', async () => {
    try {
      await doCopy('html', title, url);
    } catch (err) {
      showToast('Cannot copy on this page.');
    }
  });
});
