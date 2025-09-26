/* URL Shortener (client-side demo)
 - Safety heuristics
 - localStorage persistence
 - custom slugs & collision handling
 - copy to clipboard
 - open link (original) if user wants
*/

const urlInput = document.getElementById('urlInput');
const slugInput = document.getElementById('slugInput');
const shortenBtn = document.getElementById('shortenBtn');
const alerts = document.getElementById('alerts');
const resultArea = document.getElementById('resultArea');
const shortUrl = document.getElementById('shortUrl');
const metaInfo = document.getElementById('metaInfo');
const copyBtn = document.getElementById('copyBtn');
const openBtn = document.getElementById('openBtn');
const deleteBtn = document.getElementById('deleteBtn');
const linksList = document.getElementById('linksList');
const emptyText = document.getElementById('emptyText');
const openNew = document.getElementById('openNew');

const STORAGE = 'shortly_demo_links_v1';
// Use your current page's address instead of a fake domain
const DOMAIN = window.location.origin + window.location.pathname + '?go=';


let db = JSON.parse(localStorage.getItem(STORAGE) || '{}');

/* utils */
function genSlug(len=5){
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s='';
  for(let i=0;i<len;i++) s += chars[Math.floor(Math.random()*chars.length)];
  return s;
}
function isProbablyPhishy(url){
  url = url.toLowerCase();
  const warnings = [];
  try{
    const u = new URL(url);
    if (u.protocol !== 'https:') warnings.push('Not using HTTPS');
    if (u.hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) warnings.push('Uses IP address as host');
    if (u.hostname.split('.').some(p => /[0-9]{4,}/.test(p))) warnings.push('Suspicious hostname tokens');
    if (url.length > 80) warnings.push('Very long URL');
    if (/(login|bank|secure|verify|update|confirm)/i.test(url)) warnings.push('Contains sensitive keywords');
  }catch(e){
    warnings.push('Invalid URL format');
  }
  return warnings;
}

/* render list */
function renderList(){
  linksList.innerHTML='';
  const keys = Object.keys(db).sort((a,b)=>db[b].created - db[a].created);
  if(!keys.length) { emptyText.style.display='block'; return; }
  emptyText.style.display='none';
  for(const k of keys){
    const rec = db[k];
    const el = document.createElement('div'); el.className='linkItem';
    el.innerHTML = `
      <div class="left">
        <div><strong>${DOMAIN}${k}</strong></div>
        <div class="small">${rec.original} · created ${new Date(rec.created).toLocaleString()}</div>
      </div>
      <div class="right">
        <button data-slug="${k}" class="copy">Copy</button>
        <button data-slug="${k}" class="open">Open</button>
        <button data-slug="${k}" class="del">Delete</button>
      </div>
    `;
    linksList.appendChild(el);
  }
}

/* show result */
function showResult(slug){
  const rec = db[slug];
  shortUrl.textContent = DOMAIN + slug;
  metaInfo.textContent = rec.original;
  resultArea.hidden = false;

  copyBtn.onclick = () => {
    navigator.clipboard.writeText(DOMAIN + slug).then(()=> {
      alertSmall('Copied to clipboard');
    }).catch(()=> alertSmall('Unable to copy'));
  };
  openBtn.onclick = () => {
    if(openNew.checked) window.open(rec.original, '_blank');
    else window.location.href = rec.original;
  };
  deleteBtn.onclick = () => {
    if(confirm('Delete this shortened link?')){
      delete db[slug]; localStorage.setItem(STORAGE, JSON.stringify(db));
      renderList(); resultArea.hidden = true;
    }
  };
}

/* helper small alert */
let alertTimer = null;
function alertSmall(msg, danger=false){
  alerts.textContent = msg;
  alerts.style.color = danger ? 'var(--danger)' : 'inherit';
  clearTimeout(alertTimer);
  alertTimer = setTimeout(()=> alerts.textContent = '', 5000);
}

/* shorten flow */
shortenBtn.addEventListener('click', (e) => {
  const raw = urlInput.value.trim();
  const custom = (slugInput && slugInput.value.trim()) || '';
  if(!raw){ alertSmall('Please enter a URL', true); return; }

  const warnings = isProbablyPhishy(raw);
  if (warnings.length){
    alertSmall('Warnings: ' + warnings.join('; '), true);
    // do not block; we allow but show warning
  }

  // validate URL
  try{ new URL(raw); } catch(e){ alertSmall('Invalid URL format', true); return; }

  // slug handling
  let slug = custom || genSlug(6);
  // collision: if exists, and custom chosen -> error. if random -> regenerate
  if (db[slug]){
    if (custom) { alertSmall('Custom slug taken — choose another', true); return; }
    // try new random slug a few times
    let tries=0;
    while(db[slug] && tries < 5){ slug = genSlug(6); tries++; }
    if(db[slug]) { alertSmall('Unable to generate free slug — try again', true); return; }
  }

  // store
  db[slug] = { original: raw, created: Date.now() };
  localStorage.setItem(STORAGE, JSON.stringify(db));
  renderList();
  showResult(slug);
  alertSmall('Shortened — saved locally');
});

/* list click events (delegate) */
linksList.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if(!b) return;
  const slug = b.dataset.slug;
  if(b.classList.contains('copy')) {
    navigator.clipboard.writeText(DOMAIN + slug).then(()=> alertSmall('Copied'));
  } else if (b.classList.contains('open')){
    const rec = db[slug];
    if(openNew.checked) window.open(rec.original,'_blank'); else window.location.href = rec.original;
  } else if (b.classList.contains('del')){
    if(confirm('Delete this link?')) { delete db[slug]; localStorage.setItem(STORAGE, JSON.stringify(db)); renderList(); }
  }
});

/* initialize */
renderList();

/* If user lands on a short link (client-side demo)
   This is a demo: if location.href contains ?go=slug we open original.
   (In real production you would use server redirect)
*/
(function handleDirectOpen(){
  const params = new URLSearchParams(location.search);
  if(params.has('go')){
    const s = params.get('go');
    if(db[s]) window.location.href = db[s].original;
    else alert('Link not found locally. This demo does not use a server redirect.');
  }
})();

