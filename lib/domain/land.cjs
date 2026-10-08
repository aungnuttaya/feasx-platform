// Bare numbers use square wah for compatibility. Invalid input returns a
// marked zero area; callers must not treat this as a valid feasibility input.
function parseLandSize(raw) {
  const invalid = () => ({land_size_wah:0, land_size_sqm:0, valid:false});
  if(!['string','number'].includes(typeof raw)) return invalid();
  const s = String(raw).trim().toLowerCase();
  const number = '(?:\\d+(?:\\.\\d+)?)';
  let wah;
  const compound = s.match(/^(\d+)-(\d+)-(\d+(?:\.\d+)?)$/);
  if (compound) {
    const [, rai, ngan, remainder] = compound.map(Number);
    if (ngan >= 4 || remainder >= 100) return invalid();
    wah = rai * 400 + ngan * 100 + remainder;
  } else {
    const thai = s.match(new RegExp(`^(?:(${number})\\s*ไร่\\s*)?(?:(${number})\\s*งาน\\s*)?(?:(${number})\\s*(?:ตร\\.?\\s*ว\\.?|ตารางวา)\\s*)?$`));
    if (thai && thai.slice(1).some(v => v !== undefined)) {
      wah = Number(thai[1] || 0)*400 + Number(thai[2] || 0)*100 + Number(thai[3] || 0);
    } else {
      const unit = s.match(new RegExp(`^(${number})\\s*(sq\\.?w|ตร\\.?\\s*ม\\.?|ตารางเมตร|sqm|m2)?$`));
      if (!unit) return invalid();
      wah = Number(unit[1]) / (unit[2] && !/^sq\.?w$/.test(unit[2]) ? 4 : 1);
    }
  }
  if (!Number.isFinite(wah) || wah <= 0 || wah > Number.MAX_SAFE_INTEGER / 4) return invalid();
  const sqm=+(wah*4).toFixed(2);
  if(sqm<=0) return invalid();
  return {land_size_wah:+wah.toFixed(2), land_size_sqm:sqm, valid:true};
}

// Type A is project profit / total cost, not an annual return.
// Types B/C are estimated annual gross income / total cost, before expenses.
const METRICS = Object.freeze({Type_A_ROI:'project_margin_percent', Type_B_ROI:'annual_gross_yield_percent', Type_C_ROI:'annual_gross_yield_percent'});
function calcROI({land_size_sqm, far_ratio, road_width_m, zoning_color, price_baht}) {
  if (![land_size_sqm,far_ratio,road_width_m,price_baht].every(Number.isFinite) || land_size_sqm <= 0 || far_ratio <= 0 || road_width_m < 0 || price_baht < 0 || typeof zoning_color !== 'string') {
    return {GFA_Max:0,Type_A_ROI:0,Type_B_ROI:0,Type_C_ROI:null,Type_C_Block:'ข้อมูลพื้นที่หรือสมมติฐานไม่ถูกต้อง',valid:false};
  }
  const gfa = land_size_sqm * far_ratio;
  if(!Number.isFinite(gfa) || gfa > Number.MAX_SAFE_INTEGER/140000 || price_baht>Number.MAX_SAFE_INTEGER) return {GFA_Max:0,Type_A_ROI:0,Type_B_ROI:0,Type_C_ROI:null,Type_C_Block:'สมมติฐานเกินช่วงที่รองรับ',valid:false};
  const red = zoning_color.startsWith('แดง'), orange = zoning_color.startsWith('ส้ม');
  const cA=gfa*45000+price_baht, revenue=gfa*0.8*(red?140000:orange?100000:70000);
  const cB=gfa*25000+price_baht, rent=gfa*0.75*(red?600:orange?450:300)*12;
  const blocked=road_width_m<8 || gfa<2000;
  const cC=gfa*60000+price_baht, commercial=gfa*0.8*(red?1200:orange?900:650)*12;
  return {GFA_Max:+gfa.toFixed(0),Type_A_ROI:+((revenue-cA)/cA*100).toFixed(2),Type_B_ROI:+(rent/cB*100).toFixed(2),Type_C_ROI:blocked?null:+(commercial/cC*100).toFixed(2),Type_C_Block:blocked?(road_width_m<8?'⛔ ถนน < 8 ม.':'⛔ GFA < 2,000 ตร.ม.'):'',valid:true};
}
module.exports={parseLandSize,calcROI,METRICS};
