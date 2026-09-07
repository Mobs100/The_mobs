
// =========================================================
// THE MOBS CUSTOMER — SUPABASE
// =========================================================

const RESTAURANT_ID = window.MOBS_CONFIG.restaurantId;


const supabaseClient = window.MOBS_SUPABASE;

const screens = [
  'splash','welcome','location','home','menu','product','cart',
  'checkout','payment','review','success','tracking','orders','profile'
];

let products = [];
let categories = [];
let cart = JSON.parse(localStorage.getItem('mobs_cart') || '[]');
let currentProduct = null;
let selectedCategory = 'all';
let currentOrder = null;
let deliveryMap = null;
let deliveryMarker = null;
let deliveryMapReady = false;
let customerRealtimeChannel = null;

const money = value => `${Number(value || 0).toFixed(2).replace(/\.00$/, '')} SAR`;
const escapeHTML = value => String(value ?? '')
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

function saveCart(){
  localStorage.setItem('mobs_cart', JSON.stringify(cart));
  updateCount();
}

function updateCount(){
  const count = cart.reduce((sum,item) => sum + Number(item.quantity || 1), 0);
  document.querySelectorAll('#navCount,#count').forEach(el => el.textContent = count);
}

function go(id){
  screens.forEach(s => document.getElementById(s)?.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');

  if(id === 'home') renderHome();
  if(id === 'menu') renderMenu();
  if(id === 'cart') renderCart();
  if(id === 'review') renderReview();
  if(id === 'orders') loadOrders('active');
  if(id === 'tracking' && currentOrder?.tracking_token) loadTracking(currentOrder.tracking_token);
  if(id === 'checkout') setTimeout(initDeliveryMap, 50);

  window.scrollTo(0,0);
}

setTimeout(() => go('menu'), 1400);

async function loadData(){
  try {
    const [{ data: categoryData, error: categoryError }, { data: productData, error: productError }] = await Promise.all([
      supabaseClient
        .from('menu_categories')
        .select('id, name, sort_order, is_active')
        .eq('restaurant_id', RESTAURANT_ID)
        .order('sort_order', { ascending:true }),
      supabaseClient
        .from('products')
        .select('id, restaurant_id, name, description, image_url, price, category_id, is_available, is_featured, sort_order')
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('is_available', true)
        .order('sort_order', { ascending:true })
        .order('created_at', { ascending:true })
    ]);

    if(categoryError) throw categoryError;
    if(productError) throw productError;

    categories = (categoryData || []).filter(c => c.is_active !== false);
    products = productData || [];

    renderCategories();
    renderHome();
    renderMenu();
    updateCount();
  } catch(error) {
    console.error('MOBS menu load error:', error);
    const message = 'Could not load the menu. Check Supabase table permissions.';
    ['popularCards','menuList'].forEach(id => {
      const el = document.getElementById(id);
      if(el) el.innerHTML = `<div class="choice" style="grid-column:1/-1;text-align:center">${message}</div>`;
    });
  }
}

function productImage(product, className=''){
  if(product.image_url){
    return `<img src="${escapeHTML(product.image_url)}" alt="${escapeHTML(product.name)}" class="${className}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`;
  }
  return `<div class="burger"></div>`;
}

function renderCategories(){
  const el = document.getElementById('categories');
  if(!el) return;
  el.innerHTML = `<button class="cat ${selectedCategory==='all'?'active':''}" data-category="all" onclick="filterCategory('all', this)">All</button>` +
    categories.map(c => `<button class="cat ${selectedCategory===c.id?'active':''}" data-category="${escapeHTML(c.id)}" onclick="filterCategory('${String(c.id).replace(/'/g,"\\'")}', this)">${escapeHTML(c.name)}</button>`).join('');
}

function renderHome(){
  const el = document.getElementById('popularCards');
  if(!el) return;
  const featured = products.filter(p => p.is_featured).slice(0,4);
  const list = featured.length ? featured : products.slice(0,4);
  if(!list.length){ el.innerHTML = `<div class="choice" style="grid-column:1/-1;text-align:center">No products available.</div>`; return; }
  el.innerHTML = list.map(p => `
    <div class="food-card" onclick="openProductById('${p.id}')">
      <button class="fav" onclick="event.stopPropagation();toggleFavorite('${p.id}', this)">♡</button>
      <div class="food-thumb">${productImage(p)}</div>
      <div class="food-name">${escapeHTML(p.name)}</div>
      <div class="food-price">${money(p.price)}</div>
      ${p.is_featured ? '<span class="badge">HOT</span>' : ''}
    </div>
  `).join('');
}

function renderMenu(){
  const el = document.getElementById('menuList');
  if(!el) return;
  const filtered = selectedCategory === 'all' ? products : products.filter(p => p.category_id === selectedCategory);
  if(!filtered.length){ el.innerHTML = `<div class="choice" style="text-align:center">No products in this category.</div>`; return; }
  el.innerHTML = filtered.map(p => `
    <div class="row-card" onclick="openProductById('${p.id}')">
      <div class="row-thumb">${productImage(p)}</div>
      <div class="row-info">
        <b>${escapeHTML(p.name)}</b>
        <p>${escapeHTML(p.description || 'Freshly prepared for your story.')}</p>
        <span class="row-price">${money(p.price)}</span>
      </div>
      <span class="row-arrow">›</span>
    </div>
  `).join('');
}

function filterCategory(id, button){
  selectedCategory = id;
  document.querySelectorAll('#categories .cat').forEach(x => x.classList.remove('active'));
  button?.classList.add('active');
  renderMenu();
}

function openProductById(id){
  const product = products.find(p => p.id === id);
  if(product) openProduct(product);
}

function openProduct(productOrName){
  const product = typeof productOrName === 'string'
    ? products.find(p => p.name === productOrName)
    : productOrName;

  if(!product){
    alert('This product is not available.');
    return;
  }

  currentProduct = product;
  document.getElementById('productName').textContent = product.name;
  document.getElementById('productPrice').textContent = money(product.price);
  document.getElementById('productDescription').textContent = product.description || 'Freshly prepared for your story.';

  const art = document.querySelector('#product .product-art');
  if(art) art.innerHTML = product.image_url
    ? `<img src="${escapeHTML(product.image_url)}" alt="${escapeHTML(product.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:12px">`
    : `<div class="burger"></div>`;

  go('product');
}

function addToCart(){
  if(!currentProduct) return;
  const existing = cart.find(x => x.product_id === currentProduct.id);
  if(existing) existing.quantity = Number(existing.quantity || 1) + 1;
  else cart.push({
    product_id: currentProduct.id,
    name: currentProduct.name,
    price: Number(currentProduct.price),
    image_url: currentProduct.image_url || null,
    quantity: 1
  });
  saveCart();
  go('cart');
}

function changeQty(index, delta){
  const item = cart[index];
  if(!item) return;
  item.quantity = Number(item.quantity || 1) + delta;
  if(item.quantity <= 0) cart.splice(index,1);
  saveCart();
  renderCart();
}

function removeItem(i){ cart.splice(i,1); saveCart(); renderCart(); }
function addSame(i){ changeQty(i,1); }

function cartSubtotal(){
  return cart.reduce((sum,x) => sum + Number(x.price) * Number(x.quantity || 1), 0);
}
function cartTax(){ return Math.round(cartSubtotal() * 0.15 * 100) / 100; }
function cartTotal(){ return cartSubtotal() + (cart.length ? 8 : 0) + cartTax(); }

function renderCart(){
  const el = document.getElementById('cartItems');
  if(!el) return;
  if(!cart.length){
    el.innerHTML = `<div class="choice" style="text-align:center;padding:35px">Your cart is empty.<br><br><button class="btn yellow" onclick="go('menu')">BROWSE MENU</button></div>`;
  } else {
    el.innerHTML = cart.map((x,i) => `
      <div class="cart-item">
        <div class="row-thumb">${x.image_url ? `<img src="${escapeHTML(x.image_url)}" style="width:100%;height:100%;object-fit:cover;border-radius:7px">` : '<div class="burger"></div>'}</div>
        <div class="row-info">
          <b>${escapeHTML(x.name)}</b>
          <p>Freshly prepared for your story.</p>
          <span class="row-price">${money(x.price)}</span>
          <div class="qty">
            <button onclick="changeQty(${i},-1)">−</button>
            <b>${Number(x.quantity || 1)}</b>
            <button onclick="changeQty(${i},1)">＋</button>
          </div>
        </div>
        <b>${money(Number(x.price)*Number(x.quantity || 1))}</b>
      </div>
    `).join('');
  }
  document.getElementById('subtotal').textContent = money(cartSubtotal());
  document.getElementById('tax').textContent = money(cartTax());
  document.getElementById('total').textContent = money(cartTotal());
}

function renderReview(){
  const el = document.getElementById('reviewItems');
  if(!el) return;
  if(!cart.length){ el.innerHTML = '<b>Your cart is empty.</b>'; return; }
  const customer = getCustomerInfo();
  el.innerHTML = `<b>Customer</b>
    <div class="sumline"><span>Name</span><b>${escapeHTML(customer.name || '—')}</b></div>
    <div class="sumline"><span>Mobile</span><b>${escapeHTML(customer.phone || '—')}</b></div>
    <br>
    <b>Order Summary</b>` + cart.map(x => `
    <div class="sumline"><span>${escapeHTML(x.name)} × ${Number(x.quantity||1)}</span><b>${money(Number(x.price)*Number(x.quantity||1))}</b></div>
  `).join('') + `
    <div class="sumline"><span>Subtotal</span><b>${money(cartSubtotal())}</b></div>
    <div class="sumline"><span>Delivery Fee</span><b>${money(8)}</b></div>
    <div class="sumline"><span>Tax (15%)</span><b>${money(cartTax())}</b></div>
    <div class="sumline total"><span>Total</span><b>${money(cartTotal())}</b></div>
  `;
}

/* ---------------------------------------------------------
   DELIVERY MAP
   Leaflet + OpenStreetMap. Customer can tap the map or use
   browser geolocation. Coordinates are stored locally and
   sent with the order when the schema supports the fields.
--------------------------------------------------------- */
function setLocationStatus(message, type=''){
  const el = document.getElementById('locationStatus');
  if(!el) return;
  el.className = 'location-status' + (type ? ' ' + type : '');
  el.textContent = message;
}

function initDeliveryMap(){
  const el = document.getElementById('deliveryMap');
  if(!el || typeof L === 'undefined') return;

  if(!deliveryMap){
    // Default: Dammam. The user can immediately move the pin.
    deliveryMap = L.map(el, { zoomControl:true }).setView([26.4207, 50.0888], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom:19,
      attribution:'&copy; OpenStreetMap contributors'
    }).addTo(deliveryMap);

    deliveryMap.on('click', e => setDeliveryLocation(e.latlng.lat, e.latlng.lng, true));
    deliveryMapReady = true;
  }

  setTimeout(() => deliveryMap.invalidateSize(), 100);

  const savedLat = Number(localStorage.getItem('mobs_delivery_latitude'));
  const savedLng = Number(localStorage.getItem('mobs_delivery_longitude'));
  if(Number.isFinite(savedLat) && Number.isFinite(savedLng)){
    setDeliveryLocation(savedLat, savedLng, false);
  }
}

function setDeliveryLocation(lat, lng, moveMap=true){
  lat = Number(lat);
  lng = Number(lng);
  if(!Number.isFinite(lat) || !Number.isFinite(lng)) return;

  const latEl = document.getElementById('deliveryLatitude');
  const lngEl = document.getElementById('deliveryLongitude');
  if(latEl) latEl.value = lat.toFixed(7);
  if(lngEl) lngEl.value = lng.toFixed(7);

  localStorage.setItem('mobs_delivery_latitude', String(lat));
  localStorage.setItem('mobs_delivery_longitude', String(lng));

  if(deliveryMapReady && deliveryMap){
    if(!deliveryMarker){
      deliveryMarker = L.marker([lat,lng], {draggable:true}).addTo(deliveryMap);
      deliveryMarker.on('dragend', e => {
        const pos = e.target.getLatLng();
        setDeliveryLocation(pos.lat, pos.lng, false);
      });
    }else{
      deliveryMarker.setLatLng([lat,lng]);
    }
    if(moveMap) deliveryMap.setView([lat,lng], 16);
  }

  setLocationStatus(`Location selected: ${lat.toFixed(6)}, ${lng.toFixed(6)}`, 'ok');
}

function useMyLocation(){
  if(!navigator.geolocation){
    setLocationStatus('Location is not supported by this browser.', 'error');
    return;
  }

  setLocationStatus('Finding your location...');

  navigator.geolocation.getCurrentPosition(
    position => {
      setDeliveryLocation(position.coords.latitude, position.coords.longitude, true);
    },
    error => {
      console.error('Geolocation error:', error);
      const msg = error.code === 1
        ? 'Location permission was denied. You can tap the map instead.'
        : 'Could not get your location. You can tap the map instead.';
      setLocationStatus(msg, 'error');
    },
    { enableHighAccuracy:true, timeout:10000, maximumAge:30000 }
  );
}

function clearDeliveryLocation(){
  const latEl = document.getElementById('deliveryLatitude');
  const lngEl = document.getElementById('deliveryLongitude');
  if(latEl) latEl.value = '';
  if(lngEl) lngEl.value = '';
  localStorage.removeItem('mobs_delivery_latitude');
  localStorage.removeItem('mobs_delivery_longitude');
  if(deliveryMarker && deliveryMap){
    deliveryMap.removeLayer(deliveryMarker);
    deliveryMarker = null;
  }
  setLocationStatus('Tap the map to choose your delivery location.');
}

function getDeliveryLocation(){
  const lat = Number(document.getElementById('deliveryLatitude')?.value);
  const lng = Number(document.getElementById('deliveryLongitude')?.value);
  return {
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lng) ? lng : null,
    address: (document.getElementById('deliveryAddress')?.value || '').trim()
  };
}

function getCustomerToken(){
  let token = localStorage.getItem('mobs_customer_token');
  if(!token){
    token = (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'mobs-' + Date.now() + '-' + Math.random().toString(36).slice(2, 12);
    localStorage.setItem('mobs_customer_token', token);
  }
  return token;
}

function getCustomerInfo(){
  const nameEl = document.getElementById('customerName');
  const phoneEl = document.getElementById('customerPhone');

  const name = (nameEl?.value || '').trim();
  const phone = (phoneEl?.value || '').replace(/\D/g,'').slice(0,10);

  return { name, phone };
}

function validateCustomerInfo(showMessage=true){
  const { name, phone } = getCustomerInfo();

  if(!name){
    if(showMessage) alert('Please enter your full name.');
    document.getElementById('customerName')?.focus();
    return false;
  }

  if(!/^05\d{8}$/.test(phone)){
    if(showMessage) alert('Please enter a valid Saudi mobile number with exactly 10 digits, starting with 05.');
    document.getElementById('customerPhone')?.focus();
    return false;
  }

  const delivery = getDeliveryLocation();
  if(delivery.latitude === null || delivery.longitude === null){
    if(showMessage) alert('Please choose your delivery location on the map or use My Location.');
    initDeliveryMap();
    document.getElementById('deliveryMap')?.scrollIntoView({behavior:'smooth',block:'center'});
    return false;
  }

  localStorage.setItem('mobs_customer_name', name);
  localStorage.setItem('mobs_customer_phone', phone);
  localStorage.setItem('mobs_delivery_address', delivery.address);

  return true;
}

function loadCustomerInfo(){
  const nameEl = document.getElementById('customerName');
  const phoneEl = document.getElementById('customerPhone');
  if(nameEl) nameEl.value = '';
  if(phoneEl) phoneEl.value = '';
}

function openCheckout(){
  if(!cart.length){
    go('menu');
    return;
  }
  loadCustomerInfo();
  go('checkout');
  setTimeout(() => document.getElementById('customerName')?.focus(), 50);
}

function continueCheckout(){
  if(!validateCustomerInfo(true)) return;
  go('payment');
}

async function placeOrder(){
  if(!cart.length){ go('menu'); return; }
  if(!validateCustomerInfo(true)){ go('checkout'); return; }

  const {name: customerName, phone: customerPhone} = getCustomerInfo();
  const delivery = getDeliveryLocation();
  const instructions = String(document.getElementById('deliveryInstructions')?.value || '').trim();
  const button = document.querySelector('#review > .btn');

  if(button){ button.disabled=true; button.textContent='PLACING ORDER...'; }

  try{
    await loadData();
    const normalized = cart.map(x => {
      const product = products.find(p => String(p.id) === String(x.product_id));
      const qty = Math.max(1, Number(x.quantity || 1));
      if(!product || product.is_available === false) throw new Error(`Product "${x.name}" is no longer available.`);
      return {product_id:product.id,product_name:product.name,unit_price:Number(product.price),quantity:qty,line_total:Math.round(Number(product.price)*qty*100)/100};
    });

    const subtotal = Math.round(normalized.reduce((s,x)=>s+x.line_total,0)*100)/100;
    const deliveryFee = cart.length ? Number(window.MOBS_CONFIG.deliveryFee) : 0;
    const tax = Math.round(subtotal * Number(window.MOBS_CONFIG.taxRate) * 100)/100;
    const total = Math.round((subtotal + deliveryFee + tax)*100)/100;
    const token = getCustomerToken();
    const address = delivery.address || `Map location: ${delivery.latitude},${delivery.longitude}`;

    const {data: order, error: orderError} = await supabaseClient
      .from('orders')
      .insert({
        restaurant_id: RESTAURANT_ID,
        customer_token: token,
        customer_name: customerName,
        phone: customerPhone,
        status: 'pending',
        payment_method: 'cash_on_delivery',
        subtotal, delivery_fee:deliveryFee, tax, total,
        delivery_address: address,
        delivery_instructions: instructions || null,
        latitude: Number(delivery.latitude),
        longitude: Number(delivery.longitude)
      })
      .select('*').single();

    if(orderError) throw orderError;

    const {error:itemError} = await supabaseClient.from('order_items').insert(
      normalized.map(x => ({order_id:order.id,...x}))
    );
    if(itemError){
      await supabaseClient.from('orders').delete().eq('id',order.id);
      throw itemError;
    }

    currentOrder = {
      ...order,
      tracking_token: token,
      order_number: order.order_number || order.order_no || order.id,
      items: normalized
    };
    saveCustomerOrder(currentOrder);
    cart=[]; saveCart();

    document.getElementById('orderCode').textContent='#'+currentOrder.order_number;
    const successTotal=document.querySelector('#success .choice b');
    if(successTotal) successTotal.textContent=money(total);
    go('success');
  }catch(error){
    console.error('Place order error:',error);
    alert('Could not place the order.\n\n'+(error?.message||'Unknown error'));
  }finally{
    if(button){ button.disabled=false; button.textContent='PLACE ORDER →'; }
  }
}

function getSavedCustomerOrders(){
  try {
    const orders = JSON.parse(localStorage.getItem('mobs_customer_orders') || '[]');
    return Array.isArray(orders) ? orders : [];
  } catch {
    return [];
  }
}

function saveCustomerOrder(order){
  if(!order?.tracking_token) return;

  const orders = getSavedCustomerOrders();
  const key = String(order.tracking_token);
  const index = orders.findIndex(x => String(x.tracking_token) === key);

  if(index >= 0) orders[index] = {...orders[index], ...order};
  else orders.unshift(order);

  localStorage.setItem('mobs_customer_orders', JSON.stringify(orders.slice(0,30)));
  localStorage.setItem('mobs_last_tracking_token', key);
}

async function fetchOrderByTrackingToken(token){
  if(!token) throw new Error('Tracking token is missing.');
  const {data:order,error} = await supabaseClient
    .from('orders')
    .select('*')
    .eq('restaurant_id', RESTAURANT_ID)
    .eq('customer_token', token)
    .order('created_at',{ascending:false})
    .limit(1)
    .maybeSingle();
  if(error) throw error;
  if(!order) throw new Error('Order not found.');
  const {data:items,error:itemError}=await supabaseClient
    .from('order_items')
    .select('id,order_id,product_id,product_name,unit_price,quantity,line_total')
    .eq('order_id',order.id)
    .order('created_at',{ascending:true});
  if(itemError) throw itemError;
  return {...order,tracking_token:token,items:items||[],order_number:order.order_number||order.order_no||order.id};
}

async function loadOrders(filter='active', button){
  document.querySelectorAll('#orderTabs .cat').forEach(x => x.classList.remove('active'));
  if(button) button.classList.add('active');

  const el = document.getElementById('ordersList');
  if(!el) return;

  el.innerHTML = '<div class="choice" style="text-align:center">Loading orders...</div>';

  const saved = getSavedCustomerOrders();

  if(!saved.length){
    el.innerHTML = `
      <div class="choice" style="text-align:center">
        No orders yet.<br><br>
        <button class="btn yellow" onclick="go('menu')">BROWSE MENU</button>
      </div>
    `;
    return;
  }

  const refreshed = [];

  for(const savedOrder of saved){
    try {
      const live = await fetchOrderByTrackingToken(savedOrder.tracking_token);
      const merged = {...savedOrder, ...live};
      saveCustomerOrder(merged);
      refreshed.push(merged);
    } catch(error){
      // Keep the locally saved order visible if the API is temporarily unavailable.
      refreshed.push(savedOrder);
      console.warn('Order refresh failed:', error);
    }
  }

  const activeStatuses = [
    'جديد',
    'جاري التجهيز',
    'خرج للتوصيل',
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'out_for_delivery'
  ];

  const visible = refreshed.filter(o =>
    filter === 'active'
      ? activeStatuses.includes(String(o.status))
      : !activeStatuses.includes(String(o.status))
  );

  if(!visible.length){
    el.innerHTML = `<div class="choice" style="text-align:center">No ${filter} orders yet.</div>`;
    return;
  }

  el.innerHTML = visible.map(o => `
    <div class="row-card" onclick="openTrackingByToken('${escapeHTML(o.tracking_token)}')">
      <div class="row-thumb"><div class="burger"></div></div>
      <div class="row-info">
        <b>${escapeHTML(formatOrderNumber(o))}</b>
        <p>${money(o.total)}${o.created_at ? ' · ' + new Date(o.created_at).toLocaleDateString() : ''}</p>
        <span class="row-price">${escapeHTML(formatStatus(o.status))}</span>
      </div>
      <span class="row-arrow">›</span>
    </div>
  `).join('');
}

function formatStatus(status){
  const labels = {
    'جديد':'Order received',
    'جاري التجهيز':'Preparing your order',
    'خرج للتوصيل':'Out for delivery',
    'مكتمل':'Delivered',
    'ملغي':'Cancelled',
    pending:'Order received',
    confirmed:'Confirmed',
    preparing:'Preparing',
    ready:'Ready',
    out_for_delivery:'Out for delivery',
    delivered:'Delivered',
    cancelled:'Cancelled'
  };

  return labels[status] || status || 'Order received';
}

async function openTracking(orderId){
  const saved = getSavedCustomerOrders().find(x => String(x.id) === String(orderId));
  if(saved?.tracking_token){
    await openTrackingByToken(saved.tracking_token);
    return;
  }

  if(currentOrder?.tracking_token){
    await openTrackingByToken(currentOrder.tracking_token);
    return;
  }

  alert('Tracking information is not available for this order.');
}

async function openTrackingByToken(token){
  try {
    const order = await fetchOrderByTrackingToken(token);
    currentOrder = {
      ...currentOrder,
      ...order,
      tracking_token: token,
      order_number: order.order_number || order.order_no
    };
    saveCustomerOrder(currentOrder);
    updateTrackingScreen(currentOrder);
    go('tracking');
  } catch(error){
    console.error('Tracking error:', error);
    alert('Could not load order tracking.\n\n' + (error.message || 'Unknown tracking error'));
  }
}

async function startCustomerOrderRealtime(order){
  if(customerRealtimeChannel) await supabaseClient.removeChannel(customerRealtimeChannel);
  if(!order?.id) return;

  customerRealtimeChannel=supabaseClient.channel(`mobs-customer-order-${order.id}`)
    .on('postgres_changes',{
      event:'UPDATE',
      schema:'public',
      table:'orders',
      filter:`id=eq.${order.id}`
    },async(payload)=>{
      try{
        const live=await fetchOrderByTrackingToken(order.tracking_token);
        currentOrder={...currentOrder,...live,tracking_token:order.tracking_token};
        saveCustomerOrder(currentOrder);
        updateTrackingScreen(currentOrder);
      }catch(error){ console.warn('Customer realtime refresh failed:',error); }
    })
    .subscribe();
}

async function loadTracking(token){
  const trackingToken = token || currentOrder?.tracking_token;
  if(!trackingToken) return;

  try {
    const order = await fetchOrderByTrackingToken(trackingToken);
    currentOrder = {
      ...currentOrder,
      ...order,
      tracking_token: trackingToken,
      order_number: order.order_number || order.order_no
    };
    saveCustomerOrder(currentOrder);
    updateTrackingScreen(currentOrder);
    await startCustomerOrderRealtime(currentOrder);
  } catch(error){
    console.error('Tracking error:', error);
  }
}

function statusMessage(status){
  const map = {
    'جديد':'We received your order.',
    'جاري التجهيز':'The kitchen is preparing your order.',
    'خرج للتوصيل':'Your order is on the way!',
    'مكتمل':'Your order has been delivered.',
    'ملغي':'This order was cancelled.',
    pending:'We received your order.',
    confirmed:'Your order has been confirmed.',
    preparing:'The kitchen is preparing your order.',
    ready:'Your order is ready.',
    out_for_delivery:'Your order is on the way!',
    delivered:'Your order has been delivered.',
    cancelled:'This order was cancelled.'
  };
  return map[status] || 'Your order status is being updated.';
}

function formatOrderNumber(order){
  const value = order?.order_number || order?.order_no || order?.id || '';
  return String(value).startsWith('#') ? String(value) : `#${value}`;
}

function updateTrackingScreen(order){
  const code = document.getElementById('trackingOrderCode');
  const status = document.getElementById('trackingStatus');
  const message = document.getElementById('trackingMessage');
  const eta = document.getElementById('trackingEta');

  if(code) code.textContent = formatOrderNumber(order);
  if(status) status.textContent = formatStatus(order.status);
  if(message) message.textContent = statusMessage(order.status);

  if(eta){
    if(order.status === 'مكتمل' || order.status === 'delivered'){
      eta.textContent = 'Order delivered';
    }else if(order.status === 'ملغي' || order.status === 'cancelled'){
      eta.textContent = 'Order cancelled';
    }else if(order.status === 'خرج للتوصيل' || order.status === 'out_for_delivery'){
      eta.textContent = 'Estimated time · 15–30 min';
    }else{
      eta.textContent = 'Estimated time · 20–30 min';
    }
  }
}

function toggleFavorite(id, button){
  const key = 'mobs_favorites';
  const favorites = JSON.parse(localStorage.getItem(key) || '[]');
  const index = favorites.indexOf(id);
  if(index >= 0){ favorites.splice(index,1); button.textContent='♡'; }
  else { favorites.push(id); button.textContent='♥'; }
  localStorage.setItem(key, JSON.stringify(favorites));
}

// Inline HTML handlers must be exposed because this file is loaded as an ES module.
Object.assign(window, {
  go, addToCart, addSame, changeQty, clearDeliveryLocation,
  continueCheckout, filterCategory, loadOrders, openCheckout,
  openProduct, openProductById, openTracking, openTrackingByToken,
  placeOrder, removeItem, toggleFavorite, useMyLocation
});

// Initial load
loadCustomerInfo();
const savedTrackingToken = localStorage.getItem('mobs_last_tracking_token');
if(savedTrackingToken){ currentOrder = { tracking_token: savedTrackingToken }; }
loadData();
updateCount();
