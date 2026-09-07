
/* =========================================================
   THE MOBS DELIVERY — SUPABASE
   Delivery uses the same Supabase project as Customer and Admin.
========================================================= */

const RESTAURANT_ID = window.MOBS_CONFIG.restaurantId;

const supabaseClient = window.MOBS_SUPABASE;

let token = "";

function clearError(id){ const el=$(id); if(el){el.textContent="";el.classList.add("hidden");} }
function showError(id,message){ const el=$(id); if(el){el.textContent=message;el.classList.remove("hidden");} }
function normalizeUsername(v){ return String(v||"").trim().toLowerCase(); }
function validUsername(v){ return /^[a-zA-Z0-9._-]{3,24}$/.test(v); }
function driverEmail(username){ return `${normalizeUsername(username)}@drivers.themobs.internal`; }

async function loadDriverProfile(userId){
  const {data,error}=await supabaseClient.from("driver_profiles").select("*").eq("user_id",userId).maybeSingle();
  if(error) throw error;
  if(!data) throw new Error("Driver profile not found. Please contact THE MOBS.");
  if(data.status !== "approved") throw new Error(data.status === "rejected" ? `Application rejected${data.rejection_reason?": "+data.rejection_reason:"."}` : data.status === "suspended" ? "Your driver account is suspended." : "Your application is still under review.");
  return data;
}

async function hydrateDriver(user){
  const profile=await loadDriverProfile(user.id);
  driver={id:user.id,userId:user.id,email:user.email,username:profile.username,name:profile.full_name,phone:profile.phone,available:profile.availability_status==="online",online:profile.availability_status!=="offline",profile};
}

async function login(){
  const username=normalizeUsername($("username")?.value);
  const password=String($("password")?.value||"");
  clearError("loginError");
  if(!validUsername(username)||!password){showError("loginError","Enter a valid username and password.");return;}
  try{
    const {data:emailData,error:emailError}=await supabaseClient.rpc("get_driver_login_email",{p_username:username});
    if(emailError) throw emailError;
    if(!emailData) throw new Error("Invalid username or password.");
    const {data,error}=await supabaseClient.auth.signInWithPassword({email:emailData,password});
    if(error) throw error;
    await hydrateDriver(data.user);
    token=data.session?.access_token||"";
    $("loginView").classList.add("hidden"); $("appView").classList.remove("hidden");
    showScreen("home"); await loadOrders(); await startDeliveryRealtime();
  }catch(e){
    try{ await supabaseClient.auth.signOut(); }catch{}
    token=""; driver=null;
    $("appView")?.classList.add("hidden"); $("loginView")?.classList.remove("hidden");
    showError("loginError",e.message||"Unable to sign in.");
  }
}

function showRegistration(){$("registrationView")?.classList.remove("hidden");$("loginBtn")?.classList.add("hidden");$("username")?.classList.add("hidden");$("password")?.classList.add("hidden");clearError("loginError");}
function hideRegistration(){$("registrationView")?.classList.add("hidden");$("loginBtn")?.classList.remove("hidden");$("username")?.classList.remove("hidden");$("password")?.classList.remove("hidden");clearError("registrationError");}

function fileRequired(id){const f=$(id)?.files?.[0]; if(!f) throw new Error(`Please upload ${id.includes("Identity")?"your identity image":"your vehicle image"}.`); return f;}
async function uploadDriverFile(userId,file,folder){
  const ext=(file.name.split(".").pop()||"bin").toLowerCase();
  const path=`${userId}/${folder}-${crypto.randomUUID()}.${ext}`;
  const {error}=await supabaseClient.storage.from("driver-documents").upload(path,file,{upsert:false,contentType:file.type||undefined});
  if(error) throw error; return path;
}

async function registerDriver(){
  clearError("registrationError");

  try{
    const username=normalizeUsername($("regUsername")?.value);
    const password=String($("regPassword")?.value||"");
    const password2=String($("regPassword2")?.value||"");

    const fullName=$("regName")?.value.trim();
    const phone=$("regPhone")?.value.trim();
    const email=$("regEmail")?.value.trim().toLowerCase();
    const city=$("regCity")?.value.trim();
    const nationalAddress=$("regNationalAddress")?.value.trim();
    const idNumber=$("regIdNumber")?.value.trim();
    const vehicleType=$("regVehicleType")?.value.trim();
    const vehicleMake=$("regVehicleMake")?.value.trim();
    const vehicleModel=$("regVehicleModel")?.value.trim();
    const vehicleYear=$("regVehicleYear")?.value.trim();
    const plate=$("regPlate")?.value.trim();

    if(!validUsername(username)){
      throw new Error(
        "Username must be 3–24 characters: letters, numbers, dot, dash or underscore."
      );
    }

    if(password.length<8 || password!==password2){
      throw new Error(
        "Password must be at least 8 characters and both passwords must match."
      );
    }

    if(!fullName || !/^05\d{8}$/.test(phone) || !email || !city ||
       !nationalAddress || !idNumber || !vehicleType || !vehicleMake ||
       !vehicleModel || !vehicleYear || !plate){
      throw new Error(
        "Complete all required personal and vehicle fields."
      );
    }

    const identity=fileRequired("regIdentity");
    const vehicle=fileRequired("regVehicleImage");
    const license=$("regLicense")?.files?.[0] || null;
    const registration=$("regRegistration")?.files?.[0] || null;

    const formData=new FormData();

    formData.append("username",username);
    formData.append("password",password);
    formData.append("fullName",fullName);
    formData.append("phone",phone);
    formData.append("email",email);
    formData.append("city",city);
    formData.append("dateOfBirth",$("regDob")?.value || "");
    formData.append("nationality",$("regNationality")?.value.trim() || "");
    formData.append("nationalAddress",nationalAddress);
    formData.append("idNumber",idNumber);
    formData.append("vehicleType",vehicleType);
    formData.append("vehicleMake",vehicleMake);
    formData.append("vehicleModel",vehicleModel);
    formData.append("vehicleYear",vehicleYear);
    formData.append("plate",plate);
    formData.append("identity",identity);
    formData.append("vehicle",vehicle);

    if(license) formData.append("license",license);
    if(registration) formData.append("registration",registration);

    const {
      data,
      error
    }=await supabaseClient.functions.invoke(
      "create-driver",
      {body:formData}
    );

    if(error){
      let message=error.message || "Unable to submit application.";

      try{
        const response=error.context;
        if(response?.json){
          const body=await response.json();
          if(body?.error) message=body.error;
        }
      }catch{}

      throw new Error(message);
    }

    if(!data?.success){
      throw new Error(
        data?.error || "Unable to submit application."
      );
    }

    [
      "regUsername",
      "regPassword",
      "regPassword2",
      "regName",
      "regPhone",
      "regEmail",
      "regCity",
      "regDob",
      "regNationality",
      "regNationalAddress",
      "regIdNumber",
      "regVehicleType",
      "regVehicleMake",
      "regVehicleModel",
      "regVehicleYear",
      "regPlate"
    ].forEach(id=>{
      const el=$(id);
      if(el) el.value="";
    });

    [
      "regIdentity",
      "regVehicleImage",
      "regLicense",
      "regRegistration"
    ].forEach(id=>{
      const el=$(id);
      if(el) el.value="";
    });

    hideRegistration();

    showError(
      "loginError",
      "Application submitted. Your account is pending Admin approval."
    );

  }catch(e){
    console.error("Driver registration error:",e);
    showError(
      "registrationError",
      e.message || "Unable to submit application."
    );
  }
}
async function logout(){
  await stopDeliveryRealtime();
  await supabaseClient.auth.signOut(); token=""; driver=null; clearInterval(refreshTimer);
  $("appView").classList.add("hidden"); $("loginView").classList.remove("hidden"); $("password").value="";
}

let deliveryRealtimeChannel=null;

async function startDeliveryRealtime(){
  if(deliveryRealtimeChannel || !driver?.id) return;
  deliveryRealtimeChannel=supabaseClient.channel(`mobs-driver-${driver.id}`)
    .on('postgres_changes',{
      event:'*',
      schema:'public',
      table:'orders',
      filter:`driver_id=eq.${driver.id}`
    },async(payload)=>{
      await loadOrders();
      if(selected && String(payload.new?.id||payload.old?.id)===String(selected.id)){
        selected=orders.find(o=>String(o.id)===String(selected.id))||selected;
        renderDetail();
      }
    })
    .on('postgres_changes',{
      event:'UPDATE',
      schema:'public',
      table:'driver_profiles',
      filter:`user_id=eq.${driver.id}`
    },async(payload)=>{
      const profile=payload.new;
      if(profile.status!=='approved'){
        await stopDeliveryRealtime();
        await supabaseClient.auth.signOut();
        driver=null;
        $("appView")?.classList.add("hidden");
        $("loginView")?.classList.remove("hidden");
        showError("loginError",profile.status==='suspended'?'Your driver account has been suspended.':'Your driver account is no longer active.');
        return;
      }
      driver.profile=profile;
      driver.available=profile.availability_status==='online';
      driver.online=profile.availability_status!=='offline';
      renderDriver();
    })
    .subscribe();
}

async function stopDeliveryRealtime(){
  if(deliveryRealtimeChannel){
    await supabaseClient.removeChannel(deliveryRealtimeChannel);
    deliveryRealtimeChannel=null;
  }
}

async function restoreSession(){
  const {data}=await supabaseClient.auth.getSession();
  if(data.session){try{await hydrateDriver(data.session.user);token=data.session.access_token||"";$("loginView").classList.add("hidden");$("appView").classList.remove("hidden");showScreen("home");await loadOrders();await startDeliveryRealtime();}catch(e){await stopDeliveryRealtime();await supabaseClient.auth.signOut();showError("loginError",e.message||"Your driver account is not approved.");}}
  else{$("loginView").classList.remove("hidden");$("appView").classList.add("hidden");}
}

let driver = null;
let orders = [];
let selected = null;
let orderTab = "active";
let previousScreen = "home";
let refreshTimer = null;
let detailTimer = null;
let pendingPhotos = [];
let pendingNote = "";

const $ = id => document.getElementById(id);

document.getElementById("regPhone")?.addEventListener("input",e=>{
  e.target.value=e.target.value.replace(/\D/g,"").slice(0,10);
});
document.getElementById("regVehicleYear")?.addEventListener("input",e=>{
  e.target.value=e.target.value.replace(/\D/g,"").slice(0,4);
});

function esc(value){
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
  }[c]));
}

function showToast(message){
  const el = $("toast");
  if(!el) return;
  el.textContent = message;
  el.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => el.classList.add("hidden"), 3000);
}

function normalizeStatusValue(value){
  const s = String(value ?? "").trim().toLowerCase();
  const map = {
    pending:"pending", confirmed:"confirmed", preparing:"preparing", ready:"ready",
    out_for_delivery:"out_for_delivery", "out for delivery":"out_for_delivery",
    arrived:"arrived", delivered:"delivered", completed:"delivered",
    cancelled:"cancelled", canceled:"cancelled",
    "جديد":"pending", "مؤكد":"confirmed", "جاري التجهيز":"preparing",
    "جاهز":"ready", "خرج للتوصيل":"out_for_delivery", "وصل للموقع":"arrived",
    "مكتمل":"delivered", "ملغي":"cancelled"
  };
  return map[s] || s || "pending";
}

function normalizedStatus(o){ return normalizeStatusValue(o?.status); }
function isDone(o){ return ["delivered","cancelled"].includes(normalizedStatus(o)); }

function deliveryMetaKey(id){ return String(id || ""); }
function getDeliveryMeta(id){ return {}; }
function saveDeliveryMeta(id, patch){ /* Delivery timestamps are authoritative in Supabase orders. */ }
function applyLocalDeliveryMeta(order){ return order || order; }

function extractOrderData(o){
  const raw = String(o?.delivery_instructions || "");
  const coord = raw.match(/(?:Location|Coordinates):\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i);
  const customer = raw.match(/Customer:\s*([^|]+)/i);
  const mobile = raw.match(/Mobile:\s*([^|]+)/i);
  const address = raw.match(/Address:\s*([^|]+)/i);
  return {
    ...o,
    customer_name: o.customer_name || o.customer || (customer ? customer[1].trim() : "Customer"),
    phone: o.customer_phone || o.phone || (mobile ? mobile[1].trim() : ""),
    address: o.delivery_address || o.address || (address ? address[1].trim() : "Customer location selected on map"),
    latitude: o.latitude ?? (coord ? Number(coord[1]) : null),
    longitude: o.longitude ?? (coord ? Number(coord[2]) : null)
  };
}

async function loadOrderItems(orderIds){
  if(!orderIds.length) return [];
  const {data,error} = await supabaseClient
    .from("order_items")
    .select("id,order_id,product_id,product_name,unit_price,quantity,line_total,product_price")
    .in("order_id",orderIds);
  if(error) throw error;
  return data || [];
}

async function loadOrders(){
  try{
    const {data,error} = await supabaseClient
      .from("orders")
      .select("*")
      .eq("restaurant_id", RESTAURANT_ID)
      .eq("driver_id", driver.id)
      .order("created_at", {ascending:false});

    if(error) throw error;

    const base = (data || []).map(extractOrderData).map(applyLocalDeliveryMeta);
    const items = await loadOrderItems(base.map(o => o.id));
    const grouped = {};
    items.forEach(item => {
      (grouped[item.order_id] ||= []).push(item);
    });

    orders = base.map(o => ({...o, items: grouped[o.id] || []}));
    renderAll();
  }catch(error){
    console.error("Delivery orders error:", error);
    const message = error?.message || "Unable to load orders.";
    $("homeOrders").innerHTML = `<div class="empty">${esc(message)}<br><br><button class="btn black" onclick="loadOrders()">RETRY</button></div>`;
    $("ordersList").innerHTML = `<div class="empty">${esc(message)}<br><br><button class="btn black" onclick="loadOrders()">RETRY</button></div>`;
  }
}

function renderDriver(){
  const name=driver?.name || driver?.username || "Delivery";
  $("homeDriver").textContent=name + ".";
  $("profileName").textContent=name;
  $("profileStatus").textContent=driver?.online ? "Online" : "Offline";
  $("profileAvailability").textContent=driver?.available ? "Available" : "Unavailable";
  $("profileOrders").textContent=orders.filter(o => ["out_for_delivery","arrived"].includes(normalizedStatus(o))).length;
  $("availableBtn")?.classList.toggle("black", !!driver?.available);
  $("availableBtn")?.classList.toggle("white", !driver?.available);
  $("unavailableBtn")?.classList.toggle("black", !driver?.available);
  $("unavailableBtn")?.classList.toggle("white", !!driver?.available);
}

async function setAvailable(value){
  if(!driver?.id) return;
  try{const availability_status=value?"online":"offline";const {data,error}=await supabaseClient.from("driver_profiles").update({availability_status}).eq("user_id",driver.id).eq("status","approved").select("*").single();if(error)throw error;driver.profile=data;driver.available=value;driver.online=value;renderAll();showToast(value?"You are AVAILABLE.":"You are OFFLINE.");}catch(e){showToast(e.message||"Unable to update availability.");}
}

function renderAll(){ renderHome(); renderOrders(); renderEarnings(); renderDriver(); if(selected) renderMapScreen(); }

function renderHome(){
  const active = orders.filter(o => ["ready","out_for_delivery","arrived"].includes(normalizedStatus(o)));
  const done = orders.filter(o => normalizedStatus(o) === "delivered");
  $("assignedCount").textContent = active.length;
  $("completedCount").textContent = done.length;
  $("onlineTime").textContent = driver?.online ? "ONLINE" : "—";
  const first = active.slice(0,3);
  $("homeOrders").innerHTML = first.length ? first.map(orderCard).join("") : '<div class="empty">No deliveries available right now.<br><br>Orders marked READY by the kitchen will appear here.</div>';
}

function setOrderTab(tabName){
  orderTab = tabName;
  $("ordersActiveTab").classList.toggle("active", tabName === "active");
  $("ordersDoneTab").classList.toggle("active", tabName === "done");
  renderOrders();
}

function renderOrders(){
  const list = orders.filter(o => orderTab === "done" ? isDone(o) : ["ready","out_for_delivery","arrived"].includes(normalizedStatus(o)));
  $("ordersList").innerHTML = list.length ? list.map(orderCard).join("") : `<div class="empty">${orderTab === "done" ? "No completed orders yet." : "No delivery orders available right now."}</div>`;
}

function statusClass(o){
  const s = normalizedStatus(o);
  if(s === "delivered") return "green";
  if(s === "arrived") return "gray";
  if(s === "out_for_delivery") return "green";
  return "yellow";
}

function displayStatus(o){
  const s=normalizedStatus(o);
  return ({pending:"Waiting",confirmed:"Confirmed",preparing:"Preparing",ready:"Ready for pickup",out_for_delivery:"Out for delivery",arrived:"Arrived",delivered:"Delivered",cancelled:"Cancelled"})[s] || o.status || "Waiting";
}

function formatTime(value){
  if(!value) return "—";
  try{return new Date(value).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});}catch{return "—";}
}

function orderCard(o){
  const no=esc(o.order_number || o.order_no || o.id || "0000");
  const name=esc(o.customer_name || "Customer");
  const address=esc(o.address || "Customer location selected on map");
  const total=Number(o.total || 0).toFixed(2);
  const status=esc(displayStatus(o));
  const items=Array.isArray(o.items)?o.items:[];
  const itemCount=items.reduce((sum,x)=>sum+Number(x.quantity||x.qty||1),0);
  const canAccept=normalizedStatus(o)==="ready";
  const canContinue=["out_for_delivery","arrived"].includes(normalizedStatus(o));
  const safeId=JSON.stringify(String(o.id));
  return `<article class="order-card">
    <div class="order-top"><div><div class="order-no">#${no}</div><div class="order-name">${name}</div></div><span class="status ${statusClass(o)}">${status}</span></div>
    <div class="order-meta"><div class="meta"><span>TIME</span>${esc(formatTime(o.created_at))}</div><div class="meta"><span>ITEMS</span>${itemCount}</div><div class="meta"><span>TOTAL</span>${total} SAR</div><div class="meta"><span>PAYMENT</span>${esc(o.payment_method || "Cash")}</div></div>
    <div class="address">⌖ ${address}</div>
    <div class="actions">
      <button type="button" class="btn black full" data-delivery-action="view" data-order-id="${esc(String(o.id))}" onclick="openDetail(${safeId})">VIEW ORDER →</button>
      ${canAccept ? `<button type="button" class="btn yellow full" data-delivery-action="accept" data-order-id="${esc(String(o.id))}" onclick="acceptOrder(${safeId})">ACCEPT DELIVERY →</button>` : ""}
      ${canContinue ? `<button class="btn yellow full" onclick="openDetail(${safeId})">CONTINUE DELIVERY →</button>` : ""}
    </div>
  </article>`;
}

async function acceptOrder(id){
  const order=orders.find(o=>String(o.id)===String(id));
  if(!order){showToast("Order not found.");return;}
  if(normalizedStatus(order)!=="ready"){showToast("This order is no longer ready for pickup.");await loadOrders();return;}
  if(!driver?.id){showToast("Please log in again.");return;}
  if(!driver?.available){showToast("Set your status to AVAILABLE first.");return;}

  try{
    const {data,error}=await supabaseClient.rpc("driver_transition_order",{
      p_order_id:order.id,
      p_status:"out_for_delivery",
      p_note:null
    });
    if(error) throw error;

    selected=extractOrderData({...order,...data,items:order.items||[]});
    orders=orders.map(o=>String(o.id)===String(order.id)?selected:o);
    renderAll();
    showToast("Delivery accepted. Head to the customer.");
    openDetail(String(selected.id));
  }catch(error){
    console.error("Accept delivery error:",error);
    showToast(error?.message||"Unable to accept this delivery.");
  }
}

function openDetail(id){
  selected = orders.find(o => String(o.id) === String(id));
  if(!selected) return;

  previousScreen = currentVisibleScreen();
  pendingPhotos = [];
  pendingNote = "";

  $("detailScreen").classList.remove("hidden");
  ["homeScreen","ordersScreen","mapScreen","earningsScreen","profileScreen","successScreen"]
    .forEach(id => $(id).classList.add("hidden"));

  renderDetail();
  window.scrollTo({top:0,behavior:"smooth"});
}

function renderDetail(){
  if(!selected) return;
  const o = applyLocalDeliveryMeta(selected);
  selected = o;
  const current = normalizedStatus(o);
  const started = !!o.delivery_started_at;
  const arrived = !!o.delivery_arrived_at || current === "arrived";
  const completed = normalizedStatus(o) === "delivered";
  const cancelled = normalizedStatus(o) === "cancelled";
  const items = Array.isArray(o.items) ? o.items : [];

  $("detailOrderNo").textContent = "#" + (o.order_number || o.order_no || o.id);

  let mapHTML = "";
  const lat = Number(o.latitude);
  const lng = Number(o.longitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0;

  if(hasCoords){
    const bbox = `${lng-0.01}%2C${lat-0.01}%2C${lng+0.01}%2C${lat+0.01}`;
    mapHTML = `<div class="map"><iframe loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}"></iframe></div>`;
  }else{
    mapHTML = `<div class="map"><div class="map-fallback"><div><b>Customer location</b>${esc(o.address || "Location not available")}<br><br><span>Use the address or ask the customer for their location.</span></div></div></div>`;
  }

  let primary = "";

  if(cancelled){
    primary = `<div class="card"><div class="status gray">CANCELLED</div><p class="sub" style="margin-top:10px">This order has been cancelled.</p></div>`;
  }else if(completed){
    primary = `<div class="card"><div class="status green">DELIVERED</div><p class="sub" style="margin-top:10px">This order has already been completed.</p></div>`;
  }else if(current === "ready" && !started){
    primary = `<button class="btn yellow full" onclick="acceptOrder(${JSON.stringify(String(o.id))})">ACCEPT DELIVERY →</button>`;
  }else if(current === "out_for_delivery" && !arrived){
    primary = `<button class="btn yellow full" onclick="arriveDelivery()">I'VE ARRIVED AT CUSTOMER →</button>`;
  }else{
    primary = `<div class="upload">
      <strong>Take a photo</strong>
      <span>Capture the order at the door.</span>
      <label for="proofInput">TAKE PHOTO / ADD PHOTOS</label>
      <input id="proofInput" type="file" accept="image/*" capture="environment" multiple onchange="handlePhotos(this.files)">
      <div id="previews" class="previews"></div>
    </div>
    <textarea id="deliveryNote" class="field" style="height:75px;padding-top:11px;resize:vertical" placeholder="Add a note (optional)..."></textarea>
    <button class="btn yellow full" style="margin-top:8px" onclick="completeDelivery()">COMPLETE DELIVERY →</button>`;
  }

  $("detailBody").innerHTML = `
    <div class="card">
      <div class="restaurant">
        <div><span>RESTAURANT</span><b style="display:block;margin-top:4px">THE MOBS</b></div>
        <button class="btn white" onclick="callRestaurant()">CALL</button>
      </div>
      <div class="sub" style="margin-top:8px">${esc(o.branch || "Dammam")}</div>
    </div>

    <div class="card">
      <div class="eyebrow">CUSTOMER INFORMATION</div>
      <div class="info-row"><span>Name</span><b>${esc(o.customer_name || "—")}</b></div>
      <div class="info-row"><span>Phone</span><b>${esc(o.phone || "—")}</b></div>
      <div class="actions">
        <button class="btn black" onclick="callCustomer()">CALL</button>
        <button class="btn white" onclick="messageCustomer()">MESSAGE</button>
      </div>
    </div>

    <div class="card">
      <div class="eyebrow">DELIVERY ADDRESS</div>
      <h2 style="margin-top:6px">${esc(o.address || "Customer location")}</h2>
      ${mapHTML}
      <div class="actions">
        <button class="btn black full" onclick="openSelectedMaps()">VIEW ON MAP →</button>
      </div>
    </div>

    <div class="card">
      <div class="eyebrow">ORDER ITEMS</div>
      <div class="items">
        ${items.length ? items.map(x => `
          <div class="item">
            <span>${esc(x.product_name || x.name || x.item_name || "Item")} × ${Number(x.quantity || x.qty || 1)}</span>
            <b>${(Number(x.line_total ?? x.price ?? x.product_price ?? 0)).toFixed(2)} SAR</b>
          </div>`).join("") : '<div class="item">No item details available</div>'}
      </div>
      <div class="info-row"><span>Total</span><b>${Number(o.total || 0).toFixed(2)} SAR</b></div>
    </div>

    <div class="timer"><small>TIME SINCE PICKUP</small><b id="detailTimer">${formatElapsed()}</b></div>

    <div class="progress">
      ${step("Order received",true,o.created_at || o.createdAt)}
      ${step("Preparing your order",started || arrived || completed,o.delivery_started_at)}
      ${step("Out for delivery",started || arrived || completed,o.delivery_started_at)}
      ${step("Arrived at location",arrived || completed,o.delivery_arrived_at)}
      ${step("Delivered",completed,o.delivery_completed_at)}
    </div>

    <div class="actions" style="margin-top:15px">${primary}</div>
  `;

  startDetailTimer();
}

function step(label, done, time){
  const active = done && label !== "Delivered";
  return `<div class="step ${done ? "done" : ""} ${active ? "active" : ""}">
    <div class="dot"></div>
    <div><b>${label}</b><span>${time ? esc(formatTime(time)) : "Not yet"}</span></div>
  </div>`;
}

function startDetailTimer(){
  if(detailTimer) clearInterval(detailTimer);
  detailTimer = setInterval(() => {
    const el = $("detailTimer");
    if(el) el.textContent = formatElapsed();
  }, 1000);
}

function formatElapsed(){
  if(!selected) return "00:00:00";
  const startedAt=selected.delivery_started_at;
  if(!startedAt) return "00:00:00";
  const start=Date.parse(startedAt);
  if(!Number.isFinite(start)) return "00:00:00";
  const arrivedAt=selected.delivery_arrived_at;
  const end=arrivedAt ? Date.parse(arrivedAt) : Date.now();
  return formatDuration(Math.max(0,Math.floor((end-start)/1000)));
}

function formatDuration(seconds){
  seconds = Math.max(0, Number(seconds) || 0);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h,m,s].map(x => String(x).padStart(2,"0")).join(":");
}

async function patchOrder(payload){
  if(!selected) throw new Error("No order selected.");
  const status=normalizeStatusValue(payload?.status);
  const {data,error}=await supabaseClient.rpc("driver_transition_order",{
    p_order_id:selected.id,
    p_status:status,
    p_note:payload?.note || null
  });
  if(error) throw error;
  return {order:extractOrderData({...selected,...data,items:selected.items||[]})};
}
async function startDelivery(){
  if(!selected) return;
  if(normalizedStatus(selected)!=="ready"){ showToast("This order is not waiting for pickup."); return; }
  await acceptOrder(selected.id);
}

async function arriveDelivery(){
  if(!selected) return;
  if(normalizedStatus(selected)!=="out_for_delivery"){
    showToast("Start the delivery first.");
    return;
  }

  try{
    const now=new Date().toISOString();
    const startedAt=selected.delivery_started_at;
    const duration=startedAt
      ? Math.max(0,Math.floor((Date.now()-Date.parse(startedAt))/1000))
      : 0;

    const data=await patchOrder({status:"arrived"});
    selected=applyLocalDeliveryMeta(data.order);
    updateLocalOrder();
    showToast("Arrival recorded.");
    renderDetail();
  }catch(error){
    console.error("Arrival error:",error);
    showToast(error?.message||"Unable to record arrival.");
  }
}

function handlePhotos(files){
  const arr = [...(files || [])].slice(0,3);
  if(!arr.length) return;

  Promise.all(arr.map(compressImage)).then(images => {
    pendingPhotos = images;
    const p = $("previews");
    if(p) p.innerHTML = images.map(x => `<img src="${esc(x)}" alt="Proof">`).join("");
  }).catch(() => showToast("Unable to prepare the photo."));
}

function compressImage(file){
  return new Promise((resolve,reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      try{
        const max = 1280;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img,0,0,canvas.width,canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg",0.72));
      }catch(error){
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image error"));
    };
    img.src = url;
  });
}

async function uploadProofs(orderId, files){
  const paths=[];
  for(let i=0;i<files.length;i++){
    const file=files[i]; const ext=(file.name.split(".").pop()||"jpg").toLowerCase();
    const path=`${orderId}/${crypto.randomUUID()}.${ext}`;
    const {error}=await supabaseClient.storage.from("delivery-proofs").upload(path,file,{upsert:false,contentType:file.type||undefined});
    if(error) throw error; paths.push(path);
  }
  return paths;
}

async function completeDelivery(){
  if(!selected) return;
  if(normalizedStatus(selected)!=="arrived"){
    showToast("Mark ARRIVED before completing delivery.");
    return;
  }
  const proofFiles=[...(document.getElementById("proofInput")?.files||[])].slice(0,3);
  if(!proofFiles.length){showToast("Add a delivery proof photo first.");return;}
  pendingNote=$("deliveryNote")?.value?.trim() || "";

  try{
    let duration=0;
    if(selected.delivery_started_at){
      const startMs=Date.parse(selected.delivery_started_at);
      const endMs=selected.delivery_arrived_at ? Date.parse(selected.delivery_arrived_at) : Date.now();
      if(Number.isFinite(startMs) && Number.isFinite(endMs)) duration=Math.max(0,Math.floor((endMs-startMs)/1000));
    }

    const proofPaths=await uploadProofs(selected.id,proofFiles);
    const data=await patchOrder({status:"delivered",note:pendingNote});
    const {error:eventError}=await supabaseClient.from("delivery_events").insert({order_id:selected.id,driver_id:driver.id,event_type:"delivered",note:pendingNote||null,proof_paths:proofPaths,duration_seconds:duration});
    if(eventError) throw eventError;

    selected=applyLocalDeliveryMeta(data.order);
    updateLocalOrder();

    if(detailTimer) clearInterval(detailTimer);
    $("successOrder").textContent="#"+(selected.order_number||selected.order_no||selected.id);
    $("successDriver").textContent=driver?.name||driver?.username||"Delivery";
    $("successDuration").textContent=formatDuration(duration);
    showScreen("success");
    showToast("Delivery completed.");
  }catch(error){
    console.error("Complete delivery error:",error);
    showToast(error?.message||"Unable to complete delivery.");
  }
}

function updateLocalOrder(){
  if(!selected) return;
  orders = orders.map(o => String(o.id) === String(selected.id) ? selected : o);
  renderAll();
}

function backFromDetail(){
  if(detailTimer) clearInterval(detailTimer);
  selected = null;
  showScreen(previousScreen === "orders" ? "orders" : "home");
}

function currentVisibleScreen(){
  for(const id of ["home","orders","map","earnings","profile"]){
    const el = $(id + "Screen");
    if(el && !el.classList.contains("hidden")) return id;
  }
  return "home";
}

function showScreen(name){
  ["homeScreen","ordersScreen","mapScreen","earningsScreen","profileScreen","detailScreen","successScreen"]
    .forEach(id => $(id).classList.add("hidden"));

  const target = $(name + "Screen");
  if(target) target.classList.remove("hidden");

  if(name === "home") renderHome();
  if(name === "orders") renderOrders();
  if(name === "map") renderMapScreen();
  if(name === "earnings") renderEarnings();
  if(name === "profile") renderDriver();

  window.scrollTo({top:0,behavior:"smooth"});
}

function renderMapScreen(){
  const active = selected || orders.find(o => !isDone(o));

  if(!active){
    $("mapOrderNo").textContent = "No active order";
    $("mapAddress").textContent = "Select an active order to navigate.";
    $("mainMap").innerHTML = '<div class="map-fallback"><div><b>No active delivery</b>Your next assigned order will appear here.</div></div>';
    return;
  }

  const lat = Number(active.latitude);
  const lng = Number(active.longitude);
  $("mapOrderNo").textContent = "#" + (active.order_number || active.order_no || active.id);
  $("mapAddress").textContent = active.address || "Customer location";

  if(Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0){
    const bbox = `${lng-0.015}%2C${lat-0.015}%2C${lng+0.015}%2C${lat+0.015}`;
    $("mainMap").innerHTML = `<iframe loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}"></iframe>`;
  }else{
    $("mainMap").innerHTML = `<div class="map-fallback"><div><b>Customer location</b>${esc(active.address || "Not available")}</div></div>`;
  }
}

function openSelectedMaps(){
  const o = selected || orders.find(x => !isDone(x));
  if(!o){
    showToast("No active delivery selected.");
    return;
  }

  const lat = Number(o.latitude);
  const lng = Number(o.longitude);
  let url = "";

  if(Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0){
    url = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(lat + "," + lng);
  }else if(o.address){
    url = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(o.address);
  }else{
    showToast("Customer location is not available.");
    return;
  }

  window.open(url,"_blank","noopener");
}

function callCustomer(){
  if(selected?.phone) window.location.href = "tel:" + selected.phone;
  else showToast("Customer phone is not available.");
}

function messageCustomer(){
  if(selected?.phone) window.location.href = "sms:" + selected.phone;
  else showToast("Customer phone is not available.");
}

function callRestaurant(){
  if(selected?.branch_phone) window.location.href = "tel:" + selected.branch_phone;
  else showToast("Restaurant phone is not available yet.");
}

function renderEarnings(){
  const done = orders.filter(o => normalizedStatus(o) === "delivered");
  const total = done.reduce((sum,o) => sum + Number(o.delivery_fee || 0), 0);
  $("earnTotal").textContent = total.toFixed(0) + " SAR";
  $("earnOrders").textContent = done.length;
  $("earnOnline").textContent = driver?.online ? "ONLINE" : "—";
  $("earnAverage").textContent = (done.length ? total / done.length : 0).toFixed(1) + " SAR";
}

$("password").addEventListener("keydown", e => {
  if(e.key === "Enter") login();
});


/* Fallback click delegation for dynamically rendered order buttons. */
document.addEventListener("click", function(e){
  const btn = e.target.closest("[data-delivery-action]");
  if(!btn) return;

  const action = btn.dataset.deliveryAction;
  const id = btn.dataset.orderId;

  if(action === "view"){
    e.preventDefault();
    openDetail(id);
  }else if(action === "accept"){
    e.preventDefault();
    acceptOrder(id);
  }
});

/* =========================================================
   EXPLICIT GLOBAL UI HANDLERS
   The order cards are rendered dynamically with onclick=""
   attributes. Expose the handlers explicitly on window so
   VIEW ORDER / ACCEPT DELIVERY always resolve correctly.
========================================================= */
window.login=login;
window.logout=logout;
window.restoreSession=restoreSession;
window.showScreen=showScreen;
window.loadOrders=loadOrders;
window.openDetail=openDetail;
window.acceptOrder=acceptOrder;
window.startDelivery=startDelivery;
window.arriveDelivery=arriveDelivery;
window.completeDelivery=completeDelivery;
window.setAvailable=setAvailable;
window.callCustomer=callCustomer;
window.messageCustomer=messageCustomer;
window.callRestaurant=callRestaurant;
window.openSelectedMaps=openSelectedMaps;
window.backFromDetail=backFromDetail;
window.setOrderTab=setOrderTab;
window.showRegistration=showRegistration;
window.hideRegistration=hideRegistration;
window.registerDriver=registerDriver;
window.setAvailable=setAvailable;
window.renderAll=renderAll;

window.login=login;
window.logout=logout;
window.restoreSession=restoreSession;
window.showRegistration=showRegistration;
window.hideRegistration=hideRegistration;
window.registerDriver=registerDriver;
window.showScreen=showScreen;
window.loadOrders=loadOrders;
window.openDetail=openDetail;
window.acceptOrder=acceptOrder;
window.startDelivery=startDelivery;
window.arriveDelivery=arriveDelivery;
window.completeDelivery=completeDelivery;
window.callCustomer=callCustomer;
window.messageCustomer=messageCustomer;
window.callRestaurant=callRestaurant;
window.openSelectedMaps=openSelectedMaps;
window.setOrderTab=setOrderTab;
window.setAvailable=setAvailable;
window.renderAll=renderAll;

restoreSession();
