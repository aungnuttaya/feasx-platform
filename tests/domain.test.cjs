const test=require('node:test');
const assert=require('node:assert/strict');
const {parseLandSize,calcROI,METRICS}=require('../lib/domain/land.cjs');
const {validateImage,validateGPS}=require('../lib/domain/intake.cjs');
const {SYNTHETIC_LANDS}=require('../lib/domain/fixtures.cjs');
test('synthetic fixture areas match parsed units and contain no owner/deed identifiers',()=>{for(const row of SYNTHETIC_LANDS){assert.equal(parseLandSize(row.raw_size).land_size_sqm,row.land_size_sqm);assert.equal(row.source,'synthetic');assert.equal('owner' in row,false);assert.equal('deed_no' in row,false)}});
for(const [input,wah] of [['3 ไร่',1200],['2 งาน',200],['1 ไร่ 2 งาน 30 ตร.ว.',630],['1 งาน 46.5 ตร.ว.',146.5],['2-1-40',940],['400 ตารางเมตร',100],['100 sq.w',100],['200',200]]) {
  test(`area conversion: ${input}`,()=>{const r=parseLandSize(input);assert.equal(r.valid,true);assert.equal(r.land_size_wah,wah);assert.equal(r.land_size_sqm,wah*4)});
}
for(const input of ['-10','0','abc','3 rai','1-4-0','1-0-100','12junk','Infinity','',null,'0.0001',[200]]) test(`reject invalid area ${input}`,()=>assert.equal(parseLandSize(input).valid,false));
const assumptions={land_size_sqm:4000,far_ratio:2,road_width_m:10,zoning_color:'แดง',price_baht:40000000};
test('ROI calculates project margin and annual gross yield independently',()=>{
  const r=calcROI(assumptions);assert.equal(r.GFA_Max,8000);assert.equal(r.Type_A_ROI,124);assert.equal(r.Type_B_ROI,18);assert.equal(r.Type_C_ROI,17.72);assert.equal(METRICS.Type_A_ROI,'project_margin_percent');
});
test('road width below eight meters blocks C, boundary eight permits it',()=>{assert.equal(calcROI({...assumptions,road_width_m:7.99}).Type_C_ROI,null);assert.notEqual(calcROI({...assumptions,road_width_m:8}).Type_C_ROI,null)});
test('missing or negative cost inputs fail closed',()=>{assert.equal(calcROI({...assumptions,price_baht:-1}).valid,false);assert.equal(calcROI({...assumptions,far_ratio:NaN}).valid,false)});
test('overflow cannot produce an infinite modeled return',()=>assert.equal(calcROI({...assumptions,land_size_sqm:1e300,far_ratio:1e300}).valid,false));
test('intake permits small JPEG but rejects PDF and oversized images',()=>{assert.equal(validateImage({type:'image/jpeg',size:1000}),true);assert.equal(validateImage({type:'application/pdf',size:1000}),false);assert.equal(validateImage({type:'image/png',size:30001}),false)});
test('GPS permits zero coordinate, rejects invalid ranges and negative area',()=>{assert.equal(validateGPS({lat:'0',lng:'0'}),true);assert.equal(validateGPS({lat:'91',lng:'0'}),false);assert.equal(validateGPS({lat:'0',lng:'0',area:'-1'}),false)});
