import { createApp } from './app.js';

const port = Number(process.env.PORT) || 3000;
const app = createApp({ dbPath: process.env.DB_PATH || 'frame-in.db' });
app.listen(port, () => {
  const online = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  console.log(`Frame In running at http://localhost:${port}`);
  console.log(online ? 'Online payments: Razorpay enabled' : 'Online payments: off (set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET). Cash on delivery works.');
});
