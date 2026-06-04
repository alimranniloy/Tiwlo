const escapeHtml = (value = '') => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
}[character] || character));

const moneyLabel = (amount, currency = 'USD') => `${String(currency || 'USD').toUpperCase()} ${Number(amount || 0).toFixed(2)}`;

const dateLabel = (value) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-US', { month: 'long', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export function receiptEmailHtml({
  title = 'Thanks for Your Order!',
  subtitle = 'Your order has been placed successfully.',
  description = "We're setting things up and will notify you once it's ready.",
  orderId = 'Processing',
  summaryTitle = 'Order Summary',
  summarySubtitle = 'Here are the details of your order.',
  rows = [],
  nextTitle = "What's Next?",
  nextDescription = 'Our team is now reviewing your order and preparing everything for you.',
  actionUrl = '',
  actionLabel = 'Go to Dashboard',
  supportUrl = '/support'
} = {}) {
  const safeRows = rows.length ? rows : [
    ['Order Date', dateLabel(new Date())],
    ['Server Configuration', 'Custom Configuration'],
    ['Order Status', 'Processing'],
    ['Ordered By', 'Account Owner'],
    ['Note', "We'll notify you once everything is ready."]
  ];
  const rowHtml = safeRows.map(([label, value], index) => {
    const isStatus = String(label || '').toLowerCase().includes('status');
    return `
      <tr>
        <td style="width:40px;padding:14px 0;border-bottom:1px solid #edf1f7;">
          <div style="width:32px;height:32px;border-radius:8px;background:#f8f9fc;color:#5f667a;text-align:center;line-height:32px;font-weight:800;">${['▦', '▤', '▣', '◌', '□'][index] || '□'}</div>
        </td>
        <td style="padding:14px 12px;border-bottom:1px solid #edf1f7;color:#48536a;font-size:13px;font-weight:800;">${escapeHtml(label)}</td>
        <td align="right" style="padding:14px 0;border-bottom:1px solid #edf1f7;color:#071437;font-size:13px;font-weight:800;">
          ${isStatus ? `<span style="display:inline-block;border-radius:8px;background:#ecfdf5;color:#059669;padding:6px 12px;">${escapeHtml(value)}</span>` : escapeHtml(value)}
        </td>
      </tr>
    `;
  }).join('');

  const actionHtml = actionUrl ? `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:26px;">
      <tr>
        <td align="center" style="padding-bottom:10px;color:#536079;font-size:13px;line-height:1.7;font-weight:600;">
          You can go to your dashboard to view your order or contact our support team if you have any questions.
        </td>
      </tr>
      <tr>
        <td align="center">
          <a href="${escapeHtml(actionUrl)}" style="display:inline-block;min-width:220px;margin:6px;padding:14px 22px;border-radius:8px;background:linear-gradient(90deg,#613cf5,#3d22de);color:#ffffff;text-decoration:none;font-size:14px;font-weight:800;">${escapeHtml(actionLabel)}</a>
          <a href="${escapeHtml(supportUrl || '/support')}" style="display:inline-block;min-width:220px;margin:6px;padding:13px 22px;border:1px solid #5b35f5;border-radius:8px;background:#ffffff;color:#071437;text-decoration:none;font-size:14px;font-weight:800;">Contact Support</a>
        </td>
      </tr>
    </table>
  ` : '';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    @media (max-width: 640px) {
      .receipt-page { padding: 28px 12px 36px !important; }
      .receipt-title { font-size: 28px !important; }
      .receipt-card { padding: 20px !important; }
      .receipt-next { display: block !important; padding: 20px !important; }
      .receipt-row-value { text-align: left !important; display: block !important; padding-top: 4px !important; }
    }
    @keyframes receipt-pulse { 0%,100% { transform: scale(1); opacity:.5; } 50% { transform: scale(1.2); opacity:1; } }
  </style>
</head>
<body style="margin:0;background:#fbfaff;color:#071437;font-family:Inter,Arial,sans-serif;">
  <div class="receipt-page" style="position:relative;overflow:hidden;padding:44px 18px 52px;background:#fbfaff;">
    <div style="position:absolute;left:-90px;top:-110px;width:360px;height:250px;border-radius:999px;background:#f0edff;"></div>
    <div style="position:absolute;right:-120px;top:290px;width:380px;height:320px;border-radius:999px;background:#f5f2ff;"></div>
    <div style="position:relative;z-index:1;max-width:900px;margin:0 auto;text-align:center;">
      <div style="position:relative;height:120px;">
        <span style="position:absolute;left:38%;top:14px;width:7px;height:7px;border-radius:99px;background:#7dd3fc;animation:receipt-pulse 1.8s infinite;"></span>
        <span style="position:absolute;left:33%;top:76px;width:6px;height:6px;border-radius:99px;background:#fb7185;animation:receipt-pulse 2.1s infinite;"></span>
        <span style="position:absolute;right:35%;top:70px;width:6px;height:6px;border-radius:99px;background:#67e8f9;animation:receipt-pulse 1.9s infinite;"></span>
        <span style="position:absolute;right:31%;top:24px;width:5px;height:5px;border-radius:99px;background:#fbbf24;animation:receipt-pulse 2.3s infinite;"></span>
        <span style="position:absolute;left:31%;top:28px;color:#f59e0b;font-size:15px;font-weight:900;">+</span>
        <span style="position:absolute;right:29%;top:92px;color:#fb7185;font-size:15px;font-weight:900;">+</span>
        <div style="position:absolute;left:50%;top:14px;transform:translateX(-50%);display:inline-grid;place-items:center;width:82px;height:82px;border-radius:999px;background:#f1edff;">
          <div style="display:grid;place-items:center;width:58px;height:58px;border-radius:999px;background:linear-gradient(135deg,#6d5dfc,#3e22e8);color:#fff;font-size:32px;font-weight:900;">✓</div>
        </div>
      </div>
      <h1 class="receipt-title" style="margin:0 0 10px;font-size:34px;line-height:1.08;letter-spacing:0;color:#071437;">${escapeHtml(title)}</h1>
      <p style="margin:0 auto;max-width:620px;color:#536079;font-size:14px;font-weight:600;line-height:1.75;">${escapeHtml(subtitle)}<br>${escapeHtml(description)}</p>
      <div style="display:inline-table;margin-top:28px;padding:12px 20px 12px 24px;border:1px solid #dcd7f2;border-radius:22px;background:rgba(255,255,255,.9);">
        <div style="display:inline-block;vertical-align:middle;text-align:center;">
          <div style="color:#5f667a;font-size:11px;font-weight:800;">Order ID</div>
          <div style="color:#4f32f5;font-size:20px;font-weight:900;">${escapeHtml(orderId)}</div>
        </div>
        <div style="display:inline-grid;place-items:center;vertical-align:middle;width:36px;height:36px;margin-left:18px;border-radius:12px;background:#f2f0ff;color:#6046f4;font-weight:900;">□</div>
      </div>
      <section class="receipt-card" style="margin-top:28px;border:1px solid #ebeef6;border-radius:8px;background:#fff;padding:28px;text-align:left;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="width:62px;vertical-align:top;"><div style="display:grid;place-items:center;width:48px;height:48px;border-radius:12px;background:#f1edff;color:#5b35f5;font-weight:900;">▤</div></td>
            <td><h2 style="margin:0;color:#071437;font-size:17px;">${escapeHtml(summaryTitle)}</h2><p style="margin:6px 0 0;color:#65738a;font-size:12px;font-weight:600;">${escapeHtml(summarySubtitle)}</p></td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;border-top:1px solid #edf1f7;">${rowHtml}</table>
      </section>
      <section class="receipt-next" style="display:flex;justify-content:space-between;gap:20px;margin-top:24px;border:1px solid #ded8fb;border-radius:8px;background:#f4f0ff;padding:26px;text-align:left;">
        <div>
          <h2 style="margin:0;color:#071437;font-size:16px;">${escapeHtml(nextTitle)}</h2>
          <p style="margin:8px 0 0;max-width:560px;color:#536079;font-size:13px;font-weight:600;line-height:1.7;">${escapeHtml(nextDescription)}</p>
        </div>
        <div style="position:relative;width:134px;min-width:134px;height:84px;">
          <span style="position:absolute;bottom:0;left:0;width:58px;height:28px;border-radius:999px;background:#fff;"></span>
          <span style="position:absolute;bottom:0;right:0;width:58px;height:28px;border-radius:999px;background:#fff;"></span>
          <div style="position:absolute;right:34px;top:0;width:68px;height:76px;border-radius:16px;background:linear-gradient(135deg,#6956f3,#24168f);padding:14px;box-sizing:border-box;">
            <i style="display:block;height:8px;margin-bottom:8px;border-radius:99px;background:rgba(255,255,255,.3);"></i>
            <i style="display:block;height:8px;margin-bottom:8px;border-radius:99px;background:rgba(255,255,255,.3);"></i>
            <i style="display:block;height:8px;border-radius:99px;background:rgba(255,255,255,.3);"></i>
          </div>
          <span style="position:absolute;right:0;top:36px;display:grid;place-items:center;width:36px;height:36px;border-radius:999px;background:#22c55e;color:#fff;font-weight:900;">✓</span>
        </div>
      </section>
      ${actionHtml}
    </div>
  </div>
</body>
</html>`;
}

export function invoiceReceiptEmailHtml({ invoice, title, message, actionUrl, supportUrl }) {
  return receiptEmailHtml({
    title: title || 'Thanks for Your Order!',
    subtitle: message || `${invoice?.number || 'Invoice'} is ready.`,
    description: `Invoice total: ${moneyLabel(invoice?.amount, invoice?.currency)}.`,
    orderId: invoice?.number || invoice?.id || 'Processing',
    summaryTitle: 'Order Summary',
    summarySubtitle: 'Here are the details of your invoice.',
    rows: [
      ['Order Date', dateLabel(invoice?.createdAt || new Date())],
      ['Server Configuration', invoice?.scope || 'Billing'],
      ['Order Status', invoice?.status || 'open'],
      ['Amount', moneyLabel(invoice?.amount, invoice?.currency)],
      ['Note', invoice?.dueDate ? `Due date: ${dateLabel(invoice.dueDate)}` : 'You will be notified if action is needed.']
    ],
    nextDescription: 'You can pay, download, or review this invoice from your dashboard. Our team will notify you if action is needed.',
    actionUrl,
    actionLabel: 'Go to Dashboard',
    supportUrl
  });
}

export function storeOrderReceiptEmailHtml({ order, store, customerName, title, subtitle, actionUrl, supportUrl }) {
  const itemCount = Array.isArray(order?.items) ? order.items.length : 0;
  return receiptEmailHtml({
    title: title || 'Thanks for Your Order!',
    subtitle: subtitle || `${store?.name || 'Store'} received your order successfully.`,
    description: "We're preparing the order and will notify you once it's ready.",
    orderId: order?.number || order?.id || 'Processing',
    summaryTitle: 'Order Summary',
    summarySubtitle: 'Here are the details of your store order.',
    rows: [
      ['Order Date', dateLabel(order?.createdAt || new Date())],
      ['Order Items', `${itemCount} item${itemCount === 1 ? '' : 's'} - ${moneyLabel(order?.total, order?.currency || store?.currency)}`],
      ['Order Status', order?.status || 'pending'],
      ['Ordered By', customerName || 'Customer'],
      ['Note', 'You will receive an update once your order is ready.']
    ],
    nextDescription: 'The store team is reviewing your order, payment, and shipping details. You will receive a notification once the order is ready to move forward.',
    actionUrl,
    actionLabel: 'Go to Dashboard',
    supportUrl
  });
}
