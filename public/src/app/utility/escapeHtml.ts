/**
 * Escapes 5 entities found in string for HTML: &, <, >, " and '
 * @param unsafe string of text to escape
 */
export function escapeHtml(unsafe: string): string {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
  }  
