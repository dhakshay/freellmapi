// Store identity and policy values. Everything here comes from environment variables so the owner can edit it without code changes.
export function storeConfig(env = process.env) {
  return {
    name: env.STORE_NAME || 'Frame In',
    email: env.SUPPORT_EMAIL || '',
    phone: env.SUPPORT_PHONE || '',
    address: env.STORE_ADDRESS || '',
    returnDays: Number(env.RETURN_DAYS) > 0 ? Number(env.RETURN_DAYS) : 7,
    baseUrl: (env.BASE_URL || '').replace(/\/+$/, ''),
  };
}
