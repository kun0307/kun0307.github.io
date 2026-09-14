
document.addEventListener('DOMContentLoaded',async()=>{
 document.querySelectorAll('[data-editor-id] .post-thumb img').forEach(img=>{img.loading='eager';});
 const params=new URLSearchParams(location.search);
 const aliases=await fetch('/assets/post-aliases.json').then(r=>r.json()).catch(()=>({}));
 if(params.has('p')&&aliases[params.get('p')]){location.replace(aliases[params.get('p')]);return;}
 const target=document.getElementById('static-search-results');if(!target)return;
 const q=(params.get('s')||'').trim();document.querySelectorAll('input[name=s]').forEach(i=>i.value=q);
 const rows=await fetch('/assets/search-index.json').then(r=>r.json());
 const found=rows.filter(p=>!q||(p.title+' '+p.text).toLowerCase().includes(q.toLowerCase()));
 const info=document.createElement('p');info.textContent=q?'找到 '+found.length+' 篇相关文章':'全部文章';target.append(info);
 for(const p of found){const a=document.createElement('article'),h=document.createElement('h2'),l=document.createElement('a'),t=document.createElement('p');l.href=p.url;l.textContent=p.title;h.append(l);t.textContent=p.date+' · '+p.text.slice(0,160)+'…';a.append(h,t);target.append(a);}
});
