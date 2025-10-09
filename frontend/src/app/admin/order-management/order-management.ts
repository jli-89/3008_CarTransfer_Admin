import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import {
  ItemStatus,
  OrderItemRecord,
  OrderListMeta,
  OrderManagementService,
  OrderQuery,
  OrderRecord,
  OrderStatus,
  ORDER_STATUS_OPTIONS,
  UpdateItemPayload,
  UpdateOrderPayload,
  ITEM_STATUS_OPTIONS,
  CreateOrderPayload,
  CreateOrderItemPayload,
  OrderUserOption,
} from './order-management.service';
import { AuthService } from '../../auth/auth.service';

interface FiltersState {
  search: string;
  orderStatus: string;
  itemStatus: string;
  dateFrom: string;
  dateTo: string;
}

interface OrderEditForm {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  price_total: string;
  order_status: OrderStatus | '';
  note: string;
  append_note: string;      // <- 新增
  office_location: string;
  current_person: string;
  previous_person: string;
}

interface ItemEditForm {
  pickup_location: string;
  delivery_location: string;
  transfer_status: ItemStatus | '';
  transfer_note: string;
  snap_plate_number: string;
  snap_vin: string;
  snap_maker: string;
  snap_model: string;
  snap_colour: string;
  snap_vehicle_value: string;
}

interface NewOrderItemForm {
  snap_plate_number: string;
  snap_vin: string;
  snap_maker: string;
  snap_model: string;
  snap_colour: string;
  pickup_location: string;
  delivery_location: string;
  transfer_status: ItemStatus | '';
  transfer_note: string;
  snap_vehicle_value: string;
}

interface NewOrderForm {
  public_order_code: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  price_total: string;
  order_status: OrderStatus;
  note: string;
  append_note: string;      // <- 新增
  office_location: string;
  current_person: string;
  previous_person: string;
}

@Component({
  selector: 'app-order-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-management.html',
  styleUrls: ['./order-management.css']
})
export class OrderManagementComponent implements OnInit {
  orders: OrderRecord[] = [];
  meta: OrderListMeta | null = null;

  filters: FiltersState = {
    search: '',
    orderStatus: '',
    itemStatus: '',
    dateFrom: '',
    dateTo: ''
  };

  currentPage = 1;
  pageSize = 20;

  readonly orderStatusOptions = ORDER_STATUS_OPTIONS;
  itemStatusOptions: string[] = [...ITEM_STATUS_OPTIONS];
  staffOptions: OrderUserOption[] = [];

  showCreateForm = false;
  newOrderForm: NewOrderForm = this.createEmptyNewOrderForm();
  newOrderItems: NewOrderItemForm[] = [this.createEmptyNewOrderItem()];
  newOrderError: string | null = null;
  isCreatingOrder = false;

  expandedOrders = new Set<number>();

  isLoading = false;
  errorMessage: string | null = null;

  editingOrderId: number | null = null;
  orderEditForm: OrderEditForm | null = null;
  orderEditError: string | null = null;
  isSavingOrder = false;

  currentUserId: number | null = null;
  currentUserDisplay = '';

  get currentFirstContactLabel(): string {
    if (this.currentUserDisplay && this.currentUserId !== null) {
      return `${this.currentUserDisplay} (#${this.currentUserId})`;
    }
    if (this.currentUserDisplay) {
      return this.currentUserDisplay;
    }
    if (this.currentUserId !== null) {
      return `User #${this.currentUserId}`;
    }
    return 'Current user';
  }
  editingItemId: number | null = null;
  itemEditOrderId: number | null = null;
  itemEditForm: ItemEditForm | null = null;
  itemEditError: string | null = null;
  isSavingItem = false;

  constructor(private orderService: OrderManagementService, private auth: AuthService) {}

  ngOnInit(): void {
    const authUser = this.auth.getUser<any>();
    if (authUser) {
      const maybeId = Number(authUser.user_id);
      this.currentUserId = Number.isInteger(maybeId) && maybeId > 0 ? maybeId : null;
      const real = typeof authUser.real_name === 'string' ? authUser.real_name.trim() : '';
      const uname = typeof authUser.user_name === 'string' ? authUser.user_name.trim() : '';
      this.currentUserDisplay = real || uname;
    } else {
      this.currentUserId = null;
      this.currentUserDisplay = '';
    }

    this.fetchItemStatusOptions();
    this.loadStaffOptions();
    this.loadOrders();
  }

  fetchItemStatusOptions(): void {
    this.orderService.getTransferStatusOptions().subscribe({
      next: (options) => {
        if (options.length) {
          this.itemStatusOptions = options;
        }
      },
      error: () => {
        // fallback to default constant already set
      }
    });
  }

  loadStaffOptions(): void {
    this.orderService.listAssignableUsers().subscribe({
      next: (users) => {
        this.staffOptions = users;
      },
      error: () => {
        this.staffOptions = [];
      }
    });
  }

  loadOrders(): void {
    const query: OrderQuery = {
      search: this.filters.search.trim() || undefined,
      orderStatus: this.filters.orderStatus || undefined,
      itemStatus: this.filters.itemStatus || undefined,
      dateFrom: this.filters.dateFrom || undefined,
      dateTo: this.filters.dateTo || undefined,
      page: this.currentPage,
      pageSize: this.pageSize
    };

    this.isLoading = true;
    this.errorMessage = null;

    this.orderService
      .listOrders(query)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: ({ data, meta }) => {
          this.orders = data;
          this.meta = meta;
          this.currentPage = meta.page;
        },
        error: (error) => {
          this.errorMessage = this.toErrorMessage(error, 'Unable to load orders.');
          this.orders = [];
        }
      });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.expandedOrders.clear();
    this.loadOrders();
  }

  resetFilters(): void {
    this.filters = {
      search: '',
      orderStatus: '',
      itemStatus: '',
      dateFrom: '',
      dateTo: ''
    };
    this.currentPage = 1;
    this.expandedOrders.clear();
    this.loadOrders();
  }

  goToPage(page: number): void {
    if (!this.meta) {
      return;
    }
    const target = Math.min(Math.max(page, 1), this.meta.totalPages || 1);
    if (target === this.currentPage) {
      return;
    }
    this.currentPage = target;
    this.expandedOrders.clear();
    this.loadOrders();
  }

  nextPage(): void {
    if (this.meta && this.currentPage < this.meta.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  toggleOrderItems(orderId: number): void {
    if (this.expandedOrders.has(orderId)) {
      this.expandedOrders.delete(orderId);
    } else {
      this.expandedOrders.add(orderId);
    }
  }

  isOrderExpanded(orderId: number): boolean {
    return this.expandedOrders.has(orderId);
  }

  openCreateOrderForm(): void {
    this.showCreateForm = true;
    this.newOrderError = null;
    this.newOrderForm = this.createEmptyNewOrderForm();
    this.newOrderItems = [this.createEmptyNewOrderItem()];
  }

  cancelCreateOrder(): void {
    this.showCreateForm = false;
    this.newOrderError = null;
    this.newOrderForm = this.createEmptyNewOrderForm();
    this.newOrderItems = [this.createEmptyNewOrderItem()];
  }

  addNewOrderItemRow(): void {
    this.newOrderItems.push(this.createEmptyNewOrderItem());
  }

  removeNewOrderItemRow(index: number): void {
    if (this.newOrderItems.length === 1) {
      return;
    }
    this.newOrderItems.splice(index, 1);
  }
  //創建新訂單體提交
  // submitNewOrder(): void {
  //   this.newOrderError = null;

  //   const form = this.newOrderForm;
  //   const customerName = form.customer_name.trim();
  //   const customerEmail = form.customer_email.trim();
  //   const customerPhone = form.customer_phone.trim();

  //   if (!customerName || !customerEmail || !customerPhone) {
  //     this.newOrderError = 'Name, email, and phone are required.';
  //     return;
  //   }

  //   if (!this.newOrderItems.length) {
  //     this.newOrderError = 'Please add at least one item.';
  //     return;
  //   }

  //   const publicCode = form.public_order_code.trim();
  //   const price = form.price_total.trim();
  //   const note = form.note.trim();
  //   const office = form.office_location.trim();

  //   if (this.currentUserId === null) {
  //     this.newOrderError = 'Unable to determine the logged-in user for first contact.';
  //     return;
  //   }

  //   const currentPerson = this.parseUserSelectionValue(form.current_person);
  //   if (currentPerson === undefined) {
  //     this.newOrderError = 'Current handler must be a valid user.';
  //     return;
  //   }

  //   const previousPerson = this.parseUserSelectionValue(form.previous_person);
  //   if (previousPerson === undefined) {
  //     this.newOrderError = 'Previous handler must be a valid user.';
  //     return;
  //   }

  //   const items: CreateOrderItemPayload[] = [];
  //   for (let i = 0; i < this.newOrderItems.length; i += 1) {
  //     const item = this.newOrderItems[i];
  //     const plate = item.snap_plate_number.trim();
  //     const vin = item.snap_vin.trim();
  //     const maker = item.snap_maker.trim();
  //     const model = item.snap_model.trim();
  //     const colour = item.snap_colour.trim();
  //     const pickup = item.pickup_location.trim();
  //     const delivery = item.delivery_location.trim();
  //     const status = item.transfer_status;

  //     if (!plate || !vin || !maker || !model || !colour || !pickup || !delivery || !status) {
  //       this.newOrderError = `Item #${i + 1} is missing required fields.`;
  //       return;
  //     }

  //     const vehicleValue = item.snap_vehicle_value.trim();
  //     if (vehicleValue && Number.isNaN(Number(vehicleValue))) {
  //       this.newOrderError = `Vehicle value for item #${i + 1} must be numeric.`;
  //       return;
  //     }

  //     items.push({
  //       snap_plate_number: plate,
  //       snap_vin: vin,
  //       snap_maker: maker,
  //       snap_model: model,
  //       snap_colour: colour,
  //       pickup_location: pickup,
  //       delivery_location: delivery,
  //       transfer_status: status as ItemStatus,
  //       transfer_note: item.transfer_note.trim() ? item.transfer_note.trim() : undefined,
  //       snap_vehicle_value: vehicleValue ? vehicleValue : undefined,
  //     });
  //   }

  //   const payload: CreateOrderPayload = {
  //     customer_name: customerName,
  //     customer_email: customerEmail,
  //     customer_phone: customerPhone,
  //     order_status: form.order_status,
  //     items,
  //   };

  //   if (publicCode) {
  //     payload.public_order_code = publicCode;
  //   }
  //   payload.price_total = price ? price : undefined;
  //   payload.note = note ? note : undefined;
  //   payload.office_location = office ? office : undefined;
  //   payload.current_person = currentPerson;
  //   payload.previous_person = previousPerson;

    
  //   // ✅ 放這裡：送出前看見完整 payload
  //   console.log('[orders] create payload', payload);  //console.log

  //   this.isCreatingOrder = true;

  //   this.orderService
  //     .createOrder(payload)
  //     .pipe(finalize(() => (this.isCreatingOrder = false)))
  //     .subscribe({
  //       next: () => {
  //         console.log('[orders] create success'); // 可選 console.log
  //         this.cancelCreateOrder();
  //         this.loadOrders();
  //       },
  //       error: (error) => {
  //         this.newOrderError = this.toErrorMessage(error, 'Failed to create order.');
  //       }
  //     });
  // }


  // ---------- 3) submitNewOrder() 修改 ----------
submitNewOrder(): void {
  this.newOrderError = null;

  const form = this.newOrderForm;
  const customerName = form.customer_name.trim();
  const customerEmail = form.customer_email.trim();
  const customerPhone = form.customer_phone.trim();

  if (!customerName || !customerEmail || !customerPhone) {
    this.newOrderError = 'Name, email, and phone are required.';
    return;
  }

  if (!this.newOrderItems.length) {
    this.newOrderError = 'Please add at least one item.';
    return;
  }

  const publicCode = form.public_order_code.trim();
  const price = form.price_total.trim();
  const office = form.office_location.trim();
  const appendText = (form.append_note || '').trim();

  if (this.currentUserId === null) {
    this.newOrderError = 'Unable to determine the logged-in user for first contact.';
    return;
  }

  const currentPerson = this.parseUserSelectionValue(form.current_person);
  if (currentPerson === undefined) {
    this.newOrderError = 'Current handler must be a valid user.';
    return;
  }

  const previousPerson = this.parseUserSelectionValue(form.previous_person);
  if (previousPerson === undefined) {
    this.newOrderError = 'Previous handler must be a valid user.';
    return;
  }

  const items: CreateOrderItemPayload[] = [];
  for (let i = 0; i < this.newOrderItems.length; i += 1) {
    const item = this.newOrderItems[i];
    const plate = item.snap_plate_number.trim();
    const vin = item.snap_vin.trim();
    const maker = item.snap_maker.trim();
    const model = item.snap_model.trim();
    const colour = item.snap_colour.trim();
    const pickup = item.pickup_location.trim();
    const delivery = item.delivery_location.trim();
    const status = item.transfer_status;

    if (!plate || !vin || !maker || !model || !colour || !pickup || !delivery || !status) {
      this.newOrderError = `Item #${i + 1} is missing required fields.`;
      return;
    }

    const vehicleValue = item.snap_vehicle_value.trim();
    if (vehicleValue && Number.isNaN(Number(vehicleValue))) {
      this.newOrderError = `Vehicle value for item #${i + 1} must be numeric.`;
      return;
    }

    items.push({
      snap_plate_number: plate,
      snap_vin: vin,
      snap_maker: maker,
      snap_model: model,
      snap_colour: colour,
      pickup_location: pickup,
      delivery_location: delivery,
      transfer_status: status as ItemStatus,
      transfer_note: item.transfer_note.trim() ? item.transfer_note.trim() : undefined,
      snap_vehicle_value: vehicleValue ? vehicleValue : undefined,
    });
  }

  const payload: CreateOrderPayload = {
    customer_name: customerName,
    customer_email: customerEmail,
    customer_phone: customerPhone,
    order_status: form.order_status,
    items,
    // set the first_contact to current logged-in user as required
    first_contact: this.currentUserId,
  };

  if (publicCode) payload.public_order_code = publicCode;
  payload.price_total = price ? price : undefined;
  payload.office_location = office ? office : undefined;
  payload.current_person = currentPerson;
  payload.previous_person = previousPerson;

   // Only include note when user actually provided append text.
  if (appendText) {
    const actor = this.currentUserDisplay ? `${this.currentUserDisplay}` : (this.currentUserId ? `User #${this.currentUserId}` : 'Unknown');
    payload.note = this.makeNoteAppendEntry(actor, appendText);
  }

  console.log('[orders] create payload', payload);

  this.isCreatingOrder = true;
  this.orderService.createOrder(payload)
    .pipe(finalize(() => (this.isCreatingOrder = false)))
    .subscribe({
      next: () => {
        console.log('[orders] create success');
        // clear append field in form explicitly (in case cancelCreateOrder doesn't)
      if (this.newOrderForm) this.newOrderForm.append_note = '';
      this.loadOrders();
      },
      error: (error) => {
        this.newOrderError = this.toErrorMessage(error, 'Failed to create order.');
      },
    });
}








  openOrderEdit(order: OrderRecord): void {
    this.editingOrderId = order.order_id;
    this.orderEditError = null;
    this.orderEditForm = {
      customer_name: order.customer_name || '',
      customer_email: order.customer_email || '',
      customer_phone: order.customer_phone || '',
      price_total: this.toDecimalString(order.price_total),
      order_status: order.order_status,
      // keep existing note available for readonly display only
      note: order.note || '',
      append_note: '',      // <- 新增 // user can add text here which will be appended (not overwrite)
      office_location: order.office_location || '',
      current_person: order.current_person ? String(order.current_person) : '',
      previous_person: order.previous_person ? String(order.previous_person) : '',
    };
  }

  // ---------- helper functions (加入到 class 中，如果已存在請合併) ----------
  private pad2(n: number): string { return String(n).padStart(2, '0'); }

  private formatLocalTimestamp(d: Date): string {
    // 產生 'YYYY-MM-DD HH:mm:ss'（本地時間）
    return `${d.getFullYear()}-${this.pad2(d.getMonth() + 1)}-${this.pad2(d.getDate())} ${this.pad2(d.getHours())}:${this.pad2(d.getMinutes())}:${this.pad2(d.getSeconds())}`;
  }
// 把 userLabel 與純文字組成一行 entry
  private makeNoteAppendEntry(userLabel: string, text: string): string {
    const ts = this.formatLocalTimestamp(new Date());
    // e.g. [2025-10-10 14:32:05] Alice Lee: added text
    return `[${ts}] ${userLabel}: ${text}`;
  }

  // 取得目前使用者 label（你已經用 currentUserDisplay/currentUserId）
  private getActorLabel(): string {
    if (this.currentUserDisplay && this.currentUserId !== null) return `${this.currentUserDisplay}`;
    if (this.currentUserDisplay) return this.currentUserDisplay;
    if (this.currentUserId !== null) return `User #${this.currentUserId}`;
    return 'Unknown';
  }

    // 比較 order 舊值 (OrderRecord) 與 UI form (OrderEditForm) → 回傳陣列 of change strings
  private buildOrderDiffs(oldOrder: OrderRecord, form: OrderEditForm): string[] {
    const diffs: string[] = [];

    // 字串比較：name / email / phone
    if ((form.customer_name || '').trim() !== (oldOrder.customer_name || '').trim()) {
      diffs.push(`Customer name: "${oldOrder.customer_name || ''}" → "${form.customer_name.trim()}"`);
    }
    if ((form.customer_email || '').trim() !== (oldOrder.customer_email || '').trim()) {
      diffs.push(`Customer email: "${oldOrder.customer_email || ''}" → "${form.customer_email.trim()}"`);
    }
    if ((form.customer_phone || '').trim() !== (oldOrder.customer_phone || '').trim()) {
      diffs.push(`Customer phone: "${oldOrder.customer_phone || ''}" → "${form.customer_phone.trim()}"`);
    }

    // price_total (使用 toDecimalString 比較)
    const newPrice = form.price_total.trim();
    const oldPrice = this.toDecimalString(oldOrder.price_total);
    if (newPrice !== oldPrice) {
      diffs.push(`Price: "${oldPrice || '0.00'}" → "${newPrice || '0.00'}"`);
    }

    // order_status
    if ((form.order_status || '') !== (oldOrder.order_status || '')) {
      diffs.push(`Status: "${oldOrder.order_status || ''}" → "${form.order_status || ''}"`);
    }

    // office location
    if ((form.office_location || '').trim() !== (oldOrder.office_location || '').trim()) {
      diffs.push(`Office location: "${oldOrder.office_location || ''}" → "${form.office_location.trim()}"`);
    }

    // handlers (current / previous) — compare numeric IDs and show labels
    const oldCurrent = oldOrder.current_person ?? null;
    const newCurrent = form.current_person ? Number(form.current_person) : null;
    if (String(oldCurrent) !== String(newCurrent)) {
      diffs.push(`Current handler: "${this.getUserLabelById(oldCurrent)}" → "${this.getUserLabelById(newCurrent)}"`);
    }

    const oldPrev = oldOrder.previous_person ?? null;
    const newPrev = form.previous_person ? Number(form.previous_person) : null;
    if (String(oldPrev) !== String(newPrev)) {
      diffs.push(`Previous handler: "${this.getUserLabelById(oldPrev)}" → "${this.getUserLabelById(newPrev)}"`);
    }

    // 你可以在這裡加入更多欄位比較，例如: public_order_code, customer_note (we don't allow editing), etc.

    return diffs;
  }

  private getUserLabelById(id: number | null | undefined): string {
    if (id === null || id === undefined || id === 0) return 'Unassigned';

    // staffOptions 裡面可能的欄位名稱不一定相同（OrderUserOption），
    // 我們用寬鬆的檢查來找到最合適的顯示名稱。
    const found = this.staffOptions.find(s => {
      // common id fields: user_id, id
      const sid = (s as any).user_id ?? (s as any).id;
      return (sid !== undefined && Number(sid) === Number(id));
    });

    if (!found) {
      // fallback label
      return `User #${id}`;
    }

    // 試著找一個能顯示的名字，順序由最友善到最原始
    const f = found as any;
    return (
      f.display_name ||
      f.real_name ||
      f.full_name ||
      f.user_name ||
      f.name ||
      f.email ||
      // fallback to id fields if none of above
      String(f.user_id ?? f.id ?? id)
    );
  }

  cancelOrderEdit(): void {
    this.editingOrderId = null;
    this.orderEditForm = null;
    this.orderEditError = null;
  }

//   saveOrderEdit(order: OrderRecord): void {
//     if (!this.orderEditForm) {
//       return;
//     }

//     const form = this.orderEditForm;
//     const customerName = form.customer_name.trim();
//     const customerEmail = form.customer_email.trim();
//     const customerPhone = form.customer_phone.trim();
//     const status = form.order_status;
// //可能是導致我bug（不能成功save新的note）的原因
//     if (!customerName || !customerEmail || !customerPhone || !status) {
//       this.orderEditError = 'Name, email, phone, and status are required.';
//       return;
//     }

//     const payload: UpdateOrderPayload = {
//       customer_name: customerName,
//       customer_email: customerEmail,
//       customer_phone: customerPhone,
//       order_status: status,
//     };

//     const price = form.price_total.trim();
//     payload.price_total = price ? price : null;
// //可能是導致我bug的原因
//     const newNote = form.note.trim();
//     const note = form.note.trim();
//     const oldNote = (order.note ?? '').trim();
//     if (newNote !== oldNote) {
//       payload.note = note ? note : null;
//     }

//     const office = form.office_location.trim();
//     payload.office_location = office ? office : null;


//     const currentPerson = this.parseUserSelectionValue(form.current_person);
//     if (currentPerson === undefined) {
//       this.orderEditError = 'Current handler must be a valid user.';
//       return;
//     }
//     payload.current_person = currentPerson;

//     const previousPerson = this.parseUserSelectionValue(form.previous_person);
//     if (previousPerson === undefined) {
//       this.orderEditError = 'Previous handler must be a valid user.';
//       return;
//     }
//     payload.previous_person = previousPerson;

//     // ✅ 放這裡：送出前看見完整 payload
//     console.log('[orders] update payload', { orderId: order.order_id, payload });

//     this.isSavingOrder = true;
//     this.orderEditError = null;

//     this.orderService
//       .updateOrder(order.order_id, payload)
//       .pipe(finalize(() => (this.isSavingOrder = false)))
//       .subscribe({
//         next: (updated) => {
//           console.log('[orders] update success', updated); // 可選  console.log
//           this.orders = this.orders.map((existing) =>
//             existing.order_id === updated.order_id ? updated : existing
//           );
//           this.editingOrderId = null;
//           this.orderEditForm = null;
//         },
//         error: (error) => {
//           console.error('[orders] update error', error); // 可選  console.log
//           this.orderEditError = this.toErrorMessage(error, 'Failed to update order.');
//         }
//       });
//   }









// ---------- 4) saveOrderEdit() 修改 ----------
saveOrderEdit(order: OrderRecord): void {
  if (!this.orderEditForm) return;

  const form = this.orderEditForm;
  const customerName = form.customer_name.trim();
  const customerEmail = form.customer_email.trim();
  const customerPhone = form.customer_phone.trim();
  const status = form.order_status;

  if (!customerName || !customerEmail || !customerPhone || !status) {
    this.orderEditError = 'Name, email, phone, and status are required.';
    return;
  }
  // 建基本 payload
  const payload: UpdateOrderPayload = {
    customer_name: customerName,
    customer_email: customerEmail,
    customer_phone: customerPhone,
    order_status: status,
  };

  const price = form.price_total.trim();
  payload.price_total = price ? price : null;

  const appendText = (form.append_note || '').trim();
  if (appendText) {
    const actor = this.currentUserDisplay ? `${this.currentUserDisplay}` : (this.currentUserId ? `User #${this.currentUserId}` : 'Unknown');
    const entry = this.makeNoteAppendEntry(actor, appendText);
    const existing = order.note || '';
    payload.note = existing ? (existing + '\n' + entry) : entry;
  }

  const office = form.office_location.trim();
  payload.office_location = office ? office : null;

  const currentPerson = this.parseUserSelectionValue(form.current_person);
  if (currentPerson === undefined) {
    this.orderEditError = 'Current handler must be a valid user.';
    return;
  }
  payload.current_person = currentPerson;

  const previousPerson = this.parseUserSelectionValue(form.previous_person);
  if (previousPerson === undefined) {
    this.orderEditError = 'Previous handler must be a valid user.';
    return;
  }
  payload.previous_person = previousPerson;

    // ----- NEW: build diffs and append to note -----
  const diffs = this.buildOrderDiffs(order, form);
  const appendTextFromForm = (form.append_note || '').trim(); // if user also typed an append_message
  if (diffs.length || appendTextFromForm) {
    // 把自動產生的 diffs 與使用者輸入的 append_note 合併成一個描述
    const combinedParts: string[] = [];
    if (diffs.length) combinedParts.push(diffs.join('; '));
    if (appendTextFromForm) combinedParts.push(appendTextFromForm);
    const actor = this.getActorLabel();
    const entry = this.makeNoteAppendEntry(actor, combinedParts.join(' ; '));

    const existing = order.note || '';
    payload.note = existing ? (existing + '\n' + entry) : entry;
  }
  // ----- END NEW -----

  console.log('[orders] update payload', { orderId: order.order_id, payload });

  this.isSavingOrder = true;
  this.orderService.updateOrder(order.order_id, payload)
    .pipe(finalize(() => (this.isSavingOrder = false)))
    .subscribe({
      next: (updated) => {
        // 更新 local orders
        console.log('[orders] update success', updated);
        this.orders = this.orders.map((existing) =>
          existing.order_id === updated.order_id ? updated : existing
        );
        this.orderEditForm = null;
      },
      error: (error) => {
        console.error('[orders] update error', error);
        this.orderEditError = this.toErrorMessage(error, 'Failed to update order.');
      },
    });
}


  openItemEdit(order: OrderRecord, item: OrderItemRecord): void {
    this.editingItemId = item.item_id;
    this.itemEditOrderId = order.order_id;
    this.itemEditError = null;

    this.itemEditForm = {
      pickup_location: item.pickup_location || '',
      delivery_location: item.delivery_location || '',
      transfer_status: item.transfer_status || '',
      transfer_note: item.transfer_note || '',
      snap_plate_number: item.snap_plate_number || '',
      snap_vin: item.snap_vin || '',
      snap_maker: item.snap_maker || '',
      snap_model: item.snap_model || '',
      snap_colour: item.snap_colour || '',
      snap_vehicle_value: this.toDecimalString(item.snap_vehicle_value),
    };
  }

  cancelItemEdit(): void {
    this.editingItemId = null;
    this.itemEditOrderId = null;
    this.itemEditForm = null;
    this.itemEditError = null;
  }

  saveItemEdit(order: OrderRecord, item: OrderItemRecord): void {
    if (!this.itemEditForm) {
      return;
    }

    const form = this.itemEditForm;
    const pickup = form.pickup_location.trim();
    const delivery = form.delivery_location.trim();
    const status = form.transfer_status;

    if (!pickup || !delivery || !status) {
      this.itemEditError = 'Pickup, delivery, and status are required.';
      return;
    }

    const value = form.snap_vehicle_value.trim();
    if (value && Number.isNaN(Number(value))) {
      this.itemEditError = 'Vehicle value must be numeric.';
      return;
    }

    const payload: UpdateItemPayload = {
      pickup_location: pickup,
      delivery_location: delivery,
      transfer_status: status,
      transfer_note: form.transfer_note.trim() ? form.transfer_note.trim() : null,
      snap_plate_number: form.snap_plate_number.trim() ? form.snap_plate_number.trim() : null,
      snap_vin: form.snap_vin.trim() ? form.snap_vin.trim() : null,
      snap_maker: form.snap_maker.trim() ? form.snap_maker.trim() : null,
      snap_model: form.snap_model.trim() ? form.snap_model.trim() : null,
      snap_colour: form.snap_colour.trim() ? form.snap_colour.trim() : null,
      snap_vehicle_value: value ? value : null,
    };

    this.isSavingItem = true;
    this.itemEditError = null;

    // 範例：在 saveItemEdit 成功後，前端把一條 entry append 到 order.note，然後呼叫 updateOrder
    // this.orderService
    //   .updateItem(item.item_id, payload)
    //   .pipe(finalize(() => (this.isSavingItem = false)))
    //   .subscribe({
    //     next: (updatedItem) => {
          
    //     // 1) 更新 local orders view（你已有）
    //     // 2) 產生一條 note entry
    //       const actor = this.getActorLabel();
    //       const entryText = `Updated item ${updatedItem.item_id} - status: ${updatedItem.transfer_status}`;
    //       const entry = this.makeNoteAppendEntry(actor, entryText);
         
    //       // 3) 把 entry 串到該訂單的 existing note，然後呼叫 updateOrder
    //       const orderId = updatedItem.order_id;
    //       const order = this.orders.find(o => o.order_id === orderId);
    //       const existingNote = order?.note || '';
    //       const newNote = existingNote ? (existingNote + '\n' + entry) : entry;
          
    //       // 4) 呼叫 updateOrder（注意：若 server 允許直接覆寫 note）
    //       const orderPayload: UpdateOrderPayload = { note: newNote };

    //       this.orders = this.orders.map((existing) => {
    //         if (existing.order_id !== updatedItem.order_id) {
    //           return existing;
    //         }
    //         const updatedItems = existing.items.map((existingItem) =>
    //           existingItem.item_id === updatedItem.item_id ? updatedItem : existingItem
    //         );
    //         return { ...existing, items: updatedItems };
    //       });
    //       this.cancelItemEdit();
    //     },
    //     error: (error) => {
    //       this.itemEditError = this.toErrorMessage(error, 'Failed to update item.');
    //     }
    //   });

    this.orderService
  .updateItem(item.item_id, payload)
  .pipe(finalize(() => (this.isSavingItem = false)))
  .subscribe({
    next: (updatedItem) => {
      // 1) optimistic update local items (UI immediate feedback)
      this.orders = this.orders.map((existing) => {
        if (existing.order_id !== updatedItem.order_id) {
          return existing;
        }
        const updatedItems = existing.items.map((existingItem) =>
          existingItem.item_id === updatedItem.item_id ? updatedItem : existingItem
        );
        return { ...existing, items: updatedItems };
      });

      // 2) create a timestamped entry describing the change
      const actor = this.getActorLabel(); // 需在 class 中有此 helper
      const entryText = `Updated item ${updatedItem.item_id} - status: ${updatedItem.transfer_status}`;
      const entry = this.makeNoteAppendEntry(actor, entryText);

      // 3) build new note from current local order.note (best-effort)
      const orderId = updatedItem.order_id;
      const order = this.orders.find(o => o.order_id === orderId);
      const existingNote = order?.note || '';
      const newNote = existingNote ? (existingNote + '\n' + entry) : entry;

      // 4) call updateOrder to persist appended note (server must accept note)
      const orderPayload: UpdateOrderPayload = { note: newNote };

      // Wait for updateOrder result before finalizing edit (so we can show errors)
      this.orderService.updateOrder(orderId, orderPayload)
        .pipe(finalize(() => {
          // close item edit UI regardless; change this if you prefer different UX
          this.cancelItemEdit();
        }))
        .subscribe({
          next: (updatedOrder) => {
            // replace local order with server-returned order (contains latest note)
            this.orders = this.orders.map(o =>
              o.order_id === updatedOrder.order_id ? updatedOrder : o
            );
          },
          error: (err) => {
            console.error('Failed to append note after item update', err);
            this.itemEditError = this.toErrorMessage(err, 'Failed to append note to order.');
            // local items remain updated (optimistic). If you want to rollback, implement extra logic.
          }
        });
    },
    error: (error) => {
      this.itemEditError = this.toErrorMessage(error, 'Failed to update item.');
    }
  });

  }

  trackByOrderId(_: number, order: OrderRecord): number {
    return order.order_id;
  }

  trackByItemId(_: number, item: OrderItemRecord): number {
    return item.item_id;
  }

  private createEmptyNewOrderForm(): NewOrderForm {
    return {
      public_order_code: '',
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      price_total: '',
      order_status: this.orderStatusOptions[0] ?? 'AwaitingManualQuote',
      note: '',
      append_note: '',      // <- 新增
      office_location: '',
      current_person: '',
      previous_person: '',
    };
  }

  private createEmptyNewOrderItem(): NewOrderItemForm {
    return {
      snap_plate_number: '',
      snap_vin: '',
      snap_maker: '',
      snap_model: '',
      snap_colour: '',
      pickup_location: '',
      delivery_location: '',
      transfer_status: '',
      transfer_note: '',
      snap_vehicle_value: '',
    };
  }

  private parseUserSelectionValue(value: string): number | null | undefined {
    if (!value) {   
      return null;      // 空字串 → null（允許「未指派」）
    }
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return undefined;   // 真不合法才擋
    }
    return parsed;
  }

  private toDecimalString(value: number | null | undefined): string {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value.toFixed(2);
    }
    return '';
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object') {
      const maybeHttp = error as { error?: { error?: string; message?: string }; message?: string };
      return (
        maybeHttp.error?.error ||
        maybeHttp.error?.message ||
        maybeHttp.message ||
        fallback
      );
    }
    return fallback;
  }
}





