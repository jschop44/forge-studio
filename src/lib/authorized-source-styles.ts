/**
 * Append locally supplied, authorized CSS to an inert HTML reference.
 * Source text is parsed for design evidence, never executed or fetched.
 * Keep the single-file browser import bounded: no ZIP extraction, URLs or proxies.
 */
export function appendAuthorizedStylesheets(html:string,stylesheets:string[]):string{
 if(!/<(?:!doctype\s+html|html|head|body)\b/i.test(html)||html.length>1_000_000)
  throw Error('Import a saved HTML page before its stylesheets.');
 if(!stylesheets.length||stylesheets.length>3)
  throw Error('Select one to three local CSS files.');
 if(stylesheets.some(sheet=>typeof sheet!=='string'||sheet.trim().length<4||
    sheet.length>150_000||/<\s*\/\s*style\b|<\s*script\b/i.test(sheet)))
  throw Error('CSS must be a valid bounded text file without embedded HTML tags.');
 const joined=stylesheets.join('\n');
 if(joined.length>300_000||html.length+joined.length+stylesheets.length*64>1_000_000)
  throw Error('Combined HTML and CSS reference exceeds the 1 MB limit.');
 const block=stylesheets.map(css=>'<style data-forge-authorized-css="true">'+css+'</style>').join('\n');
 if(/<\/head\s*>/i.test(html))return html.replace(/<\/head\s*>/i,block+'</head>');
 if(/<html\b[^>]*>/i.test(html))return html.replace(/<html\b[^>]*>/i,tag=>tag+'<head>'+block+'</head>');
 return '<head>'+block+'</head>'+html;
}
