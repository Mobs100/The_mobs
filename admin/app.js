// THE MOBS — Admin Console
// Real Supabase-backed administration for the new V1 interface.

const SUPABASE_URL = "https://pcundfmldniuemtbjnop.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_hQy6k4JCxvq6UVf7Lzf_ow_a45kiq_O";
const RESTAURANT_ID = "81561a5d-c8e6-41b8-b6fd-5f582bc7e97a";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let orders = [];
let products = [];
let categories = [];
let currentOrder = null;
let orderFilter = 'all';

const STATUS_LABELS = {
  pending: 'New', confirmed: 'Confirmed', preparing: 'Preparing', ready: 'Ready',
  out_for_delivery: 'Out for delivery', delivered: 'Delivered', cancelled: 'Cancelled'
};

const STATUS_CLASS = {
  pending:'graypill', confirmed:'blue', preparing:'yellow', ready:'green',
  out_for_delivery:'blue', delivered:'green', cancelled:'red'
};

function esc(v){return String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function money(v){return `${Number(v||0).toFixed(2)} SAR`;}
function statusLabel(s){return STATUS_LABELS[s]||s||'New';}
function badge(s){const key=Object.keys(STATUS_LABELS).find(k=>STATUS_LABELS[k]===s)||s; const c=STATUS_CLASS[key]|| (s==='Available'?'green':s==='Low stock'?'yellow':'graypill'); return `<span class="pill ${c}">${esc(s)}</span>`;}
function showToast(t){const x=document.getElementById('toast'); if(!x)return; x.textContent=t; x.classList.add('show'); setTimeout(()=>x.classList.remove('show'),2200);}
function toggle(x){x.classList.toggle('on');}
function openModalRaw(){document.getElementById('modal').classList.add('show');}
function closeModal(){document.getElementById('modal').classList.remove('show');}

function go(id){
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('show'));
  const page=document.getElementById(id); if(page) page.classList.add('show');
  document.querySelectorAll('.nav button').forEach(x=>x.classList.toggle('active',x.dataset.page===id));
  window.scrollTo(0,0);
  loadPage(id);
}

document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>go(b.dataset.page));

async function loadPage(id){
  if(id==='dashboard') await loadDashboard();
  if(id==='orders') await loadOrders();
  if(id==='kitchen') await loadKitchen();
  if(id==='menu') await loadMenu();
  if(id==='products') await loadProducts();
  if(id==='categories') await loadCategories();
  if(id==='customers') await loadCustomers();
  if(id==='payments') await loadPayments();
  if(id==='reports') await loadReports();
  if(id==='settings') await loadSettings();
  if(['drivers','branches','inventory','promos','notifications','staff','audit','modifiers'].includes(id)) renderStaticModule(id);
}

async function fetchBaseOrders(limit=1000){
  const {data,error}=await supabaseClient.from('orders').select('*').eq('restaurant_id',RESTAURANT_ID).order('created_at',{ascending:false}).limit(limit);
  if(error) throw error;
  return data||[];
}

async function fetchOrderItems(orderIds){
  if(!orderIds.length) return [];
  const {data,error}=await supabaseClient.from('order_items').select('id,order_id,product_id,product_name,unit_price,quantity,line_total').in('order_id',orderIds);
  if(error) throw error;
  return data||[];
}

async function fetchCategories(){
  const {data,error}=await supabaseClient.from('menu_categories').select('*').eq('restaurant_id',RESTAURANT_ID).order('sort_order',{ascending:true}).order('id',{ascending:true});
  if(error) throw error; return data||[];
}

async function fetchProducts(){
  const {data,error}=await supabaseClient.from('products').select('*, menu_categories(name)').eq('restaurant_id',RESTAURANT_ID).order('sort_order',{ascending:true}).order('id',{ascending:true});
  if(error) throw error; return data||[];
}

function setStat(selector,value){const el=document.querySelector(selector);if(el)el.textContent=value;}

async function loadDashboard(){
  try{
    orders=await fetchBaseOrders();
    const today=new Date(); today.setHours(0,0,0,0);
    const todayOrders=orders.filter(o=>new Date(o.created_at)>=today);
    const active=todayOrders.filter(o=>!['delivered','cancelled'].includes(o.status));
    const sales=todayOrders.filter(o=>o.status!=='cancelled').reduce((a,o)=>a+Number(o.total||0),0);
    const avg=todayOrders.length?sales/todayOrders.length:0;
    setStat('.stat:nth-child(1) .num',money(sales));
    setStat('.stat:nth-child(1) .trend',`${todayOrders.length} orders today`);
    setStat('.stat:nth-child(2) .num',todayOrders.length);
    setStat('.stat:nth-child(2) .trend',`${orders.length} total orders`);
    setStat('.stat:nth-child(3) .num',money(avg));
    setStat('.stat:nth-child(3) .trend',`Average order value`);
    setStat('.stat:nth-child(4) .num',active.length);
    setStat('.stat:nth-child(4) .trend',`${active.filter(o=>o.status==='preparing').length} preparing · ${active.filter(o=>o.status==='out_for_delivery').length} delivery`);

    const statusCounts={pending:0,preparing:0,ready:0,out_for_delivery:0,delivered:0,cancelled:0};
    todayOrders.forEach(o=>{if(statusCounts[o.status]!==undefined)statusCounts[o.status]++});
    const statusBox=document.querySelector('#dashboard .layout2 .card:nth-child(2) .mini-list');
    if(statusBox) statusBox.innerHTML=[['New',statusCounts.pending],['Preparing',statusCounts.preparing],['Ready',statusCounts.ready],['Out for delivery',statusCounts.out_for_delivery],['Delivered',statusCounts.delivered]].map(([a,b])=>`<div class="mini"><span>${a}</span><b>${b}</b></div>`).join('');

    const chart=document.querySelector('#dashboard .chart');
    if(chart){
      const days=[]; for(let i=6;i>=0;i--){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-i);days.push(d);}
      const vals=days.map(d=>todayAmountForDay(d,orders)); const max=Math.max(...vals,1);
      chart.innerHTML=days.map((d,i)=>`<div class="col" style="height:${Math.max(8,Math.round(vals[i]/max*90))}%"><label>${d.toLocaleDateString('en-US',{weekday:'short'})}</label></div>`).join('');
    }
    const items=await fetchOrderItems(orders.slice(0,5).map(o=>o.id));
    const itemMap={}; items.forEach(i=>{itemMap[i.order_id]=(itemMap[i.order_id]||0)+Number(i.quantity||0)});
    document.getElementById('dashOrders').innerHTML=orderTableHTML(orders.slice(0,8),itemMap,true);
  }catch(e){console.error(e);showToast('Dashboard error: '+e.message);}
}
function todayAmountForDay(d,list){const next=new Date(d);next.setDate(next.getDate()+1);return list.filter(o=>{const x=new Date(o.created_at);return x>=d&&x<next&&o.status!=='cancelled'}).reduce((a,o)=>a+Number(o.total||0),0);}

function orderTableHTML(list,itemMap={},withActions=true){
  if(!list.length)return '<div style="padding:20px;color:#777">No orders found.</div>';
  return `<table class="table"><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>ITEMS</th><th>TOTAL</th><th>STATUS</th><th>TIME</th>${withActions?'<th></th>':''}</tr></thead><tbody>`+
  list.map((o,i)=>`<tr><td class="orderid">#MOBS-${o.order_number}</td><td>${customerDisplay(o)}</td><td>${itemMap[o.id]||'—'}</td><td class="money">${money(o.total)}</td><td>${badge(statusLabel(o.status))}</td><td>${new Date(o.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</td>${withActions?`<td><button class="iconbtn" onclick="openOrder('${o.id}')">View →</button></td>`:''}</tr>`).join('')+'</tbody></table>';
}
function customerDisplay(o){return o.customer_name||o.customer_phone||('Guest · '+String(o.customer_token||'').slice(0,8));}

async function loadOrders(){
  try{
    orders=await fetchBaseOrders();
    const search=(document.querySelector('#orders .filters input')?.value||'').trim().toLowerCase();
    const branch=document.querySelector('#orders .filters select')?.value||'All branches';
    let list=orders.filter(o=>!search||String(o.order_number).includes(search)||String(o.customer_phone||'').toLowerCase().includes(search)||String(o.customer_token||'').toLowerCase().includes(search));
    if(orderFilter!=='all') list=list.filter(o=>o.status===orderFilter);
    const items=await fetchOrderItems(list.map(o=>o.id)); const itemMap={};items.forEach(i=>itemMap[i.order_id]=(itemMap[i.order_id]||0)+Number(i.quantity||0));
    document.getElementById('ordersTable').innerHTML=orderTableHTML(list,itemMap,true);
    updateOrderTabs();
  }catch(e){console.error(e);showToast('Orders error: '+e.message);}
}
function updateOrderTabs(){
  const counts={all:orders.length,pending:0,preparing:0,ready:0,out_for_delivery:0,delivered:0,cancelled:0};orders.forEach(o=>{if(counts[o.status]!=null)counts[o.status]++});
  const names=[['all',`All ${counts.all}`],['pending',`New ${counts.pending}`],['preparing',`Preparing ${counts.preparing}`],['ready',`Ready ${counts.ready}`],['out_for_delivery',`Delivery ${counts.out_for_delivery}`],['delivered',`Completed ${counts.delivered}`],['cancelled',`Cancelled ${counts.cancelled}`]];
  const tabs=document.querySelectorAll('#orders .tabs button'); tabs.forEach((b,i)=>{if(names[i]){b.textContent=names[i][1];b.classList.toggle('sel',orderFilter===names[i][0]);b.onclick=()=>{orderFilter=names[i][0];loadOrders();}}});
}

async function loadKitchen(){
  try{orders=await fetchBaseOrders();
    for(const [id,status] of [['knew','pending'],['kprep','preparing'],['kready','ready']]){
      const arr=orders.filter(o=>o.status===status).slice(0,8);const el=document.getElementById(id);
      el.innerHTML=arr.length?arr.map(o=>`<div class="mini"><div><b>#MOBS-${o.order_number}</b><small style="display:block;color:#777">${esc(customerDisplay(o))} · ${money(o.total)}</small></div>${status==='pending'?`<button class="btn primary" style="padding:7px 9px;font-size:10px" onclick="setOrderStatus('${o.id}','preparing')">Accept</button>`:status==='preparing'?`<button class="btn primary" style="padding:7px 9px;font-size:10px" onclick="setOrderStatus('${o.id}','ready')">Ready</button>`:`<button class="btn dark" style="padding:7px 9px;font-size:10px" onclick="setOrderStatus('${o.id}','out_for_delivery')">Dispatch</button>`}</div>`).join(''):'<div style="color:#777;font-size:12px">No orders.</div>';
    }
  }catch(e){showToast('Kitchen error: '+e.message)}
}

async function openOrder(id){
  try{
    const o=orders.find(x=>x.id===id)||(await supabaseClient.from('orders').select('*').eq('id',id).single()).data;
    if(!o)return; currentOrder=o;
    const {data:items,error}=await supabaseClient.from('order_items').select('*').eq('order_id',id).order('created_at'); if(error)throw error;
    const steps=['pending','confirmed','preparing','ready','out_for_delivery','delivered'];const idx=steps.indexOf(o.status);
    const labels=['Order placed','Accepted by kitchen','Preparing','Ready for pickup','Out for delivery','Delivered'];
    document.getElementById('modalbox').innerHTML=`<div class="titlebar"><div class="title"><h1>#MOBS-${o.order_number}</h1><p>${new Date(o.created_at).toLocaleString()}</p></div>${badge(statusLabel(o.status))}</div><div class="detail"><div class="card"><h3>Order Timeline</h3><div class="timeline">${labels.map((x,j)=>`<div class="step ${j<=idx?'done':''}"><div class="dot">${j<=idx?'✓':j+1}</div><div><b>${x}</b><small style="display:block;color:#777;margin-top:3px">${j<=idx?(j===0?new Date(o.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):'Completed'):'Pending'}</small></div></div>`).join('')}</div></div><div class="card"><h3>Order Summary</h3><div class="mini"><span>Customer</span><b>${esc(customerDisplay(o))}</b></div><div class="mini"><span>Items</span><b>${items.reduce((a,x)=>a+Number(x.quantity||0),0)}</b></div><div class="mini"><span>Total</span><b>${money(o.total)}</b></div><div class="mini"><span>Payment</span><b>${esc(o.payment_method||'—')}</b></div><div class="mini"><span>Address</span><b>${esc(o.delivery_address||'—')}</b></div><div class="mini"><span>Instructions</span><b>${esc(o.delivery_instructions||'—')}</b></div><div style="margin-top:15px"><label style="font-size:11px;font-weight:800">UPDATE STATUS</label><select id="modalStatus" style="width:100%;margin-top:6px;padding:10px;border:1px solid var(--line);border-radius:9px">${Object.entries(STATUS_LABELS).map(([v,l])=>`<option value="${v}" ${v===o.status?'selected':''}>${l}</option>`).join('')}</select><button class="btn primary" style="margin-top:10px;width:100%" onclick="updateModalStatus()">Update Status</button></div></div></div><div class="card" style="margin-top:16px"><h3>Order Items</h3>${items.length?items.map(i=>`<div class="mini"><span>${esc(i.product_name)} × ${i.quantity}</span><b>${money(i.line_total)}</b></div>`).join(''):'<div style="color:#777">No item details.</div>'}</div>`;
    openModalRaw();
  }catch(e){showToast('Order error: '+e.message)}
}
async function updateModalStatus(){const s=document.getElementById('modalStatus').value;await setOrderStatus(currentOrder.id,s,true);}
async function setOrderStatus(id,status,close=false){
  try{const {error}=await supabaseClient.from('orders').update({status}).eq('id',id).eq('restaurant_id',RESTAURANT_ID);if(error)throw error;showToast('Order status updated');if(close)closeModal();await Promise.all([loadDashboard(),loadOrders(),loadKitchen()]);}catch(e){console.error(e);showToast('Could not update order: '+e.message);}
}

async function loadMenu(){
  try{products=await fetchProducts();document.getElementById('menuTable').innerHTML=productTableHTML(products,true);}catch(e){showToast('Menu error: '+e.message)}
}
function productTableHTML(list,actions){return `<table class="table"><thead><tr><th>PRODUCT</th><th>CATEGORY</th><th>PRICE</th><th>STATUS</th><th>VISIBILITY</th>${actions?'<th></th>':''}</tr></thead><tbody>${list.map(p=>`<tr><td><div class="product">${p.image_url?`<img src="${esc(p.image_url)}" class="thumb" style="object-fit:cover">`:'<div class="thumb">🍔</div>'}<div><b>${esc(p.name)}</b><small>${esc(p.description||'')}</small></div></div></td><td>${esc(p.menu_categories?.name||'—')}</td><td class="money">${money(p.price)}</td><td>${badge(p.is_available?'Available':'Hidden')}</td><td>${p.is_featured?'<span class="pill yellow">Featured</span>':'Published'}</td>${actions?`<td><button class="iconbtn" onclick="openProductEditor('${p.id}')">Edit</button></td>`:''}</tr>`).join('')}</tbody></table>`;}
async function loadProducts(){try{products=await fetchProducts();document.getElementById('productTable').innerHTML=productTableHTML(products,true);}catch(e){showToast('Products error: '+e.message)}}

async function loadCategories(){
  try{categories=await fetchCategories(); if(!products.length) products=await fetchProducts();
    document.getElementById('catCards').innerHTML=categories.length?categories.map(c=>`<div class="card"><h3>${esc(c.name)}</h3><div style="font-size:28px;font-weight:900">${products.filter(p=>p.menu_category_id===c.id).length}</div><p style="font-size:11px;color:#777">Products · ${c.is_active===false?'Inactive':'Active'}</p><div style="display:flex;gap:8px"><button class="btn ghost" onclick="openCategoryEditor('${c.id}')">Manage →</button><button class="btn danger" onclick="deleteCategory('${c.id}')">Delete</button></div></div>`).join(''):'<div class="card">No categories yet.</div>';
  }catch(e){showToast('Categories error: '+e.message)}
}

function openCategoryEditor(id=null){const c=id?categories.find(x=>x.id===id):null;document.getElementById('modalbox').innerHTML=`<h2>${c?'Edit':'New'} Category</h2><div class="formgrid"><div class="field"><label>NAME</label><input id="mCatName" value="${esc(c?.name||'')}"></div><div class="field"><label>SORT ORDER</label><input id="mCatSort" type="number" value="${Number(c?.sort_order||0)}"></div><div class="field full"><label>DESCRIPTION</label><textarea id="mCatDesc" rows="3">${esc(c?.description||'')}</textarea></div><div class="field full"><label>IMAGE URL</label><input id="mCatImage" value="${esc(c?.image_url||'')}"></div></div><div style="display:flex;justify-content:end;gap:8px;margin-top:18px"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="saveCategory('${id||''}')">Save Category</button></div>`;openModalRaw();}
async function saveCategory(id){try{const payload={restaurant_id:RESTAURANT_ID,name:document.getElementById('mCatName').value.trim(),description:document.getElementById('mCatDesc').value.trim()||null,image_url:document.getElementById('mCatImage').value.trim()||null,sort_order:Number(document.getElementById('mCatSort').value||0),is_active:true};if(!payload.name)throw new Error('Category name is required');let q=id?supabaseClient.from('menu_categories').update(payload).eq('id',id).eq('restaurant_id',RESTAURANT_ID):supabaseClient.from('menu_categories').insert(payload);const {error}=await q;if(error)throw error;closeModal();showToast('Category saved');await loadCategories();await loadProducts();}catch(e){showToast('Category error: '+e.message)}}
async function deleteCategory(id){if(!confirm('Delete this category? Products are not deleted automatically.'))return;try{const {error}=await supabaseClient.from('menu_categories').delete().eq('id',id).eq('restaurant_id',RESTAURANT_ID);if(error)throw error;showToast('Category deleted');await loadCategories();}catch(e){showToast('Delete failed: '+e.message)}}

function openProductEditor(id=null){const p=id?products.find(x=>x.id===id):null;const opts=categories.map(c=>`<option value="${c.id}" ${c.id===p?.menu_category_id?'selected':''}>${esc(c.name)}</option>`).join('');document.getElementById('modalbox').innerHTML=`<h2>${p?'Edit':'New'} Product</h2><p style="color:#777;font-size:12px">Manage the customer-facing menu item in Supabase.</p><div class="formgrid"><div class="field"><label>NAME</label><input id="mProdName" value="${esc(p?.name||'')}"></div><div class="field"><label>PRICE (SAR)</label><input id="mProdPrice" type="number" step="0.01" min="0" value="${p?.price??''}"></div><div class="field"><label>CATEGORY</label><select id="mProdCat">${opts}</select></div><div class="field"><label>SORT ORDER</label><input id="mProdSort" type="number" value="${Number(p?.sort_order||0)}"></div><div class="field full"><label>DESCRIPTION</label><textarea id="mProdDesc" rows="3">${esc(p?.description||'')}</textarea></div><div class="field full"><label>IMAGE URL</label><input id="mProdImage" value="${esc(p?.image_url||'')}"></div><div class="field"><label>AVAILABLE</label><select id="mProdAvail"><option value="true" ${p?.is_available!==false?'selected':''}>Available</option><option value="false" ${p?.is_available===false?'selected':''}>Hidden</option></select></div><div class="field"><label>FEATURED</label><select id="mProdFeatured"><option value="false" ${!p?.is_featured?'selected':''}>No</option><option value="true" ${p?.is_featured?'selected':''}>Yes</option></select></div></div><div style="display:flex;justify-content:end;gap:8px;margin-top:18px"><button class="btn ghost" onclick="closeModal()">Cancel</button>${p?`<button class="btn danger" onclick="deleteProduct('${p.id}')">Delete</button>`:''}<button class="btn primary" onclick="saveProduct('${id||''}')">Save Product</button></div>`;openModalRaw();}
async function saveProduct(id){try{const payload={restaurant_id:RESTAURANT_ID,name:document.getElementById('mProdName').value.trim(),price:Number(document.getElementById('mProdPrice').value),description:document.getElementById('mProdDesc').value.trim()||null,menu_category_id:document.getElementById('mProdCat').value||null,sort_order:Number(document.getElementById('mProdSort').value||0),image_url:document.getElementById('mProdImage').value.trim()||null,is_available:document.getElementById('mProdAvail').value==='true',is_featured:document.getElementById('mProdFeatured').value==='true'};if(!payload.name||!Number.isFinite(payload.price))throw new Error('Name and valid price are required');const {error}=id?await supabaseClient.from('products').update(payload).eq('id',id).eq('restaurant_id',RESTAURANT_ID):await supabaseClient.from('products').insert(payload);if(error)throw error;closeModal();showToast('Product saved');await loadProducts();await loadMenu();}catch(e){showToast('Product error: '+e.message)}}
async function deleteProduct(id){if(!confirm('Delete this product?'))return;try{const {error}=await supabaseClient.from('products').delete().eq('id',id).eq('restaurant_id',RESTAURANT_ID);if(error)throw error;closeModal();showToast('Product deleted');await loadProducts();await loadMenu();}catch(e){showToast('Delete failed: '+e.message)}}

async function loadCustomers(){try{orders=await fetchBaseOrders();const map=new Map();orders.forEach(o=>{const k=o.customer_token||'guest';if(!map.has(k))map.set(k,{token:k,count:0,total:0,last:o.created_at});const c=map.get(k);c.count++;c.total+=Number(o.total||0);if(new Date(o.created_at)>new Date(c.last))c.last=o.created_at});const rows=[...map.values()].sort((a,b)=>b.total-a.total);document.getElementById('customerTable').innerHTML=rows.length?`<table class="table"><thead><tr><th>CUSTOMER</th><th>ORDERS</th><th>TOTAL SPENT</th><th>LAST ORDER</th></tr></thead><tbody>${rows.map(c=>`<tr><td><b>Guest customer</b><small style="display:block;color:#777">Token ${esc(c.token.slice(0,12))}…</small></td><td>${c.count}</td><td class="money">${money(c.total)}</td><td>${new Date(c.last).toLocaleString()}</td></tr>`).join('')}</tbody></table>`:'<div style="padding:20px;color:#777">No customers/orders yet.</div>'}catch(e){showToast('Customers error: '+e.message)}}

async function loadPayments(){try{orders=await fetchBaseOrders();const valid=orders.filter(o=>o.status!=='cancelled');const captured=valid.reduce((a,o)=>a+Number(o.total||0),0),cash=valid.filter(o=>o.payment_method==='cash_on_delivery').reduce((a,o)=>a+Number(o.total||0),0),noncash=captured-cash;const cards=document.querySelectorAll('#payments .stat .num');if(cards[0])cards[0].textContent=money(captured);if(cards[1])cards[1].textContent=money(cash);if(cards[2])cards[2].textContent=money(orders.filter(o=>o.status==='cancelled').reduce((a,o)=>a+Number(o.total||0),0));if(cards[3])cards[3].textContent=money(noncash);document.getElementById('paymentTable').innerHTML=tableFromRows(valid.slice(0,50).map(o=>[`#MOBS-${o.order_number}`,esc(o.payment_method||'—'),money(o.total),badge(statusLabel(o.status)),new Date(o.created_at).toLocaleString()]),['ORDER','METHOD','AMOUNT','STATUS','TIME'],false)}catch(e){showToast('Payments error: '+e.message)}}
async function loadReports(){try{orders=await fetchBaseOrders();const valid=orders.filter(o=>o.status!=='cancelled');const sales=valid.reduce((a,o)=>a+Number(o.total||0),0),aov=valid.length?sales/valid.length:0;const nums=document.querySelectorAll('#reports .stat .num');if(nums[0])nums[0].textContent=money(sales);if(nums[1])nums[1].textContent=valid.length.toLocaleString();if(nums[2])nums[2].textContent=money(aov);if(nums[3])nums[3].textContent='—';const byCat={};const items=await fetchOrderItems(valid.map(o=>o.id));const p=await fetchProducts();const catMap={};p.forEach(x=>catMap[x.id]=x.menu_categories?.name||'Uncategorized');items.forEach(i=>{const c=catMap[i.product_id]||'Uncategorized';byCat[c]=(byCat[c]||0)+Number(i.line_total||0)});const total=Math.max(Object.values(byCat).reduce((a,b)=>a+b,0),1);const box=document.querySelector('#reports .layout2 .card:first-child .mini-list');if(box)box.innerHTML=Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([c,v])=>`<div class="mini"><span>${esc(c)}</span><b>${Math.round(v/total*100)}%</b></div><div class="bar"><span style="width:${Math.round(v/total*100)}%"></span></div>`).join('')||'<div style="color:#777">No sales yet.</div>';const top={};items.forEach(i=>top[i.product_name]=(top[i.product_name]||0)+Number(i.quantity||0));const tbox=document.querySelector('#reports .layout2 .card:nth-child(2) .mini-list');if(tbox)tbox.innerHTML=Object.entries(top).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([n,v])=>`<div class="mini"><span>${esc(n)}</span><b>${v}</b></div>`).join('')||'<div style="color:#777">No product sales yet.</div>'}catch(e){showToast('Reports error: '+e.message)}}

function tableFromRows(rows,heads,actions=true){return `<table class="table"><thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}${actions?'<th></th>':''}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table>`}

async function loadSettings(){try{const {data,error}=await supabaseClient.from('restaurants').select('*').eq('id',RESTAURANT_ID).maybeSingle();if(error)throw error;const inputs=document.querySelectorAll('#settings input');if(data&&inputs.length){inputs[0].value=data.name||'THE MOBS';}}catch(e){console.error(e)}}

function renderStaticModule(id){
  const data={
    modifiers:[['Extra Cheese','+4 SAR','Products','Active'],['Extra Patty','+8 SAR','Burgers','Active'],['BBQ Sauce','+2 SAR','Burgers','Active']],
    drivers:[['Driver module','Not configured in current database schema','—','—','—','—']],
    branches:[['THE MOBS','Restaurant ID connected to Supabase','Active']],
    inventory:[['Inventory module','No inventory table exists in current schema','—','—']],
    promos:[['Promotions module','No promotions table exists in current schema','—','—']],
    notifications:[['Operational alerts','Notifications table not configured','—','—']],
    staff:[['Admin access','Use Supabase Auth for production admin accounts','Recommended','—']],
    audit:[['Audit log','Audit table not configured in current schema','—','—']]
  }[id];
  const el=document.getElementById(id+'Table')||document.querySelector('#'+id+' .card');
  if(!el)return;
  const heads={modifiers:['GROUP / OPTION','PRICE','APPLIES TO','STATUS'],drivers:['DRIVER','ID','VEHICLE','STATUS','TODAY','RATING'],branches:['BRANCH','DETAIL','STATUS'],inventory:['ITEM','ON HAND','REORDER AT','STATUS'],promos:['CODE','OFFER','AUDIENCE','STATUS'],notifications:['TITLE','MESSAGE','AUDIENCE','STATUS'],staff:['USER','EMAIL','ROLE','STATUS'],audit:['USER','ACTION','TYPE','WHEN']}[id]||[];
  el.innerHTML=tableFromRows(data.map(r=>r.map((x,i)=>i===r.length-1?badge(x):esc(x))),heads,false);
}

function globalSearch(v){
  if(!v.trim())return;
  const q=v.trim().toLowerCase();
  const match=orders.find(o=>String(o.order_number).includes(q)||String(o.customer_token||'').toLowerCase().includes(q));
  if(match){go('orders');setTimeout(()=>openOrder(match.id),50);} else showToast('No matching order found');
}

function enter(){document.getElementById('login').style.display='none';document.getElementById('app').style.display='flex';}
function openModal(type){if(type==='product'){openProductEditor();return;}openOrderCreate();}
function openOrderCreate(){
  document.getElementById('modalbox').innerHTML=`<h2>Create New Order</h2><p style="color:#777;font-size:12px">This creates an order directly in the connected Supabase database.</p><div class="formgrid"><div class="field"><label>CUSTOMER TOKEN (OPTIONAL)</label><input id="mOrderToken" placeholder="UUID token"></div><div class="field"><label>PAYMENT</label><select id="mOrderPayment"><option value="cash_on_delivery">Cash on delivery</option><option value="card">Card</option></select></div><div class="field"><label>DELIVERY FEE</label><input id="mOrderFee" type="number" step="0.01" value="0"></div><div class="field full"><label>ADDRESS</label><input id="mOrderAddress" placeholder="Delivery address"></div><div class="field full"><label>INSTRUCTIONS</label><textarea id="mOrderInstructions" rows="3"></textarea></div><div class="field full"><label>ITEMS (one per line: Product × quantity)</label><textarea id="mOrderItems" rows="5" placeholder="Classic Burger × 1\nFrench Fries × 1"></textarea></div></div><div style="display:flex;justify-content:end;gap:8px;margin-top:18px"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="createOrder()">Create Order</button></div>`;openModalRaw();}
async function createOrder(){
  try{
    const lines=document.getElementById('mOrderItems').value.split('\n').map(x=>x.trim()).filter(Boolean);if(!lines.length)throw new Error('Add at least one item');
    products=products.length?products:await fetchProducts();const parsed=[];for(const line of lines){const m=line.match(/^(.+?)\s*[×x*]\s*(\d+)$/);if(!m)throw new Error('Use: Product × quantity');const p=products.find(x=>x.name.toLowerCase()===m[1].trim().toLowerCase());if(!p)throw new Error('Product not found: '+m[1]);parsed.push({product:p,qty:Number(m[2])});}
    const subtotal=parsed.reduce((a,x)=>a+Number(x.product.price)*x.qty,0),fee=Number(document.getElementById('mOrderFee').value||0),tax=Math.round(subtotal*0.15*100)/100,total=subtotal+fee+tax;
    const token=document.getElementById('mOrderToken').value.trim();const customer_token=token||crypto.randomUUID();
    const {data:o,error}=await supabaseClient.from('orders').insert({restaurant_id:RESTAURANT_ID,customer_token,status:'pending',payment_method:document.getElementById('mOrderPayment').value,subtotal,delivery_fee:fee,tax,total,delivery_address:document.getElementById('mOrderAddress').value.trim()||null,delivery_instructions:document.getElementById('mOrderInstructions').value.trim()||null}).select().single();if(error)throw error;
    const rows=parsed.map(x=>({order_id:o.id,product_id:x.product.id,product_name:x.product.name,unit_price:x.product.price,quantity:x.qty,line_total:Number(x.product.price)*x.qty}));const {error:ie}=await supabaseClient.from('order_items').insert(rows);if(ie)throw ie;
    closeModal();showToast('Order created');await loadDashboard();
  }catch(e){showToast('Create order failed: '+e.message)}
}

// Hook the UI controls that existed as static demo controls.
document.querySelectorAll('#orders .filters input, #orders .filters select').forEach(x=>x.addEventListener('input',loadOrders));
const categoryAddButton=document.querySelector('#categories .titlebar .btn.primary');
if(categoryAddButton) categoryAddButton.onclick=()=>openCategoryEditor();
document.querySelectorAll('#settings .btn.primary').forEach(b=>b.onclick=async()=>{try{const name=document.querySelector('#settings input')?.value?.trim();if(!name)throw new Error('Restaurant name required');const {error}=await supabaseClient.from('restaurants').update({name}).eq('id',RESTAURANT_ID);if(error)throw error;showToast('Settings saved')}catch(e){showToast('Settings error: '+e.message)}});

go('dashboard');
