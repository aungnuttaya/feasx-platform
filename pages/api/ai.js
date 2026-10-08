import gateway from '../../lib/ai/gateway.cjs';

// Day 2 scaffold: fail closed. No real auth, provider, secrets, or billing.
export const config = {api:{bodyParser:{sizeLimit:'64kb'}}};
export default gateway.createGateway();
