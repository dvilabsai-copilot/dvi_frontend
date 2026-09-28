const copyWithExecCommand = (
  html: string,
  plainText: string,
): boolean => {
  const listener = (event: ClipboardEvent) => {
    event.preventDefault();

    event.clipboardData?.setData("text/html", html);
    event.clipboardData?.setData("text/plain", plainText);
  };

  document.addEventListener("copy", listener);

  try {
    return document.execCommand("copy");
  } catch (error) {
    console.error("execCommand clipboard fallback failed", error);
    return false;
  } finally {
    document.removeEventListener("copy", listener);
  }
};

export const copyHtmlToClipboard = async (
  html: string,
  plainText: string,
): Promise<boolean> => {
  const cleanHtml = html?.trim() || "";
  const cleanPlainText = plainText?.trim() || "";

  if (!cleanHtml && !cleanPlainText) {
    console.error("Clipboard copy aborted: clipboard content is empty");
    return false;
  }

  const outlookSafeHtml = `
    <div style="display:block;width:100%;margin:0;padding:0;font-family:Calibri;font-size:11px;color:#302c6e;">
      ${cleanHtml}
      <table
        role="presentation"
        width="100%"
        border="0"
        cellpadding="0"
        cellspacing="0"
        style="border-collapse:collapse;width:100%;"
      >
        <tr>
          <td style="font-size:1px;line-height:1px;height:1px;">&nbsp;</td>
        </tr>
      </table>
    </div>
  `;

  try {
    if (
      typeof ClipboardItem !== "undefined" &&
      navigator.clipboard?.write
    ) {
      const item = new ClipboardItem({
        "text/html": new Blob([outlookSafeHtml], {
          type: "text/html",
        }),
        "text/plain": new Blob([cleanPlainText], {
          type: "text/plain",
        }),
      });

      await navigator.clipboard.write([item]);

      return true;
    }
  } catch (error) {
    console.warn(
      "Rich HTML clipboard copy failed. Trying fallback.",
      error,
    );
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(cleanPlainText);

      return true;
    }
  } catch (error) {
    console.warn(
      "Plain text clipboard copy failed. Trying legacy fallback.",
      error,
    );
  }

  return copyWithExecCommand(
    outlookSafeHtml,
    cleanPlainText,
  );
};