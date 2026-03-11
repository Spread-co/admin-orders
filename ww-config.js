export default {
  editor: {
    label: { en: 'Admin Orders' },
    icon: 'shopping-cart',
    categories: ['content'],
  },
  properties: {
    supabaseUrl: {
      label: { en: 'Supabase URL' },
      type: 'Text',
      bindable: true,
      defaultValue: '',
      hidden: true,
    },
    supabaseAnonKey: {
      label: { en: 'Supabase Anon Key' },
      type: 'Text',
      bindable: true,
      defaultValue: '',
      hidden: true,
    },
    accessToken: {
      label: { en: 'Auth Token' },
      type: 'Text',
      bindable: true,
      defaultValue: '',
      hidden: true,
    },
    pageSize: {
      label: { en: 'Page Size' },
      type: 'Number',
      bindable: true,
      defaultValue: 25,
    },
    refreshTrigger: {
      label: { en: 'Refresh Trigger' },
      type: 'Text',
      bindable: true,
      defaultValue: '',
      hidden: true,
    },
  },
  triggerEvents: [
    {
      name: 'adminorders:loaded',
      label: { en: 'Orders Loaded' },
      event: { totalCount: 0 },
    },
    {
      name: 'adminorders:statusChanged',
      label: { en: 'Order Status Changed' },
      event: { orderId: '', newStatus: '' },
    },
    {
      name: 'adminorders:refunded',
      label: { en: 'Refund Issued' },
      event: { orderId: '', refundId: '', amount: 0 },
    },
    {
      name: 'adminorders:error',
      label: { en: 'On Error' },
      event: { message: '' },
    },
  ],
};
