export const siteUrl = "https://peevue.com";
export function jsonLd(value:unknown){return JSON.stringify(value).replace(/</g,"\\u003c");}
export function xmlEscape(value:string){return value.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!));}
