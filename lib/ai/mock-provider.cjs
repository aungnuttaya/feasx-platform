// Invented output only; never a network adapter or a customer-data fixture.
function createMockProvider({delayMs=0}={}){
  return {kind:'mock',execute:async({task,signal})=>{
    if(delayMs)await new Promise((resolve,reject)=>{
      const timer=setTimeout(done,delayMs);
      function done(){signal.removeEventListener('abort',abort);resolve()}
      function abort(){clearTimeout(timer);signal.removeEventListener('abort',abort);reject(Error('Mock aborted'))}
      if(signal.aborted)return abort();signal.addEventListener('abort',abort,{once:true});
    });
    if(task==='report'){
      const section={recommendation:'Synthetic option',verdict:'Requires human review',pros:['Synthetic benefit'],cons:['Synthetic risk']};
      return {executive_summary:'Synthetic summary',location_analysis:'Synthetic location',legal_zoning:'Unverified synthetic assumption',best_recommendation:'Human review',disclaimer:'Synthetic test output only',type_a:{...section},type_b:{...section},type_c:{...section},next_steps:['Review'],risk_flags:['Synthetic only']};
    }
    return {deed_type:'Synthetic document',notes:'Synthetic only',estimated_location:'Synthetic parcel',probable_province:'Synthetic province',probable_district:'Synthetic district',area_sqm:400,area_wah:100,ocr_confidence:0.5,flags:['requires_review'],estimation_method:'gps_pin_estimate'};
  }};
}
module.exports={createMockProvider};
