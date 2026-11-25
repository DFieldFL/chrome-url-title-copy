const DEFAULTS = {
  plainTemplate: '{title} - {url}',
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

let creatingOffscreenDocument;

async function ensureOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL('offscreen.html')]
  });
  if (existingContexts.length > 0) return;

  if (!creatingOffscreenDocument) {
    creatingOffscreenDocument = chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['CLIPBOARD'],
      justification: 'Write the title/URL hyperlink to the clipboard from a keyboard shortcut regardless of which element currently has focus (e.g. the address bar).'
    });
  }
  await creatingOffscreenDocument;
  creatingOffscreenDocument = null;
}

async function copyToClipboard(htmlContent, plainText) {
  await ensureOffscreenDocument();
  const response = await chrome.runtime.sendMessage({ type: 'write-clipboard', html: htmlContent, plain: plainText });
  if (!response?.ok) {
    throw new Error('Offscreen clipboard write failed.');
  }
}

async function handleCopy(format, tab) {
  if (!tab) {
    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    tab = activeTab;
  }

  if (!tab) return;

  const templates = await getTemplates();
  const title = tab.title || '';
  const url   = tab.url   || '';

  // Rich-text flavour: always an <a> anchor so messaging apps render a real link.
  const htmlLink = `<a href="${url}">${escapeHtml(title)}</a>`;

  // Plain-text flavour: format-specific string controlled by the user's templates.
  let plainText;
  if (format === 'copy-plain') {
    plainText = applyTemplate(templates.plain, title, url);
  } else if (format === 'copy-markdown') {
    plainText = applyTemplate(templates.markdown, title, url);
  } else if (format === 'copy-html') {
    plainText = applyTemplate(templates.html, title, url);
  }

  if (plainText !== undefined) {
    try {
      await copyToClipboard(htmlLink, plainText);
    } catch (err) {
      console.error('Copy failed:', err.message);
    }
  }
}

chrome.commands.onCommand.addListener(async (command) => {
  try {
    // Use lastFocusedWindow rather than currentWindow — service workers have no
    // window context, so currentWindow is unreliable from the SW.
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab) {
      await handleCopy(command, tab);
    }
  } catch (err) {
    console.error('Command handler error:', err.message);
  }
});

