const DEFAULTS = {
  plainTemplate: '{title} \u2014 {url}',
  markdownTemplate: '[{title}]({url})',
  htmlTemplate: '<a href="{url}">{title}</a>'
};

function showStatus(message, type = 'success') {
  const el = document.getElementById('status-msg');
  el.textContent = message;
  el.className = 'status-msg ' + type;
  el.hidden = false;
  setTimeout(() => {
    el.hidden = true;
  }, 2500);
}

async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(['plainTemplate', 'markdownTemplate', 'htmlTemplate']);
    document.getElementById('plain-template').value = result.plainTemplate || DEFAULTS.plainTemplate;
    document.getElementById('markdown-template').value = result.markdownTemplate || DEFAULTS.markdownTemplate;
    document.getElementById('html-template').value = result.htmlTemplate || DEFAULTS.htmlTemplate;
  } catch {
    document.getElementById('plain-template').value = DEFAULTS.plainTemplate;
    document.getElementById('markdown-template').value = DEFAULTS.markdownTemplate;
    document.getElementById('html-template').value = DEFAULTS.htmlTemplate;
  }
}

async function loadShortcuts() {
  try {
    const commands = await chrome.commands.getAll();
    for (const cmd of commands) {
      const el = document.getElementById('shortcut-' + cmd.name);
      if (!el) continue;
      el.textContent = cmd.shortcut || 'Not set';
    }
  } catch {
    // Non-fatal — leave the placeholder dashes in place
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([loadSettings(), loadShortcuts()]);

  // Shortcuts link — chrome:// URLs can't be opened via <a>, need tabs API
  document.getElementById('shortcuts-link').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });

  // Save
  document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const plain = document.getElementById('plain-template').value.trim();
    const markdown = document.getElementById('markdown-template').value.trim();
    const html = document.getElementById('html-template').value.trim();

    if (!plain || !markdown || !html) {
      showStatus('Templates cannot be empty.', 'error');
      return;
    }

    try {
      await chrome.storage.sync.set({
        plainTemplate: plain,
        markdownTemplate: markdown,
        htmlTemplate: html
      });
      showStatus('Settings saved!', 'success');
    } catch (err) {
      showStatus('Failed to save: ' + err.message, 'error');
    }
  });

  // Reset
  document.getElementById('btn-reset').addEventListener('click', async () => {
    document.getElementById('plain-template').value = DEFAULTS.plainTemplate;
    document.getElementById('markdown-template').value = DEFAULTS.markdownTemplate;
    document.getElementById('html-template').value = DEFAULTS.htmlTemplate;

    try {
      await chrome.storage.sync.set({
        plainTemplate: DEFAULTS.plainTemplate,
        markdownTemplate: DEFAULTS.markdownTemplate,
        htmlTemplate: DEFAULTS.htmlTemplate
      });
      showStatus('Reset to defaults!', 'success');
    } catch (err) {
      showStatus('Failed to reset: ' + err.message, 'error');
    }
  });
});
