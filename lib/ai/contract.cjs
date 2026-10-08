class AIError extends Error {
  constructor(code, status=502) { super(code); this.code=code; this.status=status; }
}
const fields={
  report:['executive_summary','location_analysis','legal_zoning','best_recommendation','disclaimer'],
  ocr:['deed_type','notes'], gps:['estimated_location','probable_province','probable_district','notes'],
};
function validatePayload(task,payload) {
  if(!payload || typeof payload!=='object' || Array.isArray(payload)) return false;
  if(task==='report') return typeof payload.prompt==='string' && payload.prompt.trim().length>0 && payload.prompt.length<=20000;
  if(task==='ocr') return payload.image && ['image/jpeg','image/png'].includes(payload.image.mediaType) && typeof payload.image.base64==='string' && payload.image.base64.length>0 && payload.image.base64.length<=40000 && /^[A-Za-z0-9+/]+={0,2}$/.test(payload.image.base64);
  if(task==='gps') return Number.isFinite(payload.lat)&&payload.lat>=-90&&payload.lat<=90&&Number.isFinite(payload.lng)&&payload.lng>=-180&&payload.lng<=180&&(payload.areaWah===null||(Number.isFinite(payload.areaWah)&&payload.areaWah>0));
  return false;
}
function validateResult(task,result) {
  if (!fields[task] || !result || typeof result!=='object' || Array.isArray(result)) throw new AIError('INVALID_RESULT');
  const text=v=>typeof v==='string' && v.trim().length>0 && v.length<=20000;
  const list=v=>Array.isArray(v)&&v.length>0&&v.length<=30&&v.every(text);
  if (!fields[task].every(k=>text(result[k]))) throw new AIError('INVALID_RESULT');
  if(task==='report') {
    if(!['type_a','type_b','type_c'].every(k=>result[k] && ['recommendation','verdict'].every(f=>text(result[k][f])) && list(result[k].pros) && list(result[k].cons)) || !['next_steps','risk_flags'].every(k=>list(result[k]))) throw new AIError('INVALID_RESULT');
  } else {
    if(!Number.isFinite(result.ocr_confidence)||result.ocr_confidence<0||result.ocr_confidence>1) throw new AIError('INVALID_RESULT');
    for(const field of ['area_sqm','area_wah']) if(result[field]!==null && (!Number.isFinite(result[field])||result[field]<=0)) throw new AIError('INVALID_RESULT');
    if(task==='gps' && (!list(result.flags)||result.estimation_method!=='gps_pin_estimate')) throw new AIError('INVALID_RESULT');
  }
  return result;
}
module.exports={AIError,validateResult,validatePayload};
