import jobs from '../../../lib/ai/jobs.cjs';
// Sandbox factories are bound only by tests, never by request flags or secrets.
export const config={api:{bodyParser:{sizeLimit:'64kb'}}};
export default jobs.createJobsHandler();
