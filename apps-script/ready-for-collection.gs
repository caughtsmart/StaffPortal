/**
 * "Your order is ready to collect" email — Google Apps Script.
 *
 * The staff portal calls this when someone presses the Ready button. It sends
 * the customer an email from your Google account.
 *
 * HOW TO SET IT UP
 *  1. Go to script.google.com and choose New project.
 *  2. Delete whatever is in the editor and paste this whole file in.
 *  3. Change the three settings just below to suit.
 *  4. Click Deploy > New deployment > type: Web app.
 *       Execute as:    Me
 *       Who has access: Anyone
 *     ("Anyone" is needed because the portal's server calls it, not a person.
 *      The SHARED_SECRET below is what actually keeps strangers out.)
 *  5. Copy the web app address it gives you.
 *  6. In Cloudflare Pages > Settings > Environment variables, add:
 *       READY_EMAIL_URL     = the web app address
 *       READY_EMAIL_SECRET  = the same text as SHARED_SECRET below
 *  7. Redeploy the site (Deployments > Retry deployment) so it picks them up.
 */

// ---- Settings ------------------------------------------------------------

// Make this a long random phrase and keep it identical to READY_EMAIL_SECRET
// in Cloudflare. Anyone who knows it could send emails as you, so treat it
// like a password.
var SHARED_SECRET = 'change-me-to-something-long-and-random';

var SHOP_NAME = 'Loaded Dice';
var SHOP_ADDRESS = '28 Holton Road, Barry, Vale of Glamorgan, CF63 4HD';
var SHOP_PHONE = '01446 789 088';

// When customers can come and collect. Closed Monday is spelled out on purpose —
// "Tuesday to Saturday" alone leaves people to work that out for themselves.
var SHOP_HOURS = [
  'Tuesday to Saturday: 10.30am - 4.30pm',
  'Sunday: 11am - 3pm',
  'Closed Mondays'
];
var REPLY_TO = 'info@loadeddice.uk';

// -------------------------------------------------------------------------

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    if (body.secret !== SHARED_SECRET) {
      return reply({ ok: false, error: 'Wrong secret.' });
    }
    if (!body.email) {
      return reply({ ok: false, error: 'No email address given.' });
    }

    var firstName = String(body.customer || '').split(' ')[0] || 'there';
    var orderNumber = body.orderNumber || '';
    var items = body.items || [];

    MailApp.sendEmail({
      to: body.email,
      replyTo: REPLY_TO,
      name: SHOP_NAME,
      subject: 'Your ' + SHOP_NAME + ' order ' + orderNumber + ' is ready to collect',
      body: plainTextEmail(firstName, orderNumber, items),
      htmlBody: htmlEmail(firstName, orderNumber, items)
    });

    return reply({ ok: true });
  } catch (error) {
    return reply({ ok: false, error: String(error) });
  }
}

function reply(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function itemLines(items) {
  return items.map(function (i) { return '- ' + i.quantity + ' x ' + i.name; }).join('\n');
}

function plainTextEmail(firstName, orderNumber, items) {
  return [
    'Hi ' + firstName + ',',
    '',
    'Good news — your order ' + orderNumber + ' is packed and waiting for you at ' + SHOP_NAME + '.',
    '',
    'Your order:',
    itemLines(items),
    '',
    'Where to find us:',
    SHOP_ADDRESS,
    'Phone: ' + SHOP_PHONE,
    '',
    'Opening hours:',
    SHOP_HOURS.join('\n'),
    '',
    'Just give your order number at the counter and we will grab it for you.',
    '',
    'See you soon,',
    'The ' + SHOP_NAME + ' team'
  ].join('\n');
}

function htmlEmail(firstName, orderNumber, items) {
  var rows = items.map(function (i) {
    return '<tr>' +
      '<td style="padding:6px 12px 6px 0;color:#333333;">' + escapeHtml(i.name) + '</td>' +
      '<td style="padding:6px 0;color:#666666;white-space:nowrap;">x ' + escapeHtml(i.quantity) + '</td>' +
      '</tr>';
  }).join('');

  return '' +
    '<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;' +
    'font-size:16px;line-height:1.6;color:#333333;max-width:560px;">' +
      '<div style="border-top:4px solid #fbad36;padding-top:18px;">' +
        '<h1 style="font-size:20px;margin:0 0 14px;">Your order is ready to collect</h1>' +
        '<p style="margin:0 0 14px;">Hi ' + escapeHtml(firstName) + ',</p>' +
        '<p style="margin:0 0 18px;">Good news — order <strong>' + escapeHtml(orderNumber) +
          '</strong> is packed and waiting for you at ' + escapeHtml(SHOP_NAME) + '.</p>' +
        '<table style="border-collapse:collapse;margin:0 0 18px;">' + rows + '</table>' +
        '<p style="margin:0 0 6px;"><strong>Where to find us</strong></p>' +
        '<p style="margin:0 0 18px;color:#555555;">' + escapeHtml(SHOP_ADDRESS) + '<br>' +
          'Phone: ' + escapeHtml(SHOP_PHONE) + '</p>' +
        '<p style="margin:0 0 6px;"><strong>Opening hours</strong></p>' +
        '<p style="margin:0 0 18px;color:#555555;">' +
          SHOP_HOURS.map(escapeHtml).join('<br>') + '</p>' +
        '<p style="margin:0 0 18px;">Just give your order number at the counter and we will grab it for you.</p>' +
        '<p style="margin:0;color:#555555;">See you soon,<br>The ' + escapeHtml(SHOP_NAME) + ' team</p>' +
      '</div>' +
    '</div>';
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
