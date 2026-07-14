export const copyHtmlToClipboard = async (html: string, plainText: string): Promise<void> => {
  try {
    const outlookSafeHtml = `
        <div style="display:block;width:100%;margin:0;padding:0;font-family:Calibri;font-size:11px;color:#302c6e;">
          ${html.trim()}
          <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;">
            <tr><td style="font-size:1px;line-height:1px;height:1px;">&nbsp;</td></tr>
          </table>
        </div>
      `;
    if (window.ClipboardItem && navigator.clipboard?.write) {
      const item = new ClipboardItem({
        'text/html': new Blob([outlookSafeHtml], { type: 'text/html' }),
        'text/plain': new Blob([plainText], { type: 'text/plain' }),
      });
      await navigator.clipboard.write([item]);
    } else {
      await navigator.clipboard.writeText(plainText);
    }
  } catch (error) {
    console.error('Clipboard copy failed', error);
    await navigator.clipboard.writeText(plainText);
  }
};
