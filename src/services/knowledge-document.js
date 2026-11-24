export function parseDriveLink(raw) {
  const fail=()=>{throw new Error("Introduce un enlace válido de archivo de Google Drive.");};
  if(typeof raw!=="string"||raw.length>1000)fail();
  let url;try{url=new URL(raw.trim());}catch{fail();}
  const match=/^\/file\/d\/([A-Za-z0-9_-]{10,255})(?:\/view|\/preview)?\/?$/.exec(url.pathname);
  if(url.protocol!=="https:"||url.host!=="drive.google.com"||url.username||url.password||!match)fail();
  const canonical=new URL("https://drive.google.com/file/d/"+match[1]+"/view");
  const preview=new URL("https://drive.google.com/file/d/"+match[1]+"/preview");
  const key=url.searchParams.get("resourcekey");
  if(key&&/^[A-Za-z0-9_-]{1,255}$/.test(key)){canonical.searchParams.set("resourcekey",key);preview.searchParams.set("resourcekey",key);}
  return {url:canonical.href,preview:preview.href};
}
export function parseKeywords(raw) {
  const words=[...new Set(raw.split(",").map(x=>x.trim()).filter(Boolean))];
  if(words.length>20||words.some(x=>x.length>80))throw new Error("Máximo 20 palabras clave de 80 caracteres cada una.");
  return words;
}
