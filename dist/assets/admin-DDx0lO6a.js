import"./supabase-CjkXVilc.js";import"https://esm.sh/@supabase/supabase-js@2";async function p(t){try{const s=String(t);let e=orders.find(r=>String(r.id)===s);if(!e){const{data:r,error:d}=await supabaseClient.from("orders").select("*").eq("id",s).eq("restaurant_id",RESTAURANT_ID).maybeSingle();if(d)throw d;e=r}if(!e)throw new Error("Order not found.");currentOrder=e;const[{data:a,error:i},{data:c,error:n}]=await Promise.all([supabaseClient.from("order_items").select(`
          id,
          order_id,
          product_id,
          product_name,
          unit_price,
          quantity,
          line_total
        `).eq("order_id",s).order("id",{ascending:!0}),supabaseClient.from("driver_profiles").select(`
          id,
          user_id,
          username,
          full_name,
          phone,
          availability_status,
          status
        `).eq("status","approved").order("full_name",{ascending:!0})]);if(i)throw i;if(n)throw n;const o=a||[],u=c||[],w=["pending","confirmed","preparing","ready","out_for_delivery","arrived","delivered"],f=["Order placed","Accepted by kitchen","Preparing","Ready for pickup","Out for delivery","Arrived","Delivered"],m=w.indexOf(e.status),g=u.map(r=>{const d=String(r.user_id)===String(e.driver_id)?"selected":"",l=r.full_name||r.username||"Unnamed Driver",O=r.availability_status||"offline";return`
        <option
          value="${esc(r.user_id)}"
          ${d}
        >
          ${esc(l)}
          ${r.username?` · @${esc(r.username)}`:""}
          · ${esc(O)}
        </option>
      `}).join(""),h=o.reduce((r,d)=>r+Number(d.quantity||0),0),v=document.getElementById("modalbox");if(!v)throw new Error("Order modal was not found in the page.");v.innerHTML=`
      <div class="titlebar">

        <div class="title">
          <h1>
            #MOBS-${esc(e.order_number)}
          </h1>

          <p>
            ${new Date(e.created_at).toLocaleString()}
          </p>
        </div>

        <div>
          ${badge(statusLabel(e.status))}
        </div>

      </div>

      <!-- ORDER TIMELINE -->
      <div class="card">

        <h3>Order Timeline</h3>

        <div class="timeline">

          ${f.map((r,d)=>{const l=m>=d&&m!==-1;return`
              <div class="step ${l?"done":""}">

                <div class="dot">
                  ${l?"✓":d+1}
                </div>

                <div>
                  <b>${esc(r)}</b>

                  <small
                    style="
                      display:block;
                      color:#777;
                      margin-top:3px;
                    "
                  >
                    ${l?d===0?new Date(e.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):"Completed":"Pending"}
                  </small>

                </div>

              </div>
            `}).join("")}

        </div>

      </div>


      <!-- DISPATCH -->
      <div class="card">

        <h3>Dispatch</h3>

        <div class="field">

          <label>
            ASSIGN APPROVED DRIVER
          </label>

          <select id="modalDriver">

            <option value="">
              Unassigned
            </option>

            ${g}

          </select>

        </div>

        <button
          class="btn primary"
          style="
            width:100%;
            margin-top:10px;
          "
          onclick="saveOrderAssignment()"
        >
          SAVE DRIVER
        </button>

        <p
          style="
            color:#777;
            font-size:11px;
            margin-top:9px;
          "
        >
          Only approved drivers can be assigned.
        </p>

      </div>


      <!-- CUSTOMER / ORDER INFORMATION -->
      <div class="card">

        <h3>Order Information</h3>

        <div class="mini">
          <span>Customer</span>
          <b>
            ${esc(customerDisplay(e))}
          </b>
        </div>

        <div class="mini">
          <span>Phone</span>
          <b>
            ${esc(e.customer_phone||"—")}
          </b>
        </div>

        <div class="mini">
          <span>Items</span>
          <b>
            ${h}
          </b>
        </div>

        <div class="mini">
          <span>Subtotal</span>
          <b>
            ${money(e.subtotal)}
          </b>
        </div>

        <div class="mini">
          <span>Delivery Fee</span>
          <b>
            ${money(e.delivery_fee)}
          </b>
        </div>

        <div class="mini">
          <span>Tax</span>
          <b>
            ${money(e.tax)}
          </b>
        </div>

        <div class="mini">
          <span>Total</span>
          <b>
            ${money(e.total)}
          </b>
        </div>

        <div class="mini">
          <span>Payment</span>
          <b>
            ${esc(e.payment_method||"—")}
          </b>
        </div>

      </div>


      <!-- ADDRESS / EDIT -->
      <div class="card">

        <h3>Edit Order</h3>

        <div class="field">

          <label>
            DELIVERY ADDRESS
          </label>

          <input
            id="modalAddress"
            type="text"
            value="${esc(e.delivery_address||"")}"
          >

        </div>


        <div class="field">

          <label>
            DELIVERY INSTRUCTIONS
          </label>

          <textarea
            id="modalInstructions"
            rows="4"
          >${esc(e.delivery_instructions||"")}</textarea>

        </div>


        <button
          class="btn ghost"
          style="
            width:100%;
            margin-top:8px;
          "
          onclick="saveOrderDetails()"
        >
          SAVE ORDER DETAILS
        </button>

      </div>


      <!-- STATUS -->
      <div class="card">

        <h3>Update Status</h3>

        <div class="field">

          <label>
            ORDER STATUS
          </label>

          <select
            id="modalStatus"
            style="
              width:100%;
              margin-top:6px;
              padding:10px;
              border:1px solid var(--line);
              border-radius:9px;
            "
          >

            ${Object.entries(STATUS_LABELS).map(([r,d])=>`
                <option
                  value="${esc(r)}"
                  ${r===e.status?"selected":""}
                >
                  ${esc(d)}
                </option>
              `).join("")}

          </select>

        </div>


        <button
          class="btn primary"
          style="
            margin-top:10px;
            width:100%;
          "
          onclick="updateModalStatus()"
        >
          UPDATE STATUS
        </button>

      </div>


      <!-- ITEMS -->
      <div class="card">

        <h3>Order Items</h3>

        ${o.length?o.map(r=>`
                <div class="mini">

                  <span>
                    ${esc(r.product_name)}
                    ×
                    ${Number(r.quantity||0)}
                  </span>

                  <b>
                    ${money(r.line_total)}
                  </b>

                </div>
              `).join(""):`
              <div
                style="
                  color:#777;
                  padding:10px 0;
                "
              >
                No item details found.
              </div>
            `}

      </div>


      <!-- CLOSE -->
      <div
        style="
          display:flex;
          justify-content:flex-end;
          margin-top:16px;
        "
      >

        <button
          class="btn ghost"
          onclick="closeModal()"
        >
          CLOSE
        </button>

      </div>
    `,openModalRaw()}catch(s){console.error("openOrder error:",s),showToast("Could not open order: "+(s?.message||"Unknown error"))}}async function S(){if(!currentOrder?.id){showToast("No order selected.");return}try{const t=document.getElementById("modalDriver");if(!t)throw new Error("Driver selector not found.");const s=t.value.trim()||null,{data:e,error:a}=await supabaseClient.from("orders").update({driver_id:s}).eq("id",currentOrder.id).eq("restaurant_id",RESTAURANT_ID).select("*").single();if(a)throw a;currentOrder={...currentOrder,...e},orders=orders.map(i=>String(i.id)===String(currentOrder.id)?currentOrder:i),showToast(s?"Driver assigned successfully.":"Driver unassigned."),await loadOrders(),await p(currentOrder.id)}catch(t){console.error("saveOrderAssignment error:",t),showToast("Could not assign driver: "+(t?.message||"Unknown error"))}}async function y(){if(!currentOrder?.id){showToast("No order selected.");return}try{const t=document.getElementById("modalAddress")?.value?.trim()||null,s=document.getElementById("modalInstructions")?.value?.trim()||null,{data:e,error:a}=await supabaseClient.from("orders").update({delivery_address:t,delivery_instructions:s}).eq("id",currentOrder.id).eq("restaurant_id",RESTAURANT_ID).select("*").single();if(a)throw a;currentOrder={...currentOrder,...e},orders=orders.map(i=>String(i.id)===String(currentOrder.id)?currentOrder:i),showToast("Order details saved."),await loadOrders(),await p(currentOrder.id)}catch(t){console.error("saveOrderDetails error:",t),showToast("Could not save order: "+(t?.message||"Unknown error"))}}async function _(){if(!currentOrder?.id){showToast("No order selected.");return}const t=document.getElementById("modalStatus");if(!t){showToast("Status selector not found.");return}const s=t.value;await b(currentOrder.id,s,!0)}async function b(t,s,e=!1){try{let a=orders.find(o=>String(o.id)===String(t));if(!a){const{data:o,error:u}=await supabaseClient.from("orders").select("*").eq("id",t).eq("restaurant_id",RESTAURANT_ID).maybeSingle();if(u)throw u;a=o}if(!a)throw new Error("Order not found.");if(s==="out_for_delivery"&&!a.driver_id){showToast("Assign an approved driver before dispatching.");return}const{data:i,error:c}=await supabaseClient.from("orders").update({status:s}).eq("id",t).eq("restaurant_id",RESTAURANT_ID).select("*").single();if(c)throw c;orders=orders.map(o=>String(o.id)===String(t)?{...o,...i}:o),currentOrder={...a,...i},showToast("Order status updated."),e&&closeModal();const n=document.querySelector(".page.show")?.id;n==="orders"&&await loadOrders(),n==="dashboard"&&await loadDashboard(),n==="kitchen"&&await loadKitchen()}catch(a){console.error("setOrderStatus error:",a),showToast("Could not update order: "+(a?.message||"Unknown error"))}}window.openOrder=p;window.closeModal=closeModal;window.setOrderStatus=b;window.saveOrderAssignment=S;window.saveOrderDetails=y;window.updateModalStatus=_;
