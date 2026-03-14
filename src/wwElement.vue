<template>
  <div v-if="!content.portalTarget || content.portalTarget === 'admin'" class="spread-ao">
    <div v-if="permissionGranted !== true" class="spread-perm-overlay" style="position:absolute;inset:0;z-index:9999;background:var(--spread-cream,#FBFAF8);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:32px;text-align:center;">
      <div v-if="permissionGranted === null" style="width:24px;height:24px;border:3px solid rgba(0,0,0,0.1);border-top-color:var(--spread-accent,#CE6632);border-radius:50%;animation:spread-perm-spin 0.7s linear infinite;"></div>
      <template v-else>
        <span style="font-size:32px;line-height:1;">🔒</span>
        <strong style="font-size:15px;font-weight:700;color:var(--spread-black,#141414);margin:0;">Access denied</strong>
        <span style="font-size:13px;color:var(--spread-mid-grey,#6B7280);">You don't have permission to view this area.</span>
      </template>
    </div>
    <!-- Header -->
    <div class="spread-ao__header">
      <h2 class="spread-ao__title">Orders</h2>
      <button class="spread-ao__btn spread-ao__btn--primary" @click="loadOrders">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Refresh
      </button>
    </div>

    <!-- Status tabs -->
    <div class="spread-ao__tabs">
      <button
        v-for="tab in statusTabs"
        :key="tab.value"
        class="spread-ao__tab"
        :class="{ 'spread-ao__tab--active': filterStatus === tab.value }"
        @click="setStatusTab(tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Filters row -->
    <div class="spread-ao__filters">
      <input
        v-model="search"
        class="spread-ao__search"
        type="text"
        placeholder="Search by order ID, email, or name…"
        @input="debouncedLoad"
      />
      <input
        v-model="dateFrom"
        class="spread-ao__date"
        type="date"
        @change="resetAndLoad"
      />
      <input
        v-model="dateTo"
        class="spread-ao__date"
        type="date"
        @change="resetAndLoad"
      />
    </div>

    <!-- Loading -->
    <div v-if="loading && !orders.length" class="spread-ao__loading">
      <div class="spread-ao__spinner"></div>
      <span>Loading orders…</span>
    </div>

    <!-- Empty state -->
    <div v-else-if="!loading && !orders.length" class="spread-ao__empty">
      <p class="spread-ao__empty-title">No orders found</p>
      <p class="spread-ao__empty-sub">Adjust your filters or wait for new orders.</p>
    </div>

    <!-- Desktop table -->
    <div v-else class="spread-ao__table-wrap">
      <table class="spread-ao__table">
        <thead>
          <tr>
            <th class="spread-ao__th">Order</th>
            <th class="spread-ao__th">Customer</th>
            <th class="spread-ao__th">Status</th>
            <th class="spread-ao__th spread-ao__th--num">Items</th>
            <th class="spread-ao__th spread-ao__th--num">Total</th>
            <th class="spread-ao__th">Region</th>
            <th class="spread-ao__th">Date</th>
            <th class="spread-ao__th">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="o in orders" :key="o.id" class="spread-ao__row" @click="openDetail(o.id)">
            <td class="spread-ao__td">
              <span class="spread-ao__order-id">{{ shortId(o.id) }}</span>
            </td>
            <td class="spread-ao__td">
              <span class="spread-ao__customer-name">{{ o.customer_name }}</span>
              <span class="spread-ao__customer-email">{{ o.customer_email }}</span>
            </td>
            <td class="spread-ao__td">
              <span class="spread-ao__status-badge" :class="'spread-ao__status-badge--' + o.status">{{ formatStatus(o.status) }}</span>
              <span v-if="o.dispute_status" class="spread-ao__dispute-badge">{{ o.dispute_status }}</span>
            </td>
            <td class="spread-ao__td spread-ao__td--num">{{ o.item_count }}</td>
            <td class="spread-ao__td spread-ao__td--num">{{ formatPrice(o.total) }}</td>
            <td class="spread-ao__td">{{ o.region_name || '—' }}</td>
            <td class="spread-ao__td">{{ formatDate(o.created_at) }}</td>
            <td class="spread-ao__td" @click.stop>
              <button class="spread-ao__icon-btn" title="View details" @click="openDetail(o.id)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/></svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile cards -->
    <div v-if="orders.length" class="spread-ao__cards">
      <div v-for="o in orders" :key="'m-' + o.id" class="spread-ao__card" @click="openDetail(o.id)">
        <div class="spread-ao__card-top">
          <span class="spread-ao__order-id">{{ shortId(o.id) }}</span>
          <span class="spread-ao__status-badge" :class="'spread-ao__status-badge--' + o.status">{{ formatStatus(o.status) }}</span>
        </div>
        <div class="spread-ao__card-customer">{{ o.customer_name }} · {{ o.customer_email }}</div>
        <div class="spread-ao__card-row">
          <span>{{ o.item_count }} item{{ o.item_count === 1 ? '' : 's' }}</span>
          <span>{{ formatPrice(o.total) }}</span>
          <span>{{ formatDate(o.created_at) }}</span>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalCount > pageLimit" class="spread-ao__pagination">
      <button class="spread-ao__btn spread-ao__btn--outline" :disabled="currentPage <= 1 || loading" @click="goPage(currentPage - 1)">← Prev</button>
      <span class="spread-ao__page-info">Page {{ currentPage }} of {{ totalPages }}</span>
      <button class="spread-ao__btn spread-ao__btn--outline" :disabled="!hasMore || loading" @click="goPage(currentPage + 1)">Next →</button>
    </div>

    <!-- Detail slide-over -->
    <div v-if="detail" class="spread-ao__overlay" @click.self="closeDetail">
      <div class="spread-ao__panel">
        <div class="spread-ao__panel-header">
          <h3>Order {{ shortId(detail.id) }}</h3>
          <button class="spread-ao__icon-btn" @click="closeDetail" title="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>

        <!-- Loading detail -->
        <div v-if="detailLoading" class="spread-ao__loading" style="padding:32px">
          <div class="spread-ao__spinner"></div>
        </div>

        <div v-else class="spread-ao__panel-body">
          <!-- Status & actions -->
          <div class="spread-ao__panel-section">
            <div class="spread-ao__status-row">
              <span class="spread-ao__status-badge spread-ao__status-badge--lg" :class="'spread-ao__status-badge--' + detail.status">{{ formatStatus(detail.status) }}</span>
              <span v-if="detail.dispute_status" class="spread-ao__dispute-badge">{{ detail.dispute_status }}</span>
            </div>
            <div class="spread-ao__action-row">
              <button
                v-for="action in availableActions"
                :key="action.value"
                class="spread-ao__btn"
                :class="action.class"
                :disabled="actionLoading"
                @click="doAction(action.value)"
              >
                {{ action.label }}
              </button>
            </div>
          </div>

          <!-- Customer -->
          <div class="spread-ao__panel-section">
            <h4 class="spread-ao__section-title">Customer</h4>
            <div class="spread-ao__detail-grid">
              <div class="spread-ao__detail-field">
                <span class="spread-ao__detail-label">Name</span>
                <span>{{ detail.customer?.name || '—' }}</span>
              </div>
              <div class="spread-ao__detail-field">
                <span class="spread-ao__detail-label">Email</span>
                <span>{{ detail.customer?.email || '—' }}</span>
              </div>
              <div class="spread-ao__detail-field">
                <span class="spread-ao__detail-label">Phone</span>
                <span>{{ detail.customer?.phone || '—' }}</span>
              </div>
              <div class="spread-ao__detail-field">
                <span class="spread-ao__detail-label">Household</span>
                <span>{{ detail.customer?.household_name || '—' }}</span>
              </div>
              <div class="spread-ao__detail-field">
                <span class="spread-ao__detail-label">Member</span>
                <span>{{ detail.is_member ? 'Yes' : 'Guest' }}</span>
              </div>
              <div class="spread-ao__detail-field">
                <span class="spread-ao__detail-label">Region</span>
                <span>{{ detail.region_name || '—' }}, {{ detail.state_name || '' }}</span>
              </div>
            </div>
          </div>

          <!-- Items -->
          <div class="spread-ao__panel-section">
            <h4 class="spread-ao__section-title">Items ({{ (detail.items || []).length }})</h4>
            <div class="spread-ao__items-list">
              <div v-for="item in (detail.items || [])" :key="item.id" class="spread-ao__item">
                <img v-if="item.product_image" :src="item.product_image" class="spread-ao__item-img" alt="" />
                <div class="spread-ao__item-info">
                  <span class="spread-ao__item-name">{{ item.product_name }}{{ item.variant_name ? ` (${item.variant_name})` : '' }}</span>
                  <span class="spread-ao__item-meta">Qty: {{ item.qty }} × {{ formatPrice(item.unit_amount) }}</span>
                </div>
                <span class="spread-ao__item-total">{{ formatPrice(item.line_total) }}</span>
              </div>
            </div>
            <div class="spread-ao__totals">
              <div class="spread-ao__total-row">
                <span>Subtotal</span><span>{{ formatPrice(detail.subtotal) }}</span>
              </div>
              <div class="spread-ao__total-row">
                <span>Delivery</span><span>{{ formatPrice(detail.delivery_fee) }}</span>
              </div>
              <div class="spread-ao__total-row spread-ao__total-row--grand">
                <span>Total</span><span>{{ formatPrice(detail.total) }}</span>
              </div>
            </div>
          </div>

          <!-- Payment -->
          <div v-if="detail.payment" class="spread-ao__panel-section">
            <h4 class="spread-ao__section-title">Payment</h4>
            <div class="spread-ao__detail-grid">
              <div class="spread-ao__detail-field">
                <span class="spread-ao__detail-label">Session</span>
                <span class="spread-ao__mono">{{ detail.payment.session_id || '—' }}</span>
              </div>
              <div class="spread-ao__detail-field">
                <span class="spread-ao__detail-label">Mode</span>
                <span>{{ detail.payment.mode || '—' }}</span>
              </div>
              <div class="spread-ao__detail-field">
                <span class="spread-ao__detail-label">Status</span>
                <span>{{ detail.payment.status || '—' }}</span>
              </div>
            </div>
          </div>

          <!-- Refunds -->
          <div v-if="detail.refunds && detail.refunds.length" class="spread-ao__panel-section">
            <h4 class="spread-ao__section-title">Refunds</h4>
            <div v-for="r in detail.refunds" :key="r.id" class="spread-ao__refund-row">
              <span class="spread-ao__mono">{{ r.stripe_refund_id }}</span>
              <span>{{ formatPrice(r.amount) }}</span>
              <span class="spread-ao__status-badge" :class="'spread-ao__status-badge--' + (r.status === 'succeeded' ? 'delivered' : 'cancelled')">{{ r.status }}</span>
              <span>{{ formatDate(r.created_at) }}</span>
            </div>
          </div>

          <!-- Refund form -->
          <div v-if="showRefundForm" class="spread-ao__panel-section">
            <h4 class="spread-ao__section-title">Issue Refund</h4>
            <div class="spread-ao__refund-form">
              <div class="spread-ao__form-row">
                <label>Amount (cents)</label>
                <input v-model.number="refundAmount" type="number" class="spread-ao__input" :placeholder="'Full: ' + (detail.total || 0)" min="1" />
              </div>
              <div class="spread-ao__form-row">
                <label>Reason</label>
                <input v-model="refundReason" type="text" class="spread-ao__input" placeholder="Reason for refund…" maxlength="500" />
              </div>
              <div class="spread-ao__form-row">
                <label>Stripe Reason</label>
                <select v-model="refundStripeReason" class="spread-ao__select">
                  <option value="">None</option>
                  <option value="duplicate">Duplicate</option>
                  <option value="fraudulent">Fraudulent</option>
                  <option value="requested_by_customer">Requested by Customer</option>
                </select>
              </div>
              <div class="spread-ao__form-actions">
                <button class="spread-ao__btn spread-ao__btn--outline" @click="showRefundForm = false">Cancel</button>
                <button class="spread-ao__btn spread-ao__btn--danger" :disabled="actionLoading" @click="submitRefund">
                  {{ actionLoading ? 'Processing…' : 'Issue Refund' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
/* wwEditor:start */
const MOCK_ORDERS = [
  {
    id: '00000000-aaaa-bbbb-cccc-000000000001',
    status: 'paid',
    customer_name: 'Alice Johnson',
    customer_email: 'alice@example.com',
    is_member: true,
    item_count: 3,
    subtotal: 2499,
    delivery_fee: 500,
    total: 2999,
    region_name: 'Northern Rivers',
    postcode: '2480',
    stripe_checkout_session_id: 'cs_test_abc123',
    dispute_status: null,
    created_at: '2025-02-10T09:30:00Z',
  },
  {
    id: '00000000-aaaa-bbbb-cccc-000000000002',
    status: 'confirmed',
    customer_name: 'Bob Smith',
    customer_email: 'bob@example.com',
    is_member: true,
    item_count: 5,
    subtotal: 4200,
    delivery_fee: 500,
    total: 4700,
    region_name: 'Gold Coast Hinterland',
    postcode: '4211',
    stripe_checkout_session_id: 'cs_test_def456',
    dispute_status: null,
    created_at: '2025-02-09T14:15:00Z',
  },
  {
    id: '00000000-aaaa-bbbb-cccc-000000000003',
    status: 'cancelled',
    customer_name: 'Guest User',
    customer_email: 'guest@test.com',
    is_member: false,
    item_count: 1,
    subtotal: 899,
    delivery_fee: 500,
    total: 1399,
    region_name: 'Sunshine Coast',
    postcode: '4556',
    stripe_checkout_session_id: 'cs_test_ghi789',
    dispute_status: 'resolved_cancel',
    created_at: '2025-02-08T18:00:00Z',
  },
];
/* wwEditor:end */

function createSpreadClient(url, anonKey, token) {
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${token || anonKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
  return {
    async rpc(fnName, params = {}) {
      const res = await fetch(`${url}/rest/v1/rpc/${fnName}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `RPC ${fnName} failed (${res.status})`);
      }
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    },
    async edgeFunction(fnName, body = {}) {
      const res = await fetch(`${url}/functions/v1/${fnName}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token || anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || `Edge Function ${fnName} failed (${res.status})`);
      }
      return res.json();
    },
  };
}

export default {
  props: {
    /* wwEditor:start */
    wwEditorState: { type: Object, required: true },
    /* wwEditor:end */
    content: { type: Object, required: true },
    wwFrontState: { type: Object, required: true },
    wwElementState: { type: Object, required: true },
  },
  emits: ['trigger-event', 'update:content'],

  setup(props, { emit }) {
    const { value: wwOrderCount, setValue: setWwOrderCount } =
      wwLib.wwVariable.useComponentVariable({
        uid: 'orderCount',
        name: 'Order Count',
        type: 'number',
        defaultValue: 0,
      });
    return { wwOrderCount, setWwOrderCount };
  },

  data() {
    return {
      permissionGranted: null,
      loading: false,
      orders: [],
      totalCount: 0,
      hasMore: false,
      currentPage: 1,
      search: '',
      filterStatus: '',
      dateFrom: '',
      dateTo: '',
      // detail
      detail: null,
      detailLoading: false,
      actionLoading: false,
      // refund form
      showRefundForm: false,
      refundAmount: null,
      refundReason: '',
      refundStripeReason: '',
      _debounceTimer: null,
    };
  },

  computed: {
    isEditorMode() {
      return !!(this.wwEditorState);
    },
    pageLimit() {
      return this.content?.pageSize || 25;
    },
    totalPages() {
      return Math.max(1, Math.ceil(this.totalCount / this.pageLimit));
    },
    statusTabs() {
      return [
        { label: 'All',              value: '' },
        { label: 'Paid',             value: 'paid' },
        { label: 'Confirmed',        value: 'confirmed' },
        { label: 'Processing',       value: 'processing' },
        { label: 'Out for Delivery', value: 'out_for_delivery' },
        { label: 'On Hold',          value: 'on_hold' },
        { label: 'Delivered',        value: 'delivered' },
        { label: 'Cancelled',        value: 'cancelled' },
        { label: 'Failed',           value: 'failed' },
        { label: 'Expired',          value: 'expired' },
      ];
    },
    availableActions() {
      if (!this.detail) return [];
      const s = this.detail.status;
      const actions = [];

      // Forward progress transitions
      // 'paid' → 'confirmed' is automatic (fn_auto_confirm_paid_order trigger);
      // admin workflow begins at 'confirmed'.
      if (s === 'confirmed') {
        actions.push({ label: 'Mark Processing',   value: 'processing',       class: 'spread-ao__btn--primary' });
      }
      if (s === 'processing') {
        actions.push({ label: 'Out for Delivery',  value: 'out_for_delivery', class: 'spread-ao__btn--primary' });
      }
      if (s === 'out_for_delivery') {
        actions.push({ label: 'Mark Delivered',    value: 'delivered',        class: 'spread-ao__btn--success' });
      }

      // Hold / unhold
      if (['confirmed', 'processing'].includes(s)) {
        actions.push({ label: 'Place on Hold',     value: 'on_hold',          class: 'spread-ao__btn--outline' });
      }
      if (s === 'on_hold') {
        actions.push({ label: 'Resume → Confirmed', value: 'confirmed',       class: 'spread-ao__btn--primary' });
      }

      // Cancel / fail / refund on non-terminal statuses
      const nonTerminal = ['confirmed', 'processing', 'on_hold'];
      if (nonTerminal.includes(s)) {
        actions.push({ label: 'Cancel',            value: 'cancelled',        class: 'spread-ao__btn--danger-outline' });
        actions.push({ label: 'Mark Failed',       value: 'failed',           class: 'spread-ao__btn--danger-outline' });
      }
      const refundable = ['confirmed', 'processing', 'on_hold', 'delivered'];
      if (refundable.includes(s)) {
        actions.push({ label: 'Issue Refund',      value: 'refund',           class: 'spread-ao__btn--danger' });
      }
      return actions;
    },
  },

  watch: {
    'content.refreshTrigger'() {
      this.resetAndLoad();
    },
    'content.accessToken': { immediate: true, handler(token) { if (token) this.checkAdminPermission(); else this.permissionGranted = false; } },
  },

  mounted() {
    this.loadOrders();
  },

  methods: {
    async checkAdminPermission() {
      const t = this.content?.accessToken, u = this.content?.userId,
            url = this.content?.supabaseUrl, k = this.content?.supabaseAnonKey;
      if (!t || !u || !url || !k) { this.permissionGranted = false; return; }
      try {
        const ALLOWED = ['founder', 'platform_admin', 'regional_manager', 'country_manager', 'support', 'picker', 'packer', 'driver'];
        const results = await Promise.all(ALLOWED.map(role =>
          fetch(`${url}/rest/v1/rpc/has_role`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: k, Authorization: `Bearer ${t}` },
            body: JSON.stringify({ p_user_id: u, p_role_key: role }),
          }).then(r => r.ok ? r.json() : false)
        ));
        this.permissionGranted = results.some(Boolean);
      } catch { this.permissionGranted = false; }
    },

    client() {
      return createSpreadClient(
        this.content?.supabaseUrl,
        this.content?.supabaseAnonKey,
        this.content?.accessToken
      );
    },

    shortId(id) {
      if (!id || id.length < 8) return id || '—';
      return id.slice(0, 8) + '…';
    },

    formatPrice(cents) {
      if (cents == null) return '—';
      return `$${(cents / 100).toFixed(2)}`;
    },

    formatDate(iso) {
      if (!iso) return '—';
      const d = new Date(iso);
      return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
    },

    formatStatus(s) {
      if (!s) return '—';
      return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    },

    debouncedLoad() {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => {
        this.currentPage = 1;
        this.loadOrders();
      }, 350);
    },

    setStatusTab(value) {
      this.filterStatus = value;
      this.currentPage = 1;
      this.loadOrders();
    },

    resetAndLoad() {
      this.currentPage = 1;
      this.loadOrders();
    },

    goPage(page) {
      this.currentPage = page;
      this.loadOrders();
    },

    async loadOrders() {
      /* wwEditor:start */
      if (this.isEditorMode) {
        this.orders = MOCK_ORDERS;
        this.totalCount = MOCK_ORDERS.length;
        this.hasMore = false;
        this.setWwOrderCount(this.totalCount);
        return;
      }
      /* wwEditor:end */

      this.loading = true;
      try {
        const params = {
          p_status: this.filterStatus || null,
          p_search: this.search.trim() || null,
          p_date_from: this.dateFrom ? new Date(this.dateFrom).toISOString() : null,
          p_date_to: this.dateTo ? new Date(this.dateTo + 'T23:59:59').toISOString() : null,
          p_limit: this.pageLimit,
          p_offset: (this.currentPage - 1) * this.pageLimit,
        };

        const result = await this.client().rpc('get_admin_orders', params);
        this.orders = result?.orders || [];
        this.totalCount = result?.total_count || 0;
        this.hasMore = result?.has_more || false;
        this.setWwOrderCount(this.totalCount);

        this.$emit('trigger-event', {
          name: 'adminorders:loaded',
          event: { totalCount: this.totalCount },
        });
      } catch (err) {
        this.orders = [];
        this.$emit('trigger-event', {
          name: 'adminorders:error',
          event: { message: err.message || 'Failed to load orders' },
        });
      } finally {
        this.loading = false;
      }
    },

    async openDetail(orderId) {
      if (this.isEditorMode) return;
      this.detail = { id: orderId };
      this.detailLoading = true;
      this.showRefundForm = false;
      try {
        const result = await this.client().rpc('get_admin_order_detail', { p_order_id: orderId });
        this.detail = result;
      } catch (err) {
        this.$emit('trigger-event', {
          name: 'adminorders:error',
          event: { message: err.message || 'Failed to load order detail' },
        });
        this.detail = null;
      } finally {
        this.detailLoading = false;
      }
    },

    closeDetail() {
      this.detail = null;
      this.showRefundForm = false;
    },

    async doAction(action) {
      if (!this.detail || this.actionLoading) return;
      const orderId = this.detail.id;

      if (action === 'refund') {
        this.showRefundForm = true;
        this.refundAmount = null;
        this.refundReason = '';
        this.refundStripeReason = '';
        return;
      }

      // All other actions are direct status transitions via update_order_status RPC
      const newStatus = action; // action values are already the target status strings
      this.actionLoading = true;
      try {
        await this.client().rpc('update_order_status', {
          p_order_id:   orderId,
          p_new_status: newStatus,
          p_note: `Admin action`,
        });

        this.$emit('trigger-event', {
          name: 'adminorders:statusChanged',
          event: { orderId, newStatus },
        });

        await this.openDetail(orderId);
        this.loadOrders();
      } catch (err) {
        this.$emit('trigger-event', {
          name: 'adminorders:error',
          event: { message: err.message || `Status change to ${newStatus} failed` },
        });
      } finally {
        this.actionLoading = false;
      }
    },

    async submitRefund() {
      if (!this.detail || this.actionLoading) return;
      this.actionLoading = true;
      try {
        const result = await this.client().edgeFunction('stripe-refund', {
          order_id: this.detail.id,
          amount: this.refundAmount || null,
          reason: this.refundReason || null,
          stripe_reason: this.refundStripeReason || null,
        });

        this.$emit('trigger-event', {
          name: 'adminorders:refunded',
          event: {
            orderId: this.detail.id,
            refundId: result.refund_id,
            amount: result.amount,
          },
        });

        this.showRefundForm = false;
        await this.openDetail(this.detail.id);
        this.loadOrders();
      } catch (err) {
        this.$emit('trigger-event', {
          name: 'adminorders:error',
          event: { message: err.message || 'Refund failed' },
        });
      } finally {
        this.actionLoading = false;
      }
    },
  },
};
</script>

<style scoped>
/* ── Design tokens ─────────────────────────────────────── */
.spread-ao {
  --spread-primary: #4B162D;
  --spread-accent: #CE6632;
  --spread-accent-hover: #B5572B;
  --spread-cream: #FBFAF8;
  --spread-black: #141414;
  --spread-dark-grey: #2B2B2B;
  --spread-mid-grey: #4B5563;
  --spread-border: #E5E7EB;
  --spread-error: #D14343;
  --spread-success: #16A34A;
  --spread-warning: #D97706;
  --spread-info: #2563EB;
  --spread-radius: 12px;
  --spread-radius-sm: 8px;

  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  color: var(--spread-black);
  background: var(--spread-cream);
  border-radius: var(--spread-radius);
  padding: 24px;
  max-width: 1440px;
  margin-inline: auto;
  box-sizing: border-box;
  position: relative;
}

/* ── Header ────────────────────────────────────────────── */
.spread-ao__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
.spread-ao__title {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  color: var(--spread-primary);
}

/* ── Buttons ───────────────────────────────────────────── */
.spread-ao__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: var(--spread-radius-sm);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.15s ease;
}
.spread-ao__btn--primary { background: var(--spread-accent); color: #fff; }
.spread-ao__btn--primary:hover { background: var(--spread-accent-hover); }
.spread-ao__btn--success { background: var(--spread-success); color: #fff; }
.spread-ao__btn--success:hover { background: #15803d; }
.spread-ao__btn--outline { background: transparent; color: var(--spread-mid-grey); border: 1px solid var(--spread-border); }
.spread-ao__btn--outline:hover { background: #f3f4f6; }
.spread-ao__btn--danger { background: var(--spread-error); color: #fff; }
.spread-ao__btn--danger:hover { background: #b91c1c; }
.spread-ao__btn--danger-outline { background: transparent; color: var(--spread-error); border: 1px solid var(--spread-error); }
.spread-ao__btn--danger-outline:hover { background: #fef2f2; }
.spread-ao__btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Status tabs ───────────────────────────────────────── */
.spread-ao__tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  border-bottom: 2px solid var(--spread-border);
  padding-bottom: 0;
}
.spread-ao__tab {
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  color: var(--spread-mid-grey);
  transition: all 0.15s;
}
.spread-ao__tab:hover { color: var(--spread-accent); }
.spread-ao__tab--active {
  color: var(--spread-accent);
  border-bottom-color: var(--spread-accent);
}

/* ── Filters ───────────────────────────────────────────── */
.spread-ao__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
.spread-ao__search {
  flex: 1;
  min-width: 200px;
  padding: 8px 12px;
  border: 1px solid var(--spread-border);
  border-radius: var(--spread-radius-sm);
  font-size: 13px;
  background: #fff;
}
.spread-ao__search:focus { outline: none; border-color: var(--spread-accent); box-shadow: 0 0 0 2px rgba(206, 102, 50, 0.15); }
.spread-ao__date {
  padding: 8px 12px;
  border: 1px solid var(--spread-border);
  border-radius: var(--spread-radius-sm);
  font-size: 13px;
  background: #fff;
}

/* ── Loading / Empty ───────────────────────────────────── */
.spread-ao__loading,
.spread-ao__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  gap: 12px;
  color: var(--spread-mid-grey);
}
.spread-ao__empty-title { font-size: 16px; font-weight: 600; margin: 0; }
.spread-ao__empty-sub { font-size: 13px; margin: 0; }
.spread-ao__spinner {
  width: 24px;
  height: 24px;
  border: 2.5px solid var(--spread-border);
  border-top-color: var(--spread-accent);
  border-radius: 50%;
  animation: spread-ao-spin 0.7s linear infinite;
}
@keyframes spread-ao-spin { to { transform: rotate(360deg); } }

/* ── Table ─────────────────────────────────────────────── */
.spread-ao__table-wrap { overflow-x: auto; }
.spread-ao__table { width: 100%; border-collapse: collapse; font-size: 13px; }
.spread-ao__th {
  text-align: left;
  padding: 10px 12px;
  font-weight: 600;
  color: var(--spread-mid-grey);
  border-bottom: 2px solid var(--spread-border);
  white-space: nowrap;
}
.spread-ao__th--num { text-align: right; }
.spread-ao__row { border-bottom: 1px solid var(--spread-border); cursor: pointer; }
.spread-ao__row:hover { background: rgba(206, 102, 50, 0.04); }
.spread-ao__td { padding: 10px 12px; vertical-align: middle; }
.spread-ao__td--num { text-align: right; }

.spread-ao__order-id {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
  color: var(--spread-primary);
  font-weight: 600;
}
.spread-ao__customer-name { display: block; font-weight: 600; color: var(--spread-black); line-height: 1.3; }
.spread-ao__customer-email { display: block; font-size: 11px; color: var(--spread-mid-grey); }

/* ── Status badge ──────────────────────────────────────── */
.spread-ao__status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  text-transform: capitalize;
}
.spread-ao__status-badge--lg { font-size: 13px; padding: 4px 12px; }
.spread-ao__status-badge--paid { background: #dbeafe; color: var(--spread-info); }
.spread-ao__status-badge--pending_payment { background: #fef3c7; color: var(--spread-warning); }
.spread-ao__status-badge--confirmed { background: #dcfce7; color: var(--spread-success); }
.spread-ao__status-badge--on_hold { background: #fef3c7; color: var(--spread-warning); }
.spread-ao__status-badge--delivered { background: #dcfce7; color: #15803d; }
.spread-ao__status-badge--cancelled { background: #fee2e2; color: var(--spread-error); }
.spread-ao__status-badge--expired { background: #f3f4f6; color: var(--spread-mid-grey); }
.spread-ao__status-badge--processing { background: #ede9fe; color: #6d28d9; }
.spread-ao__status-badge--out_for_delivery { background: #fef3c7; color: #b45309; }
.spread-ao__status-badge--failed { background: #fee2e2; color: #991b1b; }

.spread-ao__dispute-badge {
  display: inline-block;
  margin-left: 4px;
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 600;
  background: #fef3c7;
  color: var(--spread-warning);
}

/* ── Icon button ───────────────────────────────────────── */
.spread-ao__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--spread-mid-grey);
  cursor: pointer;
  transition: background 0.15s;
}
.spread-ao__icon-btn:hover { background: #f3f4f6; }

/* ── Mobile cards ──────────────────────────────────────── */
.spread-ao__cards { display: none; }
.spread-ao__card {
  background: #fff;
  border: 1px solid var(--spread-border);
  border-radius: var(--spread-radius);
  padding: 14px;
  margin-bottom: 10px;
  cursor: pointer;
}
.spread-ao__card:hover { box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); }
.spread-ao__card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.spread-ao__card-customer {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
}
.spread-ao__card-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: var(--spread-mid-grey);
}

/* ── Pagination ────────────────────────────────────────── */
.spread-ao__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding-top: 16px;
}
.spread-ao__page-info { font-size: 13px; color: var(--spread-mid-grey); }

/* ── Slide-over panel ──────────────────────────────────── */
.spread-ao__overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: flex-end;
}
.spread-ao__panel {
  background: #fff;
  width: 100%;
  max-width: 520px;
  height: 100%;
  overflow-y: auto;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
}
.spread-ao__panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--spread-border);
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 1;
}
.spread-ao__panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--spread-primary);
}
.spread-ao__panel-body {
  flex: 1;
  padding: 0;
}
.spread-ao__panel-section {
  padding: 16px 20px;
  border-bottom: 1px solid var(--spread-border);
}
.spread-ao__panel-section:last-child { border-bottom: none; }

.spread-ao__section-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--spread-primary);
  margin: 0 0 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.spread-ao__status-row { margin-bottom: 12px; }
.spread-ao__action-row { display: flex; flex-wrap: wrap; gap: 8px; }

.spread-ao__detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.spread-ao__detail-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--spread-mid-grey);
  margin-bottom: 2px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.spread-ao__mono {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 11px;
  word-break: break-all;
}

/* ── Items list ────────────────────────────────────────── */
.spread-ao__items-list { margin-bottom: 12px; }
.spread-ao__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
}
.spread-ao__item:last-child { border-bottom: none; }
.spread-ao__item-img {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  object-fit: cover;
  background: #f3f4f6;
  flex-shrink: 0;
}
.spread-ao__item-info { flex: 1; min-width: 0; }
.spread-ao__item-name { display: block; font-weight: 600; font-size: 13px; }
.spread-ao__item-meta { display: block; font-size: 11px; color: var(--spread-mid-grey); }
.spread-ao__item-total { font-weight: 600; font-size: 13px; white-space: nowrap; }

.spread-ao__totals {
  border-top: 1px solid var(--spread-border);
  padding-top: 10px;
}
.spread-ao__total-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 3px 0;
}
.spread-ao__total-row--grand {
  font-weight: 700;
  font-size: 14px;
  padding-top: 6px;
  border-top: 1px solid var(--spread-border);
  margin-top: 4px;
}

/* ── Refund history row ────────────────────────────────── */
.spread-ao__refund-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  font-size: 12px;
  border-bottom: 1px solid #f3f4f6;
  flex-wrap: wrap;
}
.spread-ao__refund-row:last-child { border-bottom: none; }

/* ── Refund form ───────────────────────────────────────── */
.spread-ao__refund-form { display: flex; flex-direction: column; gap: 12px; }
.spread-ao__form-row { display: flex; flex-direction: column; gap: 4px; }
.spread-ao__form-row label { font-size: 12px; font-weight: 600; color: var(--spread-mid-grey); }
.spread-ao__input {
  padding: 8px 12px;
  border: 1px solid var(--spread-border);
  border-radius: var(--spread-radius-sm);
  font-size: 13px;
  background: #fff;
}
.spread-ao__input:focus { outline: none; border-color: var(--spread-accent); box-shadow: 0 0 0 2px rgba(206, 102, 50, 0.15); }
.spread-ao__select {
  padding: 8px 12px;
  border: 1px solid var(--spread-border);
  border-radius: var(--spread-radius-sm);
  font-size: 13px;
  background: #fff;
}
.spread-ao__form-actions { display: flex; gap: 8px; justify-content: flex-end; }

/* ── Responsive ────────────────────────────────────────── */
@media (max-width: 768px) {
  .spread-ao { padding: 16px; }
  .spread-ao__table-wrap { display: none; }
  .spread-ao__cards { display: block; }
  .spread-ao__filters { flex-direction: column; }
  .spread-ao__search { min-width: 0; }
  .spread-ao__panel { max-width: 100%; }
  .spread-ao__detail-grid { grid-template-columns: 1fr; }
  .spread-ao__tabs { overflow-x: auto; flex-wrap: nowrap; }
}

@media (min-width: 769px) {
  .spread-ao { padding: 20px 24px; }
}
@media (max-width: 479px) {
  .spread-ao { padding: 12px; }
}
@media (min-width: 480px) {
  .spread-ao { padding: 14px; }
}
@media (min-width: 1024px) {
  .spread-ao { padding: 24px 32px; }
}
@media (min-width: 1280px) {
  .spread-ao { padding: 28px 40px; }
}
@keyframes spread-perm-spin { to { transform: rotate(360deg); } }
</style>
