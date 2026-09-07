async function openOrder(id) {
  try {
    const orderId = String(id);

    // ابحث عن الطلب في البيانات المحملة أولاً
    let order = orders.find(
      o => String(o.id) === orderId
    );

    // إذا لم يكن موجوداً، اجلبه مباشرة من Supabase
    if (!order) {
      const { data, error } = await supabaseClient
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('restaurant_id', RESTAURANT_ID)
        .maybeSingle();

      if (error) throw error;
      order = data;
    }

    if (!order) {
      throw new Error('Order not found.');
    }

    currentOrder = order;

    // جلب المنتجات والسائقين بالتوازي
    const [
      { data: items, error: itemsError },
      { data: drivers, error: driversError }
    ] = await Promise.all([
      supabaseClient
        .from('order_items')
        .select(`
          id,
          order_id,
          product_id,
          product_name,
          unit_price,
          quantity,
          line_total
        `)
        .eq('order_id', orderId)
        .order('id', { ascending: true }),

      supabaseClient
        .from('driver_profiles')
        .select(`
          id,
          user_id,
          username,
          full_name,
          phone,
          availability_status,
          status
        `)
        .eq('status', 'approved')
        .order('full_name', { ascending: true })
    ]);

    if (itemsError) throw itemsError;
    if (driversError) throw driversError;

    const orderItems = items || [];
    const approvedDrivers = drivers || [];

    // مراحل الطلب
    const steps = [
      'pending',
      'confirmed',
      'preparing',
      'ready',
      'out_for_delivery',
      'arrived',
      'delivered'
    ];

    const labels = [
      'Order placed',
      'Accepted by kitchen',
      'Preparing',
      'Ready for pickup',
      'Out for delivery',
      'Arrived',
      'Delivered'
    ];

    const currentStep = steps.indexOf(order.status);

    // السائقين
    const driverOptions = approvedDrivers.map(driver => {
      const selected =
        String(driver.user_id) === String(order.driver_id)
          ? 'selected'
          : '';

      const driverName =
        driver.full_name ||
        driver.username ||
        'Unnamed Driver';

      const availability =
        driver.availability_status || 'offline';

      return `
        <option
          value="${esc(driver.user_id)}"
          ${selected}
        >
          ${esc(driverName)}
          ${driver.username ? ` · @${esc(driver.username)}` : ''}
          · ${esc(availability)}
        </option>
      `;
    }).join('');

    const totalItems = orderItems.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    );

    const modal = document.getElementById('modalbox');

    if (!modal) {
      throw new Error('Order modal was not found in the page.');
    }

    modal.innerHTML = `
      <div class="titlebar">

        <div class="title">
          <h1>
            #MOBS-${esc(order.order_number)}
          </h1>

          <p>
            ${new Date(order.created_at).toLocaleString()}
          </p>
        </div>

        <div>
          ${badge(statusLabel(order.status))}
        </div>

      </div>

      <!-- ORDER TIMELINE -->
      <div class="card">

        <h3>Order Timeline</h3>

        <div class="timeline">

          ${labels.map((label, index) => {

            const done =
              currentStep >= index &&
              currentStep !== -1;

            return `
              <div class="step ${done ? 'done' : ''}">

                <div class="dot">
                  ${done ? '✓' : index + 1}
                </div>

                <div>
                  <b>${esc(label)}</b>

                  <small
                    style="
                      display:block;
                      color:#777;
                      margin-top:3px;
                    "
                  >
                    ${
                      done
                        ? (
                            index === 0
                              ? new Date(
                                  order.created_at
                                ).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : 'Completed'
                          )
                        : 'Pending'
                    }
                  </small>

                </div>

              </div>
            `;

          }).join('')}

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

            ${driverOptions}

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
            ${esc(customerDisplay(order))}
          </b>
        </div>

        <div class="mini">
          <span>Phone</span>
          <b>
            ${esc(order.customer_phone || '—')}
          </b>
        </div>

        <div class="mini">
          <span>Items</span>
          <b>
            ${totalItems}
          </b>
        </div>

        <div class="mini">
          <span>Subtotal</span>
          <b>
            ${money(order.subtotal)}
          </b>
        </div>

        <div class="mini">
          <span>Delivery Fee</span>
          <b>
            ${money(order.delivery_fee)}
          </b>
        </div>

        <div class="mini">
          <span>Tax</span>
          <b>
            ${money(order.tax)}
          </b>
        </div>

        <div class="mini">
          <span>Total</span>
          <b>
            ${money(order.total)}
          </b>
        </div>

        <div class="mini">
          <span>Payment</span>
          <b>
            ${esc(order.payment_method || '—')}
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
            value="${esc(order.delivery_address || '')}"
          >

        </div>


        <div class="field">

          <label>
            DELIVERY INSTRUCTIONS
          </label>

          <textarea
            id="modalInstructions"
            rows="4"
          >${esc(order.delivery_instructions || '')}</textarea>

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

            ${Object.entries(STATUS_LABELS)
              .map(([value, label]) => `
                <option
                  value="${esc(value)}"
                  ${
                    value === order.status
                      ? 'selected'
                      : ''
                  }
                >
                  ${esc(label)}
                </option>
              `)
              .join('')}

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

        ${
          orderItems.length
            ? orderItems.map(item => `
                <div class="mini">

                  <span>
                    ${esc(item.product_name)}
                    ×
                    ${Number(item.quantity || 0)}
                  </span>

                  <b>
                    ${money(item.line_total)}
                  </b>

                </div>
              `).join('')
            : `
              <div
                style="
                  color:#777;
                  padding:10px 0;
                "
              >
                No item details found.
              </div>
            `
        }

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
    `;

    openModalRaw();

  } catch (error) {

    console.error(
      'openOrder error:',
      error
    );

    showToast(
      'Could not open order: ' +
      (
        error?.message ||
        'Unknown error'
      )
    );
  }
}


/* =========================================================
   SAVE DRIVER
   ========================================================= */

async function saveOrderAssignment() {

  if (!currentOrder?.id) {
    showToast('No order selected.');
    return;
  }

  try {

    const select =
      document.getElementById('modalDriver');

    if (!select) {
      throw new Error(
        'Driver selector not found.'
      );
    }

    const driverId =
      select.value.trim() || null;

    const { data, error } =
      await supabaseClient
        .from('orders')
        .update({
          driver_id: driverId
        })
        .eq('id', currentOrder.id)
        .eq('restaurant_id', RESTAURANT_ID)
        .select('*')
        .single();

    if (error) {
      throw error;
    }

    currentOrder = {
      ...currentOrder,
      ...data
    };

    orders = orders.map(order =>
      String(order.id) ===
      String(currentOrder.id)
        ? currentOrder
        : order
    );

    showToast(
      driverId
        ? 'Driver assigned successfully.'
        : 'Driver unassigned.'
    );

    // تحديث القائمة
    await loadOrders();

    // إعادة فتح الطلب بعد الحفظ
    await openOrder(
      currentOrder.id
    );

  } catch (error) {

    console.error(
      'saveOrderAssignment error:',
      error
    );

    showToast(
      'Could not assign driver: ' +
      (
        error?.message ||
        'Unknown error'
      )
    );
  }
}


/* =========================================================
   SAVE ADDRESS + INSTRUCTIONS
   ========================================================= */

async function saveOrderDetails() {

  if (!currentOrder?.id) {
    showToast('No order selected.');
    return;
  }

  try {

    const address =
      document
        .getElementById('modalAddress')
        ?.value
        ?.trim() || null;

    const instructions =
      document
        .getElementById('modalInstructions')
        ?.value
        ?.trim() || null;


    const { data, error } =
      await supabaseClient
        .from('orders')
        .update({
          delivery_address: address,
          delivery_instructions: instructions
        })
        .eq('id', currentOrder.id)
        .eq('restaurant_id', RESTAURANT_ID)
        .select('*')
        .single();


    if (error) {
      throw error;
    }


    currentOrder = {
      ...currentOrder,
      ...data
    };


    orders = orders.map(order =>
      String(order.id) ===
      String(currentOrder.id)
        ? currentOrder
        : order
    );


    showToast(
      'Order details saved.'
    );


    await loadOrders();

    await openOrder(
      currentOrder.id
    );


  } catch (error) {

    console.error(
      'saveOrderDetails error:',
      error
    );

    showToast(
      'Could not save order: ' +
      (
        error?.message ||
        'Unknown error'
      )
    );
  }
}


/* =========================================================
   UPDATE STATUS
   ========================================================= */

async function updateModalStatus() {

  if (!currentOrder?.id) {
    showToast('No order selected.');
    return;
  }

  const select =
    document.getElementById(
      'modalStatus'
    );

  if (!select) {
    showToast(
      'Status selector not found.'
    );
    return;
  }

  const newStatus =
    select.value;

  await setOrderStatus(
    currentOrder.id,
    newStatus,
    true
  );
}


/* =========================================================
   SET ORDER STATUS
   ========================================================= */

async function setOrderStatus(
  id,
  status,
  close = false
) {

  try {

    // اجلب أحدث نسخة من الطلب
    let order =
      orders.find(
        o =>
          String(o.id) ===
          String(id)
      );

    if (!order) {

      const { data, error } =
        await supabaseClient
          .from('orders')
          .select('*')
          .eq('id', id)
          .eq(
            'restaurant_id',
            RESTAURANT_ID
          )
          .maybeSingle();

      if (error) {
        throw error;
      }

      order = data;
    }


    if (!order) {
      throw new Error(
        'Order not found.'
      );
    }


    /*
      لا تسمح بإرسال الطلب
      للتوصيل بدون Driver
    */

    if (
      status ===
        'out_for_delivery' &&
      !order.driver_id
    ) {

      showToast(
        'Assign an approved driver before dispatching.'
      );

      return;
    }


    const { data, error } =
      await supabaseClient
        .from('orders')
        .update({
          status: status
        })
        .eq('id', id)
        .eq(
          'restaurant_id',
          RESTAURANT_ID
        )
        .select('*')
        .single();


    if (error) {
      throw error;
    }


    // تحديث النسخة المحلية
    orders = orders.map(o =>
      String(o.id) ===
      String(id)
        ? {
            ...o,
            ...data
          }
        : o
    );


    currentOrder = {
      ...order,
      ...data
    };


    showToast(
      'Order status updated.'
    );


    if (close) {
      closeModal();
    }


    // تحديث الشاشة
    const activePage =
      document
        .querySelector(
          '.page.show'
        )
        ?.id;


    if (
      activePage ===
      'orders'
    ) {
      await loadOrders();
    }

    if (
      activePage ===
      'dashboard'
    ) {
      await loadDashboard();
    }

    if (
      activePage ===
      'kitchen'
    ) {
      await loadKitchen();
    }


  } catch (error) {

    console.error(
      'setOrderStatus error:',
      error
    );

    showToast(
      'Could not update order: ' +
      (
        error?.message ||
        'Unknown error'
      )
    );
  }
}


/* =========================================================
   MAKE FUNCTIONS AVAILABLE TO HTML onclick=""
   ========================================================= */

window.openOrder =
  openOrder;

window.closeModal =
  closeModal;

window.setOrderStatus =
  setOrderStatus;

window.saveOrderAssignment =
  saveOrderAssignment;

window.saveOrderDetails =
  saveOrderDetails;

window.updateModalStatus =
  updateModalStatus;