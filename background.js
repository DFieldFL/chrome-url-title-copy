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

async function copyToClipboard(tabId, htmlContent, plainText) {
  await chrome.scripting.executeScript({
    target: { tabId },
    // async func so Chrome awaits the Promise before tearing down the script frame.
    // executeScript called from a keyboard shortcut / context-menu handler propagates
    // the user activation into the injected script, making navigator.clipboard.write
    // available without needing the deprecated execCommand.
    func: async (html, plain) => {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html':  new Blob([html],  { type: 'text/html'  }),
          'text/plain': new Blob([plain], { type: 'text/plain' })
        })
      ]);
    },
    args: [htmlContent, plainText]
  });
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
      await copyToClipboard(tab.id, htmlLink, plainText);
    } catch (err) {
      console.error('Copy failed:', err.message);
    }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'parent',
      title: 'Copy Page Info',
      contexts: ['page', 'frame', 'link', 'selection', 'image', 'editable']
    });
    chrome.contextMenus.create({
      id: 'copy-plain',
      title: 'Copy as Plain Text',
      parentId: 'parent',
      contexts: ['page', 'frame', 'link', 'selection', 'image', 'editable']
    });
    chrome.contextMenus.create({
      id: 'copy-markdown',
      title: 'Copy as Markdown',
      parentId: 'parent',
      contexts: ['page', 'frame', 'link', 'selection', 'image', 'editable']
    });
    chrome.contextMenus.create({
      id: 'copy-html',
      title: 'Copy as HTML',
      parentId: 'parent',
      contexts: ['page', 'frame', 'link', 'selection', 'image', 'editable']
    });
  });
});

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

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    await handleCopy(info.menuItemId, tab);
  } catch (err) {
    console.error('Context menu handler error:', err.message);
  }
});

