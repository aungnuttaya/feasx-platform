function validateImage(file) {
  if(!file || !['image/jpeg','image/png'].includes(file.type) || !Number.isFinite(file.size) || file.size<=0 || file.size>30000) return false;
  return true;
}
function validateGPS(gps) {
  if(!gps || String(gps.lat).trim()==='' || String(gps.lng).trim()==='') return false;
  const lat=Number(gps.lat),lng=Number(gps.lng);
  return Number.isFinite(lat)&&lat>=-90&&lat<=90&&Number.isFinite(lng)&&lng>=-180&&lng<=180 && (!gps.area || (Number.isFinite(Number(gps.area))&&Number(gps.area)>0));
}
module.exports={validateImage,validateGPS};
