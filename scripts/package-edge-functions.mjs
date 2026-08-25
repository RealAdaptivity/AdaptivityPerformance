import fs from 'fs';
import path from 'path';

const root = path.join(process.cwd(), 'supabase', 'functions');
const sharedDir = path.join(root, '_shared');

const sharedFiles = {
  'stripe.ts': fs.readFileSync(path.join(sharedDir, 'stripe.ts'), 'utf8'),
  'paypal.ts': fs.readFileSync(path.join(sharedDir, 'paypal.ts'), 'utf8'),
  'revenueSplit.ts': fs.readFileSync(path.join(sharedDir, 'revenueSplit.ts'), 'utf8'),
  'instantPayout.ts': fs.readFileSync(path.join(sharedDir, 'instantPayout.ts'), 'utf8'),
  'adminAuth.ts': fs.readFileSync(path.join(sharedDir, 'adminAuth.ts'), 'utf8'),
  'serviceArea.ts': fs.readFileSync(path.join(sharedDir, 'serviceArea.ts'), 'utf8'),
  'cancelHold.ts': fs.readFileSync(path.join(sharedDir, 'cancelHold.ts'), 'utf8'),
  'connectBranding.ts': fs.readFileSync(path.join(sharedDir, 'connectBranding.ts'), 'utf8'),
  'connectAccountRecovery.ts': fs.readFileSync(path.join(sharedDir, 'connectAccountRecovery.ts'), 'utf8'),
  'connectTransfer.ts': fs.readFileSync(path.join(sharedDir, 'connectTransfer.ts'), 'utf8'),
  'holdPricing.ts': fs.readFileSync(path.join(sharedDir, 'holdPricing.ts'), 'utf8'),
  'captureHold.ts': fs.readFileSync(path.join(sharedDir, 'captureHold.ts'), 'utf8'),
  'twilioSms.ts': fs.readFileSync(path.join(sharedDir, 'twilioSms.ts'), 'utf8'),
  'expoPush.ts': fs.readFileSync(path.join(sharedDir, 'expoPush.ts'), 'utf8'),
};

const functions = [
  { name: 'create-payment-intent', shared: ['paypal.ts', 'revenueSplit.ts'], verify_jwt: true },
  { name: 'confirm-checkout-payment', shared: ['paypal.ts'], verify_jwt: true },
  { name: 'create-connect-account', shared: ['stripe.ts', 'connectBranding.ts', 'connectAccountRecovery.ts'], verify_jwt: true },
  {
    name: 'create-booking-with-hold',
    shared: ['paypal.ts', 'revenueSplit.ts', 'serviceArea.ts', 'holdPricing.ts'],
    verify_jwt: true,
  },
  { name: 'confirm-booking-hold', shared: ['paypal.ts'], verify_jwt: true },
  {
    name: 'capture-booking-payment',
    shared: ['paypal.ts', 'revenueSplit.ts', 'captureHold.ts', 'expoPush.ts'],
    verify_jwt: true,
  },
  {
    name: 'send-sms',
    shared: ['stripe.ts', 'twilioSms.ts'],
    verify_jwt: true,
  },
  {
    name: 'send-push',
    shared: ['stripe.ts', 'expoPush.ts'],
    verify_jwt: true,
  },
  {
    name: 'add-booking-tip',
    shared: [
      'stripe.ts',
      'connectTransfer.ts',
      'connectAccountRecovery.ts',
      'revenueSplit.ts',
    ],
    verify_jwt: true,
  },
  {
    name: 'submit-booking-quote',
    shared: ['stripe.ts'],
    verify_jwt: true,
  },
  {
    name: 'approve-booking-quote',
    shared: ['stripe.ts'],
    verify_jwt: true,
  },
  {
    name: 'decline-booking-quote',
    shared: ['stripe.ts'],
    verify_jwt: true,
  },
  { name: 'trigger-instant-payout', shared: ['stripe.ts', 'instantPayout.ts', 'connectAccountRecovery.ts'], verify_jwt: true },
  { name: 'create-stripe-account-link', shared: ['stripe.ts', 'connectBranding.ts', 'connectAccountRecovery.ts'], verify_jwt: true },
  {
    name: 'attach-tech-debit-card',
    shared: ['stripe.ts', 'connectAccountRecovery.ts'],
    verify_jwt: true,
  },
  {
    name: 'create-account-session',
    shared: ['stripe.ts', 'connectAccountRecovery.ts'],
    verify_jwt: true,
  },
  { name: 'stripe-webhook', shared: ['stripe.ts', 'instantPayout.ts'], verify_jwt: false },
  {
    name: 'admin-cancel-booking-hold',
    shared: ['paypal.ts', 'adminAuth.ts', 'cancelHold.ts'],
    verify_jwt: true,
  },
  { name: 'bootstrap-admin', shared: ['stripe.ts'], verify_jwt: false },
  {
    name: 'invite-approved-tech',
    shared: ['stripe.ts', 'adminAuth.ts'],
    verify_jwt: true,
  },
  { name: 'cancel-booking-hold', shared: ['paypal.ts', 'cancelHold.ts'], verify_jwt: true },
  { name: 'reschedule-booking', shared: ['stripe.ts'], verify_jwt: true },
  {
    name: 'admin-adjust-capture',
    shared: ['stripe.ts', 'adminAuth.ts', 'revenueSplit.ts', 'connectTransfer.ts', 'connectAccountRecovery.ts'],
    verify_jwt: true,
  },
  {
    name: 'admin-refund-booking',
    shared: ['stripe.ts', 'adminAuth.ts', 'connectTransfer.ts', 'revenueSplit.ts', 'connectAccountRecovery.ts'],
    verify_jwt: true,
  },
  {
    name: 'admin-retry-transfer',
    shared: ['stripe.ts', 'adminAuth.ts', 'connectTransfer.ts', 'revenueSplit.ts', 'connectAccountRecovery.ts'],
    verify_jwt: true,
  },
];

const outDir = path.join(process.cwd(), 'supabase', '.edge-deploy');
fs.mkdirSync(outDir, { recursive: true });

for (const fn of functions) {
  const index = fs.readFileSync(path.join(root, fn.name, 'index.ts'), 'utf8');
  const files = [
    { name: 'index.ts', content: index },
    ...fn.shared.map((s) => ({ name: `_shared/${s}`, content: sharedFiles[s] })),
  ];
  const payload = {
    project_id: 'qqyairzymqpkbfxobztx',
    name: fn.name,
    entrypoint_path: 'index.ts',
    verify_jwt: fn.verify_jwt,
    files,
  };
  fs.writeFileSync(path.join(outDir, `${fn.name}.json`), JSON.stringify(payload));
}

console.log(`Wrote ${functions.length} payloads to ${outDir}`);
