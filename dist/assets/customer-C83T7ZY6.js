import"./supabase-CjkXVilc.js";import"https://esm.sh/@supabase/supabase-js@2";const C=window.MOBS_CONFIG.restaurantId,y=window.MOBS_SUPABASE,fe=["splash","welcome","location","home","menu","product","cart","checkout","payment","review","success","tracking","orders","profile"];let p=[],Q=[],c=JSON.parse(localStorage.getItem("mobs_cart")||"[]"),b=null,S="all",i=null,g=null,_=null,V=!1,O=null;const d=e=>`${Number(e||0).toFixed(2).replace(/\.00$/,"")} SAR`,s=e=>String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");function $(){localStorage.setItem("mobs_cart",JSON.stringify(c)),x()}function x(){const e=c.reduce((t,r)=>t+Number(r.quantity||1),0);document.querySelectorAll("#navCount,#count").forEach(t=>t.textContent=e)}function m(e){fe.forEach(t=>document.getElementById(t)?.classList.remove("active")),document.getElementById(e)?.classList.add("active"),e==="home"&&X(),e==="menu"&&P(),e==="cart"&&D(),e==="review"&&ke(),e==="orders"&&ce("active"),e==="tracking"&&i?.tracking_token&&Ne(i.tracking_token),e==="checkout"&&setTimeout(ne,50),window.scrollTo(0,0)}setTimeout(()=>m("menu"),1400);async function Z(){try{const[{data:e,error:t},{data:r,error:n}]=await Promise.all([y.from("menu_categories").select("id, name, sort_order, is_active").eq("restaurant_id",C).order("sort_order",{ascending:!0}),y.from("products").select(`
          id,
          restaurant_id,
          name,
          description,
          image_url,
          price,
          category_id,
          is_available,
          is_featured,
          sort_order
        `).eq("restaurant_id",C).eq("is_available",!0).order("sort_order",{ascending:!0}).order("created_at",{ascending:!0})]);if(t)throw t;if(n)throw n;Q=(e||[]).filter(o=>o.is_active!==!1),p=r||[],ye(),X(),P(),x()}catch(e){console.error("MOBS menu load error:",e);const t="Could not load the menu. Check Supabase table permissions.";["popularCards","menuList"].forEach(r=>{const n=document.getElementById(r);n&&(n.innerHTML=`
          <div
            class="choice"
            style="grid-column:1/-1;text-align:center"
          >
            ${t}
          </div>
        `)})}}function K(e,t=""){return e.image_url?`
      <img
        src="${s(e.image_url)}"
        alt="${s(e.name)}"
        class="${t}"
        style="
          width:100%;
          height:100%;
          object-fit:cover;
          border-radius:inherit
        "
      >
    `:'<div class="burger"></div>'}function ye(){const e=document.getElementById("categories");e&&(e.innerHTML=`
      <button
        class="cat ${S==="all"?"active":""}"
        data-category="all"
        onclick="filterCategory('all', this)"
      >
        All
      </button>
    `+Q.map(t=>`
        <button
          class="cat ${S===t.id?"active":""}"
          data-category="${s(t.id)}"
          onclick="filterCategory(
            '${String(t.id).replace(/'/g,"\\'")}',
            this
          )"
        >
          ${s(t.name)}
        </button>
      `).join(""))}function X(){const e=document.getElementById("popularCards");if(!e)return;const t=p.filter(n=>n.is_featured).slice(0,4),r=t.length?t:p.slice(0,4);if(!r.length){e.innerHTML=`
      <div
        class="choice"
        style="grid-column:1/-1;text-align:center"
      >
        No products available.
      </div>
    `;return}e.innerHTML=r.map(n=>`

    <div
      class="food-card"
      onclick="openProductById('${n.id}')"
    >

      <button
        class="fav"
        onclick="
          event.stopPropagation();
          toggleFavorite('${n.id}', this)
        "
      >
        ♡
      </button>

      <div class="food-thumb">
        ${K(n)}
      </div>

      <div class="food-name">
        ${s(n.name)}
      </div>

      <div class="food-price">
        ${d(n.price)}
      </div>

      ${n.is_featured?'<span class="badge">HOT</span>':""}

    </div>

  `).join("")}function P(){const e=document.getElementById("menuList");if(!e)return;const t=S==="all"?p:p.filter(r=>r.category_id===S);if(!t.length){e.innerHTML=`
      <div
        class="choice"
        style="text-align:center"
      >
        No products in this category.
      </div>
    `;return}e.innerHTML=t.map(r=>`

    <div
      class="row-card"
      onclick="openProductById('${r.id}')"
    >

      <div class="row-thumb">
        ${K(r)}
      </div>

      <div class="row-info">

        <b>
          ${s(r.name)}
        </b>

        <p>
          ${s(r.description||"Freshly prepared for your story.")}
        </p>

        <span class="row-price">
          ${d(r.price)}
        </span>

      </div>

      <span class="row-arrow">
        ›
      </span>

    </div>

  `).join("")}function pe(e,t){S=e,document.querySelectorAll("#categories .cat").forEach(r=>r.classList.remove("active")),t?.classList.add("active"),P()}function ve(e){const t=p.find(r=>String(r.id)===String(e));t&&ee(t)}function ee(e){const t=typeof e=="string"?p.find(n=>n.name===e):e;if(!t){alert("This product is not available.");return}b=t,document.getElementById("productName").textContent=t.name,document.getElementById("productPrice").textContent=d(t.price),document.getElementById("productDescription").textContent=t.description||"Freshly prepared for your story.";const r=document.querySelector("#product .product-art");r&&(r.innerHTML=t.image_url?`
        <img
          src="${s(t.image_url)}"
          alt="${s(t.name)}"
          style="
            width:100%;
            height:100%;
            object-fit:cover;
            border-radius:12px
          "
        >
      `:'<div class="burger"></div>'),m("product")}function be(){if(!b)return;const e=c.find(t=>String(t.product_id)===String(b.id));e?e.quantity=Number(e.quantity||1)+1:c.push({product_id:b.id,name:b.name,price:Number(b.price),image_url:b.image_url||null,quantity:1}),$(),m("cart")}function te(e,t){const r=c[e];r&&(r.quantity=Number(r.quantity||1)+t,r.quantity<=0&&c.splice(e,1),$(),D())}function _e(e){c.splice(e,1),$(),D()}function he(e){te(e,1)}function N(){return c.reduce((e,t)=>e+Number(t.price)*Number(t.quantity||1),0)}function F(){return Math.round(N()*.15*100)/100}function re(){return N()+(c.length?8:0)+F()}function D(){const e=document.getElementById("cartItems");e&&(c.length?e.innerHTML=c.map((t,r)=>`

        <div class="cart-item">

          <div class="row-thumb">

            ${t.image_url?`
                  <img
                    src="${s(t.image_url)}"
                    style="
                      width:100%;
                      height:100%;
                      object-fit:cover;
                      border-radius:7px
                    "
                  >
                `:'<div class="burger"></div>'}

          </div>

          <div class="row-info">

            <b>
              ${s(t.name)}
            </b>

            <p>
              Freshly prepared for your story.
            </p>

            <span class="row-price">
              ${d(t.price)}
            </span>

            <div class="qty">

              <button
                onclick="changeQty(${r},-1)"
              >
                −
              </button>

              <b>
                ${Number(t.quantity||1)}
              </b>

              <button
                onclick="changeQty(${r},1)"
              >
                ＋
              </button>

            </div>

          </div>

          <b>
            ${d(Number(t.price)*Number(t.quantity||1))}
          </b>

        </div>

      `).join(""):e.innerHTML=`
      <div
        class="choice"
        style="
          text-align:center;
          padding:35px
        "
      >
        Your cart is empty.
        <br><br>

        <button
          class="btn yellow"
          onclick="go('menu')"
        >
          BROWSE MENU
        </button>

      </div>
    `,document.getElementById("subtotal").textContent=d(N()),document.getElementById("tax").textContent=d(F()),document.getElementById("total").textContent=d(re()))}function ke(){const e=document.getElementById("reviewItems");if(!e)return;if(!c.length){e.innerHTML="<b>Your cart is empty.</b>";return}const t=H();e.innerHTML=`

    <b>Customer</b>

    <div class="sumline">
      <span>Name</span>
      <b>
        ${s(t.name||"—")}
      </b>
    </div>

    <div class="sumline">
      <span>Mobile</span>
      <b>
        ${s(t.phone||"—")}
      </b>
    </div>

    <br>

    <b>Order Summary</b>

  `+c.map(r=>`

    <div class="sumline">

      <span>
        ${s(r.name)}
        ×
        ${Number(r.quantity||1)}
      </span>

      <b>
        ${d(Number(r.price)*Number(r.quantity||1))}
      </b>

    </div>

  `).join("")+`

    <div class="sumline">
      <span>Subtotal</span>
      <b>${d(N())}</b>
    </div>

    <div class="sumline">
      <span>Delivery Fee</span>
      <b>${d(8)}</b>
    </div>

    <div class="sumline">
      <span>Tax (15%)</span>
      <b>${d(F())}</b>
    </div>

    <div class="sumline total">
      <span>Total</span>
      <b>${d(re())}</b>
    </div>

  `}function I(e,t=""){const r=document.getElementById("locationStatus");r&&(r.className="location-status"+(t?" "+t:""),r.textContent=e)}function ne(){const e=document.getElementById("deliveryMap");if(!e||typeof L>"u")return;g||(g=L.map(e,{zoomControl:!0}).setView([26.4207,50.0888],12),L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"&copy; OpenStreetMap contributors"}).addTo(g),g.on("click",n=>T(n.latlng.lat,n.latlng.lng,!0)),V=!0),setTimeout(()=>g.invalidateSize(),100);const t=Number(localStorage.getItem("mobs_delivery_latitude")),r=Number(localStorage.getItem("mobs_delivery_longitude"));Number.isFinite(t)&&Number.isFinite(r)&&T(t,r,!1)}function T(e,t,r=!0){if(e=Number(e),t=Number(t),!Number.isFinite(e)||!Number.isFinite(t))return;const n=document.getElementById("deliveryLatitude"),o=document.getElementById("deliveryLongitude");n&&(n.value=e.toFixed(7)),o&&(o.value=t.toFixed(7)),localStorage.setItem("mobs_delivery_latitude",String(e)),localStorage.setItem("mobs_delivery_longitude",String(t)),V&&g&&(_?_.setLatLng([e,t]):(_=L.marker([e,t],{draggable:!0}).addTo(g),_.on("dragend",u=>{const f=u.target.getLatLng();T(f.lat,f.lng,!1)})),r&&g.setView([e,t],16)),I(`Location selected: ${e.toFixed(6)}, ${t.toFixed(6)}`,"ok")}function we(){if(!navigator.geolocation){I("Location is not supported by this browser.","error");return}I("Finding your location..."),navigator.geolocation.getCurrentPosition(e=>{T(e.coords.latitude,e.coords.longitude,!0)},e=>{console.error("Geolocation error:",e);const t=e.code===1?"Location permission was denied. You can tap the map instead.":"Could not get your location. You can tap the map instead.";I(t,"error")},{enableHighAccuracy:!0,timeout:1e4,maximumAge:3e4})}function Ie(){const e=document.getElementById("deliveryLatitude"),t=document.getElementById("deliveryLongitude");e&&(e.value=""),t&&(t.value=""),localStorage.removeItem("mobs_delivery_latitude"),localStorage.removeItem("mobs_delivery_longitude"),_&&g&&(g.removeLayer(_),_=null),I("Tap the map to choose your delivery location.")}function oe(){const e=Number(document.getElementById("deliveryLatitude")?.value),t=Number(document.getElementById("deliveryLongitude")?.value);return{latitude:Number.isFinite(e)?e:null,longitude:Number.isFinite(t)?t:null,address:(document.getElementById("deliveryAddress")?.value||"").trim()}}function Se(){let e=localStorage.getItem("mobs_customer_token");return e||(e=window.crypto&&crypto.randomUUID?crypto.randomUUID():"mobs-"+Date.now()+"-"+Math.random().toString(36).slice(2,12),localStorage.setItem("mobs_customer_token",e)),e}function H(){const e=document.getElementById("customerName"),t=document.getElementById("customerPhone"),r=(e?.value||"").trim(),n=(t?.value||"").replace(/\D/g,"").slice(0,10);return{name:r,phone:n}}function ie(e=!0){const{name:t,phone:r}=H();if(!t)return e&&alert("Please enter your full name."),document.getElementById("customerName")?.focus(),!1;if(!/^05\d{8}$/.test(r))return e&&alert("Please enter a valid Saudi mobile number with exactly 10 digits, starting with 05."),document.getElementById("customerPhone")?.focus(),!1;const n=oe();return n.latitude===null||n.longitude===null?(e&&alert("Please choose your delivery location on the map or use My Location."),ne(),document.getElementById("deliveryMap")?.scrollIntoView({behavior:"smooth",block:"center"}),!1):(localStorage.setItem("mobs_customer_name",t),localStorage.setItem("mobs_customer_phone",r),localStorage.setItem("mobs_delivery_address",n.address),!0)}function ae(){const e=document.getElementById("customerName"),t=document.getElementById("customerPhone");e&&(e.value=""),t&&(t.value="")}function Ee(){if(!c.length){m("menu");return}ae(),m("checkout"),setTimeout(()=>document.getElementById("customerName")?.focus(),50)}function Ce(){ie(!0)&&m("payment")}async function Te(){if(!c.length){m("menu");return}if(!ie(!0)){m("checkout");return}const{name:e,phone:t}=H(),r=oe(),n=String(document.getElementById("deliveryInstructions")?.value||"").trim(),o=document.querySelector("#review > .btn");o&&(o.disabled=!0,o.textContent="PLACING ORDER...");try{await Z();const u=c.map(l=>{const v=p.find(ge=>String(ge.id)===String(l.product_id)),W=Math.max(1,Number(l.quantity||1));if(!v||v.is_available===!1)throw new Error(`Product "${l.name}" is no longer available.`);const M=Number(v.price),me=Math.round(M*W*100)/100;return{product_id:v.id,product_name:v.name,product_price:M,unit_price:M,quantity:W,line_total:me}}),f=Math.round(u.reduce((l,v)=>l+v.line_total,0)*100)/100,a=c.length?Number(window.MOBS_CONFIG.deliveryFee):0,h=Math.round(f*Number(window.MOBS_CONFIG.taxRate)*100)/100,w=Math.round((f+a+h)*100)/100,U=Se(),le=r.address||`Map location: ${r.latitude},${r.longitude}`,{data:k,error:Y}=await y.from("orders").insert({restaurant_id:C,customer_token:U,customer_name:e,phone:t,status:"pending",payment_method:"cash_on_delivery",subtotal:f,delivery_fee:a,tax:h,total:w,delivery_address:le,delivery_instructions:n||null,latitude:Number(r.latitude),longitude:Number(r.longitude)}).select("*").single();if(Y)throw Y;const ue=u.map(l=>({order_id:k.id,product_id:l.product_id,product_name:l.product_name,product_price:l.product_price,unit_price:l.unit_price,quantity:l.quantity,line_total:l.line_total})),{error:j}=await y.from("order_items").insert(ue);if(j)throw await y.from("orders").delete().eq("id",k.id),j;i={...k,tracking_token:U,order_number:k.order_number||k.order_no||k.id,items:u},E(i),c=[],$();const J=document.getElementById("orderCode");J&&(J.textContent="#"+i.order_number);const G=document.querySelector("#success .choice b");G&&(G.textContent=d(w)),m("success")}catch(u){console.error("Place order error:",u),alert(`Could not place the order.

`+(u?.message||"Unknown error"))}finally{o&&(o.disabled=!1,o.textContent="PLACE ORDER →")}}function A(){try{const e=JSON.parse(localStorage.getItem("mobs_customer_orders")||"[]");return Array.isArray(e)?e:[]}catch{return[]}}function E(e){if(!e?.tracking_token)return;const t=A(),r=String(e.tracking_token),n=t.findIndex(o=>String(o.tracking_token)===r);n>=0?t[n]={...t[n],...e}:t.unshift(e),localStorage.setItem("mobs_customer_orders",JSON.stringify(t.slice(0,30))),localStorage.setItem("mobs_last_tracking_token",r)}async function B(e){if(!e)throw new Error("Tracking token is missing.");const{data:t,error:r}=await y.from("orders").select("*").eq("restaurant_id",C).eq("customer_token",e).order("created_at",{ascending:!1}).limit(1).maybeSingle();if(r)throw r;if(!t)throw new Error("Order not found.");const{data:n,error:o}=await y.from("order_items").select(`
        id,
        order_id,
        product_id,
        product_name,
        product_price,
        unit_price,
        quantity,
        line_total
      `).eq("order_id",t.id).order("created_at",{ascending:!0});if(o)throw o;return{...t,tracking_token:e,items:n||[],order_number:t.order_number||t.order_no||t.id}}async function ce(e="active",t){document.querySelectorAll("#orderTabs .cat").forEach(a=>a.classList.remove("active")),t&&t.classList.add("active");const r=document.getElementById("ordersList");if(!r)return;r.innerHTML=`
      <div
        class="choice"
        style="text-align:center"
      >
        Loading orders...
      </div>
    `;const n=A();if(!n.length){r.innerHTML=`

      <div
        class="choice"
        style="text-align:center"
      >

        No orders yet.

        <br><br>

        <button
          class="btn yellow"
          onclick="go('menu')"
        >
          BROWSE MENU
        </button>

      </div>

    `;return}const o=[];for(const a of n)try{const h=await B(a.tracking_token),w={...a,...h};E(w),o.push(w)}catch(h){o.push(a),console.warn("Order refresh failed:",h)}const u=["جديد","جاري التجهيز","خرج للتوصيل","pending","confirmed","preparing","ready","out_for_delivery"],f=o.filter(a=>e==="active"?u.includes(String(a.status)):!u.includes(String(a.status)));if(!f.length){r.innerHTML=`

      <div
        class="choice"
        style="text-align:center"
      >
        No ${e} orders yet.
      </div>

    `;return}r.innerHTML=f.map(a=>`

      <div
        class="row-card"
        onclick="
          openTrackingByToken(
            '${s(a.tracking_token)}'
          )
        "
      >

        <div class="row-thumb">
          <div class="burger"></div>
        </div>

        <div class="row-info">

          <b>
            ${s(de(a))}
          </b>

          <p>
            ${d(a.total)}

            ${a.created_at?" · "+new Date(a.created_at).toLocaleDateString():""}
          </p>

          <span class="row-price">
            ${s(se(a.status))}
          </span>

        </div>

        <span class="row-arrow">
          ›
        </span>

      </div>

    `).join("")}function se(e){return{جديد:"Order received","جاري التجهيز":"Preparing your order","خرج للتوصيل":"Out for delivery",مكتمل:"Delivered",ملغي:"Cancelled",pending:"Order received",confirmed:"Confirmed",preparing:"Preparing",ready:"Ready",out_for_delivery:"Out for delivery",delivered:"Delivered",cancelled:"Cancelled"}[e]||e||"Order received"}async function Le(e){const t=A().find(r=>String(r.id)===String(e));if(t?.tracking_token){await q(t.tracking_token);return}if(i?.tracking_token){await q(i.tracking_token);return}alert("Tracking information is not available for this order.")}async function q(e){try{const t=await B(e);i={...i,...t,tracking_token:e,order_number:t.order_number||t.order_no||t.id},E(i),R(i),m("tracking")}catch(t){console.error("Tracking error:",t),alert(`Could not load order tracking.

`+(t.message||"Unknown error"))}}async function $e(e){O&&await y.removeChannel(O),e?.id&&(O=y.channel(`mobs-customer-order-${e.id}`).on("postgres_changes",{event:"UPDATE",schema:"public",table:"orders",filter:`id=eq.${e.id}`},async()=>{try{const t=await B(e.tracking_token);i={...i,...t,tracking_token:e.tracking_token},E(i),R(i)}catch(t){console.warn("Customer realtime refresh failed:",t)}}).subscribe())}async function Ne(e){const t=e||i?.tracking_token;if(t)try{const r=await B(t);i={...i,...r,tracking_token:t,order_number:r.order_number||r.order_no||r.id},E(i),R(i),await $e(i)}catch(r){console.error("Tracking error:",r)}}function Be(e){return{جديد:"We received your order.","جاري التجهيز":"The kitchen is preparing your order.","خرج للتوصيل":"Your order is on the way!",مكتمل:"Your order has been delivered.",ملغي:"This order was cancelled.",pending:"We received your order.",confirmed:"Your order has been confirmed.",preparing:"The kitchen is preparing your order.",ready:"Your order is ready.",out_for_delivery:"Your order is on the way!",delivered:"Your order has been delivered.",cancelled:"This order was cancelled."}[e]||"Your order status is being updated."}function de(e){const t=e?.order_number||e?.order_no||e?.id||"";return String(t).startsWith("#")?String(t):`#${t}`}function R(e){const t=document.getElementById("trackingOrderCode"),r=document.getElementById("trackingStatus"),n=document.getElementById("trackingMessage"),o=document.getElementById("trackingEta");t&&(t.textContent=de(e)),r&&(r.textContent=se(e.status)),n&&(n.textContent=Be(e.status)),o&&(e.status==="مكتمل"||e.status==="delivered"?o.textContent="Order delivered":e.status==="ملغي"||e.status==="cancelled"?o.textContent="Order cancelled":e.status==="خرج للتوصيل"||e.status==="out_for_delivery"?o.textContent="Estimated time · 15–30 min":o.textContent="Estimated time · 20–30 min")}function Me(e,t){const r="mobs_favorites",n=JSON.parse(localStorage.getItem(r)||"[]"),o=n.indexOf(e);o>=0?(n.splice(o,1),t.textContent="♡"):(n.push(e),t.textContent="♥"),localStorage.setItem(r,JSON.stringify(n))}Object.assign(window,{go:m,addToCart:be,addSame:he,changeQty:te,clearDeliveryLocation:Ie,continueCheckout:Ce,filterCategory:pe,loadOrders:ce,openCheckout:Ee,openProduct:ee,openProductById:ve,openTracking:Le,openTrackingByToken:q,placeOrder:Te,removeItem:_e,toggleFavorite:Me,useMyLocation:we});ae();const z=localStorage.getItem("mobs_last_tracking_token");z&&(i={tracking_token:z});Z();x();
