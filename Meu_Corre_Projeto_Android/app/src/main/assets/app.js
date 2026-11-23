'use strict';
const STORAGE_KEY = 'meu_corre_uber99_v1';
const $ = id => document.getElementById(id);
const money = n => Math.round((Number(n) || 0) * 100) / 100;
const brl = n => money(n).toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
const numberValue = id => Number($(id).value || 0);
const safe = s => String(s ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function parseDate(s) { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d, 12); }
function isoDate(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function addDays(s,n) {const d=parseDate(s);d.setDate(d.getDate()+n);return isoDate(d);}
function addMonth(s, n) {const [y,m] = s.split('-').map(Number);return isoDate(new Date(y,m-1+n,1,12));}
function monthRange(month) {const first=month+'-01', last=isoDate(new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0,12));return {first,last};}
function fullDate(s) {return parseDate(s).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).replace('.','');}
function shortDate(s) {return parseDate(s).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}).replace('.','');}
function weekdayDate(s) {return parseDate(s).toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short'}).replaceAll('.','');}
function sameMonth(s,m) {return typeof s==='string' && s.slice(0,7) === m;}
function newId() {return 'r'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function defaultData() {return {
  version:1, initialCash:900, openingDate:'2026-11-17',
  earnings:[], offDates:['2026-11-21'], payments:{},
  expenses:[
    {id:'irmao',title:'Pagamento ao irmão',amount:150,due:'2026-11-21',type:'variable',repeat:false},
    {id:'conta',title:'Conta de novembro',amount:360.38,due:'2026-11-23',type:'variable',repeat:false},
    {id:'carro',title:'Parcela do carro',amount:3600,due:'2026-11-30',type:'fixed',repeat:true},
    {id:'aluguel',title:'Aluguel da casa',amount:2400,due:'2026-12-07',type:'fixed',repeat:true}
  ]
};}
function validData(d) {return d && typeof d==='object' && Array.isArray(d.earnings) && Array.isArray(d.offDates) && Array.isArray(d.expenses) && d.payments && typeof d.payments==='object' && typeof d.openingDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.openingDate) && typeof d.initialCash==='number';}
function loadData() {try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));if(validData(saved)) return saved;}catch(e){console.warn('Dados locais inválidos',e);}return defaultData();}
let data=loadData();let currentTab='home';let selectedMonth=todayISO().slice(0,7);let noticeTimer;
function persist() {try {localStorage.setItem(STORAGE_KEY,JSON.stringify(data));}catch(e){toast('Não foi possível salvar. Exporte um backup.');}render();}
function toast(msg) {const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>el.classList.remove('show'),2800);}
function expenditureKey(ex, due) {return `${ex.id}@${ex.repeat ? due.slice(0,7) : 'unico'}`;}
function dueForMonth(ex, month) {const day=Number(ex.due.slice(-2));const last=Number(monthRange(month).last.slice(-2));return `${month}-${String(Math.min(day,last)).padStart(2,'0')}`;}
function instances(from,to) {
  const out=[];
  for(const ex of data.expenses) {
    if(!ex || !/^\d{4}-\d{2}-\d{2}$/.test(ex.due)) continue;
    if(!ex.repeat) {if(ex.due>=from && ex.due<=to) out.push({...ex,actualDue:ex.due,key:expenditureKey(ex,ex.due)});continue;}
    let month=from.slice(0,7), end=to.slice(0,7);if(month < ex.due.slice(0,7)) month=ex.due.slice(0,7);
    let guard=0;
    while(month<=end && guard++<240) {
      const due=dueForMonth(ex,month);
      if(due>=ex.due && due>=from && due<=to) out.push({...ex,actualDue:due,key:expenditureKey(ex,due)});
      month=addMonth(month+'-01',1).slice(0,7);
    }
  }
  return out.sort((a,b)=>a.actualDue.localeCompare(b.actualDue)||a.title.localeCompare(b.title));
}
function earliestExpenseDate() {return data.expenses.reduce((x,e)=> e?.due && e.due<x?e.due:x, todayISO());}
function outstandingUntil(end) {const from=earliestExpenseDate();return instances(from,end).filter(b=>!data.payments[b.key]);}
function balanceNow() {
  const earned = data.earnings.filter(e=>e.date>=data.openingDate).reduce((a,e)=>a+net(e),0);
  const paid = Object.values(data.payments).reduce((a,p)=>a+(p.date>=data.openingDate?money(p.amount):0),0);
  return money(data.initialCash+earned-paid);
}
function net(e) {return money(Number(e.uber||0)+Number(e.n99||0)-Number(e.fuel||0)-Number(e.other||0));}
function monthlyEarnings(month) {const rows=data.earnings.filter(e=>sameMonth(e.date,month));const sum=k=>money(rows.reduce((a,e)=>a+Number(e[k]||0),0));return {rows,uber:sum('uber'),n99:sum('n99'),fuel:sum('fuel'),other:sum('other'),gross:money(sum('uber')+sum('n99')),net:money(rows.reduce((a,e)=>a+net(e),0))};}
function paidInMonth(month) {return money(Object.values(data.payments).filter(p=>sameMonth(p.date,month)).reduce((a,p)=>a+Number(p.amount||0),0));}
function isAvailable(d) {return !data.offDates.includes(d) && !data.earnings.some(e=>e.date===d);}
function availableDates(from,to) {if(from>to) return [];const a=[];let d=from,guard=0;while(d<=to && guard++<400){if(isAvailable(d)) a.push(d);d=addDays(d,1);}return a;}
function nextWorkday(from) {let d=from;for(let i=0;i<370;i++) {if(isAvailable(d))return d;d=addDays(d,1);}return null;}
function dailyGoal() {
  const today=todayISO(), horizon=addDays(today,30), cash=balanceNow();
  const bills=outstandingUntil(horizon);
  const overdue=bills.filter(b=>b.actualDue<today), upcoming=bills.filter(b=>b.actualDue>=today);
  const overdueTotal=money(overdue.reduce((x,b)=>x+Number(b.amount),0));
  let cumulative=overdueTotal, target=0, impossible=false, deadline=null;
  for(const due of [...new Set(upcoming.map(b=>b.actualDue))]) {
    cumulative=money(cumulative+upcoming.filter(b=>b.actualDue===due).reduce((x,b)=>x+Number(b.amount),0));
    const shortage=money(cumulative-cash), count=availableDates(today,due).length;
    if(shortage>0 && count===0) {impossible=true;deadline=due;continue;}
    if(shortage>0) {const needed=Math.ceil(shortage*100/count)/100;if(needed>target){target=needed;deadline=due;}}
  }
  return {target:money(target),cash,bills,overdue,overdueTotal,upcoming,impossible,deadline,horizon,urgent:Math.max(0,money(overdueTotal-cash))};
}
function render() {
  $('today-label').textContent=new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  document.querySelectorAll('.month-display').forEach(el=>el.textContent=parseDate(selectedMonth+'-01').toLocaleDateString('pt-BR',{month:'long',year:'numeric'}));
  renderHome();renderEarnings();renderExpenses();renderDays();
}
function renderHome() {
  const g=dailyGoal(), month=todayISO().slice(0,7), m=monthlyEarnings(month);
  $('daily-target').textContent=brl(g.target);
  $('target-description').textContent=g.bills.length ? 'Líquidos por dia · contas dos próximos 30 dias' : 'Nenhuma conta pendente nos próximos 30 dias';
  $('next-workday').textContent=nextWorkday(todayISO()) ? weekdayDate(nextWorkday(todayISO())) : 'Sem dias livres';
  $('pending-sum').textContent=brl(g.bills.reduce((x,b)=>x+b.amount,0));
  $('cash-balance').textContent=brl(g.cash);$('month-gross').textContent=brl(m.gross);$('month-net').textContent=brl(m.net);$('month-paid').textContent=brl(paidInMonth(month));
  const alerts=[];
  if(g.overdue.length)alerts.push(`<div class="alert ${g.urgent>0?'error':''}"><strong>${g.overdue.length} ${g.overdue.length===1?'conta vencida':'contas vencidas'}</strong>${g.urgent>0?`Faltam ${brl(g.urgent)} em caixa para regularizar as contas já vencidas. A meta futura não elimina esse atraso.`:'Há contas com data passada ainda marcadas como pendentes. Confira se já foram pagas.'}</div>`);
  if(g.impossible)alerts.push(`<div class="alert error"><strong>Atenção aos vencimentos</strong>Existe conta a vencer sem nenhum dia de trabalho disponível e o saldo atual não cobre tudo. Altere as folgas ou antecipe o pagamento.</div>`);
  if(g.cash<0)alerts.push(`<div class="alert error"><strong>Saldo negativo</strong>O total já pago está maior do que o dinheiro informado em caixa.</div>`);
  $('alerts').innerHTML=alerts.join('');
  const list=g.bills.slice(0,5);
  $('upcoming-list').innerHTML=list.length?list.map(b=>`<div class="bill-row"><div class="bill-date"><strong>${b.actualDue.slice(8)}</strong><small>${parseDate(b.actualDue).toLocaleDateString('pt-BR',{month:'short'}).replace('.','')}</small></div><div class="bill-info"><strong>${safe(b.title)}</strong><small>${b.type==='fixed'?'Fixa':'Variável'}${b.repeat?' · mensal':''}</small>${b.actualDue<todayISO()?'<span class="status-tag overdue">Vencida</span>':b.actualDue===todayISO()?'<span class="status-tag">Vence hoje</span>':''}</div><div class="bill-amount">${brl(b.amount)}</div></div>`).join(''):`<div class="empty-state"><strong>Tudo em dia!</strong>Nenhuma despesa pendente nos próximos 30 dias.</div>`;
}
function renderEarnings() {
  const m=monthlyEarnings(selectedMonth);
  $('sum-uber').textContent=brl(m.uber);$('sum-99').textContent=brl(m.n99);$('sum-net').textContent=brl(m.net);
  $('earnings-count').textContent=`${m.rows.length} ${m.rows.length===1?'dia':'dias'} registrado${m.rows.length===1?'':'s'}`;
  $('earnings-list').innerHTML=m.rows.length?[...m.rows].sort((a,b)=>b.date.localeCompare(a.date)).map(e=>`<div class="entry-card"><div class="entry-main"><div class="entry-top">${safe(fullDate(e.date))}</div><div class="entry-sub">Uber ${brl(e.uber)} · 99 ${brl(e.n99)}<br>Custos ${brl(Number(e.fuel||0)+Number(e.other||0))}</div></div><div class="entry-value"><strong>${brl(Number(e.uber)+Number(e.n99))}</strong><span class="${net(e)<0?'negative':''}">Líquido ${brl(net(e))}</span></div><button class="mini-edit" data-edit-earning="${safe(e.date)}" aria-label="Editar ${safe(e.date)}">✎</button></div>`).join(''):`<div class="empty-state"><strong>Nenhum ganho registrado</strong>Adicione os valores que recebeu no Uber e na 99.</div>`;
}
function renderExpenses() {
  const {first,last}=monthRange(selectedMonth), rows=instances(first,last),dueTotal=money(rows.reduce((a,b)=>a+b.amount,0)),unpaid=rows.filter(b=>!data.payments[b.key]);
  $('expense-planned').textContent=brl(dueTotal);$('expense-unpaid').textContent=brl(unpaid.reduce((a,b)=>a+b.amount,0));
  $('expenses-list').innerHTML=rows.length?rows.map(b=>{const p=data.payments[b.key];return `<div class="entry-card"><label class="check-row" style="flex:1;min-width:0"><input type="checkbox" data-pay="${safe(b.key)}" ${p?'checked':''} aria-label="Marcar ${safe(b.title)} como paga"><span class="entry-main"><span class="entry-top expense-title ${p?'paid':''}">${safe(b.title)}</span><span class="expense-kind" style="display:block">Vence ${safe(shortDate(b.actualDue))} · ${b.type==='fixed'?'Fixa':'Variável'}${b.repeat?' · mensal':''}</span>${p?'<span class="status-tag paid">Paga '+safe(shortDate(p.date))+'</span>':b.actualDue<todayISO()?'<span class="status-tag overdue">Vencida</span>':''}</span></label><div class="expense-right"><strong>${brl(b.amount)}</strong></div><button class="mini-edit" data-edit-expense="${safe(b.id)}" aria-label="Editar ${safe(b.title)}">✎</button></div>`;}).join(''):`<div class="empty-state"><strong>Nenhuma despesa neste mês</strong>Adicione aluguel, parcelas e outros gastos.</div>`;
}
function renderDays() {
  const {first,last}=monthRange(selectedMonth),start=parseDate(first).getDay(),max=Number(last.slice(-2));let html='';
  for(let i=0;i<start;i++) html+='<span class="day-cell blank"></span>';
  for(let day=1;day<=max;day++) {
    const date=`${selectedMonth}-${String(day).padStart(2,'0')}`,off=data.offDates.includes(date),done=data.earnings.some(e=>e.date===date);
    html+=`<button class="day-cell ${off?'off':done?'done':''} ${date===todayISO()?'today':''}" data-day="${date}" aria-label="${safe(fullDate(date))}${off?' - folga':done?' - ganho registrado':' - disponível'}" title="${off?'Folga':done?'Ganho registrado':'Disponível'}">${day}</button>`;
  }
  $('calendar-grid').innerHTML=html;
  $('work-days-count').textContent=availableDates(todayISO()>first?todayISO():first,last).length;
}
function nav(tab) {currentTab=tab;document.querySelectorAll('.view').forEach(el=>el.classList.toggle('active',el.id===`view-${tab}`));document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.tab===tab));window.scrollTo({top:0,behavior:'instant'});}
function updateEarningPreview() {const n=numberValue('earning-uber')+numberValue('earning-99')-numberValue('earning-fuel')-numberValue('earning-other');$('earning-preview').textContent=brl(n);$('earning-preview').style.color=n<0?'#b74e4e':'';}
function loadEarning(date) {
  const e=data.earnings.find(x=>x.date===date);
  $('earning-date').value=date;$('earning-uber').value=e?.uber ?? 0;$('earning-99').value=e?.n99 ?? 0;$('earning-fuel').value=e?.fuel ?? 0;$('earning-other').value=e?.other ?? 0;
  $('earning-form-title').textContent=e?'Editar ganho do dia':'Adicionar ganho';$('save-earning').textContent=e?'Atualizar dia':'Salvar dia';$('delete-earning').hidden=!e;updateEarningPreview();
}
function clearEarning() {loadEarning(todayISO());}
function openModal(kind) {const overlay=$('modal-overlay');overlay.hidden=false;$('expense-modal').hidden=kind!=='expense';$('settings-modal').hidden=kind!=='settings';$('modal-heading').textContent=kind==='expense'?'Despesa':'Configurações e backup';document.body.style.overflow='hidden';}
function closeModal() {$('modal-overlay').hidden=true;document.body.style.overflow='';}
function editExpense(id) {
  const e=data.expenses.find(x=>x.id===id);if(!e)return;
  $('expense-edit-id').value=e.id;$('expense-title').value=e.title;$('expense-amount').value=e.amount;$('expense-date').value=e.due;$('expense-type').value=e.type;$('expense-repeat').checked=!!e.repeat;$('delete-expense').hidden=false;
  openModal('expense');$('modal-heading').textContent='Editar despesa';
}
function newExpense() { $('expense-form').reset();$('expense-edit-id').value='';$('expense-date').value=todayISO();$('expense-type').value='variable';$('expense-repeat').checked=false;$('delete-expense').hidden=true;openModal('expense');$('modal-heading').textContent='Nova despesa'; }
function downloadFile(name,contents,type) {const blob=new Blob([contents],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function init() {
  $('earning-form').addEventListener('submit',e=>{
    e.preventDefault();const date=$('earning-date').value;
    const record={date,uber:money(numberValue('earning-uber')),n99:money(numberValue('earning-99')),fuel:money(numberValue('earning-fuel')),other:money(numberValue('earning-other'))};
    if([record.uber,record.n99,record.fuel,record.other].some(v=>v<0))return toast('Informe apenas valores positivos.');
    const idx=data.earnings.findIndex(x=>x.date===date);if(idx>=0)data.earnings[idx]=record;else data.earnings.push(record);
    selectedMonth=date.slice(0,7);persist();toast('Ganho diário salvo!');loadEarning(date);
  });
  $('earning-date').addEventListener('change',e=>loadEarning(e.target.value));
  ['earning-uber','earning-99','earning-fuel','earning-other'].forEach(id=>$(id).addEventListener('input',updateEarningPreview));
  $('clear-earning').addEventListener('click',clearEarning);
  $('delete-earning').addEventListener('click',()=>{const date=$('earning-date').value;if(!data.earnings.some(x=>x.date===date))return;if(!confirm('Excluir os ganhos registrados neste dia?'))return;data.earnings=data.earnings.filter(e=>e.date!==date);persist();clearEarning();toast('Lançamento excluído.');});
  $('settings-btn').addEventListener('click',()=>{ $('opening-balance').value=data.initialCash;$('opening-date').value=data.openingDate;openModal('settings');});
  $('save-settings').addEventListener('click',()=>{
    const amount=numberValue('opening-balance'),date=$('opening-date').value;if(!date||amount<0)return toast('Confira saldo e data inicial.');data.initialCash=money(amount);data.openingDate=date;persist();closeModal();toast('Configurações atualizadas.');
  });
  $('open-expense-form').addEventListener('click',newExpense);
  $('expense-form').addEventListener('submit',e=>{
    e.preventDefault();const id=$('expense-edit-id').value||newId();const title=$('expense-title').value.trim();const amount=money(numberValue('expense-amount')),due=$('expense-date').value;
    if(!title || !due || amount<=0)return toast('Confira descrição, valor e vencimento.');
    const ex={id,title,amount,due,type:$('expense-type').value,repeat:$('expense-repeat').checked};const idx=data.expenses.findIndex(x=>x.id===id);
    if(idx>=0){const old=data.expenses[idx];if(old.repeat!==ex.repeat || old.due!==ex.due){const alreadyPaid=Object.keys(data.payments).some(k=>k.startsWith(id+'@'));if(alreadyPaid&&!confirm('Alterar a recorrência ou o vencimento pode mudar o mês das contas pagas. Deseja continuar?'))return;}data.expenses[idx]=ex;}else data.expenses.push(ex);
    selectedMonth=due.slice(0,7);persist();closeModal();toast('Despesa salva!');
  });
  $('delete-expense').addEventListener('click',()=>{
    const id=$('expense-edit-id').value;const e=data.expenses.find(x=>x.id===id);if(!e)return;
    if(!confirm(`Excluir "${e.title}" e seu histórico de pagamentos?`))return;
    data.expenses=data.expenses.filter(x=>x.id!==id);for(const key of Object.keys(data.payments)) if(key.startsWith(id+'@'))delete data.payments[key];persist();closeModal();toast('Despesa excluída.');
  });
  $('export-data').addEventListener('click',()=>{
    const backup=JSON.stringify({app:'Meu Corre',exportedAt:new Date().toISOString(),data},null,2);
    if(window.MeuCorreAndroid && typeof window.MeuCorreAndroid.exportBackup==='function'){
      window.MeuCorreAndroid.exportBackup(backup);
      return;
    }
    downloadFile(`meu-corre-backup-${todayISO()}.json`,backup,'application/json');
    toast('Backup exportado!');
  });
  $('show-backup-text').addEventListener('click',()=>{
    const section=$('backup-text-section');section.hidden=!section.hidden;
    if(!section.hidden) $('backup-text').value=JSON.stringify({app:'Meu Corre',exportedAt:new Date().toISOString(),data});
  });
  $('copy-backup-text').addEventListener('click',async()=>{
    const field=$('backup-text');field.focus();field.select();
    try {if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(field.value);toast('Backup copiado!');return;}}
    catch(error){}
    if(document.execCommand?.('copy'))toast('Backup copiado!');else toast('Selecione o texto e use Copiar.');
  });
  $('restore-backup-text').addEventListener('click',()=>{
    try {
      const payload=JSON.parse($('backup-text').value);
      const imported=payload.data||payload;
      if(!validData(imported))throw Error('Arquivo incompatível');
      if(!confirm('Restaurar backup? Todos os registros atuais serão substituídos.'))return;
      data=imported;selectedMonth=todayISO().slice(0,7);persist();closeModal();loadEarning(todayISO());toast('Backup restaurado!');
    }catch(error){toast('Texto de backup inválido.');}
  });
  $('import-data').addEventListener('click',()=>$('import-file').click());
  $('import-file').addEventListener('change',async e=>{
    const file=e.target.files[0];if(!file)return;
    try {const payload=JSON.parse(await file.text());const imported=payload.data||payload;if(!validData(imported))throw Error('Arquivo incompatível');if(!confirm('Restaurar backup e substituir os registros atuais?'))return;data=imported;persist();closeModal();toast('Backup restaurado!');}catch(err){toast('Não foi possível importar este backup.');}finally{e.target.value='';}
  });
  $('reset-data').addEventListener('click',()=>{if(confirm('Tem certeza? Todos os registros deste aparelho serão apagados e voltarão os dados de exemplo.')){data=defaultData();selectedMonth=todayISO().slice(0,7);persist();closeModal();loadEarning(todayISO());toast('Dados de exemplo restaurados.');}});
  document.addEventListener('click',e=>{
    const t=e.target.closest('[data-tab]');if(t){nav(t.dataset.tab);return;}
    const m=e.target.closest('[data-month]');if(m){selectedMonth=addMonth(selectedMonth+'-01',Number(m.dataset.month)).slice(0,7);render();return;}
    const day=e.target.closest('[data-day]');if(day){const date=day.dataset.day;const idx=data.offDates.indexOf(date);if(idx>=0)data.offDates.splice(idx,1);else data.offDates.push(date);persist();toast(idx>=0?'Dia liberado para trabalho.':'Folga marcada.');return;}
    const ee=e.target.closest('[data-edit-earning]');if(ee){loadEarning(ee.dataset.editEarning);$('earning-date').scrollIntoView({block:'center',behavior:'smooth'});return;}
    const ed=e.target.closest('[data-edit-expense]');if(ed){editExpense(ed.dataset.editExpense);return;}
    if(e.target.closest('[data-close-modal]'))closeModal();
  });
  document.addEventListener('change',e=>{
    const key=e.target.dataset.pay;if(!key)return;
    if(e.target.checked){const [id,period]=key.split('@');const ex=data.expenses.find(x=>x.id===id);const due=ex?(ex.repeat?dueForMonth(ex,period):ex.due):null;const item=ex?{...ex,actualDue:due,key}:null;
      if(!item){e.target.checked=false;return toast('Conta não encontrada.');}
      data.payments[key]={date:todayISO(),amount:money(item.amount)};
    } else delete data.payments[key];persist();toast(e.target.checked?'Conta marcada como paga!':'Pagamento desmarcado.');
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('modal-overlay').hidden)closeModal();});
  clearEarning();render();
  if(!window.MeuCorreAndroid && 'serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
