'use strict';
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rarityNames = {Common:'普通', Rare:'稀有', Epic:'史诗', Legendary:'传说'};
const roleNames = {Weapon:'武器', Support:'辅助', Passive:'被动', Structure:'结构', Terminal:'终端'};
const numerals = ['', 'Ⅰ', 'Ⅱ', 'Ⅲ'];
const STORAGE = 'ship-card-catalog-study-v1';
let catalog, cards = [], shown = [], current, detailTier = 1, view = 'all';
let study = Object.create(null), storageProblem = false, offlineBusy = false;
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE) || '{}');
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
    for (const [kind, record] of Object.entries(saved)) {
      if (/^Fleet_\w+$/.test(kind) && record && typeof record === 'object') study[kind] = normalize(record);
    }
  }
} catch { storageProblem = true; }
function normalize(record) {
  return {favorite: record.favorite === true, review: record.review === true,
    note: typeof record.note === 'string' ? record.note.slice(0, 50000) : '',
    updatedAt: typeof record.updatedAt === 'string' && Number.isFinite(Date.parse(record.updatedAt)) ? record.updatedAt : new Date(0).toISOString()};
}
function toast(message) {
  $('#toast').textContent = message; $('#toast').hidden = false;
  clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').hidden = true, 3500);
}
function persist() {
  try { localStorage.setItem(STORAGE, JSON.stringify(study)); storageProblem = false; return true; }
  catch { storageProblem = true; toast('浏览器无法保存笔记，请导出备份。'); return false; }
}
function update(kind, change) {
  study[kind] = {...normalize(study[kind] || {}), ...change, updatedAt: new Date().toISOString()};
  return persist();
}
function timing(s) { return s.ChargeSeconds > 0 ? `CD ${s.ChargeSeconds} 秒` : '被动 · 无 CD'; }
function stats(s) {
  const items = [['Damage','伤害'],['Shield','护盾'],['Heal','治疗'],['Corrosion','腐蚀'],['Burn','燃烧'],['Breach','破损']]
    .filter(([key]) => s[key] > 0).map(([key,label]) => `${label} ${s[key]}`);
  if (s.EffectKey === 'Phosphorus' && s.EffectValue > 0) items.push(`触发燃烧 ${s.EffectValue}`);
  if (s.EffectKey === 'FractureLaser' && s.EffectValue > 0) items.push(`触发破损 ${s.EffectValue}`);
  if (s.CritChance > 0) items.push(`暴击 ${Math.min(100,s.CritChance)}%`);
  if (s.ExtraReleases > 0) items.push(`释放 ×${1+s.ExtraReleases}`);
  if (s.UsesPerBattle >= 0) items.push(`弹药 ${s.UsesPerBattle}`);
  items.push(timing(s), `价格 ${s.Price}`);
  return `<div class="stats">${items.map(text => `<span class="stat">${esc(text)}</span>`).join('')}</div>`;
}
function render() {
  const query = $('#search').value.trim().toLowerCase(), tag = $('#tag').value, rarity = $('#rarity').value;
  const tier = Number($('#tier').value);
  shown = cards.filter(card => {
    const s = card.tiers[tier-1], record = study[card.kind] || {};
    return (!query || [s.Name,s.EffectDescription,s.Tags,card.kind,record.note || ''].join(' ').toLowerCase().includes(query))
      && (!tag || s.Tags.split('|').includes(tag)) && (!rarity || s.Rarity === rarity)
      && (view === 'all' || view === 'favorite' && record.favorite || view === 'review' && record.review || view === 'notes' && record.note?.trim());
  });
  $('#count').textContent = `${shown.length} / ${cards.length} 张模块`;
  $('#cards').innerHTML = shown.map(card => {
    const s = card.tiers[tier-1], record = study[card.kind] || {};
    return `<article class="card" data-rarity="${esc(s.Rarity)}"><a class="card-link" href="#${esc(card.kind)}" data-open="${esc(card.kind)}" aria-label="查看${esc(s.Name)}的完整效果"><div class="art"><img src="${esc(card.art)}" alt="${esc(s.Name)}卡图" loading="lazy" width="720" height="788"><span class="rarity">${esc(rarityNames[s.Rarity])}</span><span class="tier-mark">${numerals[tier]}</span></div><div class="card-body"><h2>${esc(s.Name)}</h2><p class="card-tags">${esc(s.Tags.split('|').join(' · '))}</p><p class="card-effect">${esc(s.EffectDescription)}</p></div></a><div class="card-bottom"><span class="timing">${esc(timing(s))}</span><span class="saved-mark">${record.review ? '待改' : record.note?.trim() ? '笔记' : ''}</span><button class="star" data-favorite="${esc(card.kind)}" aria-label="${record.favorite?'取消收藏':'收藏'}${esc(s.Name)}" aria-pressed="${!!record.favorite}">${record.favorite?'★':'☆'}</button></div></article>`;
  }).join('');
  $('#empty').hidden = shown.length > 0;
  $('#empty-text').textContent = view === 'all' ? '试试其他关键词，或清除筛选。' : '打开卡牌详情，添加收藏、待改标记或笔记。';
}
function detailHtml() {
  const s = current.tiers[detailTier-1], record = study[current.kind] || {};
  const directions = [['EffectUp','上'],['EffectDown','下'],['EffectLeft','左'],['EffectRight','右']].filter(([key]) => s[key]).map(([,name]) => name);
  const technical = [['Kind','行为键'],['EffectKey','效果键'],['EffectScope','作用范围'],['EffectTrigger','触发时机'],['EffectValue','效果参数 1'],['EffectValue2','效果参数 2'],['TargetTags','目标标签'],['Inputs','输入数'],['Outputs','输出数'],['ShopWeight','抽取权重'],['ImplStatus','实现状态'],['Remark','配置备注']];
  $('#detail-title').textContent = s.Name;
  $('#detail-meta').textContent = `${rarityNames[s.Rarity]} · ${s.Tags.split('|').join(' / ')}`;
  $('#detail-content').innerHTML = `<div class="detail-main"><div class="detail-art"><img src="${esc(current.art)}" alt="${esc(s.Name)}卡图" width="720" height="788"></div><div class="detail-text"><div class="tier-buttons">${[1,2,3].map(t => `<button data-tier="${t}" aria-pressed="${t===detailTier}">${numerals[t]} 级</button>`).join('')}</div><p class="effect">${esc(s.EffectDescription)}</p>${stats(s)}<p class="direction">${esc(roleNames[s.Role] || s.Role)}${directions.length ? ` · 作用方向：${directions.join('、')}` : ''}${s.TargetTags ? ` · 目标：${esc(s.TargetTags.split('|').join('、'))}` : ''}${s.EffectPermanent ? ' · 永久成长' : ''}${!s.Enabled?' · 当前停用':''}</p></div></div><section class="study"><h3>我的审卡笔记</h3><div class="actions"><button id="detail-favorite" aria-pressed="${!!record.favorite}">${record.favorite?'★ 已收藏':'☆ 收藏'}</button><button id="detail-review" aria-pressed="${!!record.review}">${record.review?'已标记待改':'标记待改'}</button></div><label class="note-label" for="note">想法与待验证的问题</label><textarea class="note" id="note" maxlength="50000" placeholder="定位、搭配、数值或描述上，有什么值得改进？"></textarea><p id="note-status" class="note-status">${storageProblem?'当前浏览器无法保存，请导出备份。':'自动保存在当前浏览器；可在「更多」中导出。'}</p></section><section class="compare"><h3>三级效果对比</h3><div class="compare-grid">${current.tiers.map(t => `<article class="compare-item"><h3>${numerals[t.Tier]} 级</h3><p>${esc(t.EffectDescription)}</p>${stats(t)}</article>`).join('')}</div></section><details class="config"><summary>开发配置与备注</summary><dl>${technical.map(([key,label]) => `<dt>${label}</dt><dd>${esc(s[key] ?? '—') || '—'}</dd>`).join('')}</dl></details><div class="dialog-navigation"><button id="previous">上一张</button><button id="next">下一张</button></div>`;
  $('#note').value = record.note || '';
  $('#note').addEventListener('input', event => {
    const saved = update(current.kind, {note:event.target.value});
    $('#note-status').textContent = saved ? '已保存到当前浏览器' : '保存失败，请在「更多」中导出备份。';
    render();
  });
  $('#detail-favorite').onclick = () => { update(current.kind,{favorite:!study[current.kind]?.favorite}); detailHtml(); render(); };
  $('#detail-review').onclick = () => { update(current.kind,{review:!study[current.kind]?.review}); detailHtml(); render(); };
  $('#detail-content').querySelectorAll('[data-tier]').forEach(button => button.onclick = () => {detailTier=Number(button.dataset.tier); detailHtml();});
  $('#previous').onclick = () => navigate(-1);
  $('#next').onclick = () => navigate(1);
}
function showCard(kind) {
  const card = cards.find(c => c.kind === kind);
  if (!card) return;
  current = card; detailTier = Number($('#tier').value); detailHtml();
  if (!$('#detail').open) $('#detail').showModal();
  $('#detail').scrollTop = 0;
}
function navigate(delta) {
  const sequence = shown.some(c => c.kind === current.kind) ? shown : cards;
  const index = sequence.findIndex(c => c.kind === current.kind);
  location.replace(`#${sequence[(index+delta+sequence.length)%sequence.length].kind}`);
}
function route() {
  const kind = location.hash.slice(1);
  if (cards.some(c => c.kind === kind)) showCard(kind);
  else if ($('#detail').open) $('#detail').close();
}
$('#cards').addEventListener('click', event => {
  const star = event.target.closest('[data-favorite]');
  if (star) {const kind=star.dataset.favorite; update(kind,{favorite:!study[kind]?.favorite}); render();}
  const link = event.target.closest('[data-open]');
  if (link && location.hash === `#${link.dataset.open}`) {event.preventDefault();showCard(link.dataset.open);}
});
$('#close-detail').onclick = () => $('#detail').close();
$('#detail').addEventListener('close', () => {
  if (location.hash) history.replaceState(null,'',location.pathname+location.search);
});
window.addEventListener('hashchange', route);
$('#search').addEventListener('input', render);
['tag','rarity','tier'].forEach(id => $('#'+id).addEventListener('change', render));
document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => {
  view=button.dataset.view;
  document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed',String(b===button)));
  render();
});
$('#layout').onclick = () => {
  const reading=$('#cards').classList.toggle('reading');
  $('#layout').setAttribute('aria-pressed',String(reading)); $('#layout').textContent=reading?'卡图视图':'阅读视图';
};
$('#reset').onclick = () => {
  $('#search').value=''; $('#tag').value=''; $('#rarity').value=''; $('[data-view=all]').click();
};
$('#tools-open').onclick = () => $('#tools').showModal();
$('#close-tools').onclick = () => $('#tools').close();
$('#export').onclick = () => {
  const data={type:'ship-card-study',schema:1,exportedAt:new Date().toISOString(),records:study};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=`卡册笔记-${new Date().toISOString().slice(0,10)}.json`;link.click();
  setTimeout(() => URL.revokeObjectURL(url),10000);toast('笔记备份已导出');
};
$('#import').onclick = () => $('#import-file').click();
$('#import-file').addEventListener('change', async event => {
  try {
    const file=event.target.files[0]; if(!file)return;
    if(file.size>5*1024*1024)throw new Error('文件过大，请选择卡册导出的笔记备份。');
    const data=JSON.parse(await file.text());
    if(data.type!=='ship-card-study'||data.schema!==1||!data.records||typeof data.records!=='object'||Array.isArray(data.records))throw new Error('这不是卡册导出的笔记备份。');
    let count=0;
    for(const [kind,value] of Object.entries(data.records)) {
      if(!cards.some(c=>c.kind===kind)||!value||typeof value!=='object')continue;
      const record=normalize(value);
      if(!study[kind]||record.updatedAt>study[kind].updatedAt){study[kind]=record;count++;}
    }
    if(persist())toast(`已合并 ${count} 张卡牌的笔记`);
    render();if(current&&$('#detail').open)detailHtml();
  } catch(error) {toast(error instanceof SyntaxError?'备份文件无法读取。':error.message);}
  event.target.value='';
});
$('#offline').onclick = async () => {
  if(offlineBusy)return;
  offlineBusy=true;$('#offline').disabled=true;
  try {
    if(!('serviceWorker' in navigator))throw new Error('当前浏览器不支持离线保存，请使用 Safari 或 Chrome。');
    const registration=await navigator.serviceWorker.ready;
    const worker=registration.active;if(!worker)throw new Error('离线功能尚未就绪，请重新打开后重试。');
    await new Promise((resolve,reject) => {
      const channel=new MessageChannel();
      let timer=setTimeout(()=>reject(new Error('保存超时，请检查网络后重试。')),60000);
      channel.port1.onmessage=event=>{
        clearTimeout(timer);
        const data=event.data;
        if(data.error){channel.port1.close();reject(new Error(data.error));return;}
        $('#offline-status').textContent=data.complete?`已保存 ${data.total} 张卡牌，可以离线浏览。`:`正在保存卡图 ${data.done} / ${data.total}…`;
        if(data.complete){channel.port1.close();resolve();}
        else timer=setTimeout(()=>reject(new Error('保存超时，请检查网络后重试。')),60000);
      };
      worker.postMessage({type:'SAVE_OFFLINE'},[channel.port2]);
    });
  } catch(error) {$('#offline-status').textContent=error.message;}
  finally {offlineBusy=false;$('#offline').disabled=false;}
};
async function init() {
  try {
    const response=await fetch('catalog.json',{cache:'no-cache'});
    if(!response.ok)throw new Error('无法加载卡牌数据');
    catalog=await response.json();cards=catalog.cards;
    const tags=[...new Set(cards.flatMap(c=>c.tiers[0].Tags.split('|').filter(Boolean)))];
    $('#tag').innerHTML='<option value="">全部标签</option>'+tags.map(tag=>`<option value="${esc(tag)}">${esc(tag)}</option>`).join('');
    const date=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(catalog.publishedAt));
    $('#version').textContent=`更新 ${date}`;
    $('#footer-version').textContent=`配置版本 ${catalog.version.slice(0,8)} · 项目 ${catalog.revision}`;
    $('#rules').innerHTML=catalog.rules.map(rule=>`<div class="rule"><h3>${esc(rule.Name)}</h3><p>${esc(rule.Description)}</p></div>`).join('');
    render();route();
    if(storageProblem)toast('浏览器保存功能不可用，请定期导出笔记。');
    if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{
      $('#offline').disabled=true;$('#offline-status').textContent='离线保存暂不可用，请联网重新打开。';
    });
    else {$('#offline').disabled=true;$('#offline-status').textContent='当前浏览器不支持离线保存。';}
  } catch {
    $('#count').textContent='卡册加载失败';$('#empty').hidden=false;
    $('#empty-text').textContent='请检查网络后重新加载。离线使用前，需要先联网保存卡牌。';
    $('#reset').textContent='重新加载';$('#reset').onclick=()=>location.reload();
  }
}
init();
