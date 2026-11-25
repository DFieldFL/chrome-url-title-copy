// Offscreen documents are never focused, which is exactly why they're used here:
// the modern async Clipboard API refuses to write to an unfocused document (e.g.
// when the user's cursor is in the address bar), but the legacy execCommand('copy')
// path is explicitly allowed in an offscreen document created with the CLIPBOARD
// reason. Overriding the resulting 'copy' event lets it carry both an HTML and a
// plain-text flavour, same as the rich write the popup does.
function writeClipboard(html, plain) {
  const textarea = document.createElement('textarea');
  textarea.value = plain;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  const setFormats = (e) => {
    e.clipboardData.setData('text/html', html);
    e.clipboardData.setData('text/plain', plain);
    e.preventDefault();
  };

  document.addEventListener('copy', setFormats);
  const ok = document.execCommand('copy');
  document.removeEventListener('copy', setFormats);

  document.body.removeChild(textarea);
  return ok;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'write-clipboard') return;
  sendResponse({ ok: writeClipboard(message.html, message.plain) });
});
