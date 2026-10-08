const {test,expect}=require('@playwright/test');
test('guest homepage hydrates on desktop without external service requests',async({page})=>{
  const failures=[],external=[];page.on('pageerror',error=>failures.push(error.message));
  await page.route('**/*',route=>{const url=new URL(route.request().url());if(!['127.0.0.1','localhost'].includes(url.hostname)){external.push(url.hostname);return route.abort()}return route.continue()});
  await page.goto('/');
  await expect(page.getByText('ข้อมูลจำลองสำหรับทดสอบ — ไม่ใช่ประกาศขายหรือผลยืนยันทางกฎหมาย')).toBeVisible();
  await expect(page.getByText('กำลังโหลด FeasX...')).toHaveCount(0);
  expect(failures).toEqual([]);expect(external.filter(host=>/supabase|stripe|anthropic/.test(host))).toEqual([]);
});
test('guest homepage hydrates at mobile width',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  await page.goto('/');await expect(page.getByText('ข้อมูลจำลองสำหรับทดสอบ — ไม่ใช่ประกาศขายหรือผลยืนยันทางกฎหมาย')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('AI endpoint rejects anonymous and forged identity in actual browser request',async({request})=>{
  for(const headers of [{},{Authorization:'Bearer forged-synthetic'}]){const res=await request.post('/api/ai',{headers,data:{task:'report',payload:{prompt:'synthetic'}}});expect(res.status()).toBe(401);expect((await res.json()).error.code).toBe('UNAUTHENTICATED')}
});
test('job API rejects anonymous/forged create and status reads without binding',async({request})=>{
  for(const headers of [{},{Authorization:'Bearer forged-synthetic'}]){
    const created=await request.post('/api/ai/jobs',{headers,data:{task:'gps',payload:{lat:0,lng:0,areaWah:100}}});expect(created.status()).toBe(401);
    const read=await request.get('/api/ai/jobs?id=synthetic-not-a-job',{headers});expect(read.status()).toBe(401);
  }
});
async function openGPS(page){
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  await page.goto('/');await page.getByText('📄 นำเข้าที่ดิน',{exact:true}).click();
  await page.getByText('ไม่มีโฉนด / ปักหมุด GPS',{exact:true}).click();
  await page.getByPlaceholder('เช่น 13.7234').fill('0');
  await page.getByPlaceholder('เช่น 100.6754').fill('0');
}
test('GPS journey preserves failure after actual unauthenticated response',async({page})=>{
  await openGPS(page);
  await page.getByRole('button',{name:/ประเมินพิกัดด้วย AI/}).click();
  await expect(page.getByText('เกิดข้อผิดพลาด กรุณาลองใหม่',{exact:true})).toBeVisible();
  await expect(page.getByText('OCR Confidence Score',{exact:true})).toHaveCount(0);
});
test('GPS journey displays a validated synthetic browser-mocked result',async({page})=>{
  await openGPS(page);
  await page.route('**/api/ai',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,requestId:'synthetic-browser-test',provenance:{provider:'mock',humanReviewRequired:true},result:{estimated_location:'SYNTHETIC-GPS',probable_province:'จังหวัดสมมติ',probable_district:'เขตสมมติ',notes:'Synthetic only',area_sqm:400,area_wah:100,ocr_confidence:0.5,estimation_method:'gps_pin_estimate',flags:['requires_review']}})}));
  await page.getByRole('button',{name:/ประเมินพิกัดด้วย AI/}).click();
  await expect(page.getByText('OCR Confidence Score',{exact:true})).toBeVisible();
});
