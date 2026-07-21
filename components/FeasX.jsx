import { useState, useEffect, useRef, useMemo } from "react";

const C = {
  cream:"#F7F3EC", creamDk:"#EDE6D8", sand:"#D4C5A9",
  amber:"#8B6F47", amberLt:"#B8966A", bark:"#2C2416",
  barkLt:"#5C4A30", forest:"#3D6B4F", forestLt:"#4E8A65",
  mist:"#C8BBA8", white:"#FDFAF6", danger:"#B94040",
  lo_bg:"#12100D", lo_surface:"#1C1915", lo_border:"#2E2820",
  lo_gold:"#C9A96E", lo_goldLt:"#E4C28A", lo_goldDk:"#9A7A48",
  lo_text:"#F0EAE0", lo_muted:"#7A6E62",
  inv_bg:"#0D1117", inv_surface:"#161B22", inv_border:"#21262D",
  inv_green:"#00C896", inv_text:"#E6EDF3", inv_muted:"#8B949E", inv_blue:"#58A6FF",
};

/* ── ENGINE L1: Unit Parser ── */
function parseLandSize(raw) {
  const s = (raw||"").toString().trim().toLowerCase();
  const raiM = s.match(/(\d+\.?\d*)\s*ไร่?\s*(\d+\.?\d*)?\s*ง(าน)?\s*(\d+\.?\d*)?/);
  if (raiM) {
    const t = parseFloat(raiM[1]||0)*400 + parseFloat(raiM[2]||0)*100 + parseFloat(raiM[4]||0);
    return { land_size_wah: +t.toFixed(2), land_size_sqm: +(t*4).toFixed(2) };
  }
  const dM = s.match(/^(\d+)-(\d+)-(\d+\.?\d*)$/);
  if (dM) {
    const t = parseFloat(dM[1])*400 + parseFloat(dM[2])*100 + parseFloat(dM[3]);
    return { land_size_wah: +t.toFixed(2), land_size_sqm: +(t*4).toFixed(2) };
  }
  const wM = s.match(/(\d+\.?\d*)\s*(ตร\.?ว\.?|ตารางวา|sq\.?w)/);
  if (wM) { const w=parseFloat(wM[1]); return { land_size_wah:w, land_size_sqm:+(w*4).toFixed(2) }; }
  const mM = s.match(/(\d+\.?\d*)\s*(ตร\.?ม\.?|ตารางเมตร|sqm|m2)/);
  if (mM) { const m=parseFloat(mM[1]); return { land_size_wah:+(m/4).toFixed(2), land_size_sqm:+m.toFixed(2) }; }
  const n = parseFloat(s);
  if (!isNaN(n)) return { land_size_wah:n, land_size_sqm:+(n*4).toFixed(2) };
  return { land_size_wah:0, land_size_sqm:0 };
}

/* ── ENGINE L2: Zone DB — ครอบคลุมทั้งประเทศ ── */
const ZONE_DB = {
  // ════ กรุงเทพมหานคร — 50 เขต ════
  // โซนกลางเมือง (CBD)
  "กรุงเทพมหานคร:ปทุมวัน":        {zoning_color:"แดง พ.7",    far_ratio:10.0, road_width_m:24, frontage_length_m:40},
  "กรุงเทพมหานคร:บางรัก":         {zoning_color:"แดง พ.6",    far_ratio:8.0,  road_width_m:20, frontage_length_m:30},
  "กรุงเทพมหานคร:สาทร":           {zoning_color:"แดง พ.6",    far_ratio:8.0,  road_width_m:20, frontage_length_m:30},
  "กรุงเทพมหานคร:สัมพันธวงศ์":    {zoning_color:"แดง พ.5",    far_ratio:7.0,  road_width_m:16, frontage_length_m:25},
  "กรุงเทพมหานคร:พระนคร":         {zoning_color:"น้ำตาล ก.2", far_ratio:3.0,  road_width_m:10, frontage_length_m:15},
  "กรุงเทพมหานคร:ป้อมปราบศัตรูพ่าย":{zoning_color:"แดง พ.4",  far_ratio:6.0,  road_width_m:12, frontage_length_m:20},
  // โซนสุขุมวิท-วัฒนา
  "กรุงเทพมหานคร:วัฒนา":          {zoning_color:"ส้ม ย.5",    far_ratio:5.0,  road_width_m:12, frontage_length_m:20},
  "กรุงเทพมหานคร:คลองเตย":        {zoning_color:"แดง พ.5",    far_ratio:7.0,  road_width_m:16, frontage_length_m:25},
  "กรุงเทพมหานคร:พระโขนง":        {zoning_color:"ส้ม ย.5",    far_ratio:5.0,  road_width_m:10, frontage_length_m:18},
  "กรุงเทพมหานคร:บางนา":          {zoning_color:"ส้ม ย.4",    far_ratio:4.0,  road_width_m:10, frontage_length_m:16},
  // โซนรัชดา-ลาดพร้าว
  "กรุงเทพมหานคร:ห้วยขวาง":       {zoning_color:"แดง พ.4",    far_ratio:6.0,  road_width_m:12, frontage_length_m:20},
  "กรุงเทพมหานคร:ดินแดง":         {zoning_color:"แดง พ.4",    far_ratio:6.0,  road_width_m:12, frontage_length_m:18},
  "กรุงเทพมหานคร:ลาดพร้าว":       {zoning_color:"ส้ม ย.4",    far_ratio:4.5,  road_width_m:12, frontage_length_m:16},
  "กรุงเทพมหานคร:จตุจักร":        {zoning_color:"ส้ม ย.4",    far_ratio:4.5,  road_width_m:12, frontage_length_m:18},
  "กรุงเทพมหานคร:บึงกุ่ม":        {zoning_color:"เหลือง ย.3", far_ratio:3.0,  road_width_m:8,  frontage_length_m:10},
  "กรุงเทพมหานคร:วังทองหลาง":     {zoning_color:"ส้ม ย.4",    far_ratio:4.0,  road_width_m:10, frontage_length_m:14},
  "กรุงเทพมหานคร:สะพานสูง":       {zoning_color:"เหลือง ย.3", far_ratio:3.0,  road_width_m:8,  frontage_length_m:12},
  // โซนเหนือ
  "กรุงเทพมหานคร:บางเขน":         {zoning_color:"ส้ม ย.3",    far_ratio:3.5,  road_width_m:10, frontage_length_m:14},
  "กรุงเทพมหานคร:ดอนเมือง":       {zoning_color:"เหลือง ย.3", far_ratio:3.0,  road_width_m:8,  frontage_length_m:12},
  "กรุงเทพมหานคร:สายไหม":         {zoning_color:"เหลือง ย.2", far_ratio:2.5,  road_width_m:6,  frontage_length_m:10},
  "กรุงเทพมหานคร:คลองสาน":        {zoning_color:"ส้ม ย.4",    far_ratio:4.0,  road_width_m:10, frontage_length_m:14},
  "กรุงเทพมหานคร:ลาดกระบัง":      {zoning_color:"เขียว ก.1",  far_ratio:1.0,  road_width_m:6,  frontage_length_m:10},
  "กรุงเทพมหานคร:มีนบุรี":        {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "กรุงเทพมหานคร:หนองจอก":        {zoning_color:"เขียว ก.1",  far_ratio:1.0,  road_width_m:6,  frontage_length_m:8},
  "กรุงเทพมหานคร:คลองสามวา":      {zoning_color:"เขียว ก.1",  far_ratio:1.0,  road_width_m:6,  frontage_length_m:8},
  // โซนตะวันตก-ใต้
  "กรุงเทพมหานคร:ราษฎร์บูรณะ":    {zoning_color:"เหลือง ย.3", far_ratio:3.0,  road_width_m:8,  frontage_length_m:12},
  "กรุงเทพมหานคร:ทุ่งครุ":        {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "กรุงเทพมหานคร:บางขุนเทียน":    {zoning_color:"เขียว ก.2",  far_ratio:1.5,  road_width_m:6,  frontage_length_m:8},
  "กรุงเทพมหานคร:จอมทอง":         {zoning_color:"เหลือง ย.3", far_ratio:3.0,  road_width_m:8,  frontage_length_m:12},
  "กรุงเทพมหานคร:บางบอน":         {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "กรุงเทพมหานคร:ภาษีเจริญ":      {zoning_color:"เหลือง ย.3", far_ratio:3.0,  road_width_m:8,  frontage_length_m:12},
  "กรุงเทพมหานคร:หนองแขม":        {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "กรุงเทพมหานคร:บางแค":          {zoning_color:"เหลือง ย.3", far_ratio:3.0,  road_width_m:8,  frontage_length_m:12},
  "กรุงเทพมหานคร:ตลิ่งชัน":       {zoning_color:"เหลือง ย.3", far_ratio:2.5,  road_width_m:8,  frontage_length_m:12},
  "กรุงเทพมหานคร:ทวีวัฒนา":       {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  // โซนธนบุรี
  "กรุงเทพมหานคร:ธนบุรี":         {zoning_color:"ส้ม ย.4",    far_ratio:4.0,  road_width_m:10, frontage_length_m:14},
  "กรุงเทพมหานคร:คลองสาน":        {zoning_color:"ส้ม ย.4",    far_ratio:4.0,  road_width_m:10, frontage_length_m:14},
  "กรุงเทพมหานคร:บางกอกน้อย":     {zoning_color:"ส้ม ย.3",    far_ratio:3.5,  road_width_m:8,  frontage_length_m:12},
  "กรุงเทพมหานคร:บางกอกใหญ่":     {zoning_color:"ส้ม ย.3",    far_ratio:3.5,  road_width_m:8,  frontage_length_m:12},
  "กรุงเทพมหานคร:บางพลัด":        {zoning_color:"ส้ม ย.4",    far_ratio:4.0,  road_width_m:10, frontage_length_m:14},
  // โซนเพิ่มเติม
  "กรุงเทพมหานคร:พญาไท":          {zoning_color:"แดง พ.4",    far_ratio:6.0,  road_width_m:12, frontage_length_m:20},
  "กรุงเทพมหานคร:ราชเทวี":        {zoning_color:"แดง พ.5",    far_ratio:7.0,  road_width_m:16, frontage_length_m:24},
  "กรุงเทพมหานคร:บางซื่อ":        {zoning_color:"ส้ม ย.4",    far_ratio:4.5,  road_width_m:12, frontage_length_m:16},
  "กรุงเทพมหานคร:ดุสิต":          {zoning_color:"น้ำตาล ก.2", far_ratio:3.0,  road_width_m:12, frontage_length_m:18},
  "กรุงเทพมหานคร:พระนคร":         {zoning_color:"น้ำตาล ก.2", far_ratio:3.0,  road_width_m:10, frontage_length_m:15},
  "กรุงเทพมหานคร:สาธร":           {zoning_color:"แดง พ.6",    far_ratio:8.0,  road_width_m:20, frontage_length_m:30},
  "กรุงเทพมหานคร:ยานนาวา":        {zoning_color:"ส้ม ย.4",    far_ratio:4.5,  road_width_m:10, frontage_length_m:16},
  "กรุงเทพมหานคร:สวนหลวง":        {zoning_color:"ส้ม ย.4",    far_ratio:4.0,  road_width_m:10, frontage_length_m:14},
  "กรุงเทพมหานคร:ประเวศ":         {zoning_color:"เหลือง ย.3", far_ratio:3.0,  road_width_m:8,  frontage_length_m:12},
  "กรุงเทพมหานคร:พัฒนาการ":       {zoning_color:"ส้ม ย.4",    far_ratio:4.0,  road_width_m:10, frontage_length_m:14},

  // ════ นนทบุรี ════
  "นนทบุรี:เมืองนนทบุรี":         {zoning_color:"ส้ม ย.4",    far_ratio:4.0,  road_width_m:10, frontage_length_m:16},
  "นนทบุรี:ปากเกร็ด":             {zoning_color:"เหลือง ย.3", far_ratio:3.0,  road_width_m:8,  frontage_length_m:12},
  "นนทบุรี:บางใหญ่":              {zoning_color:"เหลือง ย.3", far_ratio:3.0,  road_width_m:8,  frontage_length_m:12},
  "นนทบุรี:บางบัวทอง":            {zoning_color:"เหลือง ย.3", far_ratio:3.0,  road_width_m:8,  frontage_length_m:12},
  "นนทบุรี:บางกรวย":              {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "นนทบุรี:ไทรน้อย":              {zoning_color:"เขียว ก.1",  far_ratio:1.0,  road_width_m:6,  frontage_length_m:8},
  "นนทบุรี:บางกรวย":              {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},

  // ════ ปทุมธานี ════
  "ปทุมธานี:เมืองปทุมธานี":       {zoning_color:"เหลือง ย.3", far_ratio:3.0,  road_width_m:8,  frontage_length_m:12},
  "ปทุมธานี:คลองหลวง":            {zoning_color:"ส้ม ย.3",    far_ratio:3.5,  road_width_m:8,  frontage_length_m:12},
  "ปทุมธานี:ธัญบุรี":             {zoning_color:"เหลือง ย.3", far_ratio:3.0,  road_width_m:8,  frontage_length_m:12},
  "ปทุมธานี:ลำลูกกา":             {zoning_color:"เหลือง ย.3", far_ratio:2.5,  road_width_m:8,  frontage_length_m:10},
  "ปทุมธานี:สามโคก":              {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "ปทุมธานี:หนองเสือ":            {zoning_color:"เขียว ก.1",  far_ratio:1.0,  road_width_m:6,  frontage_length_m:8},

  // ════ สมุทรปราการ ════
  "สมุทรปราการ:เมืองสมุทรปราการ": {zoning_color:"ส้ม ย.4",    far_ratio:4.0,  road_width_m:10, frontage_length_m:15},
  "สมุทรปราการ:บางพลี":           {zoning_color:"ส้ม ย.3",    far_ratio:3.5,  road_width_m:10, frontage_length_m:14},
  "สมุทรปราการ:พระประแดง":        {zoning_color:"เหลือง ย.3", far_ratio:3.0,  road_width_m:8,  frontage_length_m:12},
  "สมุทรปราการ:พระสมุทรเจดีย์":   {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "สมุทรปราการ:บางบ่อ":           {zoning_color:"เขียว ก.2",  far_ratio:1.5,  road_width_m:6,  frontage_length_m:8},
  "สมุทรปราการ:บางเสาธง":         {zoning_color:"เหลือง ย.3", far_ratio:2.5,  road_width_m:8,  frontage_length_m:12},

  // ════ สมุทรสาคร ════
  "สมุทรสาคร:เมืองสมุทรสาคร":     {zoning_color:"เหลือง ย.3", far_ratio:3.0,  road_width_m:8,  frontage_length_m:12},
  "สมุทรสาคร:กระทุ่มแบน":         {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "สมุทรสาคร:บ้านแพ้ว":           {zoning_color:"เขียว ก.1",  far_ratio:1.0,  road_width_m:6,  frontage_length_m:8},

  // ════ นครปฐม ════
  "นครปฐม:เมืองนครปฐม":           {zoning_color:"เหลือง ย.3", far_ratio:3.0,  road_width_m:8,  frontage_length_m:12},
  "นครปฐม:สามพราน":               {zoning_color:"เหลือง ย.3", far_ratio:2.5,  road_width_m:8,  frontage_length_m:12},
  "นครปฐม:นครชัยศรี":             {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "นครปฐม:พุทธมณฑล":              {zoning_color:"เหลือง ย.3", far_ratio:2.5,  road_width_m:8,  frontage_length_m:12},

  // ════ เชียงใหม่ ════
  "เชียงใหม่:เมืองเชียงใหม่":      {zoning_color:"ส้ม ย.4",    far_ratio:4.0,  road_width_m:10, frontage_length_m:16},
  "เชียงใหม่:แม่ริม":              {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "เชียงใหม่:สันทราย":             {zoning_color:"เหลือง ย.3", far_ratio:2.5,  road_width_m:8,  frontage_length_m:12},
  "เชียงใหม่:หางดง":               {zoning_color:"เหลือง ย.3", far_ratio:2.5,  road_width_m:8,  frontage_length_m:12},
  "เชียงใหม่:สันกำแพง":            {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "เชียงใหม่:ดอยสะเก็ด":           {zoning_color:"เขียว ก.1",  far_ratio:1.0,  road_width_m:6,  frontage_length_m:8},
  "เชียงใหม่:สารภี":               {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "เชียงใหม่:แม่แตง":              {zoning_color:"เขียว ก.1",  far_ratio:1.0,  road_width_m:6,  frontage_length_m:8},

  // ════ ภูเก็ต ════
  "ภูเก็ต:เมืองภูเก็ต":            {zoning_color:"ส้ม ย.4",    far_ratio:4.0,  road_width_m:10, frontage_length_m:16},
  "ภูเก็ต:กะทู้":                  {zoning_color:"ส้ม ย.3",    far_ratio:3.5,  road_width_m:8,  frontage_length_m:14},
  "ภูเก็ต:ถลาง":                   {zoning_color:"เหลือง ย.3", far_ratio:3.0,  road_width_m:8,  frontage_length_m:12},

  // ════ ชลบุรี ════
  "ชลบุรี:เมืองชลบุรี":            {zoning_color:"ส้ม ย.4",    far_ratio:4.0,  road_width_m:10, frontage_length_m:16},
  "ชลบุรี:บางละมุง":               {zoning_color:"ส้ม ย.4",    far_ratio:4.0,  road_width_m:10, frontage_length_m:16},
  "ชลบุรี:พัทยา":                  {zoning_color:"แดง พ.4",    far_ratio:6.0,  road_width_m:12, frontage_length_m:20},
  "ชลบุรี:ศรีราชา":                {zoning_color:"ส้ม ย.4",    far_ratio:4.0,  road_width_m:10, frontage_length_m:14},
  "ชลบุรี:บ้านบึง":                {zoning_color:"เหลือง ย.3", far_ratio:2.5,  road_width_m:8,  frontage_length_m:12},
  "ชลบุรี:พนัสนิคม":               {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "ชลบุรี:สัตหีบ":                 {zoning_color:"เหลือง ย.3", far_ratio:2.5,  road_width_m:8,  frontage_length_m:12},

  // ════ ระยอง ════
  "ระยอง:เมืองระยอง":              {zoning_color:"ส้ม ย.4",    far_ratio:4.0,  road_width_m:10, frontage_length_m:14},
  "ระยอง:มาบตาพุด":                {zoning_color:"แดง พ.3",    far_ratio:5.0,  road_width_m:12, frontage_length_m:18},
  "ระยอง:บ้านฉาง":                 {zoning_color:"เหลือง ย.3", far_ratio:2.5,  road_width_m:8,  frontage_length_m:12},
  "ระยอง:ปลวกแดง":                 {zoning_color:"ส้ม ย.3",    far_ratio:3.5,  road_width_m:10, frontage_length_m:14},

  // ════ นครราชสีมา (โคราช) ════
  "นครราชสีมา:เมืองนครราชสีมา":   {zoning_color:"ส้ม ย.4",    far_ratio:4.0,  road_width_m:10, frontage_length_m:16},
  "นครราชสีมา:ปากช่อง":            {zoning_color:"เหลือง ย.3", far_ratio:2.5,  road_width_m:8,  frontage_length_m:12},
  "นครราชสีมา:สูงเนิน":            {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "นครราชสีมา:หนองบุญมาก":         {zoning_color:"เขียว ก.1",  far_ratio:1.0,  road_width_m:6,  frontage_length_m:8},
  "นครราชสีมา:โชคชัย":             {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "นครราชสีมา:หนองกระทุ่ม":        {zoning_color:"เหลือง ย.3", far_ratio:3.0,  road_width_m:8,  frontage_length_m:12},

  // ════ ขอนแก่น ════
  "ขอนแก่น:เมืองขอนแก่น":          {zoning_color:"ส้ม ย.4",    far_ratio:4.0,  road_width_m:10, frontage_length_m:14},
  "ขอนแก่น:บ้านไผ่":               {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "ขอนแก่น:พล":                    {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "ขอนแก่น:น้ำพอง":                {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},

  // ════ อุดรธานี ════
  "อุดรธานี:เมืองอุดรธานี":        {zoning_color:"ส้ม ย.4",    far_ratio:4.0,  road_width_m:10, frontage_length_m:14},
  "อุดรธานี:กุมภวาปี":             {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "อุดรธานี:บ้านดุง":              {zoning_color:"เขียว ก.1",  far_ratio:1.0,  road_width_m:6,  frontage_length_m:8},

  // ════ อุบลราชธานี ════
  "อุบลราชธานี:เมืองอุบลราชธานี":  {zoning_color:"เหลือง ย.3", far_ratio:3.0,  road_width_m:8,  frontage_length_m:12},
  "อุบลราชธานี:วารินชำราบ":        {zoning_color:"เหลือง ย.3", far_ratio:3.0,  road_width_m:8,  frontage_length_m:12},
  "อุบลราชธานี:เดชอุดม":           {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},

  // ════ สงขลา / หาดใหญ่ ════
  "สงขลา:เมืองสงขลา":              {zoning_color:"เหลือง ย.3", far_ratio:3.0,  road_width_m:8,  frontage_length_m:12},
  "สงขลา:หาดใหญ่":                 {zoning_color:"ส้ม ย.4",    far_ratio:4.0,  road_width_m:10, frontage_length_m:16},
  "สงขลา:สะเดา":                   {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},

  // ════ เชียงราย ════
  "เชียงราย:เมืองเชียงราย":        {zoning_color:"เหลือง ย.3", far_ratio:3.0,  road_width_m:8,  frontage_length_m:12},
  "เชียงราย:แม่สาย":               {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "เชียงราย:เชียงแสน":             {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},

  // ════ นครศรีธรรมราช ════
  "นครศรีธรรมราช:เมืองนครศรีธรรมราช":{zoning_color:"เหลือง ย.3",far_ratio:3.0, road_width_m:8, frontage_length_m:12},
  "นครศรีธรรมราช:ทุ่งสง":          {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},

  // ════ สุราษฎร์ธานี ════
  "สุราษฎร์ธานี:เมืองสุราษฎร์ธานี":{zoning_color:"เหลือง ย.3", far_ratio:3.0,  road_width_m:8,  frontage_length_m:12},
  "สุราษฎร์ธานี:เกาะสมุย":         {zoning_color:"ส้ม ย.3",    far_ratio:3.5,  road_width_m:8,  frontage_length_m:14},
  "สุราษฎร์ธานี:เกาะพะงัน":        {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},

  // ════ กาญจนบุรี ════
  "กาญจนบุรี:เมืองกาญจนบุรี":      {zoning_color:"เหลือง ย.3", far_ratio:2.5,  road_width_m:8,  frontage_length_m:12},
  "กาญจนบุรี:ท่าม่วง":             {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},

  // ════ พระนครศรีอยุธยา ════
  "พระนครศรีอยุธยา:พระนครศรีอยุธยา":{zoning_color:"น้ำตาล ก.2",far_ratio:2.5, road_width_m:8, frontage_length_m:12},
  "พระนครศรีอยุธยา:บางปะอิน":      {zoning_color:"ส้ม ย.3",    far_ratio:3.5,  road_width_m:10, frontage_length_m:14},
  "พระนครศรีอยุธยา:อุทัย":         {zoning_color:"เหลือง ย.3", far_ratio:2.5,  road_width_m:8,  frontage_length_m:12},

  // ════ สระบุรี ════
  "สระบุรี:เมืองสระบุรี":          {zoning_color:"เหลือง ย.3", far_ratio:3.0,  road_width_m:8,  frontage_length_m:12},
  "สระบุรี:แก่งคอย":               {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},

  // ════ นครสวรรค์ ════
  "นครสวรรค์:เมืองนครสวรรค์":      {zoning_color:"เหลือง ย.3", far_ratio:3.0,  road_width_m:8,  frontage_length_m:12},
  "นครสวรรค์:ตาคลี":               {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},

  // ════ พิษณุโลก ════
  "พิษณุโลก:เมืองพิษณุโลก":        {zoning_color:"เหลือง ย.3", far_ratio:3.0,  road_width_m:8,  frontage_length_m:12},
  "พิษณุโลก:พรหมพิราม":            {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},

  // ════ ลำปาง ════
  "ลำปาง:เมืองลำปาง":              {zoning_color:"เหลือง ย.3", far_ratio:2.5,  road_width_m:8,  frontage_length_m:12},

  // ════ ลำพูน ════
  "ลำพูน:เมืองลำพูน":              {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},

  // ════ กระบี่ ════
  "กระบี่:เมืองกระบี่":            {zoning_color:"เหลือง ย.3", far_ratio:3.0,  road_width_m:8,  frontage_length_m:12},
  "กระบี่:อ่าวนาง":                {zoning_color:"ส้ม ย.3",    far_ratio:3.5,  road_width_m:8,  frontage_length_m:14},

  // ════ สมุย / ประจวบ ════
  "ประจวบคีรีขันธ์:เมืองประจวบคีรีขันธ์":{zoning_color:"เหลือง ย.2",far_ratio:2.0,road_width_m:6,frontage_length_m:10},
  "ประจวบคีรีขันธ์:หัวหิน":        {zoning_color:"ส้ม ย.3",    far_ratio:3.5,  road_width_m:8,  frontage_length_m:14},
  "ประจวบคีรีขันธ์:ปราณบุรี":      {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},

  // ════ ราชบุรี ════
  "ราชบุรี:เมืองราชบุรี":          {zoning_color:"เหลือง ย.3", far_ratio:2.5,  road_width_m:8,  frontage_length_m:12},
  "ราชบุรี:โพธาราม":               {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},

  // ════ เพชรบุรี ════
  "เพชรบุรี:เมืองเพชรบุรี":        {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "เพชรบุรี:ชะอำ":                  {zoning_color:"เหลือง ย.3", far_ratio:2.5,  road_width_m:8,  frontage_length_m:12},

  // ════ บึงกาฬ / หนองคาย ════
  "หนองคาย:เมืองหนองคาย":          {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "บึงกาฬ:เมืองบึงกาฬ":            {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},

  // ════ มุกดาหาร / นครพนม ════
  "มุกดาหาร:เมืองมุกดาหาร":        {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "นครพนม:เมืองนครพนม":            {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},

  // ════ สกลนคร ════
  "สกลนคร:เมืองสกลนคร":            {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},

  // ════ ร้อยเอ็ด / มหาสารคาม ════
  "ร้อยเอ็ด:เมืองร้อยเอ็ด":        {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "มหาสารคาม:เมืองมหาสารคาม":      {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},

  // ════ ฉะเชิงเทรา / ปราจีนบุรี ════
  "ฉะเชิงเทรา:เมืองฉะเชิงเทรา":   {zoning_color:"เหลือง ย.3", far_ratio:2.5,  road_width_m:8,  frontage_length_m:12},
  "ฉะเชิงเทรา:บางน้ำเปรี้ยว":      {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "ปราจีนบุรี:เมืองปราจีนบุรี":    {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "ปราจีนบุรี:กบินทร์บุรี":        {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},

  // ════ จันทบุรี / ตราด ════
  "จันทบุรี:เมืองจันทบุรี":        {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "ตราด:เมืองตราด":                {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "ตราด:เกาะช้าง":                 {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},

  // ════ พังงา ════
  "พังงา:เมืองพังงา":              {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "พังงา:เขาหลัก":                 {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},

  // ════ ตรัง / พัทลุง ════
  "ตรัง:เมืองตรัง":                {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "พัทลุง:เมืองพัทลุง":            {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},

  // ════ ปัตตานี / ยะลา / นราธิวาส ════
  "ปัตตานี:เมืองปัตตานี":          {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "ยะลา:เมืองยะลา":                {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "นราธิวาส:เมืองนราธิวาส":        {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},

  // ════ สุพรรณบุรี / อ่างทอง / สิงห์บุรี ════
  "สุพรรณบุรี:เมืองสุพรรณบุรี":    {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "อ่างทอง:เมืองอ่างทอง":          {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "สิงห์บุรี:เมืองสิงห์บุรี":      {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},

  // ════ ลพบุรี / ชัยนาท ════
  "ลพบุรี:เมืองลพบุรี":            {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "ชัยนาท:เมืองชัยนาท":            {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},

  // ════ สุโขทัย / กำแพงเพชร / ตาก ════
  "สุโขทัย:เมืองสุโขทัย":          {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "กำแพงเพชร:เมืองกำแพงเพชร":      {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "ตาก:เมืองตาก":                  {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "ตาก:แม่สอด":                    {zoning_color:"เหลือง ย.3", far_ratio:2.5,  road_width_m:8,  frontage_length_m:12},

  // ════ น่าน / แพร่ / อุตรดิตถ์ / พะเยา ════
  "น่าน:เมืองน่าน":                {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "แพร่:เมืองแพร่":                {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "อุตรดิตถ์:เมืองอุตรดิตถ์":      {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "พะเยา:เมืองพะเยา":              {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},

  // ════ แม่ฮ่องสอน ════
  "แม่ฮ่องสอน:เมืองแม่ฮ่องสอน":   {zoning_color:"เขียว ก.1",  far_ratio:1.0,  road_width_m:6,  frontage_length_m:8},

  // ════ เพชรบูรณ์ ════
  "เพชรบูรณ์:เมืองเพชรบูรณ์":      {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},

  // ════ ชัยภูมิ / บุรีรัมย์ / สุรินทร์ / ศรีสะเกษ ════
  "ชัยภูมิ:เมืองชัยภูมิ":          {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "บุรีรัมย์:เมืองบุรีรัมย์":      {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "สุรินทร์:เมืองสุรินทร์":        {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "ศรีสะเกษ:เมืองศรีสะเกษ":        {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},

  // ════ เลย / หนองบัวลำภู / กาฬสินธุ์ ════
  "เลย:เมืองเลย":                  {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "หนองบัวลำภู:เมืองหนองบัวลำภู":  {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},
  "กาฬสินธุ์:เมืองกาฬสินธุ์":      {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10},

  // ════ ยโสธร / อำนาจเจริญ ════
  "ยโสธร:เมืองยโสธร":              {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10, isDefault:false},
  "อำนาจเจริญ:เมืองอำนาจเจริญ":    {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10, isDefault:false},

  // ════ ที่ดินเกษตร / ชนบท — เพิ่มเพื่อ Featured Lands ════
  "พิจิตร:สากเหล็ก":               {zoning_color:"เขียว ก.2",  far_ratio:0.5,  road_width_m:6,  frontage_length_m:6,  isDefault:false},
  "พิษณุโลก:บางกระทุ่ม":           {zoning_color:"เขียว ก.1",  far_ratio:0.5,  road_width_m:6,  frontage_length_m:6,  isDefault:false},

  // ════ เขตที่ขาดหายจาก 95 แปลง (DDProperty + Kaidee) ════
  "กรุงเทพมหานคร:คันนายาว":        {zoning_color:"เหลือง ย.3", far_ratio:3.0,  road_width_m:8,  frontage_length_m:10, isDefault:false},
  "กรุงเทพมหานคร:บางกะปิ":         {zoning_color:"ส้ม ย.4",    far_ratio:4.0,  road_width_m:10, frontage_length_m:14, isDefault:false},
  "กรุงเทพมหานคร:สายไหม":          {zoning_color:"เหลือง ย.2", far_ratio:2.5,  road_width_m:6,  frontage_length_m:10, isDefault:false},
  "กาญจนบุรี:เมือง":               {zoning_color:"เหลือง ย.3", far_ratio:2.5,  road_width_m:8,  frontage_length_m:12, isDefault:false},
  "กาญจนบุรี:ไทรโยค":              {zoning_color:"เขียว ก.1",  far_ratio:1.0,  road_width_m:6,  frontage_length_m:8,  isDefault:false},
  "กาฬสินธุ์:ห้วยเม็ก":            {zoning_color:"เขียว ก.1",  far_ratio:1.0,  road_width_m:6,  frontage_length_m:8,  isDefault:false},
  "จันทบุรี:มะขาม":                {zoning_color:"เขียว ก.1",  far_ratio:1.0,  road_width_m:6,  frontage_length_m:8,  isDefault:false},
  "จันทบุรี:สอยดาว":               {zoning_color:"เขียว ก.1",  far_ratio:1.0,  road_width_m:6,  frontage_length_m:8,  isDefault:false},
  "ฉะเชิงเทรา:บางคล้า":            {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10, isDefault:false},
  "ฉะเชิงเทรา:บางน้ำเปรี้ยว":      {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10, isDefault:false},
  "ชลบุรี:เมือง":                  {zoning_color:"ส้ม ย.4",    far_ratio:4.0,  road_width_m:10, frontage_length_m:16, isDefault:false},
  "ชุมพร:ทุ่งตะโก":                {zoning_color:"เขียว ก.1",  far_ratio:1.0,  road_width_m:6,  frontage_length_m:8,  isDefault:false},
  "นครปฐม:นครชัยศรี":              {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10, isDefault:false},
  "นครปฐม:เมือง":                  {zoning_color:"เหลือง ย.3", far_ratio:3.0,  road_width_m:8,  frontage_length_m:12, isDefault:false},
  "นนทบุรี:บางกรวย":               {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10, isDefault:false},
  "ปทุมธานี:เมืองปทุมธานี":        {zoning_color:"เหลือง ย.3", far_ratio:3.0,  road_width_m:8,  frontage_length_m:12, isDefault:false},
  "ประจวบคีรีขันธ์:บางสะพานน้อย":  {zoning_color:"เขียว ก.1",  far_ratio:1.0,  road_width_m:6,  frontage_length_m:8,  isDefault:false},
  "ปราจีนบุรี:บ้านสร้าง":          {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10, isDefault:false},
  "พระนครศรีอยุธยา:บางซ้าย":       {zoning_color:"เขียว ก.2",  far_ratio:1.0,  road_width_m:6,  frontage_length_m:8,  isDefault:false},
  "พระนครศรีอยุธยา:อุทัย":         {zoning_color:"เหลือง ย.2", far_ratio:2.5,  road_width_m:8,  frontage_length_m:10, isDefault:false},
  "พิษณุโลก:เมือง":                {zoning_color:"เหลือง ย.3", far_ratio:3.0,  road_width_m:8,  frontage_length_m:12, isDefault:false},
  "มหาสารคาม:กันทรวิชัย":          {zoning_color:"เขียว ก.1",  far_ratio:1.0,  road_width_m:6,  frontage_length_m:8,  isDefault:false},
  "สกลนคร:เมือง":                  {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10, isDefault:false},
  "สมุทรปราการ:บางเสาธง":          {zoning_color:"เหลือง ย.3", far_ratio:2.5,  road_width_m:8,  frontage_length_m:12, isDefault:false},
  "สมุทรปราการ:เมือง":             {zoning_color:"ส้ม ย.4",    far_ratio:4.0,  road_width_m:10, frontage_length_m:15, isDefault:false},
  "สระบุรี:หนองแค":                {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10, isDefault:false},
  "สุราษฎร์ธานี:พุนพิน":           {zoning_color:"เหลือง ย.2", far_ratio:2.0,  road_width_m:6,  frontage_length_m:10, isDefault:false},
  "เชียงราย:แม่จัน":               {zoning_color:"เขียว ก.1",  far_ratio:1.0,  road_width_m:6,  frontage_length_m:8,  isDefault:false},
  "เชียงใหม่:เมือง":               {zoning_color:"ส้ม ย.4",    far_ratio:4.0,  road_width_m:10, frontage_length_m:16, isDefault:false},
  "เพชรบุรี:ชะอำ":                  {zoning_color:"เหลือง ย.3", far_ratio:2.5,  road_width_m:8,  frontage_length_m:12, isDefault:false},
  "เพชรบูรณ์:วิเชียรบุรี":          {zoning_color:"เขียว ก.1",  far_ratio:1.0,  road_width_m:6,  frontage_length_m:8,  isDefault:false},
  "เลย:ท่าลี่":                    {zoning_color:"เขียว ก.1",  far_ratio:1.0,  road_width_m:6,  frontage_length_m:8,  isDefault:false},
  "เลย:วังสะพุง":                   {zoning_color:"เขียว ก.1",  far_ratio:1.0,  road_width_m:6,  frontage_length_m:8,  isDefault:false},
};
const ZD = {zoning_color:"เขียว ก.2", far_ratio:1.0, road_width_m:6, frontage_length_m:8, isDefault:true};
function enrichZone(province, district) {
  const z = ZONE_DB[province+":"+district];
  return z ? {...z, isDefault:false} : ZD;
}

/* ── ENGINE L3: ROI ── */
function calcROI({ land_size_sqm, far_ratio, road_width_m, zoning_color, price_baht }) {
  const gfa = land_size_sqm * far_ratio;
  const sp = zoning_color.startsWith("แดง") ? 140000 : zoning_color.startsWith("ส้ม") ? 100000 : 70000;
  const cA = gfa*45000 + price_baht, rA = gfa*0.8*sp;
  const roiA = cA > 0 ? (rA-cA)/cA*100 : 0;
  const rent = gfa*0.75*(zoning_color.startsWith("แดง")?600:zoning_color.startsWith("ส้ม")?450:300)*12;
  const cB = gfa*25000 + price_baht;
  const roiB = cB > 0 ? rent/cB*100 : 0;
  const legal = road_width_m < 8 || gfa < 2000;
  let roiC = null, block = "";
  if (legal) { block = road_width_m < 8 ? "⛔ ถนน < 8 ม." : "⛔ GFA < 2,000 ตร.ม."; }
  else {
    const comm = gfa*0.8*(zoning_color.startsWith("แดง")?1200:zoning_color.startsWith("ส้ม")?900:650)*12;
    const cC = gfa*60000 + price_baht;
    roiC = cC > 0 ? comm/cC*100 : 0;
  }
  return { GFA_Max:+gfa.toFixed(0), Type_A_ROI:+roiA.toFixed(2), Type_B_ROI:+roiB.toFixed(2), Type_C_ROI:roiC!==null?+roiC.toFixed(2):null, Type_C_Block:block };
}
function processRow(r) {
  const size = parseLandSize(r.raw_size);
  const zone = enrichZone(r.province, r.district);
  const price = parseFloat((r.price||"0").toString().replace(/[^\d.]/g,"")) || 0;
  return { ...r, ...size, ...zone, ...calcROI({...size,...zone,price_baht:price}) };
}

const REAL_LANDS = [
  {id:1,source:"kaidee",title:"รับนายหน้าจ่ายคอมไม่ผูกมัดสัญญาคอม3เปอร์เซ็นต์ ขายที่ดิ",price:42000000,district:"ราษฎร์บูรณะ",province:"กรุงเทพมหานคร",raw_size:"462 ตารางวา",land_size_wah:462.0,land_size_sqm:1848.0,price_per_wah:90909},
  {id:2,source:"kaidee",title:"🔥 คุ้มสุดๆ ที่ดินหุบบอน ศรีราชา 3 ไร่ 39 ตร.ว. เพียง 10",price:10000000,district:"ศรีราชา",province:"ชลบุรี",raw_size:"1239",land_size_wah:1239.0,land_size_sqm:4956.0,price_per_wah:8071},
  {id:3,source:"kaidee",title:"🎉 ขายที่ดินทำเลทอง สุขุมวิท 101 ทับ 1 พร้อมสิ่งปลูกสร้า",price:20000000,district:"พระโขนง",province:"กรุงเทพมหานคร",raw_size:"142 ตารางวา",land_size_wah:142.0,land_size_sqm:568.0,price_per_wah:140845},
  {id:4,source:"kaidee",title:"ที่ดิน กันทรวิชัย มหาสารคาม",price:3500000,district:"กันทรวิชัย",province:"มหาสารคาม",raw_size:"3 ไร่",land_size_wah:1200.0,land_size_sqm:4800.0,price_per_wah:2917},
  {id:5,source:"kaidee",title:"&quot;สวนสวรรค์&quot; สวรรค์บนดินที่คุณครอบครองได้.",price:130000000,district:"ปากช่อง",province:"นครราชสีมา",raw_size:"52800 ตารางเมตร",land_size_wah:13200.0,land_size_sqm:52800.0,price_per_wah:9848},
  {id:6,source:"kaidee",title:"ขายที่ดินพร้อมอาคารสำนักงาน จอดรถ 40 คัน ใกล้ MRT บางพล",price:49900000,district:"บางบัวทอง",province:"นนทบุรี",raw_size:"483",land_size_wah:483.0,land_size_sqm:1932.0,price_per_wah:103313},
  {id:7,source:"kaidee",title:"ที่ดินติดทะเลติดเขาสามมุขพร้อมคาเฟ่และที่พัก",price:259000000,district:"เมือง",province:"ชลบุรี",raw_size:"ชลบุรี465 ตารางวา",land_size_wah:465.0,land_size_sqm:1860.0,price_per_wah:556989},
  {id:8,source:"kaidee",title:"ขายที่ดินเขตเศรฐกิจ (EEC) 19 ไร่ 2 งาน ติดถนนสุขุมวิท อ",price:330000000,district:"สัตหีบ",province:"ชลบุรี",raw_size:"19 ไร่",land_size_wah:7600.0,land_size_sqm:30400.0,price_per_wah:43421},
  {id:9,source:"kaidee",title:"ที่ดินในชุมชน ใกล้เมือง เชียงใหม่ สันป่าตอง",price:2470000,district:"สันป่าตอง",province:"เชียงใหม่",raw_size:"247 ตารางวา",land_size_wah:247.0,land_size_sqm:988.0,price_per_wah:10000},
  {id:10,source:"kaidee",title:"ซอยวัดอุโมงค์(หลังมอ) ทำเลดี",price:22000000,district:"เมือง",province:"เชียงใหม่",raw_size:"เชียงใหม่220 ตารางวา",land_size_wah:220.0,land_size_sqm:880.0,price_per_wah:100000},
  {id:11,source:"kaidee",title:"ที่ดินใกล้เมืองเชียงใหม่ ห่างจากเซ็นเฟส 10 นาที แปลงมุม",price:4025000,district:"ดอยสะเก็ด",province:"เชียงใหม่",raw_size:"161 ตารางวา",land_size_wah:161.0,land_size_sqm:644.0,price_per_wah:25000},
  {id:12,source:"kaidee",title:"ขายที่ดิน 2 ไร่ 7 ตารางวา ติดถนนมาลัยแมน",price:8900000,district:"กำแพงแสน",province:"นครปฐม",raw_size:"2 ไร่",land_size_wah:800.0,land_size_sqm:3200.0,price_per_wah:11125},
  {id:13,source:"kaidee",title:"ขายที่ดินสวยมาก หมู่บ้านภูนภารีสอร์ท 108 ตรว. มวกเหล็ก",price:5000000,district:"ปากช่อง",province:"นครราชสีมา",raw_size:"108 ตารางวา",land_size_wah:108.0,land_size_sqm:432.0,price_per_wah:46296},
  {id:14,source:"kaidee",title:"ที่ดินเหมาะสร้าง Resort , Homestay",price:40000,district:"บางซ้าย",province:"พระนครศรีอยุธยา",raw_size:"18 ไร่",land_size_wah:7200.0,land_size_sqm:28800.0,price_per_wah:6},
  {id:15,source:"kaidee",title:"ที่ดิน บ้านแพ้ว สมุทรสาคร มีโฉนด ขายสวนมะพร้าว บ้านแพ้ว",price:18900000,district:"บ้านแพ้ว",province:"สมุทรสาคร",raw_size:"10 ไร่",land_size_wah:4000.0,land_size_sqm:16000.0,price_per_wah:4725},
  {id:16,source:"kaidee",title:"ขายที่สวย 2 แปลง",price:10447500,district:"สันทราย",province:"เชียงใหม่",raw_size:"2786",land_size_wah:2786.0,land_size_sqm:11144.0,price_per_wah:3750},
  {id:17,source:"kaidee",title:"ที่ดินให้เช่าในเขตเทศบาล",price:20000,district:"บางซ้าย",province:"พระนครศรีอยุธยา",raw_size:"1 ไร่",land_size_wah:400.0,land_size_sqm:1600.0,price_per_wah:50},
  {id:18,source:"kaidee",title:"ขายที่ดินพระรามเก้า ซอย 62-64 ทำเลยดี ซอยสวย ใกล้เดอะไน",price:40391000,district:"ประเวศ",province:"กรุงเทพมหานคร",raw_size:"239 ตารางวา",land_size_wah:239.0,land_size_sqm:956.0,price_per_wah:169000},
  {id:19,source:"kaidee",title:"ขายด่วน ที่ดินศูนย์วิจัย ถูกที่สุดแปลงสุดท้าย 290,000 บ",price:116000000,district:"ห้วยขวาง",province:"กรุงเทพมหานคร",raw_size:"290000 ตารางวา",land_size_wah:290000.0,land_size_sqm:1160000.0,price_per_wah:400},
  {id:20,source:"kaidee",title:"ขายด่วน ที่ดินติดถนนรัชดาภิเษก ใกล้เมเจอร์รัชโยธินเพียง",price:195000000,district:"จตุจักร",province:"กรุงเทพมหานคร",raw_size:"500 ตารางวา",land_size_wah:500.0,land_size_sqm:2000.0,price_per_wah:390000},
  {id:21,source:"kaidee",title:"ขายที่สวนยาง 103 ไร่ โฉนดครุฑแดง ติดถนนคอนกรีต ยินดีรับ",price:103000000,district:"พุนพิน",province:"สุราษฎร์ธานี",raw_size:"103 ไร่",land_size_wah:41200.0,land_size_sqm:164800.0,price_per_wah:2500},
  {id:22,source:"kaidee",title:"แบ่งขายที่ดิน 300 ตรว. ราคาต่อรองได้ ซ.ลาดพร้าว 88-1(88",price:60000000,district:"วังทองหลาง",province:"กรุงเทพมหานคร",raw_size:"300 ตารางวา",land_size_wah:300.0,land_size_sqm:1200.0,price_per_wah:200000},
  {id:23,source:"kaidee",title:"ขายด่วน ที่ดินเปล่า 14 ไร่ ติดถนนดิน ทำเล ต.อาฮี อ.ท่าล",price:3200000,district:"ท่าลี่",province:"เลย",raw_size:"14 ไร่",land_size_wah:5600.0,land_size_sqm:22400.0,price_per_wah:571},
  {id:24,source:"kaidee",title:"ให้เช่าที่ดินดอนเมือง ติดแหล่งชุมชน เหมาะทำธุรกิจ",price:20000,district:"ดอนเมือง",province:"กรุงเทพมหานคร",raw_size:"2 ไร่",land_size_wah:800.0,land_size_sqm:3200.0,price_per_wah:25},
  {id:25,source:"kaidee",title:"🎊ที่ดินสวย 303 ตร.ว ใจกลางพิษณุโลกใกล้เซ็นทรัล✨ 6.5 ล้า",price:6500000,district:"เมือง",province:"พิษณุโลก",raw_size:"พิษณุโลก1212 ตารางเมตร",land_size_wah:303.0,land_size_sqm:1212.0,price_per_wah:21452},
  {id:26,source:"kaidee",title:"🔥 นักลงทุนห้ามพลาด ที่ดินศรีราชาฝั่งทะเล 1 ไร่ 195 ตร.ว",price:35700000,district:"ศรีราชา",province:"ชลบุรี",raw_size:"595 ตารางวา",land_size_wah:595.0,land_size_sqm:2380.0,price_per_wah:60000},
  {id:27,source:"kaidee",title:"🎉ขายที่ดินบ้านฉาง ระยอง ใกล้สนามบินอู่ตะเภา 6 ไร่ 89 ตร",price:65000000,district:"บ้านฉาง",province:"ระยอง",raw_size:"9600 ตารางเมตร",land_size_wah:2400.0,land_size_sqm:9600.0,price_per_wah:27083},
  {id:28,source:"kaidee",title:"ขายที่ดินแถวนครปฐม 2 งาน (200 ตร.วา) ราคา 990,000 บาท",price:899000,district:"สามพราน",province:"นครปฐม",raw_size:"200 ตารางวา",land_size_wah:200.0,land_size_sqm:800.0,price_per_wah:4495},
  {id:29,source:"kaidee",title:"ให้เช่าที่ดิน เพชรเกษม 118 - พุทธมณฑลสาย 4 18 ไร่",price:180000,district:"กระทุ่มแบน",province:"สมุทรสาคร",raw_size:"18 ไร่",land_size_wah:7200.0,land_size_sqm:28800.0,price_per_wah:25},
  {id:30,source:"kaidee",title:"ขายที่ดินนครปฐม 1 ไร่ 1งาน (500 ตร.วา) ราคา 2.39 ล้านบา",price:2290000,district:"เมือง",province:"นครปฐม",raw_size:"นครปฐม500 ตารางวา",land_size_wah:500.0,land_size_sqm:2000.0,price_per_wah:4580},
  {id:31,source:"kaidee",title:"ขายที่ดิน",price:3600000,district:"ห้วยเม็ก",province:"กาฬสินธุ์",raw_size:"4.2 ไร่",land_size_wah:1680.0,land_size_sqm:6720.0,price_per_wah:2143},
  {id:32,source:"kaidee",title:"ขายที่พร้อมสิ่งปลูกสร้าง",price:890000,district:"เมือง",province:"สกลนคร",raw_size:"สกลนคร92 ตารางวา",land_size_wah:92.0,land_size_sqm:368.0,price_per_wah:9674},
  {id:33,source:"kaidee",title:"🌴 สวรรค์ส่วนตัว เริ่มต้นที่นี่ ที่ดินติดชายหาด 28 ไร่ ท",price:95800000,district:"ทุ่งตะโก",province:"ชุมพร",raw_size:"27 ไร่",land_size_wah:10800.0,land_size_sqm:43200.0,price_per_wah:8870},
  {id:34,source:"kaidee",title:"ที่ดินเปล่าสวยๆ",price:1650000,district:"บางคล้า",province:"ฉะเชิงเทรา",raw_size:"3.3.58 ไร่",land_size_wah:1432.0,land_size_sqm:5728.0,price_per_wah:1152},
  {id:35,source:"kaidee",title:"Land reclamation 67 square wa, beautiful plot, next to ",price:2000000,district:"ลาดกระบัง",province:"กรุงเทพมหานคร",raw_size:"268 ตารางเมตร",land_size_wah:67.0,land_size_sqm:268.0,price_per_wah:29851},
  {id:36,source:"kaidee",title:"ที่ดิน + ห้องเช่า 3 ชั้น 370 ตร.ว. ที่ดิน + ห้องเช่า ซอ",price:31900000,district:"บึงกุ่ม",province:"กรุงเทพมหานคร",raw_size:"370 ตารางวา",land_size_wah:370.0,land_size_sqm:1480.0,price_per_wah:86216},
  {id:37,source:"kaidee",title:"ที่ดินเปล่า 36 ไร่ 279 ตร.ว. ที่ดิน ถนนแสงชูโต กาญจนบุร",price:12000000,district:"ไทรโยค",province:"กาญจนบุรี",raw_size:"36 ไร่",land_size_wah:14400.0,land_size_sqm:57600.0,price_per_wah:833},
  {id:38,source:"kaidee",title:"ขายยกแปลง ที่ดินนครชัยศรี 9 ไร่กว่า แบ่งแล้ว 10 โฉนด พร",price:38300000,district:"นครชัยศรี",province:"นครปฐม",raw_size:"3838",land_size_wah:3838.0,land_size_sqm:15352.0,price_per_wah:9979},
  {id:39,source:"kaidee",title:"ขายที่ดินพร้อมบ้านอยู่อาศัย",price:12900000,district:"วังสะพุง",province:"เลย",raw_size:"22.37 ไร่",land_size_wah:8948.0,land_size_sqm:35792.0,price_per_wah:1442},
  {id:40,source:"kaidee",title:"ขายที่ดินปัญญาอินทรา 103.4 ตรว. วิวสนามกอล์ฟ ราคา 5.7 ล",price:5700000,district:"คันนายาว",province:"กรุงเทพมหานคร",raw_size:"103.4 ตารางวา",land_size_wah:103.4,land_size_sqm:413.6,price_per_wah:55126},
  {id:41,source:"kaidee",title:"ขายที่ดิน ทำเลทอง หน้ากว้าง ติดถนนดำ",price:11385000,district:"อุทัย",province:"พระนครศรีอยุธยา",raw_size:"8280 ตารางวา",land_size_wah:8280.0,land_size_sqm:33120.0,price_per_wah:1375},
  {id:42,source:"kaidee",title:"ขายที่ดินเปล่า☘️ ถูกที่สุดในโครงการ 180 บางปู บีชเฮ้าส์",price:5400000,district:"เมือง",province:"สมุทรปราการ",raw_size:"สมุทรปราการ164 ตารางวา",land_size_wah:164.0,land_size_sqm:656.0,price_per_wah:32927},
  {id:43,source:"kaidee",title:"ที่ดินเปล่า 461 ตร.ว. ที่ดิน ซอยแจ้งวัฒนะ1 หลัง รร.ไผทอ",price:39646000,district:"บางเขน",province:"กรุงเทพมหานคร",raw_size:"1.61 ไร่",land_size_wah:644.0,land_size_sqm:2576.0,price_per_wah:61562},
  {id:44,source:"kaidee",title:"ที่ดินเปล่า 13 ไร่ 113 ตร.ว. ที่ดินเปล่า ใกล้วัดโพรงอาก",price:6000000,district:"บางน้ำเปรี้ยว",province:"ฉะเชิงเทรา",raw_size:"13.113 ไร่",land_size_wah:5245.2,land_size_sqm:20980.8,price_per_wah:1144},
  {id:45,source:"kaidee",title:"ให้เช่าที่ดินรามคำแหง 21 เนื้อที่ 600 ตารางวา แปลงสวย ท",price:70000,district:"วังทองหลาง",province:"กรุงเทพมหานคร",raw_size:"600 ตารางวา",land_size_wah:600.0,land_size_sqm:2400.0,price_per_wah:117},
  {id:46,source:"kaidee",title:"ขายที่ดินแปลงสวย สภาพแวดล้อมดี ใกล้ รพ.กรุงเทพ",price:91200000,district:"ห้วยขวาง",province:"กรุงเทพมหานคร",raw_size:"240 ตารางวา",land_size_wah:240.0,land_size_sqm:960.0,price_per_wah:380000},
  {id:47,source:"kaidee",title:"ขายที่ดินพระราม 9 ติดถนนใหญ่และสถานีรถไฟฟ้าสายสีส้ม ขึ้",price:350000,district:"ห้วยขวาง",province:"กรุงเทพมหานคร",raw_size:"4 ไร่",land_size_wah:1600.0,land_size_sqm:6400.0,price_per_wah:219},
  {id:48,source:"kaidee",title:"ขายที่ดินหนามแดง-บางพลี 1-3-58 ไร่ เข้าทาง ซอย หนามแดง ",price:30320000,district:"บางพลี",province:"สมุทรปราการ",raw_size:"758",land_size_wah:758.0,land_size_sqm:3032.0,price_per_wah:40000},
  {id:49,source:"kaidee",title:"ขายที่ดินเชียงใหม่ติดถนนติดแม่น้ำ",price:19900000,district:"เมือง",province:"เชียงใหม่",raw_size:"เชียงใหม่2777 ตารางวา",land_size_wah:2777.0,land_size_sqm:11108.0,price_per_wah:7166},
  {id:50,source:"kaidee",title:"ขายด่วน ที่ดินทำเลทอง 300 ไร่ ติดถนน 4 เลน สาย 3574 อ.ป",price:750000000,district:"ปลวกแดง",province:"ระยอง",raw_size:"300 ไร่",land_size_wah:120000.0,land_size_sqm:480000.0,price_per_wah:6250},
  {id:51,source:"kaidee",title:"ที่ดินสวยติดถนน ลาดยาง",price:95000,district:"วิเชียรบุรี",province:"เพชรบูรณ์",raw_size:"65 ไร่",land_size_wah:26000.0,land_size_sqm:104000.0,price_per_wah:4},
  {id:52,source:"kaidee",title:"ที่ดินในเมืองริมน้ำ ลำตะคอง (ปากช่อง-เขาใหญ่) 30 ไร่ 3 ",price:169235000,district:"ปากช่อง",province:"นครราชสีมา",raw_size:"30-3-8 ไร่",land_size_wah:3200.0,land_size_sqm:12800.0,price_per_wah:52886},
  {id:53,source:"kaidee",title:"ขายที่ดินสวยๆ",price:1450000,district:"เมือง",province:"นครปฐม",raw_size:"นครปฐม1899 ตารางวา",land_size_wah:1899.0,land_size_sqm:7596.0,price_per_wah:764},
  {id:54,source:"kaidee",title:"ที่ดินเปล่า 359.1 ตร.ว. ที่ดิน ถนนรามคำแหง ที่ดินใกล้แย",price:49000000,district:"บางกะปิ",province:"กรุงเทพมหานคร",raw_size:"359.1 ตารางวา",land_size_wah:359.1,land_size_sqm:1436.4,price_per_wah:136452},
  {id:55,source:"kaidee",title:"ที่ดิน +โกดัง 101 ตร.ว. ที่ดิน +โกดัง อยู่หลังตลาดป้าพร",price:9999000,district:"สายไหม",province:"กรุงเทพมหานคร",raw_size:"101 ตารางวา",land_size_wah:101.0,land_size_sqm:404.0,price_per_wah:99000},
  {id:56,source:"kaidee",title:"Phuwai hill resort",price:1600000,district:"ชะอำ",province:"เพชรบุรี",raw_size:"3 ไร่",land_size_wah:1200.0,land_size_sqm:4800.0,price_per_wah:1333},
  {id:57,source:"kaidee",title:"ขายที่ดิน 1ไร่ 2งาน สายไหมวัดเกาะ ที่ดินเปล่าหรือพร้อมโ",price:17000000,district:"สายไหม",province:"กรุงเทพมหานคร",raw_size:"600 ตารางวา",land_size_wah:600.0,land_size_sqm:2400.0,price_per_wah:28333},
  {id:58,source:"kaidee",title:"ขายที่ดินราคาถูก 393.9 ตารางวา คลองสาม คลองหลวง ปทุมธาน",price:3200000,district:"คลองหลวง",province:"ปทุมธานี",raw_size:"393.9 ตารางวา",land_size_wah:393.9,land_size_sqm:1575.6,price_per_wah:8124},
  {id:59,source:"kaidee",title:"ที่ดินพร้อมสิ่งปลูกสร้าง 1 ไร่ 355 ตร.ว. ที่ดินพร้อมสิ่",price:9900000,district:"เมือง",province:"กาญจนบุรี",raw_size:"กาญจนบุรี1.355 ไร่",land_size_wah:542.0,land_size_sqm:2168.0,price_per_wah:18266},
  {id:60,source:"kaidee",title:"ที่ดินแบ่งขาย",price:500000,district:"หนองแค",province:"สระบุรี",raw_size:"350 ตารางวา",land_size_wah:350.0,land_size_sqm:1400.0,price_per_wah:1429},
  {id:61,source:"kaidee",title:"ขายที่ดินพร้อมสิ่งปลูกสร้าง 114 ตร.ว. ลาดพร้าว 15 ทำเลใ",price:35500000,district:"จตุจักร",province:"กรุงเทพมหานคร",raw_size:"114 ตารางวา",land_size_wah:114.0,land_size_sqm:456.0,price_per_wah:311404},
  {id:62,source:"kaidee",title:"ขายด่วน ที่ดินสวย 98 ตร.ว. ราคา Net",price:800000,district:"คลองหลวง",province:"ปทุมธานี",raw_size:"98 ตารางวา",land_size_wah:98.0,land_size_sqm:392.0,price_per_wah:8163},
  {id:63,source:"kaidee",title:"ที่ดิน พร้อมสิ่งปลูกสร้าง 35 ตร.ว. ที่ดิน พร้อมสิ่งปลูก",price:650000,district:"จอมทอง",province:"กรุงเทพมหานคร",raw_size:"35 ตารางวา",land_size_wah:35.0,land_size_sqm:140.0,price_per_wah:18571},
  {id:64,source:"kaidee",title:"ขายที่ดินสุขุมวิท 52 เนื้อที่ 395 ตารางวา ที่ดินหัวมุม ",price:360000000,district:"พระโขนง",province:"กรุงเทพมหานคร",raw_size:"395 ตารางวา",land_size_wah:395.0,land_size_sqm:1580.0,price_per_wah:911392},
  {id:65,source:"kaidee",title:"ขายที่ดินเชิงเขา 1งาน เหมาะปลูกบ้านพักตากอากาศ หรือรีสอ",price:350000,district:"แม่จัน",province:"เชียงราย",raw_size:"100 ตารางวา",land_size_wah:100.0,land_size_sqm:400.0,price_per_wah:3500},
  {id:66,source:"kaidee",title:"ที่ดินเปล่า ปากช่อง 40 ไร่",price:231720000,district:"ปากช่อง",province:"นครราชสีมา",raw_size:"16204 ตารางวา",land_size_wah:16204.0,land_size_sqm:64816.0,price_per_wah:14300},
  {id:67,source:"kaidee",title:"ขายที่ดิน ทำเลดี นาบัว อ.บางละมุง พัทยา พื้นที่ 3-2-44 ",price:25000000,district:"บางละมุง",province:"ชลบุรี",raw_size:"3 ไร่",land_size_wah:1200.0,land_size_sqm:4800.0,price_per_wah:20833},
  {id:68,source:"kaidee",title:"ขายที่ดินสวย หลังโลตัสบางใหญ่ อำเภอบางกรวย เนื้อที่ 2-2",price:65000000,district:"บางกรวย",province:"นนทบุรี",raw_size:"1020 ตารางวา",land_size_wah:1020.0,land_size_sqm:4080.0,price_per_wah:63725},
  {id:69,source:"kaidee",title:"ที่ดินเปล่าโฉนด หน้าติดถนนคอนกรีต ด้านหลังติดแม่น้ำบางป",price:3500000,district:"บ้านสร้าง",province:"ปราจีนบุรี",raw_size:"532",land_size_wah:532.0,land_size_sqm:2128.0,price_per_wah:6579},
  {id:70,source:"kaidee",title:"ที่ดิน แถมสิ่งปลูกสร้าง 163 ตร.ว. ที่ดิน แถมสิ่งปลูกสร้",price:87650000,district:"วัฒนา",province:"กรุงเทพมหานคร",raw_size:"163 ตารางวา",land_size_wah:163.0,land_size_sqm:652.0,price_per_wah:537730},
  {id:71,source:"ddproperty",title:"ที่ดินแปลงสวย ศรีราชา-วัดเขาแตงอ่อน ค่ายลูกเสือ ชลบุรี",price:4500000,district:"ศรีราชา",province:"ชลบุรี",raw_size:"1 ไร่ 98 ตร.วา",land_size_wah:498.0,land_size_sqm:1992.0,price_per_wah:9036},
  {id:72,source:"ddproperty",title:"ขายที่ดินเปล่า หลักหก เมืองปทุม ใกล้สถานีรถไฟฟ้า ซอยเจร",price:3900000,district:"เมืองปทุมธานี",province:"ปทุมธานี",raw_size:"121 ตร.วา",land_size_wah:121.0,land_size_sqm:484.0,price_per_wah:32231},
  {id:73,source:"ddproperty",title:"ขายที่ดินแปลงมุม ถมแล้ว ซอยประเสริฐมนูกิจ 46",price:9000000,district:"บึงกุ่ม",province:"กรุงเทพ",raw_size:"135 ตร.วา",land_size_wah:135.0,land_size_sqm:540.0,price_per_wah:66667},
  {id:74,source:"ddproperty",title:"ขาย ที่ดินเพื่อการลงทุน",price:236327000,district:"สามพราน",province:"นครปฐม",raw_size:"23 ไร่ 1 งาน 41 ตร.วา",land_size_wah:9341.0,land_size_sqm:37364.0,price_per_wah:25300},
  {id:75,source:"ddproperty",title:"ขายที่ดินพร้อมบ้านสไตล์รีสอร์ท ท่ามกลางสวนทุเรียน",price:22500000,district:"มะขาม",province:"จันทบุรี",raw_size:"11 ไร่ 7 ตร.วา",land_size_wah:4407.0,land_size_sqm:17628.0,price_per_wah:5106},
  {id:76,source:"ddproperty",title:"ขายที่ดิน ติดทะเล ชะอำ บางเก่า หน้าติดทะเล 50 เมตร",price:108000000,district:"ชะอำ",province:"เพชรบุรี",raw_size:"3 ไร่",land_size_wah:1200.0,land_size_sqm:4800.0,price_per_wah:90000},
  {id:77,source:"ddproperty",title:"ขายที่ดิน 91 ไร่ เขาใหญ่ ใกล้ InterCon สวอนเลค",price:500500000,district:"ปากช่อง",province:"นครราชสีมา",raw_size:"91 ไร่",land_size_wah:36400.0,land_size_sqm:145600.0,price_per_wah:13750},
  {id:78,source:"ddproperty",title:"ที่ดิน เขาใหญ่ 41 ไร่ วิวสวยมาก ใกล้รร.อินเตอร์คอนฯ ทอส",price:225500000,district:"ปากช่อง",province:"นครราชสีมา",raw_size:"41 ไร่",land_size_wah:16400.0,land_size_sqm:65600.0,price_per_wah:13750},
  {id:79,source:"ddproperty",title:"ที่ดินสวย ทำเลทองติดถนนใหญ่ ใกล้แหล่งชุมชน",price:62100000,district:"สอยดาว",province:"จันทบุรี",raw_size:"138 ไร่ 3 งาน 71 ตร.วา",land_size_wah:55571.0,land_size_sqm:222284.0,price_per_wah:1117},
  {id:80,source:"ddproperty",title:"ที่ดินซอยเอแบค โคตรถูก ไม่ถึง 5 ล้าน/ไร่",price:9990000,district:"บางเสาธง",province:"สมุทรปราการ",raw_size:"2 ไร่",land_size_wah:800.0,land_size_sqm:3200.0,price_per_wah:12488},
  {id:81,source:"ddproperty",title:"เหลือแปลงสุดท้ายซอยติวานนท์ 24 หน้ากว้างติดถนน ถมแล้ว",price:42000000,district:"เมืองนนทบุรี",province:"นนทบุรี",raw_size:"1 ไร่ 2 งาน",land_size_wah:600.0,land_size_sqm:2400.0,price_per_wah:70000},
  {id:82,source:"ddproperty",title:"ขาย/ให้เช่า ที่ดินแปลงใหญ่ติดถนนพระราม 9 เนื้อที่ 7-2-8",price:1542500000,district:"ห้วยขวาง",province:"กรุงเทพ",raw_size:"7 ไร่ 2 งาน 85 ตร.วา",land_size_wah:3085.0,land_size_sqm:12340.0,price_per_wah:500000},
  {id:83,source:"ddproperty",title:"ขายที่ดิน 78 ไร่ ติดถนนพหลโยธิน ใกล้มหาวิทยาลัยธรรมศาสต",price:1450000000,district:"คลองหลวง",province:"ปทุมธานี",raw_size:"78 ไร่ 10 ตร.วา",land_size_wah:31210.0,land_size_sqm:124840.0,price_per_wah:46459},
  {id:84,source:"ddproperty",title:"ขายที่ดินเปล่า 1,940 ไร่ (แยกขาย 3 กลุ่ม) ติดถนนเพชรเกษ",price:4617973000,district:"ชะอำ",province:"เพชรบุรี",raw_size:"1940 ไร่ 1 งาน 14 ตร.วา",land_size_wah:776114.0,land_size_sqm:3104456.0,price_per_wah:5950},
  {id:85,source:"ddproperty",title:"ขายที่ดินเปล่า 345 ตร.ว กฤษฎานคร 25 ถมแล้ว บรรยากาศดี",price:3277500,district:"มีนบุรี",province:"กรุงเทพ",raw_size:"345 ตร.วา",land_size_wah:345.0,land_size_sqm:1380.0,price_per_wah:9500},
  {id:86,source:"ddproperty",title:"ขายที่ดิน 197 ตรว เพชรเกษม 58 ทำเลดี ใกล้ MRT ภาษีเจริญ",price:5614500,district:"ภาษีเจริญ",province:"กรุงเทพ",raw_size:"197 ตร.วา",land_size_wah:197.0,land_size_sqm:788.0,price_per_wah:28500},
  {id:87,source:"ddproperty",title:"ขายที่ดิน 431 ตารางวา โชคชัย 4 แยก 12 ถนนลาดพร้าว",price:43100000,district:"ลาดพร้าว",province:"กรุงเทพ",raw_size:"1 ไร่ 31 ตร.วา",land_size_wah:431.0,land_size_sqm:1724.0,price_per_wah:100000},
  {id:88,source:"ddproperty",title:"ขายที่ดินสวย 9-2-98 ไร่ ในชะอำ",price:9700000,district:"ชะอำ",province:"เพชรบุรี",raw_size:"9 ไร่ 2 งาน 28 ตร.วา",land_size_wah:3828.0,land_size_sqm:15312.0,price_per_wah:2534},
  {id:89,source:"ddproperty",title:"ที่ดินติดสนามกอล์ฟสปริงฟิลด์ 1-2-0 ไร่ ติดถนน วิวเขา",price:2490000,district:"ชะอำ",province:"เพชรบุรี",raw_size:"1 ไร่ 2 งาน",land_size_wah:600.0,land_size_sqm:2400.0,price_per_wah:4150},
  {id:90,source:"ddproperty",title:"ที่ดินริมอ่างเก็บน้ำ 2-0-8 ไร่ วิวธรรมชาติในสปริงฟิลด์ ",price:9500000,district:"ชะอำ",province:"เพชรบุรี",raw_size:"2 ไร่ 8 ตร.วา",land_size_wah:808.0,land_size_sqm:3232.0,price_per_wah:11757},
  {id:91,source:"ddproperty",title:"2,000 ตร.ม. ที่ดินสำหรับขาย (Laz118654) Palm Hills Golf",price:7900000,district:"ชะอำ",province:"เพชรบุรี",raw_size:"1 ไร่ 1 งาน",land_size_wah:500.0,land_size_sqm:2000.0,price_per_wah:15800},
  {id:92,source:"ddproperty",title:"ขายที่ดิน 48,224 ตร.ม. (Laz116577)",price:42196000,district:"หัวหิน",province:"ประจวบคีรีขันธ์",raw_size:"30 ไร่ 56 ตร.วา",land_size_wah:12056.0,land_size_sqm:48224.0,price_per_wah:3500},
  {id:93,source:"ddproperty",title:"ขายที่ดิน 22,815 ตร.ม. (Laz146885)",price:142000000,district:"หัวหิน",province:"ประจวบคีรีขันธ์",raw_size:"14 ไร่ 1 งาน 4 ตร.วา",land_size_wah:5704.0,land_size_sqm:22816.0,price_per_wah:24895},
  {id:94,source:"ddproperty",title:"ขายที่ดิน 1,600 ตร.ม. ใกล้หาดทรายน้อย (Laz117716)",price:5500000,district:"หัวหิน",province:"ประจวบคีรีขันธ์",raw_size:"400 ตร.วา",land_size_wah:400.0,land_size_sqm:1600.0,price_per_wah:13750},
  {id:95,source:"ddproperty",title:"ขายที่ดินติดหาด 31,600 ตร.ม. (Laz113070)",price:41475000,district:"บางสะพานน้อย",province:"ประจวบคีรีขันธ์",raw_size:"19 ไร่ 3 งาน",land_size_wah:7900.0,land_size_sqm:31600.0,price_per_wah:5250},
];
// SEED ใช้ข้อมูลจริงจาก Kaidee + DDProperty
const SEED = REAL_LANDS.map(r => ({...r, price: String(r.price)}));

/* ── FEATURED LANDS — โฉนดยืนยันแล้ว 17 แปลง (ของเจ้าของแพลตฟอร์ม) ── */
const FEATURED_LANDS = [
  {id:"F01",source:"owner",featured:true,
   title:"ที่ดินสากเหล็ก แปลง 1 — โฉนด 12760",
   deed_no:"12760",land_no:"303",survey:"50411 6020",
   district:"สากเหล็ก",province:"พิจิตร",tambon:"สากเหล็ก",
   raw_size:"57.10 ตร.ว.",land_size_wah:57.1,land_size_sqm:228.4,
   price:0,price_per_wah:0,owner:"นางสาวณัฐขยาน์ แสงงาม",
   note:"ติดถนนสาธารณะ · โฉนดน.ส.4จ. · ยืนยันแล้ว"},
  {id:"F02",source:"owner",featured:true,
   title:"ที่ดินสากเหล็ก แปลง 2 — โฉนด 12759",
   deed_no:"12759",land_no:"302",survey:"50411 6020",
   district:"สากเหล็ก",province:"พิจิตร",tambon:"สากเหล็ก",
   raw_size:"57 ตร.ว.",land_size_wah:57.0,land_size_sqm:228.0,
   price:0,price_per_wah:0,owner:"นางสาวณัฐขยาน์ แสงงาม",
   note:"ติดถนนสาธารณะ · โฉนดน.ส.4จ. · ยืนยันแล้ว"},
  {id:"F03",source:"owner",featured:true,
   title:"ที่ดินสากเหล็ก แปลง 3 — โฉนด 12761",
   deed_no:"12761",land_no:"304",survey:"50411 6020",
   district:"สากเหล็ก",province:"พิจิตร",tambon:"สากเหล็ก",
   raw_size:"1 งาน 46.5 ตร.ว.",land_size_wah:146.5,land_size_sqm:586.0,
   price:0,price_per_wah:0,owner:"นางสาวณัฐขยาน์ แสงงาม",
   note:"โฉนดน.ส.4จ. · ยืนยันแล้ว"},
  {id:"F04",source:"owner",featured:true,
   title:"ที่ดินสากเหล็ก แปลง 4 — โฉนด 12762",
   deed_no:"12762",land_no:"304",survey:"50411 6020",
   district:"สากเหล็ก",province:"พิจิตร",tambon:"สากเหล็ก",
   raw_size:"1 งาน 33 ตร.ว.",land_size_wah:133.0,land_size_sqm:532.0,
   price:0,price_per_wah:0,owner:"นางสาวณัฐขยาน์ แสงงาม",
   note:"โฉนดน.ส.4จ. · ยืนยันแล้ว"},
  {id:"F05",source:"owner",featured:true,
   title:"ที่ดินสากเหล็ก แปลง 5 — โฉนด 12758",
   deed_no:"12758",land_no:"303",survey:"50411 6020",
   district:"สากเหล็ก",province:"พิจิตร",tambon:"สากเหล็ก",
   raw_size:"1 งาน 36.5 ตร.ว.",land_size_wah:136.5,land_size_sqm:546.0,
   price:0,price_per_wah:0,owner:"นางสาวณัฐขยาน์ แสงงาม",
   note:"โฉนดน.ส.4จ. · ยืนยันแล้ว"},
  {id:"F06",source:"owner",featured:true,
   title:"ที่ดินบางกระทุ่ม แปลง 6 — โฉนด 26465",
   deed_no:"26465",land_no:"423",survey:"5042 II 5628",
   district:"บางกระทุ่ม",province:"พิษณุโลก",tambon:"เนินกุ่ม",
   raw_size:"25.1 ตร.ว.",land_size_wah:25.1,land_size_sqm:100.4,
   price:0,price_per_wah:0,owner:"นางสุวรินทร์ แสงงาม",
   note:"โฉนดน.ส.4จ. · ยืนยันแล้ว"},
  {id:"F07",source:"owner",featured:true,
   title:"ที่ดินบางกระทุ่ม แปลง 7 — โฉนด 26564",
   deed_no:"26564",land_no:"422",survey:"5042 II 5628",
   district:"บางกระทุ่ม",province:"พิษณุโลก",tambon:"เนินกุ่ม",
   raw_size:"25 ตร.ว.",land_size_wah:25.0,land_size_sqm:100.0,
   price:0,price_per_wah:0,owner:"นางสุวรินทร์ แสงงาม",
   note:"โฉนดน.ส.4จ. · ยืนยันแล้ว"},
  {id:"F08",source:"owner",featured:true,
   title:"ที่ดินบางกระทุ่ม แปลง 8 — โฉนด 26562",
   deed_no:"26562",land_no:"421",survey:"5042 II 5628",
   district:"บางกระทุ่ม",province:"พิษณุโลก",tambon:"เนินกุ่ม",
   raw_size:"25 ตร.ว.",land_size_wah:25.0,land_size_sqm:100.0,
   price:0,price_per_wah:0,owner:"นางสุวรินทร์ แสงงาม",
   note:"โฉนดน.ส.4จ. · ยืนยันแล้ว"},
  {id:"F09",source:"owner",featured:true,
   title:"ที่ดินบางกระทุ่ม แปลง 9 — โฉนด 26560",
   deed_no:"26560",land_no:"419",survey:"5042 II 5628",
   district:"บางกระทุ่ม",province:"พิษณุโลก",tambon:"เนินกุ่ม",
   raw_size:"25 ตร.ว.",land_size_wah:25.0,land_size_sqm:100.0,
   price:0,price_per_wah:0,owner:"นางสุวรินทร์ แสงงาม",
   note:"โฉนดน.ส.4จ. · ยืนยันแล้ว"},
  {id:"F10",source:"owner",featured:true,
   title:"ที่ดินบางกระทุ่ม แปลง 10 — โฉนด 26562",
   deed_no:"26562",land_no:"420",survey:"5042 II 5628",
   district:"บางกระทุ่ม",province:"พิษณุโลก",tambon:"เนินกุ่ม",
   raw_size:"25 ตร.ว.",land_size_wah:25.0,land_size_sqm:100.0,
   price:0,price_per_wah:0,owner:"นางสุวรินทร์ แสงงาม",
   note:"โฉนดน.ส.4จ. · ยืนยันแล้ว"},
  {id:"F11",source:"owner",featured:true,
   title:"ที่ดินบางกระทุ่ม แปลง 11 — โฉนด 26560",
   deed_no:"26560",land_no:"418",survey:"5042 II 5628",
   district:"บางกระทุ่ม",province:"พิษณุโลก",tambon:"เนินกุ่ม",
   raw_size:"25 ตร.ว.",land_size_wah:25.0,land_size_sqm:100.0,
   price:0,price_per_wah:0,owner:"นางสุวรินทร์ แสงงาม",
   note:"โฉนดน.ส.4จ. · ยืนยันแล้ว"},
  {id:"F12",source:"owner",featured:true,
   title:"ที่ดินสากเหล็ก แปลงใหญ่ — โฉนด 12725",
   deed_no:"12725",land_no:"2464",survey:"5041 I 6020",
   district:"สากเหล็ก",province:"พิจิตร",tambon:"สากเหล็ก",
   raw_size:"3 ไร่ 7.5 ตร.ว.",land_size_wah:1207.5,land_size_sqm:4830.0,
   price:0,price_per_wah:0,owner:"นางสาวณัฐขยาน์ แสงงาม",
   note:"ขนาดใหญ่ 3 ไร่เศษ · โฉนดน.ส.4จ. · ยืนยันแล้ว"},
  {id:"F13",source:"owner",featured:true,
   title:"ที่ดินสากเหล็ก — โฉนด 12724",
   deed_no:"12724",land_no:"2467",survey:"5041 I 6020",
   district:"สากเหล็ก",province:"พิจิตร",tambon:"สากเหล็ก",
   raw_size:"1 ไร่ 3 งาน 4.5 ตร.ว.",land_size_wah:704.5,land_size_sqm:2818.0,
   price:0,price_per_wah:0,owner:"นางสาวณัฐขยาน์ แสงงาม",
   note:"โฉนดน.ส.4จ. · ยืนยันแล้ว"},
  {id:"F14",source:"owner",featured:true,
   title:"ที่ดินสากเหล็ก แปลง 14 — โฉนด 12764",
   deed_no:"12764",land_no:"307",survey:"50411 6020",
   district:"สากเหล็ก",province:"พิจิตร",tambon:"สากเหล็ก",
   raw_size:"45.5 ตร.ว.",land_size_wah:45.5,land_size_sqm:182.0,
   price:0,price_per_wah:0,owner:"นางสาวณัฐขยาน์ แสงงาม",
   note:"โฉนดน.ส.4จ. · ยืนยันแล้ว"},
  {id:"F15",source:"owner",featured:true,
   title:"ที่ดินสากเหล็ก แปลง 15 — โฉนด 12763",
   deed_no:"12763",land_no:"306",survey:"50411 6020",
   district:"สากเหล็ก",province:"พิจิตร",tambon:"สากเหล็ก",
   raw_size:"43 ตร.ว.",land_size_wah:43.0,land_size_sqm:172.0,
   price:0,price_per_wah:0,owner:"นางสาวณัฐขยาน์ แสงงาม",
   note:"โฉนดน.ส.4จ. · ยืนยันแล้ว"},
  {id:"F16",source:"owner",featured:true,
   title:"ที่ดินสากเหล็ก — โฉนด 12725 แปลง 16",
   deed_no:"12725",land_no:"2464",survey:"5041 I 6020",
   district:"สากเหล็ก",province:"พิจิตร",tambon:"สากเหล็ก",
   raw_size:"1 ไร่ 16.5 ตร.ว.",land_size_wah:416.5,land_size_sqm:1666.0,
   price:0,price_per_wah:0,owner:"นางสาวณัฐขยาน์ แสงงาม",
   note:"โฉนดน.ส.4จ. · ยืนยันแล้ว"},
  {id:"F17",source:"owner",featured:true,
   title:"ที่ดินบางบัวทอง นนทบุรี — โฉนด 11495",
   deed_no:"11495",land_no:"6ส4",survey:"99 5136 III 2014-5",
   district:"บางบัวทอง",province:"นนทบุรี",tambon:"บางบัวทอง",
   raw_size:"66 ตร.ว.",land_size_wah:66.0,land_size_sqm:264.0,
   price:0,price_per_wah:0,owner:"นางวรวรม ปฐมวิรุจน์",
   note:"ใกล้เมือง ปริมณฑล · โฉนดน.ส.4จ. · ยืนยันแล้ว"},
];


/* ── Global Styles ── */
function GlobalStyles() {
  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = `
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:'Noto Sans Thai','Sarabun',sans-serif;background:#F7F3EC;}
      @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      @keyframes fadeUp{from{opacity:0;transform:translateX(-50%) translateY(14px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
      @keyframes tabFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      input,textarea,select{font-family:'Noto Sans Thai','Sarabun',sans-serif;outline:none;}
      button{font-family:'Noto Sans Thai','Sarabun',sans-serif;cursor:pointer;}
      .trow:hover{background:#EDE6D8!important;}
      .irow:hover{background:#1C2128!important;}
      ::-webkit-scrollbar{height:5px;width:5px;}
      ::-webkit-scrollbar-track{background:#EDE6D8;}
      ::-webkit-scrollbar-thumb{background:#C8BBA8;border-radius:10px;}
    `;
    document.head.appendChild(s);
    return () => document.head.removeChild(s);
  }, []);
  return null;
}

/* ── Toast ── */
function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",
      background:C.bark,color:C.cream,padding:"11px 26px",borderRadius:30,fontSize:13,
      zIndex:1000,whiteSpace:"nowrap",boxShadow:"0 6px 24px rgba(0,0,0,.22)",animation:"fadeUp .3s ease"}}>
      {msg}
    </div>
  );
}

/* ── Overlay ── */
function Overlay({ onClose, children }) {
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{position:"fixed",inset:0,background:"rgba(10,8,6,.65)",backdropFilter:"blur(6px)",
        zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      {children}
    </div>
  );
}

/* ── Navbar ── */

/* ══════════════════════════════════════════════════════════════
   CREDIT SYSTEM — State, Badge, Packages, Confirm Modal
══════════════════════════════════════════════════════════════ */

/* ── Credit Badge (Navbar) ── */
function CreditBadge({ credits, onClick }) {
  const low = credits <= 2;
  return (
    <button onClick={onClick} style={{
      display:"flex", alignItems:"center", gap:5,
      padding:"5px 12px",
      background: low ? "#FFF0F0" : "#EAF2EC",
      border:`1px solid ${low ? C.danger+"55" : C.forest+"55"}`,
      borderRadius:20, cursor:"pointer", transition:"all .2s",
    }}
    onMouseEnter={e=>e.currentTarget.style.transform="scale(1.04)"}
    onMouseLeave={e=>e.currentTarget.style.transform="none"}>
      <span style={{fontSize:13}}>🪙</span>
      <span style={{fontFamily:"monospace",fontWeight:700,fontSize:13,
        color:low?C.danger:C.forest}}>{credits}</span>
      <span style={{fontSize:10,color:low?C.danger:C.forest,fontWeight:600}}>
        {low?"ใกล้หมด":"เครดิต"}
      </span>
    </button>
  );
}

/* ── Stepper Bar ── */
function StepperBar({ current }) {
  const steps = ["🔍 ค้นหา","📄 นำเข้า","📊 วิเคราะห์","📋 รายงาน"];
  const idx   = ["l1","intake","engine","report"].indexOf(current);
  return (
    <div style={{
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:"10px 24px", background:C.white,
      borderBottom:`1px solid ${C.sand}`, gap:0,
    }}>
      {steps.map((s,i) => (
        <div key={s} style={{display:"flex",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{
              width:24, height:24, borderRadius:"50%",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:10, fontWeight:700,
              background: i < idx ? C.forest : i===idx ? C.amber : C.creamDk,
              color: i <= idx ? C.white : C.mist,
              transition:"all .3s",
            }}>
              {i < idx ? "✓" : i+1}
            </div>
            <span style={{
              fontSize:11, fontWeight: i===idx ? 700 : 400,
              color: i===idx ? C.bark : C.mist,
              whiteSpace:"nowrap",
            }}>{s}</span>
          </div>
          {i < steps.length-1 && (
            <div style={{
              width:32, height:1.5, marginLeft:8,
              background: i < idx ? C.forest : C.creamDk,
              transition:"background .3s",
            }}/>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Navbar v3 — 4 เมนู + Credit + เติมเครดิต ── */
function Navbar({ screen, credits, onGoHome, onGoIntake, onGoEngine,
                  onGoReport, onGoActivity, onOpenCredits, onToast }) {
  const MENUS = [
    { id:"l1",       label:"🏠 หน้าหลัก" },
    { id:"intake",   label:"📄 นำเข้าที่ดิน" },
    { id:"engine",   label:"📊 ตารางวิเคราะห์" },
    { id:"activity", label:"🎯 Activity Engine" },
    { id:"report",   label:"📋 รายงาน" },
  ];
  const handlers = { l1:onGoHome, intake:onGoIntake, engine:onGoEngine, report:onGoReport, activity:onGoActivity };

  const showStepper = ["intake","engine","report"].includes(screen);

  return (
    <>
      <nav style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 24px", height:58, background:C.white,
        borderBottom:`1px solid ${C.sand}`,
        position:"sticky", top:0, zIndex:200,
      }}>
        {/* Logo */}
        <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}
          onClick={onGoHome}>
          <div style={{width:32,height:32,background:C.bark,borderRadius:8,
            display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              {/* X shape — left-rising arm (graph line) */}
              <line x1="2" y1="16" x2="16" y2="2" stroke="#C9A96E" strokeWidth="2.5" strokeLinecap="round"/>
              {/* X shape — right arm (building structure) */}
              <line x1="2" y1="2" x2="16" y2="16" stroke="#4E8A65" strokeWidth="2.5" strokeLinecap="round"/>
              {/* Graph dot on top of rising arm */}
              <circle cx="16" cy="2" r="2" fill="#C9A96E"/>
              <circle cx="9" cy="9" r="1.5" fill="#F7F3EC"/>
            </svg>
          </div>
          <div>
            <div style={{fontFamily:"'Georgia',serif",fontWeight:700,fontSize:17,
              color:C.bark,letterSpacing:".02em"}}>
              Feas<span style={{color:C.forest}}>X</span>
            </div>
            <div style={{fontSize:9,color:C.amber,letterSpacing:".14em",
              textTransform:"uppercase",marginTop:-2}}>
              Smart Feasibility
            </div>
          </div>
        </div>

        {/* Menu tabs */}
        <div style={{display:"flex",gap:2,background:C.creamDk,borderRadius:10,padding:3}}>
          {MENUS.map(m => {
            const active = screen === m.id;
            return (
              <button key={m.id} onClick={handlers[m.id]} style={{
                padding:"6px 13px", borderRadius:8, border:"none", fontSize:12,
                fontWeight: active ? 700 : 400, cursor:"pointer",
                background: active ? C.white : "transparent",
                color: active ? C.bark : C.mist,
                boxShadow: active ? "0 1px 6px rgba(44,36,22,.1)" : "none",
                transition:"all .2s",
                borderBottom: active ? `2px solid ${C.amber}` : "2px solid transparent",
              }}>
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Right — Credit + Topup */}
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <CreditBadge credits={credits} onClick={onOpenCredits}/>
          <button onClick={onOpenCredits} style={{
            padding:"6px 14px", background:C.amber, color:C.white,
            border:"none", borderRadius:20, fontSize:12, fontWeight:700,
            cursor:"pointer", transition:"all .2s",
          }}
          onMouseEnter={e=>e.currentTarget.style.background=C.amberLt}
          onMouseLeave={e=>e.currentTarget.style.background=C.amber}>
            + เติมเครดิต
          </button>
          <button onClick={()=>onToast("กรุณาเข้าสู่ระบบ")} style={{
            padding:"6px 14px", border:`1px solid ${C.sand}`,
            borderRadius:8, background:"transparent",
            color:C.barkLt, fontSize:12, cursor:"pointer",
          }}>
            เข้าสู่ระบบ
          </button>
        </div>
      </nav>
      {showStepper && <StepperBar current={screen}/>}
    </>
  );
}

/* ── Credit Confirm Modal — 1 คลิก ── */
function CreditConfirmModal({ credits, landName, onConfirm, onClose }) {
  return (
    <Overlay onClose={onClose}>
      <div style={{
        background:C.white, borderRadius:16, maxWidth:320, width:"100%",
        padding:"28px 24px", textAlign:"center",
        boxShadow:"0 20px 60px rgba(44,36,22,.24)", animation:"slideUp .25s ease",
      }}>
        <div style={{
          width:52, height:52, borderRadius:"50%",
          background:"#EAF2EC", border:`2px solid ${C.forest}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:22, margin:"0 auto 14px",
        }}>🪙</div>
        <div style={{fontFamily:"Georgia,serif",fontSize:17,fontWeight:700,color:C.bark,marginBottom:6}}>
          ใช้ 1 เครดิต
        </div>
        <div style={{fontSize:13,color:C.barkLt,marginBottom:10}}>{landName}</div>
        <div style={{
          background:C.creamDk, borderRadius:8,
          padding:"7px 14px", fontSize:12, color:C.barkLt,
          display:"inline-block", marginBottom:20,
        }}>
          คงเหลือหลังใช้: <strong style={{color:C.forest}}>{credits-1} แปลง</strong>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={onClose} style={{
            flex:1, padding:"11px", border:`1px solid ${C.sand}`,
            borderRadius:9, background:"transparent",
            color:C.barkLt, fontSize:13, cursor:"pointer",
          }}>ยกเลิก</button>
          <button onClick={onConfirm} style={{
            flex:2, padding:"11px", border:"none", borderRadius:9,
            background:`linear-gradient(135deg,${C.forest},${C.forestLt})`,
            color:C.white, fontSize:13, fontWeight:700, cursor:"pointer",
          }}>ยืนยัน — ดูทันที →</button>
        </div>
      </div>
    </Overlay>
  );
}

/* ── Credit Package Modal ── */
function CreditPackageModal({ onClose, onBuy }) {
  const pkgs = [
    { id:"single",  credits:1,   price:490,  perUnit:490,  label:"ลองใช้",    badge:null,        popular:false, saving:null },
    { id:"five",    credits:5,   price:1990, perUnit:398,  label:"ยอดนิยม",   badge:"⭐ ยอดนิยม", popular:true,  saving:"ประหยัด ฿460" },
    { id:"ten",     credits:10,  price:3490, perUnit:349,  label:"คุ้มที่สุด", badge:"🏆 ดีที่สุด", popular:false, saving:"ประหยัด ฿1,410" },
    { id:"monthly", credits:999, price:1990, perUnit:0,    label:"Pro รายเดือน",badge:"∞ PRO",    popular:false, saving:"Unlimited" },
  ];
  return (
    <Overlay onClose={onClose}>
      <div style={{
        background:C.white, borderRadius:20, maxWidth:640, width:"100%",
        overflow:"hidden", boxShadow:"0 24px 64px rgba(44,36,22,.26)",
        animation:"slideUp .28s ease", maxHeight:"90vh", overflowY:"auto",
      }}>
        <button onClick={onClose} style={{position:"absolute",top:14,right:14,
          background:C.creamDk,border:"none",borderRadius:"50%",
          width:28,height:28,fontSize:14,cursor:"pointer",color:C.barkLt,zIndex:1}}>✕</button>

        {/* Header */}
        <div style={{background:C.bark,padding:"24px 28px 20px",textAlign:"center"}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:".16em",textTransform:"uppercase",
            color:C.amberLt,marginBottom:8}}>เลือกแพ็กเกจ</div>
          <div style={{fontFamily:"Georgia,serif",fontSize:20,fontWeight:700,color:C.white,marginBottom:4}}>
            เครดิตวิเคราะห์ที่ดิน
          </div>
          <div style={{fontSize:13,color:"rgba(255,255,255,.55)"}}>
            จ่ายครั้งเดียว ไม่มีรายเดือน · ใช้ได้ไม่มีวันหมดอายุ
          </div>
        </div>

        {/* Package grid */}
        <div style={{padding:"24px",display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12}}>
          {pkgs.map(p => (
            <div key={p.id} onClick={()=>onBuy(p)} style={{
              background: p.popular ? C.bark : C.white,
              border: p.popular ? `2px solid ${C.amber}` : `1px solid ${C.sand}`,
              borderRadius:14, padding:"18px 16px",
              cursor:"pointer", position:"relative",
              transition:"transform .15s, box-shadow .15s",
              boxShadow: p.popular ? "0 6px 24px rgba(44,36,22,.18)" : "none",
            }}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";
              e.currentTarget.style.boxShadow="0 8px 28px rgba(44,36,22,.16)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="none";
              e.currentTarget.style.boxShadow=p.popular?"0 6px 24px rgba(44,36,22,.18)":"none";}}>

              {p.badge && (
                <div style={{
                  position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",
                  background:p.badge.includes("PRO")?C.inv_green:p.popular?C.amber:C.forest,
                  color:"#fff",fontSize:9,fontWeight:700,letterSpacing:".1em",
                  padding:"3px 12px",borderRadius:20,whiteSpace:"nowrap",
                }}>{p.badge}</div>
              )}

              <div style={{
                fontFamily:"Georgia,serif",
                fontSize:p.id==="monthly"?15:26,fontWeight:700,
                color:p.popular?C.cream:C.bark,
                marginTop:p.badge?8:0,marginBottom:3,
              }}>
                {p.id==="monthly"?"ไม่จำกัด":`${p.credits} แปลง`}
              </div>

              <div style={{fontSize:10,fontWeight:600,textTransform:"uppercase",
                letterSpacing:".1em",color:p.popular?C.amberLt:C.amber,marginBottom:10}}>
                {p.label}
              </div>

              <div style={{fontFamily:"monospace",fontSize:22,fontWeight:700,
                color:p.popular?C.white:C.forest,marginBottom:3}}>
                ฿{p.price.toLocaleString()}
                {p.id==="monthly"&&<span style={{fontSize:11,fontWeight:400,
                  color:p.popular?"rgba(255,255,255,.5)":C.mist}}>/เดือน</span>}
              </div>

              {p.perUnit>0 && (
                <div style={{fontSize:11,color:p.popular?"rgba(255,255,255,.5)":C.mist,marginBottom:8}}>
                  ฿{p.perUnit}/แปลง
                </div>
              )}

              {p.saving && (
                <div style={{
                  fontSize:11,fontWeight:600,
                  color:p.popular?C.amberLt:C.forest,
                  background:p.popular?"rgba(255,255,255,.08)":"#EAF2EC",
                  borderRadius:6,padding:"3px 8px",
                  display:"inline-block",marginBottom:10,
                }}>✓ {p.saving}</div>
              )}

              <div style={{
                width:"100%",padding:"9px 0",
                background:p.popular
                  ?`linear-gradient(135deg,${C.amber},${C.amberLt})`
                  :C.creamDk,
                borderRadius:8,fontSize:12,fontWeight:700,
                color:p.popular?C.bark:C.barkLt,
                textAlign:"center",marginTop:8,
              }}>
                {p.id==="monthly"?"เริ่ม Pro →":"เลือกแพ็กนี้ →"}
              </div>
            </div>
          ))}
        </div>

        <div style={{textAlign:"center",padding:"0 24px 20px",fontSize:12,color:C.mist}}>
          🔐 ชำระผ่าน PromptPay / บัตรเครดิต · ปลอดภัย 100%
        </div>
      </div>
    </Overlay>
  );
}

/* ── AI Key Summary Card (แทน Chatbot) ── */
function AISummaryCard({ land, zone, roi }) {
  const bestType = roi?.Type_C_ROI ? "C (Low-Rise)" :
                   (roi?.Type_A_ROI||0)>(roi?.Type_B_ROI||0) ? "A (บ้านหรู)" : "B (บ้านเช่า)";
  const bestRoi  = Math.max(roi?.Type_A_ROI||0, roi?.Type_B_ROI||0, roi?.Type_C_ROI||0);
  const gfa      = roi?.GFA_Max || 0;
  const flag     = zone?.road_width_m < 8 ? "⚠ ถนน < 8 ม. — ไม่รองรับ Type C" : null;

  return (
    <div style={{
      background:`linear-gradient(135deg,${C.bark} 0%,#3A2E1C 100%)`,
      border:`1px solid ${C.amber}33`,
      borderRadius:14, padding:"18px 20px",
      marginBottom:20,
    }}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <span style={{fontSize:16}}>💡</span>
        <span style={{fontSize:10,fontWeight:700,letterSpacing:".14em",
          textTransform:"uppercase",color:C.amberLt}}>
          AI สรุปศักยภาพ
        </span>
      </div>
      <div style={{fontSize:14,color:C.lo_text,lineHeight:1.85}}>
        ที่ดินแปลงนี้เหมาะพัฒนา <strong style={{color:C.lo_gold}}>Type {bestType}</strong>
        {" · "}GFA สูงสุด <strong style={{color:C.lo_gold}}>{gfa.toLocaleString()} ตร.ม.</strong>
        {" · "}ROI คาดการณ์ <strong style={{color:C.inv_green}}>{bestRoi.toFixed(1)}%</strong>
        {" · "}ผังเมือง <strong style={{color:C.lo_gold}}>{zone?.zoning_color}</strong>
        {flag && (
          <span style={{display:"block",marginTop:6,fontSize:12,color:C.danger}}>
            {flag}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── My Lands Dashboard ── */
function MyLandsPanel({ lands, onCompare, onToast }) {
  const [selected, setSelected] = useState([]);

  function toggleSelect(id) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x=>x!==id) : prev.length<3 ? [...prev,id] : prev
    );
  }

  return (
    <div style={{marginTop:24}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontFamily:"Georgia,serif",fontSize:16,fontWeight:700,color:C.bark}}>
          📁 ที่ดินของฉัน
        </div>
        {selected.length >= 2 && (
          <button onClick={()=>onCompare(selected)} style={{
            padding:"7px 16px",background:C.forest,color:C.white,
            border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",
          }}>
            เปรียบเทียบ {selected.length} แปลง →
          </button>
        )}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {lands.map(l => {
          const sel = selected.includes(l.id);
          return (
            <div key={l.id} style={{
              background:sel?"#EAF2EC":C.white,
              border:`1px solid ${sel?C.forest:C.sand}`,
              borderRadius:10,padding:"12px 16px",
              display:"flex",alignItems:"center",gap:12,
              cursor:"pointer",transition:"all .2s",
            }} onClick={()=>toggleSelect(l.id)}>
              <div style={{
                width:20,height:20,borderRadius:"50%",flexShrink:0,
                border:`2px solid ${sel?C.forest:C.sand}`,
                background:sel?C.forest:"transparent",
                display:"flex",alignItems:"center",justifyContent:"center",
              }}>
                {sel && <span style={{color:"#fff",fontSize:10,fontWeight:700}}>✓</span>}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:13,color:C.bark}}>{l.loc}</div>
                <div style={{fontSize:11,color:C.mist}}>{l.size} · {l.price}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontFamily:"monospace",fontSize:13,fontWeight:700,
                  color:l.roiA>=12?C.forest:C.amber}}>
                  {l.roiA}%
                </div>
                <div style={{fontSize:10,color:C.mist}}>ROI A</div>
              </div>
            </div>
          );
        })}
      </div>

      {selected.length > 0 && selected.length < 2 && (
        <div style={{fontSize:12,color:C.mist,textAlign:"center",marginTop:10}}>
          เลือกอีก {2-selected.length} แปลงเพื่อเปรียบเทียบ
        </div>
      )}
    </div>
  );
}
function MiniBar({ pct, color }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(pct), 400); return () => clearTimeout(t); }, [pct]);
  return (
    <div style={{ height:3, background:"rgba(0,0,0,.06)", borderRadius:10, overflow:"hidden", flex:1 }}>
      <div style={{ height:"100%", width:w+"%", background:color, borderRadius:10, transition:"width 1s ease" }}/>
    </div>
  );
}

/* ── Result card after search ── */
function ResultCard({ land, onUnlock, onToast }) {
  const [revealed, setRevealed] = useState(false);
  const wah   = land.land_size_wah || 0;
  const sqm   = land.land_size_sqm || wah * 4;
  const price = typeof land.price === "string"
    ? parseFloat(land.price.replace(/[^\d.]/g,"")) || 0
    : land.price || 0;
  const zone  = enrichZone(land.province || "กรุงเทพมหานคร", land.district || "วัฒนา");
  const roi   = wah > 0 && sqm > 0 ? calcROI({
    land_size_sqm: sqm,
    far_ratio: zone.far_ratio,
    road_width_m: zone.road_width_m,
    zoning_color: zone.zoning_color,
    price_baht: price,
  }) : null;
  const pricePerWah = land.price_per_wah || (wah > 0 ? Math.round(price/wah) : 0);
  const isFeatured = land.featured || land.source === "owner" || land.hot || (typeof land.id === "number" && land.id <= 3);
  const isOwner = land.source === "owner";

  function handleReveal() {
    if (isFeatured) setRevealed(true);
    else onUnlock();
  }

  return (
    <div style={{ background:C.white,
      border:`1px solid ${isFeatured?C.forest:C.sand}`,
      borderRadius:16, overflow:"hidden",
      boxShadow:isFeatured?"0 4px 24px rgba(61,107,79,.12)":"0 2px 8px rgba(44,36,22,.06)",
      animation:"tabFade .4s ease" }}>
      <div style={{ height:4, background:isFeatured
        ?`linear-gradient(90deg,${C.forest},${C.forestLt})`
        :`linear-gradient(90deg,${C.amber},${C.amberLt})` }}/>
      <div style={{ padding:"18px 20px" }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
          <div style={{ flex:1, marginRight:12 }}>
            {isFeatured && <span style={{ fontSize:9,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",
              background: isOwner?"#EAF2EC":"#FDF5EA",
              color: isOwner?C.forest:C.amber,
              padding:"3px 8px",borderRadius:20,marginBottom:5,display:"inline-block"}}>
              {isOwner ? "✦ โฉนดยืนยันแล้ว" : "✦ แนะนำ"}
            </span>}
            <div style={{ fontFamily:"Georgia,serif",fontSize:14,fontWeight:700,color:C.bark,lineHeight:1.4,marginTop:isFeatured?4:0 }}>
              {(land.title||"").slice(0,52)}{(land.title||"").length>52?"...":""}
            </div>
            <div style={{ fontSize:11,color:C.mist,marginTop:3 }}>{land.district} · {land.province}</div>
            {isOwner && land.deed_no && (
              <div style={{ fontSize:10,color:C.forest,marginTop:2,fontFamily:"monospace" }}>
                โฉนด {land.deed_no} · เลขที่ {land.land_no}
              </div>
            )}
          </div>
          <div style={{ textAlign:"right",flexShrink:0 }}>
            {price > 0 ? (
              <>
                <div style={{ fontFamily:"monospace",fontSize:15,fontWeight:700,color:C.bark }}>
                  ฿{(price/1e6).toFixed(1)}M
                </div>
                {pricePerWah>0 && <div style={{ fontSize:10,color:C.amber,fontWeight:600 }}>฿{pricePerWah.toLocaleString()}/ตร.ว.</div>}
              </>
            ) : (
              <div style={{ fontSize:11,color:C.forest,fontWeight:600,background:"#EAF2EC",
                padding:"4px 8px",borderRadius:8,textAlign:"center" }}>ติดต่อขอราคา</div>
            )}
            <div style={{ fontSize:11,color:C.mist,marginTop:2 }}>{wah.toLocaleString()} ตร.ว.</div>
          </div>
        </div>
        {/* Chips */}
        <div style={{ display:"flex",gap:7,marginBottom:14,flexWrap:"wrap" }}>
          <span style={{ fontSize:10, fontWeight:600, padding:"3px 9px", borderRadius:20,
            background:"#EEF0FF", color:"#5865F2" }}>FAR {zone.far_ratio}:1</span>
          <span style={{ fontSize:10, fontWeight:600, padding:"3px 9px", borderRadius:20,
            background:zone.zoning_color.startsWith("แดง")?"#FFE5E5":zone.zoning_color.startsWith("ส้ม")?"#FFF0E0":zone.zoning_color.startsWith("เขียว")?"#E8F5E9":"#FFFAE0",
            color:zone.zoning_color.startsWith("แดง")?"#C0392B":zone.zoning_color.startsWith("ส้ม")?C.amber:zone.zoning_color.startsWith("เขียว")?"#2E7D32":"#7A6000"
          }}>{zone.zoning_color}</span>
          {roi?.GFA_Max > 0 && (
            <span style={{ fontSize:10, color:C.mist, padding:"3px 9px",
              background:C.creamDk, borderRadius:20 }}>
              GFA {(roi.GFA_Max/1000).toFixed(1)}K ตร.ม.
            </span>
          )}
          <span style={{ fontSize:10, color:C.mist, padding:"3px 9px",
            background:C.creamDk, borderRadius:20 }}>
            📌 {land.source === "kaidee" ? "Kaidee" : land.source === "owner" ? "โฉนดตรวจสอบแล้ว" : "DDProperty"}
          </span>
          {zone.isDefault && (
            <span style={{ fontSize:10, fontWeight:600, padding:"3px 9px", borderRadius:20,
              background:"#FFF8E8", color:"#8B6F00",
              border:"1px solid #E8D080" }}>
              ⚠️ ผังเมืองโดยประมาณ
            </span>
          )}
        </div>
        {zone.isDefault && (
          <div style={{ fontSize:11, color:"#8B6F00", background:"#FFF8E8",
            border:"1px solid #E8D080", borderRadius:8, padding:"7px 10px",
            marginBottom:12, lineHeight:1.6 }}>
            ⚠️ <strong>ข้อมูลผังเมืองโดยประมาณ</strong> — อำเภอนี้ยังไม่มีในฐานข้อมูล
            ตัวเลข ROI เป็นการประมาณเท่านั้น ควรยืนยันกับสำนักงานโยธาธิการจังหวัดก่อนตัดสินใจลงทุน
          </div>
        )}
        {/* ROI */}
        {revealed ? (
          <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:14 }}>
            {roi && [
              {label:"Type A · บ้านหรู",val:roi.Type_A_ROI,color:"#C9A96E"},
              {label:"Type B · บ้านเช่า",val:roi.Type_B_ROI,color:"#7BA68A"},
              {label:"Type C · Low-Rise",val:roi.Type_C_ROI,color:C.forest,block:roi.Type_C_Block},
            ].map(r=>(
              <div key={r.label}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:3 }}>
                  <span style={{ fontSize:11,color:C.barkLt }}>{r.label}</span>
                  {r.block
                    ?<span style={{ fontSize:10,color:C.danger }}>{r.block}</span>
                    :<span style={{ fontFamily:"monospace",fontWeight:700,fontSize:13,
                        color:(r.val||0)>=12?C.forest:(r.val||0)>=7?C.amber:C.danger }}>{(r.val||0).toFixed(1)}%</span>}
                </div>
                <MiniBar pct={r.block?0:Math.min(((r.val||0)/20)*100,100)} color={r.color}/>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ marginBottom:14,position:"relative" }}>
            <div style={{ display:"flex",flexDirection:"column",gap:8,filter:"blur(4px)",userSelect:"none" }}>
              {["Type A · บ้านหรู","Type B · บ้านเช่า","Type C · Low-Rise"].map(l=>(
                <div key={l} style={{ display:"flex",alignItems:"center",gap:10 }}>
                  <span style={{ fontSize:11,color:C.barkLt,minWidth:120 }}>{l}</span>
                  <MiniBar pct={65} color={C.sand}/>
                  <span style={{ fontFamily:"monospace",fontSize:12,color:C.sand }}>xx.x%</span>
                </div>
              ))}
            </div>
            <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center" }}>
              <div style={{ background:"rgba(255,255,255,.94)",borderRadius:10,padding:"7px 14px",
                fontSize:12,fontWeight:700,color:C.bark,border:`1px solid ${C.sand}` }}>
                🔒 ดู ROI จริง — ฿490
              </div>
            </div>
          </div>
        )}
        {/* CTA */}
        {!revealed ? (
          <button onClick={handleReveal} style={{
            width:"100%",padding:"12px",border:"none",borderRadius:10,
            background:isFeatured?`linear-gradient(135deg,${C.forest},${C.forestLt})`:`linear-gradient(135deg,${C.amber},${C.amberLt})`,
            color:C.white,fontSize:13,fontWeight:700,cursor:"pointer",transition:"transform .15s",
          }}
          onMouseEnter={e=>e.currentTarget.style.transform="translateY(-1px)"}
          onMouseLeave={e=>e.currentTarget.style.transform="none"}>
            {isOwner ? "ดู ROI วิเคราะห์ — ฟรี →" : isFeatured ? "ดู ROI ฟรี — แปลงตัวอย่าง →" : "ปลดล็อก ROI · ฿490 →"}
          </button>
        ) : (
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {isOwner ? (
              <>
                <button onClick={()=>onToast("🏗️ ส่งคำขอปรึกษาสถาปนิกแล้ว — ทีมจะติดต่อกลับภายใน 24 ชม. ไม่มีค่าใช้จ่าย")}
                  style={{ width:"100%",padding:"11px",border:"none",borderRadius:9,
                    background:C.forest,color:C.white,fontSize:13,fontWeight:700,cursor:"pointer" }}>
                  🏗️ สอบถามสถาปนิก — ฟรี ไม่มีข้อผูกมัด
                </button>
                <button onClick={()=>{ onGoReport && onGoReport(); }}
                  style={{ width:"100%",padding:"10px",border:`1px solid ${C.sand}`,borderRadius:9,
                    background:C.cream,color:C.barkLt,fontSize:12,fontWeight:600,cursor:"pointer" }}>
                  📋 ปรึกษาสถาปนิก + Feasibility Study ฿4,900 →
                </button>
              </>
            ) : (
              <div style={{ display:"flex",gap:8 }}>
                <button onClick={onUnlock} style={{ flex:1,padding:"10px",border:"none",borderRadius:9,background:C.forest,color:C.white,fontSize:12,fontWeight:700,cursor:"pointer" }}>📋 รายงานเต็ม ฿4,900 →</button>
                <button onClick={()=>onToast("📞 สิทธิ์สมาชิก Pro")} style={{ padding:"10px 14px",border:`1px solid ${C.sand}`,borderRadius:9,background:C.cream,color:C.barkLt,fontSize:13,cursor:"pointer" }}>📞</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══ MAIN HOME SCREEN ══ */
function HomeScreen({ onOpenPaywall, onToast, onGoReport, onGoIntake }) {
  const [zone, setZone] = useState("");
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState([]);
  const [showFeatured, setShowFeatured] = useState(true);
  const inputRef = useRef(null);

  const ZONES = [
    { label:"สากเหล็ก" },
    { label:"บางกระทุ่ม" },
    { label:"บางบัวทอง" },
    { label:"อ่อนนุช" },
    { label:"สาทร" },
    { label:"ชลบุรี" },
  ];

  function handleSearch() {
    if (!zone) { inputRef.current?.focus(); onToast("พิมพ์ทำเลที่ต้องการดู"); return; }
    const q = zone.toLowerCase().trim();

    // ค้นใน Featured ก่อน
    const featFound = FEATURED_LANDS.filter(l =>
      l.district.toLowerCase().includes(q) ||
      l.province.toLowerCase().includes(q) ||
      l.tambon?.toLowerCase().includes(q) ||
      l.title.toLowerCase().includes(q)
    );

    // ค้นใน REAL_LANDS ต่อ
    const realFound = REAL_LANDS.filter(l =>
      l.district.toLowerCase().includes(q) ||
      l.province.toLowerCase().includes(q) ||
      l.title.toLowerCase().includes(q)
    ).slice(0, 4);

    const combined = [...featFound, ...realFound].slice(0, 6);

    if (combined.length > 0) {
      setResults(combined);
      setShowFeatured(false);
    } else {
      setResults(FEATURED_LANDS.slice(0, 3));
      setShowFeatured(false);
      onToast(`ไม่พบ "${zone}" — แสดง Featured Listings แทน`);
    }
    setSearched(true);
  }

  function handleKey(e) { if (e.key==="Enter") handleSearch(); }

  return (
    <div style={{ background:C.cream, minHeight:"calc(100vh - 58px)" }}>

      {/* ── HERO ── */}
      <div style={{
        maxWidth:600, margin:"0 auto", padding:"64px 24px 40px",
        textAlign:"center",
      }}>
        <div style={{
          fontSize:10, fontWeight:700, letterSpacing:".18em", textTransform:"uppercase",
          color:C.amber, marginBottom:14,
        }}>
          Smart Real Estate Feasibility
        </div>
        <h1 style={{
          fontFamily:"Georgia,serif",
          fontSize:"clamp(24px,5vw,42px)",
          fontWeight:700, lineHeight:1.3, color:C.bark, marginBottom:14,
        }}>
          ที่ดินแปลงนี้<br/>
          <span style={{ color:C.amber }}>คุ้มค่าแค่ไหน?</span>
        </h1>
        <p style={{
          fontSize:15, color:C.barkLt, lineHeight:1.8, marginBottom:32, maxWidth:420, margin:"0 auto 32px",
        }}>
          พิมพ์ย่านที่ต้องการ — เห็นศักยภาพที่ดินทันที
        </p>

        {/* ── SEARCH BOX ── */}
        <div style={{
          background:C.white, border:`1px solid ${C.sand}`,
          borderRadius:16, padding:8, display:"flex", gap:8,
          boxShadow:"0 4px 24px rgba(44,36,22,.08)",
          maxWidth:480, margin:"0 auto 24px",
        }}>
          <input
            ref={inputRef}
            value={zone}
            onChange={e => { setZone(e.target.value); setSearched(false); }}
            onKeyDown={handleKey}
            placeholder="พิมพ์ย่าน เช่น อ่อนนุช, รัชดา..."
            style={{
              flex:1, border:"none", background:"transparent",
              padding:"10px 14px", fontSize:15, color:C.bark,
              outline:"none",
            }}
          />
          <button onClick={handleSearch} style={{
            padding:"10px 22px", background:C.bark, color:C.cream,
            border:"none", borderRadius:10, fontSize:14, fontWeight:700,
            cursor:"pointer", transition:"background .2s", whiteSpace:"nowrap",
          }}
          onMouseEnter={e=>e.currentTarget.style.background=C.forest}
          onMouseLeave={e=>e.currentTarget.style.background=C.bark}>
            ค้นหา →
          </button>
        </div>

        {/* ── QUICK ZONE CHIPS ── */}
        {!searched && (
          <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap" }}>
            {ZONES.map(z => (
              <button key={z.label} onClick={() => {
                setZone(z.label);
                const q = z.label.toLowerCase();
                const feat = FEATURED_LANDS.filter(l=>
                  l.district.toLowerCase().includes(q)||
                  l.province.toLowerCase().includes(q)||
                  l.tambon?.toLowerCase().includes(q));
                const real = REAL_LANDS.filter(l=>
                  l.district.toLowerCase().includes(q)||
                  l.province.toLowerCase().includes(q)).slice(0,3);
                setResults([...feat,...real].slice(0,5));
                setSearched(true); setShowFeatured(false);
              }}
                style={{
                  padding:"6px 14px", border:`1px solid ${zone===z.label?C.amber:C.sand}`,
                  borderRadius:20, background: zone===z.label?"#FDF5EA":C.white,
                  color: zone===z.label?C.amber:C.barkLt,
                  fontSize:13, cursor:"pointer", transition:"all .15s",
                }}>
                {z.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── FEATURED LISTINGS — โฉนดยืนยันแล้ว 17 แปลง ── */}
      {showFeatured && !searched && (
        <div style={{ maxWidth:600, margin:"0 auto", padding:"0 24px 32px" }}>
          {/* Section header */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:".14em", textTransform:"uppercase",
                color:C.forest, marginBottom:3 }}>✦ Featured Listings</div>
              <div style={{ fontFamily:"Georgia,serif", fontSize:15, fontWeight:700, color:C.bark }}>
                ที่ดินโฉนดยืนยันแล้ว
              </div>
            </div>
            <div style={{ fontSize:11, color:C.mist }}>17 แปลง · พิจิตร · พิษณุโลก · นนทบุรี</div>
          </div>

          {/* Featured group by province */}
          {[
            { prov:"พิจิตร", district:"สากเหล็ก", count:10, totalWah:2947, emoji:"🌾" },
            { prov:"พิษณุโลก", district:"บางกระทุ่ม", count:6, totalWah:150, emoji:"🏞️" },
            { prov:"นนทบุรี", district:"บางบัวทอง", count:1, totalWah:66, emoji:"🏘️" },
          ].map(g => (
            <div key={g.prov} onClick={() => {
              const q = g.district.toLowerCase();
              setZone(g.district);
              setResults(FEATURED_LANDS.filter(l=>l.district.toLowerCase().includes(q)||l.province.toLowerCase().includes(q)));
              setSearched(true); setShowFeatured(false);
            }} style={{
              background:C.white, border:`1.5px solid ${C.forest}33`,
              borderRadius:12, padding:"14px 18px", marginBottom:10,
              cursor:"pointer", transition:"all .2s", display:"flex",
              justifyContent:"space-between", alignItems:"center",
            }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=C.forest;e.currentTarget.style.transform="translateY(-1px)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.forest+"33";e.currentTarget.style.transform="none";}}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ fontSize:24 }}>{g.emoji}</div>
                <div>
                  <div style={{ fontWeight:700, color:C.bark, fontSize:14 }}>
                    {g.prov} · {g.district}
                  </div>
                  <div style={{ fontSize:11, color:C.mist, marginTop:2 }}>
                    {g.count} แปลง · รวม {g.totalWah.toLocaleString()} ตร.ว.
                  </div>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:9, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase",
                  background:"#EAF2EC", color:C.forest, padding:"3px 9px", borderRadius:20 }}>
                  ✓ โฉนดยืนยัน
                </span>
                <span style={{ color:C.mist, fontSize:16 }}>›</span>
              </div>
            </div>
          ))}

          <div style={{ textAlign:"center", marginTop:6 }}>
            <button onClick={() => {
              setResults(FEATURED_LANDS);
              setSearched(true); setShowFeatured(false);
            }} style={{ fontSize:12, color:C.forest, background:"none", border:"none",
              cursor:"pointer", textDecoration:"underline", padding:0 }}>
              ดูทั้งหมด 17 แปลง →
            </button>
          </div>
        </div>
      )}

      {/* ── RESULTS ── */}
      {searched && results.length > 0 && (
        <div style={{ maxWidth:520, margin:"0 auto", padding:"0 24px 48px" }}>
          <div style={{ fontSize:11, color:C.mist, fontWeight:600, textTransform:"uppercase",
            letterSpacing:".1em", marginBottom:14, textAlign:"center" }}>
            พบ {results.length} แปลงในทำเลนี้
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {results.map(land => (
              <ResultCard
                key={land.id}
                land={land}
                onUnlock={onOpenPaywall}
                onToast={onToast}
              />
            ))}
          </div>

          {/* ── Owner CTA (subtle, below results) ── */}
          <div style={{
            marginTop:28, padding:"18px 20px",
            background:C.bark, borderRadius:14, textAlign:"center",
            cursor:"pointer",
          }} onClick={onGoIntake}>
            <div style={{ fontSize:12, color:"rgba(255,255,255,.5)", marginBottom:4 }}>
              มีที่ดินอยู่แล้ว?
            </div>
            <div style={{ fontSize:15, fontWeight:700, color:C.white }}>
              ส่งที่ดินให้เราวิเคราะห์ → ฟรี
            </div>
          </div>
        </div>
      )}

      {/* ── EMPTY STATE — before search ── */}
      {!searched && (
        <div style={{ maxWidth:480, margin:"0 auto 56px", padding:"0 24px" }}>
          {/* Single teaser card */}
          <div style={{
            background:C.white, border:`1px solid ${C.sand}`, borderRadius:16, overflow:"hidden",
            boxShadow:"0 2px 16px rgba(44,36,22,.06)",
          }}>
            <div style={{ height:4, background:`linear-gradient(90deg,${C.forest},${C.forestLt})` }}/>
            <div style={{ padding:"18px 20px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                <div>
                  <span style={{ fontSize:9, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase",
                    background:"#EAF2EC", color:C.forest, padding:"3px 8px", borderRadius:20,
                    marginBottom:8, display:"inline-block" }}>✦ ตัวอย่าง</span>
                  <div style={{ fontFamily:"Georgia,serif", fontSize:16, fontWeight:700, color:C.bark }}>อ่อนนุช · วัฒนา</div>
                  <div style={{ fontSize:12, color:C.mist, marginTop:2 }}>วัฒนา · 350 ม. BTS</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontFamily:"monospace", fontSize:18, fontWeight:700, color:C.bark }}>฿38M</div>
                  <div style={{ fontSize:11, color:C.mist }}>2-1-40 ไร่</div>
                </div>
              </div>
              {/* Blurred teaser */}
              <div style={{ position:"relative" }}>
                <div style={{ display:"flex", flexDirection:"column", gap:10, filter:"blur(5px)", userSelect:"none" }}>
                  {["Type A · บ้านหรู","Type B · บ้านเช่า","Type C · Low-Rise"].map(l=>(
                    <div key={l} style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontSize:12, color:C.barkLt, minWidth:130 }}>{l}</span>
                      <MiniBar pct={70} color={C.sand}/>
                      <span style={{ fontFamily:"monospace", fontSize:13, color:C.sand }}>xx.x%</span>
                    </div>
                  ))}
                </div>
                <div style={{
                  position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
                }}>
                  <button onClick={() => { setZone("อ่อนนุช"); setResults(REAL_LANDS.filter(l=>l.district.includes("ราษฎร์บูรณะ")||l.district.includes("พระโขนง")||l.id<=3).slice(0,3)); setSearched(true); }} style={{
                    background:C.bark, color:C.cream, border:"none", borderRadius:10,
                    padding:"10px 20px", fontSize:13, fontWeight:700, cursor:"pointer",
                  }}>
                    กดเพื่อดูตัวอย่างฟรี →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/* ════ PAYWALL MODAL ════ */
function PaywallModal({ onClose, onUnlock }) {
  return (
    <Overlay onClose={onClose}>
      <div style={{background:C.white,borderRadius:18,maxWidth:400,width:"100%",overflow:"hidden",
        boxShadow:"0 24px 64px rgba(44,36,22,.26)",animation:"slideUp .28s ease",position:"relative"}}>
        <button onClick={onClose} style={{position:"absolute",top:12,right:12,background:C.creamDk,
          border:"none",borderRadius:"50%",width:28,height:28,fontSize:14,color:C.barkLt}}>✕</button>

        {/* Header */}
        <div style={{padding:"22px 24px 16px",borderBottom:`1px solid ${C.creamDk}`}}>
          <div style={{fontSize:22,marginBottom:10}}>🔓</div>
          <h2 style={{fontFamily:"Georgia,serif",fontSize:18,fontWeight:700,color:C.bark,marginBottom:6,lineHeight:1.4}}>
            เริ่มต้นเป็นนักลงทุน<br/><span style={{color:C.amber}}>ด้วย ฿490 เพียงครั้งเดียว</span>
          </h2>
          <p style={{fontSize:13,color:C.barkLt,lineHeight:1.75}}>
            จ่ายครั้งเดียว ค่อยๆ ดู ค่อยๆ เลือก จนพบแปลงที่ใช่
            แล้วค่อยปรึกษาสถาปนิกขั้นต่อไป
          </p>
        </div>

        <div style={{padding:"16px 24px 22px"}}>
          <div style={{background:C.cream,border:`1.5px solid ${C.amber}`,borderRadius:12,padding:"18px",marginBottom:14,position:"relative"}}>
            <div style={{position:"absolute",top:-10,left:14,background:C.amber,color:C.white,
              fontSize:10,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",padding:"3px 12px",borderRadius:20}}>
              Investor Pass · 1 แปลง
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginTop:6,marginBottom:4}}>
              <div style={{fontSize:13,color:C.mist,textDecoration:"line-through",fontFamily:"monospace"}}>฿4,900</div>
              <div style={{fontSize:10,background:"#FFF0E0",color:C.amber,padding:"2px 8px",borderRadius:20,fontWeight:700}}>ลด 90%</div>
            </div>
            <div style={{fontFamily:"monospace",fontSize:28,fontWeight:700,color:C.forest,marginBottom:12}}>
              ฿490 <span style={{fontSize:12,fontWeight:400,color:C.barkLt}}>/ แปลง</span>
            </div>
            {["ข้อมูล ROI เชิงลึก 3 รูปแบบ",
              "ข้อมูลติดต่อเจ้าของที่ดินโดยตรง",
              "เส้นทางปรึกษาสถาปนิก (ฟรี)",
              "บันทึกแปลงไว้เปรียบเทียบทีหลัง"].map(f=>(
              <div key={f} style={{fontSize:13,color:C.barkLt,display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
                <span style={{color:C.forest,fontWeight:700,fontSize:12,flexShrink:0}}>✓</span>{f}
              </div>
            ))}
          </div>

          <div style={{textAlign:"center",fontSize:12,color:C.barkLt,marginBottom:12,lineHeight:1.65}}>
            💡 ที่ดินมูลค่าหลายล้าน — <strong style={{color:C.bark}}>฿490 เพื่อตัดสินใจได้ถูกต้อง</strong>
          </div>

          <button onClick={onUnlock} style={{width:"100%",padding:"14px",
            background:`linear-gradient(135deg,${C.forest},${C.forestLt})`,
            color:C.white,border:"none",borderRadius:10,fontSize:15,fontWeight:700,
            marginBottom:8,cursor:"pointer",
            boxShadow:"0 4px 16px rgba(61,107,79,.3)",transition:"all .2s"}}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 6px 24px rgba(61,107,79,.4)"}}
            onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 4px 16px rgba(61,107,79,.3)"}}>
            เริ่มเป็นนักลงทุน · ฿490 →
          </button>
          <div style={{textAlign:"center",fontSize:11,color:C.mist}}>
            🔐 PromptPay / บัตรเครดิต · จ่ายครั้งเดียว ไม่มีรายเดือน
          </div>
        </div>
      </div>
    </Overlay>
  );
}

/* ════ LEVEL 3 DASHBOARD ════ */
const DTYPES = [
  {key:"a",letter:"Type A",name:"บ้านหรู",nameEn:"Luxury Residential",tag:"นักลงทุนระยะยาว",
   cost:"45M",roi:"12%",payback:"8 ปี",total:"83M",pct:76,bar:"linear-gradient(90deg,#C9A96E,#E4C28A)",
   tagBg:"#F5EDD8",tagColor:"#8B6F47",best:false},
  {key:"b",letter:"Type B",name:"บ้านเช่า",nameEn:"Rental Property",tag:"Cash Flow สม่ำเสมอ",
   cost:"25M",roi:"8.5%",payback:"11 ปี",total:"63M",pct:55,bar:"linear-gradient(90deg,#7BA68A,#A8C5B4)",
   tagBg:"#EAF2EC",tagColor:"#3D6B4F",best:false},
  {key:"c",letter:"Type C",name:"อาคาร Low-Rise",nameEn:"Commercial",tag:"ศักยภาพสูงสุด",
   cost:"85M",roi:"15%",payback:"6 ปี",total:"123M",pct:100,bar:"linear-gradient(90deg,#3D6B4F,#5D9270)",
   tagBg:"#E6F0E9",tagColor:"#2E5C3E",best:true},
];

function DashCard({ t, onToast }) {
  const [h1,sh1] = useState(false);
  const [h2,sh2] = useState(false);
  const top = t.key==="a" ? "linear-gradient(90deg,#C9A96E,#E4C28A)" : t.key==="b" ? "linear-gradient(90deg,#7BA68A,#A8C5B4)" : "linear-gradient(90deg,#3D6B4F,#5D9270)";
  const [barW, setBarW] = useState(0);
  useEffect(()=>{const tm=setTimeout(()=>setBarW(t.pct),300);return()=>clearTimeout(tm);},[t.pct]);
  return (
    <div style={{background:C.white,border:`1px solid ${t.best?C.forest:C.sand}`,borderRadius:14,overflow:"hidden",position:"relative",boxShadow:t.best?"0 4px 20px rgba(61,107,79,.14)":"none"}}>
      {t.best && <div style={{position:"absolute",top:10,right:10,background:C.forest,color:C.white,fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:20}}>★ ROI สูงสุด</div>}
      <div style={{height:5,background:top}}/>
      <div style={{padding:"13px 18px 11px",borderBottom:`1px solid ${C.creamDk}`}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:".14em",textTransform:"uppercase",color:C.mist,marginBottom:3}}>{t.letter}</div>
        <div style={{fontFamily:"Georgia,serif",fontSize:15,fontWeight:700,color:C.bark,lineHeight:1.3,marginBottom:2}}>{t.name}</div>
        <div style={{fontSize:11,color:C.barkLt}}>{t.nameEn}</div>
      </div>
      <div style={{padding:"12px 18px 16px"}}>
        <span style={{display:"inline-block",fontSize:10,fontWeight:700,background:t.tagBg,color:t.tagColor,padding:"3px 9px",borderRadius:20,marginBottom:11}}>{t.tag}</span>
        {[["ค่าก่อสร้าง",t.cost,""],["ROI",t.roi,"roi"],["คืนทุน",t.payback,"pay"],["ทุนรวม",t.total,""]].map(([l,v,cls])=>(
          <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingBottom:7,marginBottom:7,borderBottom:`1px dashed ${C.creamDk}`}}>
            <span style={{fontSize:12,color:C.barkLt}}>{l}</span>
            <span style={{fontFamily:"monospace",fontWeight:700,fontSize:13,color:cls==="roi"?C.forest:cls==="pay"?C.amber:C.bark}}>{v}</span>
          </div>
        ))}
        <div style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.mist,marginBottom:4}}><span>ROI เทียบ Max</span><span>{t.pct}%</span></div>
          <div style={{height:5,background:C.creamDk,borderRadius:10,overflow:"hidden"}}>
            <div style={{height:"100%",width:barW+"%",background:top,borderRadius:10,transition:"width 1s ease"}}/>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:7}}>
          <button onClick={()=>onToast("📐 "+t.letter+": ส่งคำขอพิมพ์เขียว — ทีมจะติดต่อภายใน 24 ชม.")}
            onMouseEnter={()=>sh1(true)} onMouseLeave={()=>sh1(false)}
            style={{width:"100%",padding:"10px 0",border:"none",borderRadius:7,fontSize:12.5,fontWeight:700,
              background:h1||t.key==="c"?C.forest:C.bark,color:C.white,transition:"background .2s"}}>
            🏗️ ซื้อแบบสถาปัตยกรรมสำเร็จรูป
          </button>
          <button onClick={()=>onToast("🔒 "+t.letter+": พิกัด+เบอร์ตรง — สิทธิ์สมาชิก Pro")}
            onMouseEnter={()=>sh2(true)} onMouseLeave={()=>sh2(false)}
            style={{width:"100%",padding:"9px 0",border:`1px solid ${C.sand}`,borderRadius:7,fontSize:12,fontWeight:600,
              background:h2?C.creamDk:C.cream,color:C.barkLt,transition:"all .2s"}}>
            📞 ติดต่อนายหน้า / เจ้าของที่ดิน
          </button>
        </div>
      </div>
    </div>
  );
}

function Level3({ onGoHome, onToast }) {
  return (
    <div style={{background:C.cream,minHeight:"calc(100vh - 58px)"}}>
      <div style={{background:C.white,borderBottom:`1px solid ${C.sand}`,padding:"18px 28px 14px"}}>
        <div style={{fontFamily:"Georgia,serif",fontSize:19,fontWeight:700,color:C.bark,marginBottom:4}}>แปลงที่ 1 · ที่ดินคุณพิงค์ — ซ.อ่อนนุช 38</div>
        <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",gap:16,fontSize:13,color:C.barkLt}}><span>📍 วัฒนา</span><span>🏙️ FAR 5:1</span><span>📐 2-1-40</span></div>
          <div style={{display:"inline-flex",alignItems:"center",gap:5,background:"#EAF2EC",color:C.forest,fontSize:12,fontWeight:600,padding:"4px 12px",borderRadius:20}}>✓ ปลดล็อกแล้ว</div>
        </div>
      </div>
      <div style={{maxWidth:940,margin:"0 auto",padding:"20px 28px 48px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:22}}>
          {[["ราคาที่ดิน","38M"],["ราคา/ตร.ว.","145K"],["ห่าง BTS","350 ม."],["EIA","ผ่านแล้ว ✓"]].map(([l,v])=>(
            <div key={l} style={{background:C.white,border:`1px solid ${C.sand}`,borderRadius:10,padding:"11px 14px"}}>
              <div style={{fontSize:10,fontWeight:600,letterSpacing:".1em",textTransform:"uppercase",color:C.mist,marginBottom:3}}>{l}</div>
              <div style={{fontFamily:"monospace",fontSize:16,fontWeight:700,color:C.bark}}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{fontFamily:"Georgia,serif",fontSize:17,fontWeight:700,color:C.bark,marginBottom:3}}>เปรียบเทียบ 3 รูปแบบพัฒนา</div>
        <div style={{fontSize:13,color:C.barkLt,marginBottom:16}}>วิเคราะห์จากข้อมูลตลาดปี 2567 · MLR+1.5%</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
          {DTYPES.map(t => <DashCard key={t.key} t={t} onToast={onToast}/>)}
        </div>
        <div style={{marginTop:16}}>
          <AISummaryCard
            land={{loc:"อ่อนนุช · วัฒนา"}}
            zone={{zoning_color:"ส้ม ย.5", road_width_m:12, far_ratio:5}}
            roi={{Type_A_ROI:12.4, Type_B_ROI:7.8, Type_C_ROI:15.2, GFA_Max:18800}}
          />
        </div>
      </div>
      <footer style={{background:C.bark,color:C.sand,textAlign:"center",padding:"14px",fontSize:12}}>© 2025 FeasX Platform</footer>
    </div>
  );
}

/* ════ SMART ENGINE SCREEN ════ */
function SmartEngine({ onToast }) {
  const [rows, setRows] = useState(() => SEED.map(r => processRow(r)));
  const [showAdd, setShowAdd] = useState(false);
  const [sel, setSel] = useState(null);
  const [sk, setSk] = useState("Type_C_ROI");
  const [sd, setSd] = useState("desc");
  const [fz, setFz] = useState("");
  const [search, setSearch] = useState("");

  function addRow(raw) {
    setRows(p => [processRow({...raw,id:Date.now()}), ...p]);
    setShowAdd(false);
    onToast("✓ เพิ่มแปลงและคำนวณ ROI เรียบร้อย!");
  }
  function delRow(id) { setRows(p => p.filter(r=>r.id!==id)); if(sel?.id===id) setSel(null); }
  function sort(k) { if(sk===k) setSd(d=>d==="asc"?"desc":"asc"); else{setSk(k);setSd("desc");} }

  const filtered = useMemo(() => {
    let d = [...rows];
    if (search) d = d.filter(r=>r.title.includes(search)||r.district.includes(search)||r.province.includes(search));
    if (fz) d = d.filter(r=>r.zoning_color.startsWith(fz));
    d.sort((a,b)=>{ const av=a[sk]??-999,bv=b[sk]??-999; return sd==="desc"?bv-av:av-bv; });
    return d;
  }, [rows,search,fz,sk,sd]);

  const stats = useMemo(() => {
    const v = rows.filter(r=>r.Type_C_ROI!==null);
    return {
      total: rows.length,
      avgA: (rows.reduce((s,r)=>s+(r.Type_A_ROI||0),0)/rows.length).toFixed(1),
      avgC: v.length ? (v.reduce((s,r)=>s+(r.Type_C_ROI||0),0)/v.length).toFixed(1) : 0,
      blocked: rows.filter(r=>r.Type_C_Block).length,
    };
  }, [rows]);

  const SB = ({k,l}) => (
    <span onClick={()=>sort(k)} style={{cursor:"pointer",userSelect:"none",display:"flex",alignItems:"center",gap:2,
      color:sk===k?C.amber:C.mist,fontWeight:sk===k?700:400,fontSize:10,letterSpacing:".06em",textTransform:"uppercase"}}>
      {l}{sk===k?(sd==="desc"?"↓":"↑"):""}
    </span>
  );

  function ZChip({color}) {
    const bg=color.startsWith("แดง")?"#FFE5E5":color.startsWith("ส้ม")?"#FFF0E0":color.startsWith("เหลือง")?"#FFFAE0":color.startsWith("เขียว")?"#E8F5E9":"#F3EDE0";
    const tx=color.startsWith("แดง")?"#C0392B":color.startsWith("ส้ม")?"#A04000":color.startsWith("เหลือง")?"#7A6000":color.startsWith("เขียว")?"#2E7D32":"#5C4A30";
    return <span style={{display:"inline-block",background:bg,color:tx,fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:20,whiteSpace:"nowrap"}}>{color}</span>;
  }

  function RBadge({value,block}) {
    if(block) return <span style={{fontSize:10,color:C.danger,fontWeight:600}}>{block}</span>;
    if(value===null||value===undefined) return <span style={{color:C.mist}}>—</span>;
    const col=value>=12?C.forest:value>=7?C.amber:C.danger;
    return <span style={{fontFamily:"monospace",fontWeight:700,color:col,fontSize:13}}>{value.toFixed(1)}%</span>;
  }

  return (
    <div style={{background:C.cream,minHeight:"calc(100vh - 58px)"}}>
      <div style={{background:"linear-gradient(135deg,#1E3A2A 0%,#2E5C3E 60%,#3D6B4F 100%)",padding:"24px 28px 20px"}}>
        <div style={{maxWidth:1060,margin:"0 auto"}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:".18em",textTransform:"uppercase",color:"#7CC89A",marginBottom:6}}>⚙️ FeasX · Feasibility Engine</div>
          <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
            <div>
              <h2 style={{fontFamily:"Georgia,serif",fontSize:"clamp(16px,2.8vw,24px)",fontWeight:700,color:C.white,marginBottom:3}}>ตารางวิเคราะห์ศักยภาพอัจฉริยะ</h2>
              <p style={{fontSize:12,color:"rgba(255,255,255,.6)"}}>3-Layer: Unit Parser → Zone Enrichment → ROI Automation</p>
            </div>
            <button onClick={()=>setShowAdd(true)} style={{padding:"9px 18px",background:C.amber,color:C.white,border:"none",borderRadius:9,fontSize:13,fontWeight:700}}>+ เพิ่มแปลงที่ดิน</button>
          </div>
          <div style={{display:"flex",gap:12,marginTop:16,flexWrap:"wrap"}}>
            {[["แปลงทั้งหมด",stats.total,"แปลง"],["ROI เฉลี่ย A",stats.avgA,"%"],["ROI เฉลี่ย C",stats.avgC,"%"],["ไม่ผ่านกม.",stats.blocked,"แปลง"]].map(([l,v,u])=>(
              <div key={l} style={{background:"rgba(255,255,255,.1)",borderRadius:9,padding:"9px 14px",minWidth:110}}>
                <div style={{fontSize:9,color:"rgba(255,255,255,.5)",fontWeight:500,marginBottom:3,textTransform:"uppercase",letterSpacing:".06em"}}>{l}</div>
                <div style={{fontFamily:"monospace",fontSize:18,fontWeight:700,color:C.white}}>{v}<span style={{fontSize:11,fontWeight:400,marginLeft:2,color:"rgba(255,255,255,.5)"}}>{u}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:1060,margin:"0 auto",padding:"18px 28px 48px"}}>
        <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
          <div style={{position:"relative",flex:"1 1 200px"}}>
            <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:C.mist,fontSize:13}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ค้นหา..."
              style={{width:"100%",padding:"8px 12px 8px 30px",border:`1px solid ${C.sand}`,borderRadius:8,background:C.white,color:C.bark,fontSize:13}}/>
          </div>
          <select value={fz} onChange={e=>setFz(e.target.value)} style={{padding:"8px 12px",border:`1px solid ${C.sand}`,borderRadius:8,background:C.white,color:C.bark,fontSize:13,minWidth:120}}>
            <option value="">ทุกผังเมือง</option>
            <option value="แดง">สีแดง</option><option value="ส้ม">สีส้ม</option>
            <option value="เหลือง">สีเหลือง</option><option value="เขียว">สีเขียว</option>
          </select>
          <div style={{fontSize:12,color:C.mist}}>{filtered.length}/{rows.length} แปลง</div>
        </div>

        <div style={{background:C.white,border:`1px solid ${C.sand}`,borderRadius:14,overflow:"hidden",boxShadow:"0 2px 16px rgba(44,36,22,.06)"}}>
          <div style={{background:C.creamDk,padding:"9px 14px",display:"flex",gap:14,flexWrap:"wrap",borderBottom:`1px solid ${C.sand}`}}>
            {[["L1","Unit Parser","#B8966A"],["L2","Zone Enrichment","#4E8A65"],["L3","ROI Engine","#3D6B4F"]].map(([tag,desc,c])=>(
              <div key={tag} style={{display:"flex",alignItems:"center",gap:5,fontSize:11}}>
                <span style={{background:c,color:"#fff",fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4}}>{tag}</span>
                <span style={{color:C.barkLt}}>{desc}</span>
              </div>
            ))}
            <div style={{fontSize:11,color:C.mist,marginLeft:"auto"}}>คลิกแถวเพื่อดูรายละเอียด</div>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:860}}>
              <thead>
                <tr style={{background:C.cream,borderBottom:`2px solid ${C.sand}`}}>
                  {[["#","",36],["หัวข้อ","ttl",null],["เขต","dist",100],["ราคา","price_baht",95],
                    ["ตร.ว.","land_size_wah",72],["ตร.ม.","land_size_sqm",72],
                    ["ผังเมือง","zoning_color",110],["FAR","far_ratio",52],["ถนน","road_width_m",65],["GFA","GFA_Max",80],
                    ["ROI A","Type_A_ROI",72],["ROI B","Type_B_ROI",72],["ROI C","Type_C_ROI",72],["","-",34]
                  ].map(([label,key,w])=>(
                    <th key={key} style={{padding:"9px 11px",textAlign:"left",width:w||undefined,whiteSpace:"nowrap",fontWeight:400}}>
                      {key&&key!=="ttl"&&key!=="-"&&key!==""?<SB k={key} l={label}/>:
                       <span style={{fontSize:10,fontWeight:600,color:C.mist,textTransform:"uppercase",letterSpacing:".06em"}}>{label}</span>}
                    </th>
                  ))}
                </tr>
                <tr style={{background:C.creamDk,borderBottom:`1px solid ${C.sand}`}}>
                  <td colSpan={4}/>
                  <td colSpan={2} style={{padding:"3px 11px",fontSize:9,fontWeight:700,color:"#B8966A",letterSpacing:".08em"}}>▸ L1 UNIT</td>
                  <td colSpan={4} style={{padding:"3px 11px",fontSize:9,fontWeight:700,color:"#4E8A65",letterSpacing:".08em"}}>▸ L2 ZONE</td>
                  <td colSpan={3} style={{padding:"3px 11px",fontSize:9,fontWeight:700,color:C.forest,letterSpacing:".08em"}}>▸ L3 ROI</td>
                  <td/>
                </tr>
              </thead>
              <tbody>
                {filtered.length===0 && <tr><td colSpan={14} style={{padding:"28px",textAlign:"center",color:C.mist,fontSize:14}}>ไม่พบข้อมูล</td></tr>}
                {filtered.map((row,i)=>{
                  const isSel = sel?.id===row.id;
                  return (
                    <tr key={row.id} className="trow" onClick={()=>setSel(isSel?null:row)}
                      style={{background:isSel?"#E8F5E9":i%2===0?C.white:C.cream,borderBottom:`1px solid ${C.creamDk}`,cursor:"pointer",transition:"background .15s"}}>
                      <td style={{padding:"9px 11px",fontSize:11,color:C.mist,fontFamily:"monospace"}}>{i+1}</td>
                      <td style={{padding:"9px 11px",maxWidth:190}}>
                        <div style={{fontWeight:600,color:C.bark,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row.title}</div>
                        <div style={{fontSize:10,color:C.mist}}>{row.raw_size}</div>
                      </td>
                      <td style={{padding:"9px 11px",fontSize:11,color:C.barkLt,whiteSpace:"nowrap"}}>{row.district}<br/><span style={{fontSize:10,color:C.mist}}>{row.province}</span></td>
                      <td style={{padding:"9px 11px",fontFamily:"monospace",fontSize:12,color:C.bark,whiteSpace:"nowrap"}}>{Number(row.price).toLocaleString()}</td>
                      <td style={{padding:"9px 11px",fontFamily:"monospace",fontSize:12,color:"#8B6F47",fontWeight:600}}>{row.land_size_wah?.toLocaleString()}</td>
                      <td style={{padding:"9px 11px",fontFamily:"monospace",fontSize:12,color:"#8B6F47"}}>{row.land_size_sqm?.toLocaleString()}</td>
                      <td style={{padding:"9px 11px"}}><ZChip color={row.zoning_color}/></td>
                      <td style={{padding:"9px 11px",fontFamily:"monospace",fontSize:12,color:C.barkLt,textAlign:"center"}}>{row.far_ratio}</td>
                      <td style={{padding:"9px 11px",fontFamily:"monospace",fontSize:12,textAlign:"center",color:row.road_width_m<8?C.danger:C.barkLt,fontWeight:row.road_width_m<8?700:400}}>{row.road_width_m}m</td>
                      <td style={{padding:"9px 11px",fontFamily:"monospace",fontSize:12,color:C.forest,fontWeight:600}}>{row.GFA_Max?.toLocaleString()}</td>
                      <td style={{padding:"9px 11px",textAlign:"center"}}><RBadge value={row.Type_A_ROI}/></td>
                      <td style={{padding:"9px 11px",textAlign:"center"}}><RBadge value={row.Type_B_ROI}/></td>
                      <td style={{padding:"9px 11px",textAlign:"center",minWidth:75}}><RBadge value={row.Type_C_ROI} block={row.Type_C_Block}/></td>
                      <td style={{padding:"7px 9px"}}>
                        <button onClick={e=>{e.stopPropagation();delRow(row.id);}}
                          style={{background:"none",border:"none",color:C.mist,fontSize:13,padding:"2px 5px",borderRadius:4}}
                          onMouseEnter={e=>e.target.style.color=C.danger} onMouseLeave={e=>e.target.style.color=C.mist}>✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{padding:"9px 14px",background:C.creamDk,borderTop:`1px solid ${C.sand}`,display:"flex",gap:14,flexWrap:"wrap",fontSize:11,color:C.barkLt}}>
            <span><span style={{color:C.forest,fontWeight:700}}>≥12%</span> ยอดเยี่ยม</span>
            <span><span style={{color:C.amber,fontWeight:700}}>7-11%</span> ดี</span>
            <span><span style={{color:C.danger,fontWeight:700}}>&lt;7%</span> ต่ำ</span>
            <span style={{marginLeft:"auto"}}>ถนน <span style={{color:C.danger,fontWeight:700}}>แดง = &lt;8ม.</span> (Type C ไม่ผ่านกม.)</span>
          </div>
          <div style={{padding:"9px 14px",background:"#FFF8E8",borderTop:`1px solid #E8D080`,fontSize:11,color:"#8B6F00",lineHeight:1.6}}>
            ⚠️ <strong>หมายเหตุสำคัญ:</strong> ข้อมูลผังเมืองที่แสดงเป็นการประมาณจากฐานข้อมูล
            สำหรับอำเภอที่ไม่มีในระบบจะใช้ค่า <strong>เขียว ก.2 / FAR 0.5</strong> แทน
            ตัวเลข ROI ทั้งหมดเป็นการประมาณเบื้องต้น ควรยืนยันผังเมืองจริงกับสำนักงานโยธาธิการจังหวัดก่อนตัดสินใจลงทุน
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginTop:18}}>
          {[{tag:"L1",title:"Unit Parser",color:"#B8966A",bg:"#FDF5EA",desc:"แปลงข้อความดิบ → ตร.ว./ตร.ม. ทุกรูปแบบ"},
            {tag:"L2",title:"Zone Enrichment",color:"#4E8A65",bg:"#EAF2EC",desc:"เติมผังเมือง FAR ถนน จากฐานข้อมูล 20+ ย่าน"},
            {tag:"L3",title:"ROI Engine",color:C.forest,bg:"#E6F0E9",desc:"GFA Max + ROI 3 Type + Logic กม. Type C"}
          ].map(({tag,title,color,bg,desc})=>(
            <div key={tag} style={{background:bg,borderRadius:12,padding:"13px 15px",border:`1px solid ${color}30`}}>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:7}}>
                <span style={{background:color,color:"#fff",fontSize:9,fontWeight:700,padding:"3px 7px",borderRadius:6}}>{tag}</span>
                <span style={{fontFamily:"Georgia,serif",fontSize:13,fontWeight:700,color:C.bark}}>{title}</span>
              </div>
              <p style={{fontSize:11,color:C.barkLt,lineHeight:1.65}}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {showAdd && <AddRowModal onClose={()=>setShowAdd(false)} onAdd={addRow}/>}
      {sel && <DetailDrawer row={sel} onClose={()=>setSel(null)}/>}
      <footer style={{background:C.bark,color:C.sand,textAlign:"center",padding:"14px",fontSize:12}}>© 2025 FeasX · Smart Real Estate Feasibility Platform</footer>
    </div>
  );
}

/* ── Add Row Modal ── */
function AddRowModal({ onClose, onAdd }) {
  const [f, setF] = useState({title:"",price:"",district:"",province:"กรุงเทพมหานคร",raw_size:""});
  const [errs, setErrs] = useState({});
  const set = (k,v) => { setF(p=>({...p,[k]:v})); setErrs(e=>({...e,[k]:""})); };
  function submit() {
    const e={};
    if(!f.title.trim()) e.title="กรุณาใส่หัวข้อ";
    if(!f.price.trim()||isNaN(f.price.replace(/,/g,""))) e.price="กรุณาใส่ราคา (ตัวเลข)";
    if(!f.district.trim()) e.district="กรุณาใส่เขต/อำเภอ";
    if(!f.raw_size.trim()) e.raw_size="กรุณาใส่ขนาดที่ดิน";
    if(Object.keys(e).length) { setErrs(e); return; }
    onAdd({...f, price:f.price.replace(/,/g,"")});
  }
  const inp = (k) => ({width:"100%",padding:"9px 12px",border:`1px solid ${errs[k]?C.danger:C.sand}`,borderRadius:8,background:C.cream,color:C.bark,fontSize:14});
  const parsed = parseLandSize(f.raw_size);
  return (
    <Overlay onClose={onClose}>
      <div style={{background:C.white,borderRadius:18,maxWidth:440,width:"100%",overflow:"hidden",
        boxShadow:"0 24px 64px rgba(44,36,22,.26)",animation:"slideUp .28s ease",position:"relative",maxHeight:"90vh",overflowY:"auto"}}>
        <button onClick={onClose} style={{position:"absolute",top:12,right:12,background:C.creamDk,
          border:"none",borderRadius:"50%",width:28,height:28,fontSize:14,color:C.barkLt,zIndex:1}}>✕</button>
        <div style={{background:"linear-gradient(135deg,#1E3A2A,#2E5C3E)",padding:"20px 24px 16px"}}>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:".14em",textTransform:"uppercase",color:"#7CC89A",marginBottom:6}}>⚙️ FeasX Engine</div>
          <div style={{fontFamily:"Georgia,serif",fontSize:17,fontWeight:700,color:C.white}}>เพิ่มแปลงที่ดินใหม่</div>
        </div>
        <div style={{padding:"18px 22px 20px",display:"flex",flexDirection:"column",gap:12}}>
          <div>
            <label style={LBL}>หัวข้อประกาศ *</label>
            <input value={f.title} onChange={e=>set("title",e.target.value)} placeholder="เช่น ขายที่ดินอ่อนนุช ใกล้ BTS" style={inp("title")}/>
            {errs.title && <div style={{fontSize:11,color:C.danger,marginTop:3}}>⚠ {errs.title}</div>}
          </div>
          <div>
            <label style={LBL}>ราคา (บาท) *</label>
            <input value={f.price} onChange={e=>set("price",e.target.value)} placeholder="เช่น 38000000" style={inp("price")}/>
            {errs.price && <div style={{fontSize:11,color:C.danger,marginTop:3}}>⚠ {errs.price}</div>}
          </div>
          <div style={{display:"flex",gap:8}}>
            <div style={{flex:1}}>
              <label style={LBL}>จังหวัด</label>
              <select value={f.province} onChange={e=>set("province",e.target.value)} style={{...inp("province"),background:C.cream}}>
                {["กรุงเทพมหานคร","นนทบุรี","ปทุมธานี","สมุทรปราการ","เชียงใหม่","ภูเก็ต","ขอนแก่น"].map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
            <div style={{flex:1}}>
              <label style={LBL}>เขต / อำเภอ *</label>
              <input value={f.district} onChange={e=>set("district",e.target.value)} placeholder="เช่น วัฒนา" style={inp("district")}/>
              {errs.district && <div style={{fontSize:11,color:C.danger,marginTop:3}}>⚠ {errs.district}</div>}
            </div>
          </div>
          <div>
            <label style={LBL}>ขนาดที่ดิน (ข้อความดิบ) *</label>
            <input value={f.raw_size} onChange={e=>set("raw_size",e.target.value)} placeholder="เช่น 2-1-40 / 400 ตร.ว. / 1600 sqm" style={inp("raw_size")}/>
            {errs.raw_size && <div style={{fontSize:11,color:C.danger,marginTop:3}}>⚠ {errs.raw_size}</div>}
            {f.raw_size && parsed.land_size_wah > 0 && (
              <div style={{fontSize:11,color:C.forest,marginTop:4,fontFamily:"monospace"}}>✓ {parsed.land_size_wah} ตร.ว. = {parsed.land_size_sqm} ตร.ม.</div>
            )}
          </div>
          <button onClick={submit} style={{width:"100%",padding:"12px",background:C.forest,color:C.white,border:"none",borderRadius:10,fontSize:14,fontWeight:700}}
            onMouseEnter={e=>e.target.style.background=C.forestLt} onMouseLeave={e=>e.target.style.background=C.forest}>
            ⚙️ คำนวณและเพิ่มลงตาราง →
          </button>
        </div>
      </div>
    </Overlay>
  );
}

/* ── Detail Drawer ── */
function DetailDrawer({ row, onClose }) {
  const TC = {A:{bar:"linear-gradient(90deg,#C9A96E,#E4C28A)",l:"บ้านหรู"},B:{bar:"linear-gradient(90deg,#7BA68A,#A8C5B4)",l:"บ้านเช่า"},C:{bar:"linear-gradient(90deg,#3D6B4F,#5D9270)",l:"อาคาร"}};
  const maxR = Math.max(row.Type_A_ROI||0, row.Type_B_ROI||0, row.Type_C_ROI||0) || 1;
  function ZC({c}) {
    const bg=c.startsWith("แดง")?"#FFE5E5":c.startsWith("ส้ม")?"#FFF0E0":c.startsWith("เหลือง")?"#FFFAE0":c.startsWith("เขียว")?"#E8F5E9":"#F3EDE0";
    const tx=c.startsWith("แดง")?"#C0392B":c.startsWith("ส้ม")?"#A04000":c.startsWith("เหลือง")?"#7A6000":c.startsWith("เขียว")?"#2E7D32":"#5C4A30";
    return <span style={{background:bg,color:tx,fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:20}}>{c}</span>;
  }
  return (
    <div style={{position:"fixed",inset:0,zIndex:400,display:"flex"}}>
      <div onClick={onClose} style={{flex:1,background:"rgba(44,36,22,.4)",backdropFilter:"blur(3px)"}}/>
      <div style={{width:340,background:C.white,height:"100%",overflowY:"auto",boxShadow:"-8px 0 40px rgba(0,0,0,.18)"}}>
        <div style={{background:"linear-gradient(135deg,#1E3A2A,#2E5C3E)",padding:"18px 18px 14px"}}>
          <button onClick={onClose} style={{float:"right",background:"rgba(255,255,255,.15)",border:"none",borderRadius:6,padding:"4px 10px",color:C.white,fontSize:12}}>✕</button>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:"#7CC89A",marginBottom:5}}>Smart Analysis</div>
          <div style={{fontFamily:"Georgia,serif",fontSize:14,fontWeight:700,color:C.white,lineHeight:1.4,clear:"both"}}>{row.title}</div>
        </div>
        <div style={{padding:"14px 16px",display:"flex",flexDirection:"column",gap:12}}>
          {[{tag:"L1 · Unit Parser",items:[["ข้อมูลดิบ",row.raw_size],["ตร.ว.",row.land_size_wah],["ตร.ม.",row.land_size_sqm],["GFA Max",(row.GFA_Max||0).toLocaleString()+" ตร.ม."]]},
            {tag:"L2 · Zone Enrichment",items:[["ผังเมือง",<ZC key="z" c={row.zoning_color}/>],["FAR",row.far_ratio],["ถนน",row.road_width_m+" ม."],["หน้ากว้าง",row.frontage_length_m+" ม."]]}
          ].map(sec=>(
            <div key={sec.tag} style={{background:C.cream,borderRadius:9,padding:"11px 13px",border:`1px solid ${C.sand}`}}>
              <div style={{fontSize:10,fontWeight:700,color:C.amber,textTransform:"uppercase",letterSpacing:".1em",marginBottom:7}}>{sec.tag}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                {sec.items.map(([l,v])=>(
                  <div key={l}><div style={{fontSize:9,color:C.mist,marginBottom:2}}>{l}</div><div style={{fontFamily:"monospace",fontSize:12,fontWeight:700,color:C.bark}}>{v}</div></div>
                ))}
              </div>
            </div>
          ))}
          <div style={{background:C.cream,borderRadius:9,padding:"11px 13px",border:`1px solid ${C.sand}`}}>
            <div style={{fontSize:10,fontWeight:700,color:C.amber,textTransform:"uppercase",letterSpacing:".1em",marginBottom:9}}>L3 · ROI Engine</div>
            {["A","B","C"].map(k=>{
              const v = k==="A"?row.Type_A_ROI:k==="B"?row.Type_B_ROI:row.Type_C_ROI;
              const isB = k==="C" && row.Type_C_Block;
              const pct = isB?0:Math.min(((v||0)/maxR)*100,100);
              return (
                <div key={k} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                    <span style={{fontSize:11,color:C.barkLt}}>Type {k} · {TC[k].l}</span>
                    {isB?<span style={{fontSize:9,color:C.danger,fontWeight:600}}>{row.Type_C_Block}</span>
                        :<span style={{fontFamily:"monospace",fontWeight:700,color:(v||0)>=12?C.forest:(v||0)>=7?C.amber:C.danger,fontSize:13}}>{(v||0).toFixed(1)}%</span>}
                  </div>
                  <div style={{height:4,background:C.creamDk,borderRadius:10,overflow:"hidden"}}>
                    <div style={{height:"100%",width:pct+"%",background:TC[k].bar,borderRadius:10,transition:"width 1s ease"}}/>
                  </div>
                </div>
              );
            })}
          </div>
          <AISummaryCard
              land={{loc:row.district}}
              zone={{zoning_color:row.zoning_color, road_width_m:row.road_width_m, far_ratio:row.far_ratio}}
              roi={{Type_A_ROI:row.Type_A_ROI, Type_B_ROI:row.Type_B_ROI, Type_C_ROI:row.Type_C_ROI, GFA_Max:row.GFA_Max}}
            />
        </div>
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════
   ACTIVITY-BASED LAND USE ENGINE v2.0
   อ้างอิง: Jan Gehl (Activity-Based Design) + MAI Highest & Best Use
══════════════════════════════════════════════════════════════ */

/* ── Activity Clusters ── */
const ACTIVITY_CLUSTERS = [
  {
    id:"daily", label:"Daily Life", labelTH:"ชีวิตประจำวัน",
    icon:"🏘️", freq:"ทุกวัน", freqScore:5,
    desc:"ที่พักอาศัย ร้านค้า ตลาดสด — คนต้องการทุกวัน",
    minWah:50, maxWah:2000,
    location:["urban","suburban"],
    roadMin:6,
    types:[
      {id:"residential",  label:"บ้านจัดสรร / คอนโด",     costPerSqm:35000, yieldPct:6.5,  sellPct:0.85, sellPrice:70000},
      {id:"shophouse",    label:"อาคารพาณิชย์",             costPerSqm:30000, yieldPct:7.0,  sellPct:0,    sellPrice:0},
      {id:"fresh_market", label:"ตลาดสด / ร้านอาหาร",      costPerSqm:15000, yieldPct:9.0,  sellPct:0,    sellPrice:0},
    ]
  },
  {
    id:"weekly", label:"Community Hub", labelTH:"ศูนย์ชุมชน",
    icon:"🏪", freq:"สัปดาห์ละ 1-3 ครั้ง", freqScore:4,
    desc:"Community Mall ตลาดนัด Co-working — คนวางแผนมา",
    minWah:200, maxWah:5000,
    location:["urban","suburban"],
    roadMin:8,
    types:[
      {id:"community_mall",label:"Community Mall",          costPerSqm:25000, yieldPct:8.5,  sellPct:0,    sellPrice:0},
      {id:"night_market",  label:"ตลาดนัด / Night Market", costPerSqm:8000,  yieldPct:12.0, sellPct:0,    sellPrice:0},
      {id:"coworking",     label:"Co-working Space",        costPerSqm:20000, yieldPct:9.0,  sellPct:0,    sellPrice:0},
    ]
  },
  {
    id:"occasional", label:"Service & Wellness", labelTH:"บริการและสุขภาพ",
    icon:"🏥", freq:"เดือนละหลายครั้ง", freqScore:3,
    desc:"คลินิก โรงแรมบูทีค Fitness — คนมาเพราะมีความต้องการ",
    minWah:100, maxWah:3000,
    location:["urban","suburban","rural"],
    roadMin:6,
    types:[
      {id:"hotel_boutique",label:"Boutique Hotel",          costPerSqm:45000, yieldPct:10.0, sellPct:0,    sellPrice:0},
      {id:"medical",       label:"คลินิก / Medical Hub",   costPerSqm:30000, yieldPct:8.0,  sellPct:0,    sellPrice:0},
      {id:"fitness",       label:"Fitness / Wellness",      costPerSqm:20000, yieldPct:9.5,  sellPct:0,    sellPrice:0},
    ]
  },
  {
    id:"destination", label:"Destination", labelTH:"จุดหมายปลายทาง",
    icon:"🌿", freq:"ไม่บ่อย แต่ใช้เวลานาน", freqScore:2,
    desc:"Eco-Tourism Farm Stay Event Space — คนวางแผนมาโดยเฉพาะ",
    minWah:400, maxWah:99999,
    location:["suburban","rural"],
    roadMin:4,
    types:[
      {id:"eco_resort",   label:"Eco Resort / Farm Stay",  costPerSqm:20000, yieldPct:11.0, sellPct:0,    sellPrice:0},
      {id:"event_space",  label:"Event Space / Exhibition", costPerSqm:18000, yieldPct:8.5,  sellPct:0,    sellPrice:0},
      {id:"agri_tourism", label:"เกษตรท่องเที่ยว",         costPerSqm:5000,  yieldPct:7.0,  sellPct:0,    sellPrice:0},
    ]
  },
  {
    id:"infrastructure", label:"Infrastructure", labelTH:"โครงสร้างพื้นฐาน",
    icon:"🏭", freq:"Passive — ไม่ต้องการคนมาบ่อย", freqScore:1,
    desc:"โกดัง Logistics Solar Farm — รายได้สม่ำเสมอ ดูแลน้อย",
    minWah:400, maxWah:99999,
    location:["suburban","rural"],
    roadMin:6,
    types:[
      {id:"warehouse",    label:"โกดัง / Logistics",       costPerSqm:12000, yieldPct:7.5,  sellPct:0,    sellPrice:0},
      {id:"solar_farm",   label:"Solar Farm",              costPerSqm:3000,  yieldPct:8.0,  sellPct:0,    sellPrice:0},
      {id:"light_factory",label:"โรงงานขนาดเล็ก",          costPerSqm:15000, yieldPct:8.5,  sellPct:0,    sellPrice:0},
    ]
  },
];

/* ── Location classifier ── */
function classifyLocation(province, district) {
  const urban = ["กรุงเทพมหานคร","นนทบุรี","ปทุมธานี","สมุทรปราการ"];
  const suburban = ["เชียงใหม่","ภูเก็ต","ชลบุรี","ขอนแก่น","นครราชสีมา","ระยอง","สงขลา","อุดรธานี"];
  if (urban.includes(province)) return "urban";
  if (suburban.includes(province)) return "suburban";
  return "rural";
}

/* ── Recommend clusters for a given land ── */
function recommendClusters(land, zone) {
  const wah = land.land_size_wah || 0;
  const loc  = classifyLocation(land.province, land.district);
  const road = zone.road_width_m || 6;

  return ACTIVITY_CLUSTERS
    .filter(c =>
      wah >= c.minWah && wah <= c.maxWah &&
      c.location.includes(loc) &&
      road >= c.roadMin
    )
    .map(c => {
      // score = freqScore × location fit × size fit
      const sizeFit = wah <= (c.minWah + c.maxWah) / 2 ? 1.2 : 1.0;
      const locFit  = loc === "urban" && c.id === "daily" ? 1.3
                    : loc === "rural" && c.id === "destination" ? 1.3
                    : loc === "rural" && c.id === "infrastructure" ? 1.2 : 1.0;
      return { ...c, score: +(c.freqScore * sizeFit * locFit).toFixed(2) };
    })
    .sort((a,b) => b.score - a.score);
}

/* ── Calculate ROI for a cluster type ── */
function calcClusterROI(typeObj, land_size_sqm, far_ratio, price_baht) {
  const gfa = land_size_sqm * far_ratio;
  const usableGFA = gfa * 0.75;
  const totalCost = usableGFA * typeObj.costPerSqm + price_baht;

  let annualReturn = 0, roi = 0, payback = 0, revenue_label = "";

  if (typeObj.sellPct > 0) {
    // Sell model
    const sellRevenue = usableGFA * typeObj.sellPct * typeObj.sellPrice;
    roi = totalCost > 0 ? (sellRevenue - totalCost) / totalCost * 100 : 0;
    payback = roi > 0 ? 100 / roi : 99;
    revenue_label = `ราคาขาย ~฿${(sellRevenue/1e6).toFixed(1)}M`;
  } else {
    // Yield model
    annualReturn = totalCost * (typeObj.yieldPct / 100);
    roi = typeObj.yieldPct;
    payback = roi > 0 ? 100 / roi : 99;
    revenue_label = `รายได้/ปี ~฿${(annualReturn/1e6).toFixed(1)}M`;
  }

  return {
    gfa: Math.round(gfa),
    usableGFA: Math.round(usableGFA),
    totalCostM: +(totalCost/1e6).toFixed(1),
    roi: +roi.toFixed(1),
    payback: +payback.toFixed(1),
    revenue_label,
    feasible: gfa >= 200 && roi > 0,
  };
}

/* ══ ACTIVITY ENGINE SCREEN ══ */
/* ── Business Model Cards ── */
const BUSINESS_MODELS = [
  {
    id:"rental_home",
    icon:"🏠",
    title:"บ้านให้เช่า",
    sub:"Residential Rental",
    desc:"ซื้อที่ดิน สร้างบ้าน ปล่อยเช่ารายเดือน รายได้สม่ำเสมอ",
    skill:"บริหารผู้เช่า ดูแลทรัพย์สิน",
    minWah:50, maxWah:2000,
    location:["urban","suburban"],
    costPerSqm:25000, yieldPct:6.5,
    tag:"Cash Flow",tagColor:"#3D6B4F",
  },
  {
    id:"sell_project",
    icon:"🏗️",
    title:"สร้างเพื่อขาย",
    sub:"Property Development",
    desc:"พัฒนาโครงการ ขายทำกำไรครั้งเดียว Capital Gain สูง",
    skill:"บริหารโครงการ การตลาด",
    minWah:200, maxWah:5000,
    location:["urban","suburban"],
    costPerSqm:35000, yieldPct:0, sellMargin:0.25,
    tag:"Capital Gain",tagColor:"#8B6F47",
  },
  {
    id:"resort_hotel",
    icon:"🌴",
    title:"รีสอร์ท / โรงแรม",
    sub:"Hospitality",
    desc:"สร้างที่พักแรม ท่องเที่ยว รายได้ตามฤดูกาล",
    skill:"บริหารงานบริการ ต้อนรับแขก",
    minWah:400, maxWah:99999,
    location:["suburban","rural"],
    costPerSqm:30000, yieldPct:10.0,
    tag:"Lifestyle",tagColor:"#2E5C9A",
  },
  {
    id:"agri_camp",
    icon:"🌾",
    title:"เกษตรจัดสรร",
    sub:"Agricultural Allotment",
    desc:"แบ่งพื้นที่เช่าทำเกษตร ปลูกผัก ฟาร์มสเตย์ ชุมชนเกษตร",
    skill:"ดูแลที่ดิน ชุมชน เกษตรกร",
    minWah:1000, maxWah:99999,
    location:["suburban","rural"],
    costPerSqm:3000, yieldPct:8.0,
    tag:"Community",tagColor:"#5C8A3D",
  },
  {
    id:"market",
    icon:"🏪",
    title:"ตลาด / ชุมชน",
    sub:"Market & Community Hub",
    desc:"ตลาดนัด Street Food Night Market Community Mall",
    skill:"บริหารพื้นที่เช่า จัดกิจกรรม",
    minWah:200, maxWah:10000,
    location:["urban","suburban","rural"],
    costPerSqm:8000, yieldPct:12.0,
    tag:"High Yield",tagColor:"#B8600A",
  },
  {
    id:"commercial",
    icon:"🏢",
    title:"อาคารพาณิชย์",
    sub:"Commercial Building",
    desc:"ออฟฟิศ คลินิก Co-working ร้านค้า เช่าระยะยาว",
    skill:"บริหารสัญญาเช่า ดูแลอาคาร",
    minWah:100, maxWah:3000,
    location:["urban","suburban"],
    costPerSqm:30000, yieldPct:8.5,
    tag:"Stable",tagColor:"#4A4A8A",
  },
];

function BusinessCard({ bm, selected, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: selected ? `${C.bark}` : C.white,
      border:`2px solid ${selected ? C.amber : C.sand}`,
      borderRadius:16, padding:"22px 20px",
      cursor:"pointer", transition:"all .2s",
      position:"relative", overflow:"hidden",
      boxShadow: selected ? "0 8px 28px rgba(44,36,22,.18)" : "0 2px 8px rgba(44,36,22,.06)",
      transform: selected ? "translateY(-3px)" : "none",
    }}
    onMouseEnter={e=>{ if(!selected){ e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 6px 20px rgba(44,36,22,.12)"; }}}
    onMouseLeave={e=>{ if(!selected){ e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="0 2px 8px rgba(44,36,22,.06)"; }}}>

      {selected && (
        <div style={{position:"absolute",top:10,right:10,width:22,height:22,borderRadius:"50%",
          background:C.amber,display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:12,color:"#fff",fontWeight:700}}>✓</div>
      )}

      <div style={{fontSize:32,marginBottom:10}}>{bm.icon}</div>
      <div style={{fontFamily:"Georgia,serif",fontSize:16,fontWeight:700,
        color:selected?C.cream:C.bark,marginBottom:4}}>{bm.title}</div>
      <div style={{fontSize:10,fontWeight:600,letterSpacing:".1em",textTransform:"uppercase",
        color:selected?"rgba(255,255,255,.5)":C.mist,marginBottom:10}}>{bm.sub}</div>
      <div style={{fontSize:12,color:selected?"rgba(255,255,255,.7)":C.barkLt,lineHeight:1.65,marginBottom:12}}>
        {bm.desc}
      </div>
      <span style={{
        display:"inline-block",fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:20,
        background: selected ? "rgba(255,255,255,.15)" : bm.tagColor+"18",
        color: selected ? C.amberLt : bm.tagColor,
      }}>{bm.tag}</span>
    </div>
  );
}

/* ── Land results for selected business model ── */
function LandResultsForBusiness({ bm, onUnlock, onToast, onGoReport }) {
  const loc_filter = bm.location;
  const matches = REAL_LANDS.filter(l => {
    const loc = classifyLocation(l.province, l.district);
    const wah = l.land_size_wah || 0;
    return loc_filter.includes(loc) && wah >= bm.minWah && wah <= bm.maxWah;
  }).slice(0, 4);

  const featured = FEATURED_LANDS.filter(l => {
    const loc = classifyLocation(l.province, l.district);
    return loc_filter.includes(loc);
  }).slice(0, 2);

  const allLands = [...featured, ...matches];

  if (allLands.length === 0) return (
    <div style={{textAlign:"center",padding:"28px",color:C.mist,fontSize:14}}>
      ไม่พบแปลงที่เหมาะสมในฐานข้อมูลตอนนี้
    </div>
  );

  return (
    <div>
      <div style={{fontSize:11,color:C.mist,marginBottom:14,fontWeight:600,
        textTransform:"uppercase",letterSpacing:".1em"}}>
        พบ {allLands.length} แปลงที่เหมาะกับ {bm.title}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {allLands.map((land,i) => {
          const wah   = land.land_size_wah || 0;
          const price = typeof land.price==="string"
            ? parseFloat(land.price.replace(/[^\d.]/g,""))||0 : land.price||0;
          const zone  = enrichZone(land.province||"",land.district||"");
          const sqm   = land.land_size_sqm || wah*4;
          const gfa   = Math.round(sqm * zone.far_ratio);
          const totalCost = sqm * 0.75 * bm.costPerSqm + price;
          const roi = bm.id==="sell_project"
            ? ((totalCost*(1+bm.sellMargin)-totalCost)/totalCost*100).toFixed(1)
            : bm.yieldPct.toFixed(1);
          const isOwner = land.source==="owner";

          return (
            <div key={land.id||i} style={{
              background:C.white,
              border:`1.5px solid ${isOwner?C.forest:C.sand}`,
              borderRadius:14,overflow:"hidden",
            }}>
              <div style={{height:3,background:isOwner
                ?`linear-gradient(90deg,${C.forest},${C.forestLt})`
                :`linear-gradient(90deg,${C.amber},${C.amberLt})`}}/>
              <div style={{padding:"14px 18px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div style={{flex:1,marginRight:12}}>
                    {isOwner && <span style={{fontSize:9,fontWeight:700,letterSpacing:".1em",
                      textTransform:"uppercase",background:"#EAF2EC",color:C.forest,
                      padding:"2px 7px",borderRadius:20,marginBottom:5,display:"inline-block"}}>✦ โฉนดยืนยัน</span>}
                    <div style={{fontFamily:"Georgia,serif",fontSize:14,fontWeight:700,
                      color:C.bark,lineHeight:1.4,marginTop:isOwner?4:0}}>
                      {(land.title||"").slice(0,50)}{(land.title||"").length>50?"...":""}
                    </div>
                    <div style={{fontSize:11,color:C.mist,marginTop:2}}>{land.district} · {land.province}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    {price>0
                      ?<div style={{fontFamily:"monospace",fontSize:15,fontWeight:700,color:C.bark}}>฿{(price/1e6).toFixed(1)}M</div>
                      :<div style={{fontSize:11,color:C.forest,fontWeight:600,background:"#EAF2EC",padding:"3px 8px",borderRadius:6}}>ติดต่อขอราคา</div>}
                    <div style={{fontSize:11,color:C.mist,marginTop:2}}>{wah.toLocaleString()} ตร.ว.</div>
                  </div>
                </div>

                {/* ROI Preview for this business model */}
                <div style={{background:C.creamDk,borderRadius:8,padding:"10px 14px",marginBottom:12,
                  display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                  {[
                    ["GFA สูงสุด",`${(gfa/1000).toFixed(1)}K ตร.ม.`,""],
                    ["ROI คาดการณ์",`~${roi}%`,""],
                    ["คืนทุน",roi>0?`~${(100/parseFloat(roi)).toFixed(1)} ปี`:"-`",""],
                  ].map(([l,v])=>(
                    <div key={l}>
                      <div style={{fontSize:9,color:C.mist,textTransform:"uppercase",letterSpacing:".08em",marginBottom:2}}>{l}</div>
                      <div style={{fontFamily:"monospace",fontSize:14,fontWeight:700,color:C.bark}}>{v}</div>
                    </div>
                  ))}
                </div>

                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>onToast("🏗️ กำลังส่งคำขอปรึกษาสถาปนิก — ทีมจะติดต่อกลับภายใน 24 ชม.")}
                    style={{flex:1,padding:"10px",border:"none",borderRadius:9,
                      background:C.forest,color:C.white,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                    🏗️ สอบถามสถาปนิก — ฟรี
                  </button>
                  <button onClick={onUnlock}
                    style={{padding:"10px 14px",border:`1px solid ${C.amber}`,borderRadius:9,
                      background:"#FDF5EA",color:C.amber,fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
                    ข้อมูลลึก ฿490
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{marginTop:16,padding:"14px 18px",background:C.bark,borderRadius:12,textAlign:"center",cursor:"pointer"}}
        onClick={onGoReport}>
        <div style={{fontSize:12,color:"rgba(255,255,255,.5)",marginBottom:3}}>อยากได้รายงานเต็มรูปแบบ?</div>
        <div style={{fontSize:14,fontWeight:700,color:C.white}}>
          ปรึกษาสถาปนิก + Feasibility Study ฿4,900 →
        </div>
      </div>
    </div>
  );
}

/* ══ ACTIVITY ENGINE SCREEN v3 — Business-First ══ */
function ActivityEngineScreen({ onToast, onOpenPaywall, onGoReport }) {
  const [selBM, setSelBM] = useState(null);

  return (
    <div style={{background:C.cream, minHeight:"calc(100vh - 58px)"}}>
      {/* Header */}
      <div style={{background:C.white,borderBottom:`1px solid ${C.sand}`,padding:"20px 28px 16px"}}>
        <div style={{maxWidth:860,margin:"0 auto"}}>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:".18em",textTransform:"uppercase",
            color:C.amber,marginBottom:6}}>FeasX · Activity Engine</div>
          <div style={{fontFamily:"Georgia,serif",fontSize:22,fontWeight:700,color:C.bark,marginBottom:4}}>
            คุณถนัดบริหารอะไร?
          </div>
          <div style={{fontSize:13,color:C.barkLt,lineHeight:1.7}}>
            เลือก Business Model ที่คุณสนใจ — ระบบจะแนะนำที่ดินและคู่มือการลงทุนที่เหมาะสมให้ทันที
          </div>
        </div>
      </div>

      <div style={{maxWidth:860,margin:"0 auto",padding:"28px 28px 56px"}}>

        {/* Step 1 — Business Model Grid */}
        <div style={{marginBottom:32}}>
          <div style={{fontSize:11,fontWeight:700,color:C.bark,textTransform:"uppercase",
            letterSpacing:".1em",marginBottom:16}}>
            ① เลือกประเภทการลงทุนที่ถนัด
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
            {BUSINESS_MODELS.map(bm=>(
              <BusinessCard
                key={bm.id}
                bm={bm}
                selected={selBM?.id===bm.id}
                onClick={()=>setSelBM(bm)}
              />
            ))}
          </div>
        </div>

        {/* Step 2 — Land Recommendations */}
        {selBM && (
          <div style={{animation:"tabFade .4s ease"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <div style={{width:3,height:18,background:C.amber,borderRadius:2}}/>
              <div style={{fontSize:11,fontWeight:700,color:C.bark,textTransform:"uppercase",letterSpacing:".1em"}}>
                ② ที่ดินที่เหมาะกับ {selBM.icon} {selBM.title}
              </div>
            </div>
            <div style={{background:"#FDF5EA",border:`1px solid ${C.amber}33`,borderRadius:10,
              padding:"10px 14px",marginBottom:16,fontSize:12,color:C.barkLt,lineHeight:1.65}}>
              💡 <strong style={{color:C.bark}}>ทักษะที่ต้องการ:</strong> {selBM.skill}
              {" · "}Yield คาดการณ์ <strong style={{color:C.forest}}>{selBM.yieldPct>0?selBM.yieldPct+"%/ปี":"Capital Gain"}</strong>
            </div>
            <LandResultsForBusiness
              bm={selBM}
              onUnlock={onOpenPaywall}
              onToast={onToast}
              onGoReport={onGoReport}
            />
          </div>
        )}

        {/* Empty state */}
        {!selBM && (
          <div style={{textAlign:"center",padding:"28px 0",color:C.mist,fontSize:13}}>
            ← เลือก Business Model ด้านบนเพื่อดูที่ดินที่เหมาะสม
          </div>
        )}
      </div>
    </div>
  );
}
/* ════ ROOT APP ════ */

/* ════════════════════════════════════════════════════════════
   ROOT APP v3 — Credit System + New Nav + No AI Agent
════════════════════════════════════════════════════════════ */
export default function App() {
  const [screen, setScreen]   = useState("l1");
  const [modal,  setModal]    = useState(null);
  const [toast,  setToast]    = useState("");
  const [credits,setCredits]  = useState(3); // จำลอง credit
  const [myLands,setMyLands]  = useState([
    { id:1, loc:"อ่อนนุช · วัฒนา",  size:"2-1-40",    price:"฿38M",  roiA:12.4 },
    { id:2, loc:"รัชดา · ห้วยขวาง", size:"3-0-0",     price:"฿72M",  roiA:14.1 },
  ]);

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(""),3200); }

  function handleUnlock() {
    if (credits > 0) {
      // มี credit → แสดง confirm modal
      setModal("creditConfirm");
    } else {
      // ไม่มี credit → ไปซื้อ
      setModal("credits");
    }
  }

  function handleCreditConfirm() {
    setCredits(c => c-1);
    setModal(null);
    showToast("✓ ใช้ 1 เครดิต — กำลังโหลดข้อมูล...");
    setTimeout(() => setScreen("engine"), 700);
  }

  function handleBuyCredits(pkg) {
    setModal(null);
    showToast(`✓ ชำระเงิน ฿${pkg.price.toLocaleString()} สำเร็จ — ได้รับ ${pkg.credits===999?"Unlimited":pkg.credits+" เครดิต"}`);
    if (pkg.credits !== 999) setCredits(c => c + pkg.credits);
  }

  const goHome     = () => { setScreen("l1");       setModal(null); };
  const goIntake   = () => { setScreen("intake");   setModal(null); };
  const goEngine   = () => { setScreen("engine");   setModal(null); };
  const goReport   = () => { setScreen("report");   setModal(null); };
  const goActivity = () => { setScreen("activity"); setModal(null); };

  return (
    <>
      <GlobalStyles/>

      <Navbar
        screen={screen}
        credits={credits}
        onGoHome={goHome}
        onGoIntake={goIntake}
        onGoEngine={goEngine}
        onGoReport={goReport}
        onGoActivity={goActivity}
        onOpenCredits={() => setModal("credits")}
        onToast={showToast}
      />

      {/* Screens */}
      {screen==="l1" && (
        <HomeScreen
          onOpenPaywall={handleUnlock}
          onToast={showToast}
          onGoReport={goReport}
          onGoIntake={goIntake}
          credits={credits}
          myLands={myLands}
        />
      )}
      {screen==="engine"   && <SmartEngine onToast={showToast} credits={credits} onUseCredit={handleUnlock}/>}
      {screen==="activity" && <ActivityEngineScreen onToast={showToast} onOpenPaywall={handleUnlock} onGoReport={goReport}/>}
      {screen==="intake" && <IntakeScreen onToast={showToast} onNext={goEngine}/>}
      {screen==="report" && <ReportScreen onToast={showToast}/>}
      {screen==="l3"     && <Level3 onGoHome={goHome} onToast={showToast}/>}

      {/* Modals */}
      {modal==="paywall" && (
        <PaywallModal onClose={()=>setModal(null)} onUnlock={handleUnlock}/>
      )}
      {modal==="credits" && (
        <CreditPackageModal onClose={()=>setModal(null)} onBuy={handleBuyCredits}/>
      )}
      {modal==="creditConfirm" && (
        <CreditConfirmModal
          credits={credits}
          landName="แปลงที่เลือก"
          onConfirm={handleCreditConfirm}
          onClose={()=>setModal(null)}
        />
      )}
      {modal==="launchOffer" && (
        <LaunchOfferModal onClose={()=>setModal(null)} onPay={()=>{setModal(null);goReport();}}/>
      )}

      <Toast msg={toast}/>
    </>
  );
}

/* ── Launch Offer Modal (Special ฿4,900) ── */
function LaunchOfferModal({ onClose, onPay }) {
  return (
    <Overlay onClose={onClose}>
      <div style={{
        background:C.white, borderRadius:20, maxWidth:460, width:"100%",
        overflow:"hidden", boxShadow:"0 24px 64px rgba(44,36,22,.28)",
        animation:"slideUp .28s ease", position:"relative",
      }}>
        <button onClick={onClose} style={{position:"absolute",top:14,right:14,
          background:C.creamDk,border:"none",borderRadius:"50%",
          width:28,height:28,fontSize:14,cursor:"pointer",color:C.barkLt,zIndex:1}}>✕</button>

        {/* Fire header */}
        <div style={{
          background:`linear-gradient(135deg,#1A0A00,#3A1800)`,
          padding:"24px 28px 20px", textAlign:"center",
        }}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:".18em",
            textTransform:"uppercase",color:"#FF6B35",marginBottom:8}}>
            🔥 SPECIAL LAUNCH OFFER
          </div>
          <div style={{fontSize:13,color:"rgba(255,255,255,.7)",marginBottom:4}}>
            จำกัดสิทธิ์ <strong style={{color:"#FF6B35"}}>100 ท่านแรกเท่านั้น</strong>
          </div>
          <div style={{fontFamily:"Georgia,serif",fontSize:20,fontWeight:700,
            color:"#F0EAE0",lineHeight:1.4}}>
            Premium Feasibility Report<br/>
            <span style={{color:"#FF6B35"}}>AI Powered</span>
          </div>
        </div>

        <div style={{padding:"22px 28px 26px"}}>
          {/* Price anchor */}
          <div style={{
            background:"#FFF8F0",border:"1.5px solid #FF6B3533",
            borderRadius:12,padding:"18px",marginBottom:18,textAlign:"center",
          }}>
            <div style={{fontSize:13,color:C.mist,marginBottom:4}}>
              ราคาตลาดจ้างบริษัทที่ปรึกษา
            </div>
            <div style={{fontFamily:"monospace",fontSize:16,
              textDecoration:"line-through",color:C.mist,marginBottom:6}}>
              ฿49,000
            </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
              <span style={{fontFamily:"monospace",fontSize:32,fontWeight:700,color:C.forest}}>
                ฿4,900
              </span>
              <div style={{background:"#FF6B35",color:"#fff",fontSize:10,fontWeight:700,
                padding:"4px 10px",borderRadius:20}}>ลด 90%</div>
            </div>
            <div style={{fontSize:12,color:C.barkLt,marginTop:4}}>
              ประหยัดทันที <strong>฿44,100</strong>
            </div>
          </div>

          {/* What you get */}
          {[
            "⚡ ได้รับ PDF รายงานฉบับเต็มใน 5 นาที (ไม่ต้องรอ 2 สัปดาห์)",
            "✓ ข้อมูลผังเมืองล่าสุด พร้อมยื่นธนาคาร / นายทุน",
            "✓ ROI 3 รูปแบบ + GFA สูงสุด + คำแนะนำ AI",
            "✓ รายงาน PDF พร้อมพิมพ์ส่งได้ทันที",
          ].map(f => (
            <div key={f} style={{fontSize:13,color:C.barkLt,marginBottom:8,lineHeight:1.6}}>
              {f}
            </div>
          ))}

          <button onClick={onPay} style={{
            width:"100%",marginTop:14,padding:"15px",border:"none",
            borderRadius:12,fontSize:15,fontWeight:700,cursor:"pointer",
            background:`linear-gradient(135deg,${C.forest},${C.forestLt})`,
            color:C.white,
            boxShadow:"0 4px 20px rgba(61,107,79,.35)",
            transition:"transform .15s",
          }}
          onMouseEnter={e=>e.currentTarget.style.transform="translateY(-1px)"}
          onMouseLeave={e=>e.currentTarget.style.transform="none"}>
            💳 ชำระ ฿4,900 · รับรายงานทันที →
          </button>

          <div style={{
            display:"flex",justifyContent:"center",gap:20,marginTop:12,
            fontSize:11,color:C.mist,
          }}>
            <span>🔒 ชำระปลอดภัย</span>
            <span>📋 ได้ไฟล์รายงานทันที 100%</span>
            <span>⚡ PromptPay / Card</span>
          </div>
        </div>
      </div>
    </Overlay>
  );
}

const LBL = {display:"block",fontSize:11,fontWeight:600,color:"#8B6F47",letterSpacing:".08em",textTransform:"uppercase",marginBottom:5};
const LBL_GOLD = {display:"block",fontSize:10,fontWeight:600,color:"#9A7A48",letterSpacing:".1em",textTransform:"uppercase",marginBottom:5};
function ReportScreen({ onToast }) {
  const [step, setStep] = useState(1); // 1=กรอกข้อมูล 2=AI กำลังสร้าง 3=รายงานพร้อม
  const [form, setForm] = useState({
    title:"", location:"", district:"", province:"กรุงเทพมหานคร",
    size:"", price:"", goal:"", road_width:"", note:"", agent_ref:"",
  });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef(null);

  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const parsed = parseLandSize(form.size);
  const zone = enrichZone(form.province, form.district);
  const price = parseFloat(form.price.replace(/,/g,"")) || 0;
  const roi = parsed.land_size_sqm > 0
    ? calcROI({...parsed, ...zone, price_baht:price})
    : null;

  async function generateReport() {
    if (!form.location || !form.size) {
      onToast("กรุณากรอกทำเลและขนาดที่ดินก่อน"); return;
    }
    setStep(2); setLoading(true);

    const prompt = `สร้างรายงาน Feasibility Study เต็มรูปแบบสำหรับที่ดินต่อไปนี้:

ข้อมูลที่ดิน:
- ชื่อโครงการ/หัวข้อ: ${form.title || "ที่ดิน "+form.location}
- ทำเล: ${form.location}, ${form.district}, ${form.province}
- ขนาด: ${form.size} (= ${parsed.land_size_wah} ตร.ว. / ${parsed.land_size_sqm} ตร.ม.)
- ราคา: ${price.toLocaleString()} บาท (${parsed.land_size_wah>0?(price/parsed.land_size_wah).toFixed(0):"?"} บ/ตร.ว.)
- ผังเมือง: ${zone.zoning_color} | FAR ${zone.far_ratio}:1 | ถนน ${zone.road_width_m}ม.
- GFA สูงสุด: ${roi?.GFA_Max?.toLocaleString() || "?"} ตร.ม.
- เป้าหมาย: ${form.goal || "ยังไม่ระบุ"}
- ความกว้างถนน: ${form.road_width || zone.road_width_m} ม.
- หมายเหตุ: ${form.note || "-"}

ROI ที่คำนวณได้:
- Type A (บ้านหรู): ${roi?.Type_A_ROI?.toFixed(1)}% ต่อปี
- Type B (บ้านเช่า): ${roi?.Type_B_ROI?.toFixed(1)}% ต่อปี  
- Type C (Low-Rise): ${roi?.Type_C_ROI ? roi.Type_C_ROI.toFixed(1)+"%": roi?.Type_C_Block || "N/A"}

กรุณาสร้างรายงานเป็นภาษาไทยในรูปแบบ JSON ต่อไปนี้ (ตอบเป็น JSON เท่านั้น ไม่ต้องมี markdown):
{
  "executive_summary": "สรุปผู้บริหาร 3-4 ประโยค",
  "location_analysis": "วิเคราะห์ทำเลและศักยภาพ 4-5 ประโยค",
  "legal_zoning": "ข้อมูลผังเมือง FAR กฎหมายควบคุมอาคาร 3-4 ประโยค",
  "type_a": {"recommendation": "ข้อแนะนำ Type A", "pros": ["ข้อดี1","ข้อดี2","ข้อดี3"], "cons": ["ข้อเสีย1","ข้อเสีย2"], "verdict": "เหมาะสม/ไม่เหมาะสม และเหตุผล"},
  "type_b": {"recommendation": "ข้อแนะนำ Type B", "pros": ["ข้อดี1","ข้อดี2","ข้อดี3"], "cons": ["ข้อเสีย1","ข้อเสีย2"], "verdict": "เหมาะสม/ไม่เหมาะสม และเหตุผล"},
  "type_c": {"recommendation": "ข้อแนะนำ Type C", "pros": ["ข้อดี1","ข้อดี2"], "cons": ["ข้อเสีย1","ข้อเสีย2"], "verdict": "เหมาะสม/ไม่เหมาะสม/ไม่ได้ตามกฎหมาย"},
  "best_recommendation": "สรุปว่า Type ไหนดีที่สุดและทำไม",
  "next_steps": ["ขั้นตอนที่ 1","ขั้นตอนที่ 2","ขั้นตอนที่ 3","ขั้นตอนที่ 4"],
  "risk_flags": ["ความเสี่ยง1","ความเสี่ยง2","ความเสี่ยง3"],
  "disclaimer": "ข้อจำกัดความรับผิดชอบ 1-2 ประโยค"
}`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-6", max_tokens:1000,
          messages:[{role:"user", content:prompt}]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "{}";
      const clean = text.replace(/```json|```/g,"").trim();
      const parsed_report = JSON.parse(clean);
      setReport(parsed_report);
      setStep(3);
    } catch(e) {
      onToast("เกิดข้อผิดพลาด กรุณาลองใหม่");
      setStep(1);
    }
    setLoading(false);
  }

  function printReport() {
    window.print();
  }

  const inp = (extra={}) => ({
    width:"100%", padding:"9px 12px",
    border:`1px solid ${C.sand}`, borderRadius:8,
    background:C.cream, color:C.bark, fontSize:14, ...extra
  });

  // ── Step 1: Form ──
  if (step === 1) return (
    <div style={{background:C.cream, minHeight:"calc(100vh - 58px)"}}>
      <div style={{maxWidth:720, margin:"0 auto", padding:"36px 28px 56px"}}>
        <div style={{marginBottom:28}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:".16em",textTransform:"uppercase",color:C.amber,marginBottom:8}}>Phase 2 · รายงาน Feasibility</div>
          <h2 style={{fontFamily:"Georgia,serif",fontSize:24,fontWeight:700,color:C.bark,marginBottom:6}}>สร้างรายงานวิเคราะห์ที่ดิน</h2>
          <p style={{fontSize:14,color:C.barkLt,lineHeight:1.7}}>กรอกข้อมูลด้านล่าง — AI จะสร้างรายงาน Feasibility Study เต็มรูปแบบภาษาไทย พร้อมพิมพ์ส่งนักลงทุนได้ทันที</p>
        </div>

        <div style={{background:C.white, border:`1px solid ${C.sand}`, borderRadius:16, padding:"28px 24px"}}>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:14}}>
            <div style={{gridColumn:"1/-1"}}>
              <label style={LBL}>ชื่อโครงการ / หัวข้อรายงาน</label>
              <input value={form.title} onChange={e=>set("title",e.target.value)}
                placeholder="เช่น Feasibility Report — ที่ดินอ่อนนุช ซ.38" style={inp()}/>
            </div>
            <div>
              <label style={LBL}>ทำเล / ที่อยู่ *</label>
              <input value={form.location} onChange={e=>set("location",e.target.value)}
                placeholder="เช่น ซ.อ่อนนุช 38" style={inp()}/>
            </div>
            <div>
              <label style={LBL}>เขต / อำเภอ</label>
              <input value={form.district} onChange={e=>set("district",e.target.value)}
                placeholder="เช่น วัฒนา" style={inp()}/>
            </div>
            <div>
              <label style={LBL}>ขนาดที่ดิน *</label>
              <input value={form.size} onChange={e=>set("size",e.target.value)}
                placeholder="เช่น 2-1-40 หรือ 400 ตร.ว." style={inp()}/>
              {parsed.land_size_wah > 0 && (
                <div style={{fontSize:11,color:C.forest,marginTop:4,fontFamily:"monospace"}}>
                  ✓ {parsed.land_size_wah} ตร.ว. = {parsed.land_size_sqm} ตร.ม.
                </div>
              )}
            </div>
            <div>
              <label style={LBL}>ราคาที่ดิน (บาท)</label>
              <input value={form.price} onChange={e=>set("price",e.target.value)}
                placeholder="เช่น 38000000" style={inp()}/>
            </div>
            <div>
              <label style={LBL}>เป้าหมายการพัฒนา</label>
              <select value={form.goal} onChange={e=>set("goal",e.target.value)} style={inp()}>
                <option value="">— เลือกเป้าหมาย —</option>
                <option>พัฒนาเพื่อขาย</option>
                <option>ปล่อยเช่าระยะยาว</option>
                <option>สร้างอาคารพาณิชย์</option>
                <option>วางแผนมรดก</option>
                <option>ขายเลย</option>
              </select>
            </div>
            <div>
              <label style={LBL}>ความกว้างถนนหน้าโครงการ (ม.)</label>
              <input value={form.road_width} onChange={e=>set("road_width",e.target.value)}
                placeholder={`ค่าเริ่มต้น: ${zone.road_width_m} ม.`} style={inp()}/>
            </div>
            <div style={{gridColumn:"1/-1"}}>
              <label style={LBL}>หมายเหตุ / จุดเด่นพิเศษ</label>
              <textarea value={form.note} onChange={e=>set("note",e.target.value)} rows={2}
                placeholder="เช่น ห่าง BTS 350 ม., EIA ผ่านแล้ว, มีน้ำประปา/ไฟฟ้า..." style={{...inp(),resize:"vertical"}}/>
            </div>
            <div>
              <label style={LBL}>Agent Referral ID (ถ้ามี)</label>
              <input value={form.agent_ref} onChange={e=>set("agent_ref",e.target.value.toUpperCase())}
                placeholder="เช่น AGT-00123" style={{...inp(),fontFamily:"monospace",letterSpacing:".08em"}}/>
            </div>
          </div>

          {/* Preview ROI */}
          {roi && (
            <div style={{marginTop:18,background:C.creamDk,borderRadius:10,padding:"14px 16px",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
              {[["GFA สูงสุด",(roi.GFA_Max||0).toLocaleString()+" ตร.ม."],
                ["ROI Type A",roi.Type_A_ROI?.toFixed(1)+"%"],
                ["ROI Type B",roi.Type_B_ROI?.toFixed(1)+"%"],
                ["ROI Type C",roi.Type_C_ROI?roi.Type_C_ROI.toFixed(1)+"%":roi.Type_C_Block||"N/A"]
              ].map(([l,v])=>(
                <div key={l}>
                  <div style={{fontSize:10,color:C.mist,marginBottom:3,textTransform:"uppercase",letterSpacing:".06em"}}>{l}</div>
                  <div style={{fontFamily:"monospace",fontSize:15,fontWeight:700,color:C.bark}}>{v}</div>
                </div>
              ))}
            </div>
          )}

          {/* Pricing comparison */}
          <div style={{marginTop:20,background:C.cream,border:`1.5px solid ${C.amber}`,borderRadius:12,padding:"16px 18px",position:"relative"}}>
            <div style={{position:"absolute",top:-10,left:14,background:C.amber,color:C.white,
              fontSize:10,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",padding:"3px 12px",borderRadius:20}}>
              Premium Feasibility Report
            </div>
            {/* Strikethrough */}
            <div style={{display:"flex",alignItems:"center",gap:10,marginTop:6,marginBottom:4,flexWrap:"wrap"}}>
              <div style={{fontSize:13,color:C.mist,textDecoration:"line-through",fontFamily:"monospace"}}>
                ฿40,000 — ฿200,000
              </div>
              <div style={{fontSize:10,background:"#FFF0E0",color:C.amber,padding:"2px 8px",borderRadius:20,fontWeight:700}}>
                ราคาตลาดจ้างบริษัทที่ปรึกษา
              </div>
            </div>
            <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:10}}>
              <span style={{fontFamily:"monospace",fontSize:28,fontWeight:700,color:C.forest}}>฿4,900</span>
              <span style={{fontSize:12,color:C.barkLt}}>/ รายงาน · จ่ายครั้งเดียว</span>
            </div>
            <div style={{height:1,background:C.sand,marginBottom:10}}/>
            <div style={{fontSize:12,color:C.barkLt,lineHeight:1.7}}>
              💡 <strong style={{color:C.bark}}>ประหยัดกว่า 90%</strong> เทียบกับจ้างที่ปรึกษา · ได้ผลภายใน 5 นาที ไม่ต้องรอสัปดาห์
            </div>
          </div>

          <button onClick={generateReport} style={{
            width:"100%",marginTop:14,padding:"14px",
            background:`linear-gradient(135deg,${C.forest},${C.forestLt})`,
            color:C.white,border:"none",borderRadius:10,fontSize:15,fontWeight:700,
            boxShadow:"0 4px 20px rgba(61,107,79,.3)",cursor:"pointer",transition:"transform .15s"}}
            onMouseEnter={e=>e.currentTarget.style.transform="translateY(-1px)"}
            onMouseLeave={e=>e.currentTarget.style.transform="none"}>
            🤖 ชำระ ฿4,900 · สร้างรายงาน Feasibility ทันที →
          </button>
          <div style={{textAlign:"center",fontSize:11,color:C.mist,marginTop:8}}>
            🔐 PromptPay / บัตรเครดิต · จ่ายครั้งเดียวไม่มีรายเดือน
          </div>
        </div>
      </div>
    </div>
  );

  // ── Step 2: Loading ──
  if (step === 2) return (
    <div style={{background:C.cream, minHeight:"calc(100vh - 58px)", display:"flex", alignItems:"center", justifyContent:"center"}}>
      <div style={{textAlign:"center", padding:40}}>
        <div style={{fontSize:48, marginBottom:20, animation:"pulse 1.5s infinite"}}>🤖</div>
        <div style={{fontFamily:"Georgia,serif", fontSize:22, fontWeight:700, color:C.bark, marginBottom:10}}>AI กำลังวิเคราะห์...</div>
        <div style={{fontSize:14, color:C.barkLt, lineHeight:1.8}}>
          กำลังประเมินศักยภาพทำเล · คำนวณ ROI 3 Type<br/>
          วิเคราะห์กฎหมายผังเมือง · จัดทำรายงาน
        </div>
        <div style={{display:"flex",justifyContent:"center",gap:6,marginTop:20}}>
          {[0,1,2].map(i=>(
            <div key={i} style={{width:8,height:8,borderRadius:"50%",background:C.forest,
              animation:`pulse ${1+i*0.2}s infinite`,animationDelay:`${i*0.2}s`}}/>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Step 3: Report ──
  if (step === 3 && report) return (
    <div style={{background:C.cream, minHeight:"calc(100vh - 58px)"}}>
      {/* Action bar */}
      <div style={{background:C.white, borderBottom:`1px solid ${C.sand}`, padding:"12px 28px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12}}>
        <div style={{fontFamily:"Georgia,serif", fontSize:16, fontWeight:700, color:C.bark}}>
          📋 {form.title || "Feasibility Report — "+form.location}
        </div>
        <div style={{display:"flex", gap:10}}>
          <button onClick={()=>setStep(1)} style={{padding:"7px 16px",border:`1px solid ${C.sand}`,borderRadius:8,background:"transparent",color:C.barkLt,fontSize:13}}>
            ← แก้ไขข้อมูล
          </button>
          <button onClick={printReport} style={{padding:"7px 18px",border:"none",borderRadius:8,background:C.forest,color:C.white,fontSize:13,fontWeight:700}}>
            🖨️ พิมพ์ / บันทึก PDF
          </button>
        </div>
      </div>

      {/* Report content */}
      <div ref={reportRef} id="report-print" style={{maxWidth:820, margin:"0 auto", padding:"32px 28px 60px"}}>

        {/* Header */}
        <div style={{textAlign:"center", paddingBottom:24, borderBottom:`2px solid ${C.sand}`, marginBottom:28}}>
          <div style={{fontSize:11, fontWeight:700, letterSpacing:".16em", textTransform:"uppercase", color:C.amber, marginBottom:8}}>
            FeasX · Smart Real Estate Feasibility
          </div>
          <h1 style={{fontFamily:"Georgia,serif", fontSize:26, fontWeight:700, color:C.bark, marginBottom:6}}>
            {form.title || "Feasibility Study Report"}
          </h1>
          <div style={{fontSize:13, color:C.barkLt}}>
            {form.location} · {form.district} · {form.province}
          </div>
          <div style={{display:"flex", justifyContent:"center", gap:20, marginTop:14, flexWrap:"wrap"}}>
            {[
              ["ขนาด", `${parsed.land_size_wah} ตร.ว.`],
              ["GFA Max", `${(roi?.GFA_Max||0).toLocaleString()} ตร.ม.`],
              ["ผังเมือง", zone.zoning_color],
              ["วันที่", new Date().toLocaleDateString("th-TH")],
            ].map(([l,v])=>(
              <div key={l} style={{background:C.creamDk, borderRadius:8, padding:"8px 16px", textAlign:"center"}}>
                <div style={{fontSize:10, color:C.mist, marginBottom:2, textTransform:"uppercase", letterSpacing:".08em"}}>{l}</div>
                <div style={{fontFamily:"monospace", fontSize:14, fontWeight:700, color:C.bark}}>{v}</div>
              </div>
            ))}
          </div>
          {form.agent_ref && (
            <div style={{marginTop:10, fontSize:11, color:C.amber}}>Agent Referral: {form.agent_ref}</div>
          )}
        </div>

        {/* Executive Summary */}
        <Section title="01 · สรุปผู้บริหาร" color={C.forest}>
          <p style={{fontSize:14, color:C.bark, lineHeight:1.85}}>{report.executive_summary}</p>
        </Section>

        {/* Location */}
        <Section title="02 · วิเคราะห์ทำเลและศักยภาพ" color={C.amber}>
          <p style={{fontSize:14, color:C.bark, lineHeight:1.85}}>{report.location_analysis}</p>
        </Section>

        {/* Legal */}
        <Section title="03 · ผังเมืองและกฎหมายควบคุมอาคาร" color={C.bark}>
          <p style={{fontSize:14, color:C.bark, lineHeight:1.85}}>{report.legal_zoning}</p>
          <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginTop:14}}>
            {[
              ["ผังเมือง", zone.zoning_color],
              ["FAR", `${zone.far_ratio}:1`],
              ["ถนนขั้นต่ำ Type C", `${zone.road_width_m} ม.`],
            ].map(([l,v])=>(
              <div key={l} style={{background:C.creamDk, borderRadius:8, padding:"10px 12px", textAlign:"center"}}>
                <div style={{fontSize:10, color:C.mist, marginBottom:2}}>{l}</div>
                <div style={{fontFamily:"monospace", fontWeight:700, fontSize:15, color:C.bark}}>{v}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* 3 Types */}
        <div style={{fontSize:11, fontWeight:700, letterSpacing:".14em", textTransform:"uppercase", color:C.mist, marginBottom:14}}>04 · เปรียบเทียบรูปแบบพัฒนา 3 ประเภท</div>
        <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:28}}>
          {[
            {key:"type_a", label:"Type A · บ้านหรู", roi:roi?.Type_A_ROI, bar:"#C9A96E", d:report.type_a},
            {key:"type_b", label:"Type B · บ้านเช่า", roi:roi?.Type_B_ROI, bar:"#7BA68A", d:report.type_b},
            {key:"type_c", label:"Type C · Low-Rise", roi:roi?.Type_C_ROI, bar:C.forest, d:report.type_c, block:roi?.Type_C_Block},
          ].map(({key,label,roi:r,bar,d,block})=>(
            <div key={key} style={{background:C.white, border:`1px solid ${C.sand}`, borderRadius:12, overflow:"hidden"}}>
              <div style={{height:4, background:bar}}/>
              <div style={{padding:"14px 16px"}}>
                <div style={{fontFamily:"Georgia,serif", fontSize:14, fontWeight:700, color:C.bark, marginBottom:8}}>{label}</div>
                <div style={{fontFamily:"monospace", fontSize:22, fontWeight:700,
                  color:block?C.danger:(r>=12?C.forest:r>=7?C.amber:C.danger), marginBottom:10}}>
                  {block ? "N/A" : r?.toFixed(1)+"%"}
                </div>
                {d && (
                  <>
                    {d.pros?.map((p,i)=><div key={i} style={{fontSize:12,color:C.barkLt,marginBottom:3}}>✓ {p}</div>)}
                    {d.cons?.map((c,i)=><div key={i} style={{fontSize:12,color:C.danger,marginBottom:3}}>✗ {c}</div>)}
                    <div style={{fontSize:11,color:C.barkLt,marginTop:8,paddingTop:8,borderTop:`1px dashed ${C.creamDk}`,lineHeight:1.6}}>{d.verdict}</div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Best Recommendation */}
        <div style={{background:`linear-gradient(135deg,${C.forest}18,${C.forestLt}10)`,
          border:`1.5px solid ${C.forest}44`,borderRadius:12,padding:"18px 20px",marginBottom:24}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:".14em",textTransform:"uppercase",color:C.forest,marginBottom:8}}>⭐ คำแนะนำสูงสุด</div>
          <p style={{fontSize:14,color:C.bark,lineHeight:1.85,margin:0}}>{report.best_recommendation}</p>
        </div>

        {/* Next steps + Risk */}
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, marginBottom:24}}>
          <Section title="05 · ขั้นตอนถัดไป" color={C.forest} compact>
            {report.next_steps?.map((s,i)=>(
              <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:8,fontSize:13,color:C.bark}}>
                <span style={{fontFamily:"monospace",fontSize:11,fontWeight:700,color:C.forest,marginTop:1,minWidth:20}}>{String(i+1).padStart(2,"0")}</span>
                <span style={{lineHeight:1.6}}>{s}</span>
              </div>
            ))}
          </Section>
          <Section title="06 · ความเสี่ยงที่ต้องระวัง" color={C.danger} compact>
            {report.risk_flags?.map((r,i)=>(
              <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:8,fontSize:13,color:C.bark}}>
                <span style={{color:C.danger,fontSize:13,marginTop:1}}>⚠</span>
                <span style={{lineHeight:1.6}}>{r}</span>
              </div>
            ))}
          </Section>
        </div>

        {/* Disclaimer */}
        <div style={{background:C.creamDk, borderRadius:10, padding:"14px 16px", fontSize:12, color:C.mist, lineHeight:1.7}}>
          <strong style={{color:C.barkLt}}>ข้อจำกัดความรับผิดชอบ:</strong> {report.disclaimer} · รายงานนี้จัดทำโดย FeasX Platform เพื่อการประเมินเบื้องต้นเท่านั้น
        </div>
      </div>
    </div>
  );

  return null;
}

function Section({ title, color, children, compact }) {
  return (
    <div style={{marginBottom: compact?0:24}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <div style={{width:3,height:18,background:color,borderRadius:2}}/>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:".14em",textTransform:"uppercase",color}}>{title}</div>
      </div>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PHASE 3 — LAYER 0: OCR โฉนด + GPS PIN
   screen="intake" — รับข้อมูลดิบจากเจ้าของที่ดิน
══════════════════════════════════════════════════════════════ */

function IntakeScreen({ onToast }) {
  const [mode, setMode] = useState(null); // "deed" | "gps"
  const [img, setImg] = useState(null);
  const [imgBase64, setImgBase64] = useState(null);
  const [gps, setGps] = useState({lat:"",lng:"",area:""});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confidence, setConfidence] = useState(null);
  const fileRef = useRef(null);

  function handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    setImg(f);
    const reader = new FileReader();
    reader.onload = ev => {
      const base64 = ev.target.result.split(",")[1];
      setImgBase64(base64);
    };
    reader.readAsDataURL(f);
  }

  async function analyzeWithOCR() {
    if (!imgBase64) { onToast("กรุณาอัปโหลดรูปโฉนดก่อน"); return; }
    setLoading(true); setResult(null);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-6", max_tokens:1000,
          messages:[{
            role:"user",
            content:[
              {type:"image", source:{type:"base64", media_type:img.type||"image/jpeg", data:imgBase64}},
              {type:"text", text:`คุณคือระบบ OCR เฉพาะทางสำหรับโฉนดที่ดินไทย

กรุณาสกัดข้อมูลจากรูปโฉนดหรือเอกสารที่ดินที่เห็น แล้วตอบเป็น JSON เท่านั้น:
{
  "deed_type": "โฉนดที่ดิน/น.ส.3/ส.ค.1/อื่นๆ หรือ 'ไม่ใช่โฉนด' ถ้าไม่ใช่เอกสารที่ดิน",
  "deed_number": "เลขที่โฉนด หรือ null",
  "title_deed_no": "เลขที่ดิน หรือ null",
  "area_rai": ตัวเลขไร่ หรือ null,
  "area_ngan": ตัวเลขงาน หรือ null,
  "area_wah": ตัวเลขตารางวา หรือ null,
  "area_sqm": ตัวเลขตารางเมตร หรือ null,
  "province": "จังหวัด หรือ null",
  "district": "อำเภอ/เขต หรือ null",
  "subdistrict": "ตำบล/แขวง หรือ null",
  "owner_name": "ชื่อเจ้าของ หรือ null",
  "map_sheet": "ระวางที่ หรือ null",
  "ocr_confidence": 0.0 ถึง 1.0 (ความมั่นใจในการอ่าน),
  "notes": "สิ่งที่อ่านไม่ชัดหรือข้อสังเกต",
  "road_access_visible": true/false หรือ null
}`}
            ]
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "{}";
      const clean = text.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
      setConfidence(parsed.ocr_confidence || 0);
    } catch(e) {
      onToast("เกิดข้อผิดพลาดในการอ่านโฉนด กรุณาลองใหม่");
    }
    setLoading(false);
  }

  async function analyzeGPS() {
    if (!gps.lat || !gps.lng) { onToast("กรุณาระบุพิกัด GPS"); return; }
    setLoading(true); setResult(null);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-6", max_tokens:1000,
          messages:[{role:"user", content:`ที่ดินมีพิกัด GPS: lat=${gps.lat}, lng=${gps.lng}
ขนาดโดยประมาณ: ${gps.area || "ไม่ทราบ"} ตร.ว.

กรุณาวิเคราะห์ตำแหน่งและประเมินข้อมูลเบื้องต้น ตอบเป็น JSON เท่านั้น:
{
  "estimated_location": "คำอธิบายตำแหน่งโดยประมาณในประเทศไทย",
  "probable_province": "จังหวัดที่น่าจะเป็น",
  "probable_district": "เขต/อำเภอที่น่าจะเป็น",
  "area_sqm": ${gps.area ? parseFloat(gps.area)*4 : null},
  "area_wah": ${gps.area || null},
  "estimation_method": "gps_pin_estimate",
  "ocr_confidence": 0.5,
  "road_access_visible": null,
  "notes": "ข้อมูลนี้เป็นการประมาณจาก GPS เท่านั้น ต้องยืนยันกับโฉนดจริง",
  "flags": ["low_confidence_area", "requires_deed_verification"]
}`}]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "{}";
      const clean = text.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
      setConfidence(0.5);
    } catch(e) {
      onToast("เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
    setLoading(false);
  }

  const confColor = confidence >= 0.8 ? C.forest : confidence >= 0.5 ? C.amber : C.danger;
  const confLabel = confidence >= 0.8 ? "สูง — ข้อมูลน่าเชื่อถือ" : confidence >= 0.5 ? "ปานกลาง — ต้องยืนยันเพิ่ม" : "ต่ำ — ต้อง Human Review";

  return (
    <div style={{background:C.cream, minHeight:"calc(100vh - 58px)"}}>
      <div style={{maxWidth:760, margin:"0 auto", padding:"36px 28px 56px"}}>
        {/* Header */}
        <div style={{marginBottom:28}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:".16em",textTransform:"uppercase",color:C.amber,marginBottom:8}}>Layer 0 · Land Intake</div>
          <h2 style={{fontFamily:"Georgia,serif",fontSize:24,fontWeight:700,color:C.bark,marginBottom:6}}>นำเข้าข้อมูลที่ดิน</h2>
          <p style={{fontSize:14,color:C.barkLt,lineHeight:1.7}}>เลือกวิธีนำเข้าข้อมูลที่ดิน — ระบบจะสกัดข้อมูลสำคัญ สร้าง Land JSON และส่งต่อเข้าระบบวิเคราะห์อัตโนมัติ</p>
        </div>

        {/* Mode selector */}
        {!mode && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            {[
              {id:"deed",icon:"📄",title:"มีโฉนดที่ดิน",sub:"อัปโหลดรูปถ่ายโฉนด — AI จะอ่านและสกัดข้อมูลให้",badge:"OCR Engine",badgeColor:C.forest},
              {id:"gps",icon:"📍",title:"ไม่มีโฉนด / ปักหมุด GPS",sub:"ระบุพิกัด GPS — ระบบจะประเมินตำแหน่งและขนาด",badge:"GPS Estimate",badgeColor:C.amber},
            ].map(m=>(
              <div key={m.id} onClick={()=>setMode(m.id)} style={{
                background:C.white,border:`1.5px solid ${C.sand}`,borderRadius:14,
                padding:"24px 20px",cursor:"pointer",transition:"all .2s",textAlign:"center"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=C.amber;e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 6px 20px rgba(44,36,22,.1)"}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=C.sand;e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none"}}>
                <div style={{fontSize:36,marginBottom:12}}>{m.icon}</div>
                <span style={{display:"inline-block",fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:20,background:m.badgeColor+"22",color:m.badgeColor,marginBottom:10,letterSpacing:".1em",textTransform:"uppercase"}}>{m.badge}</span>
                <div style={{fontFamily:"Georgia,serif",fontSize:17,fontWeight:700,color:C.bark,marginBottom:8}}>{m.title}</div>
                <div style={{fontSize:13,color:C.barkLt,lineHeight:1.6}}>{m.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* DEED MODE */}
        {mode==="deed" && (
          <div style={{background:C.white,border:`1px solid ${C.sand}`,borderRadius:16,padding:"24px 22px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:18,fontWeight:700,color:C.bark}}>📄 อัปโหลดโฉนดที่ดิน</div>
              <button onClick={()=>{setMode(null);setResult(null);setImg(null);setImgBase64(null);}}
                style={{fontSize:12,color:C.mist,background:"none",border:"none",cursor:"pointer"}}>← เปลี่ยนวิธี</button>
            </div>
            <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleFile} style={{display:"none"}}/>
            <div onClick={()=>fileRef.current.click()} style={{
              border:`2px dashed ${img?C.forest:C.sand}`,borderRadius:12,padding:"32px",
              textAlign:"center",cursor:"pointer",background:img?"#EAF2EC":C.cream,marginBottom:16,transition:"all .2s"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=C.amber}
              onMouseLeave={e=>e.currentTarget.style.borderColor=img?C.forest:C.sand}>
              <div style={{fontSize:32,marginBottom:8}}>{img?"✅":"📎"}</div>
              <div style={{fontSize:14,color:img?C.forest:C.barkLt,fontWeight:img?600:400}}>
                {img?img.name:"คลิกเพื่อเลือกรูปโฉนด หรือลากวางที่นี่"}
              </div>
              {!img && <div style={{fontSize:12,color:C.mist,marginTop:4}}>รองรับ JPG, PNG, PDF</div>}
            </div>
            {img && !loading && !result && (
              <button onClick={analyzeWithOCR} style={{width:"100%",padding:"13px",background:C.forest,color:C.white,border:"none",borderRadius:10,fontSize:14,fontWeight:700}}>
                🤖 ให้ AI อ่านและสกัดข้อมูลโฉนด →
              </button>
            )}
            {loading && (
              <div style={{textAlign:"center",padding:"20px",color:C.barkLt}}>
                <div style={{fontSize:28,marginBottom:8,animation:"pulse 1s infinite"}}>🔍</div>
                กำลังอ่านโฉนด...
              </div>
            )}
          </div>
        )}

        {/* GPS MODE */}
        {mode==="gps" && (
          <div style={{background:C.white,border:`1px solid ${C.sand}`,borderRadius:16,padding:"24px 22px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:18,fontWeight:700,color:C.bark}}>📍 ระบุพิกัด GPS</div>
              <button onClick={()=>{setMode(null);setResult(null);}}
                style={{fontSize:12,color:C.mist,background:"none",border:"none",cursor:"pointer"}}>← เปลี่ยนวิธี</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:16}}>
              {[["lat","Latitude (ละติจูด)","เช่น 13.7234"],["lng","Longitude (ลองจิจูด)","เช่น 100.6754"],["area","ขนาดโดยประมาณ (ตร.ว.)","เช่น 400"]].map(([k,l,p])=>(
                <div key={k}>
                  <label style={{display:"block",fontSize:11,color:C.amber,fontWeight:600,textTransform:"uppercase",letterSpacing:".08em",marginBottom:5}}>{l}</label>
                  <input value={gps[k]} onChange={e=>setGps(p2=>({...p2,[k]:e.target.value}))}
                    placeholder={p} style={{width:"100%",padding:"9px 12px",border:`1px solid ${C.sand}`,borderRadius:8,background:C.cream,color:C.bark,fontSize:14,fontFamily:"monospace"}}/>
                </div>
              ))}
            </div>
            <div style={{background:"#FFF8E8",border:"1px solid #E8D070",borderRadius:8,padding:"10px 14px",fontSize:12,color:"#8B6F00",marginBottom:14}}>
              ⚠️ ข้อมูลจาก GPS เป็นการประมาณเท่านั้น จะมี flag <code>low_confidence_area</code> ต้องยืนยันกับโฉนดจริงก่อนใช้ในการซื้อขาย
            </div>
            {!loading && !result && (
              <button onClick={analyzeGPS} style={{width:"100%",padding:"13px",background:C.amber,color:C.white,border:"none",borderRadius:10,fontSize:14,fontWeight:700}}>
                📍 ประเมินพิกัดด้วย AI →
              </button>
            )}
            {loading && <div style={{textAlign:"center",padding:"20px",color:C.barkLt}}>กำลังประเมินพิกัด...</div>}
          </div>
        )}

        {/* RESULT */}
        {result && (
          <div style={{marginTop:20}}>
            {/* Confidence meter */}
            <div style={{background:C.white,border:`1px solid ${C.sand}`,borderRadius:12,padding:"16px 18px",marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:12,fontWeight:600,color:C.bark}}>OCR Confidence Score</div>
                <div style={{fontFamily:"monospace",fontSize:18,fontWeight:700,color:confColor}}>{Math.round((confidence||0)*100)}%</div>
              </div>
              <div style={{height:8,background:C.creamDk,borderRadius:10,overflow:"hidden",marginBottom:6}}>
                <div style={{height:"100%",width:`${(confidence||0)*100}%`,background:confColor,borderRadius:10,transition:"width 1s ease"}}/>
              </div>
              <div style={{fontSize:12,color:confColor,fontWeight:600}}>{confLabel}</div>
              {confidence < 0.8 && (
                <div style={{marginTop:8,fontSize:12,color:C.danger,background:"#FFF0F0",padding:"8px 10px",borderRadius:6}}>
                  🔴 Human Review Required — ต้องให้แอดมินตรวจสอบก่อนไหลเข้าระบบวิเคราะห์
                </div>
              )}
            </div>

            {/* Extracted data */}
            <div style={{background:C.white,border:`1px solid ${C.sand}`,borderRadius:12,padding:"16px 18px",marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:C.forest,marginBottom:14}}>ข้อมูลที่สกัดได้</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
                {[
                  ["ประเภทเอกสาร",result.deed_type],
                  ["เลขที่โฉนด",result.deed_number],
                  ["เลขที่ดิน",result.title_deed_no],
                  ["จังหวัด",result.province||result.probable_province],
                  ["เขต/อำเภอ",result.district||result.probable_district],
                  ["ตำบล/แขวง",result.subdistrict],
                  ["ขนาด (ไร่)",result.area_rai],
                  ["ขนาด (งาน)",result.area_ngan],
                  ["ขนาด (ตร.ว.)",result.area_wah],
                  ["ขนาด (ตร.ม.)",result.area_sqm],
                  ["ชื่อเจ้าของ",result.owner_name],
                  ["ระวางที่",result.map_sheet],
                ].filter(([,v])=>v!=null&&v!="null"&&v!="").map(([l,v])=>(
                  <div key={l} style={{background:C.cream,borderRadius:8,padding:"9px 12px"}}>
                    <div style={{fontSize:10,color:C.mist,marginBottom:2,textTransform:"uppercase",letterSpacing:".06em"}}>{l}</div>
                    <div style={{fontFamily:"monospace",fontSize:13,fontWeight:600,color:C.bark}}>{String(v)}</div>
                  </div>
                ))}
              </div>
              {result.notes && (
                <div style={{marginTop:12,fontSize:12,color:C.barkLt,background:C.creamDk,padding:"8px 12px",borderRadius:8}}>
                  📝 {result.notes}
                </div>
              )}
            </div>

            {/* JSON output */}
            <div style={{background:"#1C1915",borderRadius:12,padding:"16px 18px",marginBottom:16}}>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:C.lo_goldDk,marginBottom:10}}>Layer 0 Output JSON — พร้อมส่งเข้า AI Agent</div>
              <pre style={{color:"#C9A96E",fontSize:11,lineHeight:1.7,overflow:"auto",margin:0,whiteSpace:"pre-wrap"}}>
                {JSON.stringify({
                  land_intake:{
                    source_type: mode==="deed"?"owner_registered":"self_sourced",
                    document_type: mode==="deed"?"title_deed":"gps_pin_only",
                    title_deed_data: mode==="deed"?{
                      deed_number:result.deed_number,
                      rai_ngan_wa:`${result.area_rai||0}-${result.area_ngan||0}-${result.area_wah||0}`,
                      area_sqm_from_deed:result.area_sqm,
                      ocr_confidence:confidence,
                    }:null,
                    gps_pin_data: mode==="gps"?{
                      pinned_coordinates:{lat:parseFloat(gps.lat),lng:parseFloat(gps.lng)},
                      estimated_area_sqm:result.area_sqm,
                      estimation_method:"gps_pin_estimate"
                    }:null,
                    location:{
                      province:result.province||result.probable_province,
                      district:result.district||result.probable_district,
                      subdistrict:result.subdistrict,
                    },
                    verification_status:confidence>=0.8?"pending":"requires_human_review",
                    flags: confidence<0.8?["low_confidence_area"]:[]
                  }
                },null,2)}
              </pre>
            </div>

            <button onClick={()=>onToast("✓ ส่งข้อมูลเข้าระบบวิเคราะห์เรียบร้อย — AI Agent จะเริ่มประมวลผล")}
              style={{width:"100%",padding:"13px",background:C.forest,color:C.white,border:"none",borderRadius:10,fontSize:14,fontWeight:700}}>
              ✅ ยืนยันและส่งเข้าระบบวิเคราะห์ →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   AI FEASIBILITY AGENT — Claude-powered analysis screen
   เพิ่มเข้ามาเป็น screen="agent" ใหม่
══════════════════════════════════════════════════════════════ */

/* ── Typing cursor animation ── */
function Cursor() {
  return <span style={{display:"inline-block",width:2,height:"1em",background:C.inv_green,marginLeft:2,verticalAlign:"text-bottom",animation:"pulse 1s infinite"}}/>;
}

/* ── Message bubble ── */
function MsgBubble({ role, content, loading }) {
  const isUser = role === "user";
  return (
    <div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:16,
      flexDirection: isUser ? "row-reverse" : "row"}}>
      {/* Avatar */}
      <div style={{width:32,height:32,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,
        background: isUser ? C.amber : C.inv_green,
        color: isUser ? C.white : C.inv_bg}}>
        {isUser ? "คุณ" : "AI"}
      </div>
      {/* Bubble */}
      <div style={{maxWidth:"78%",padding:"12px 16px",borderRadius: isUser?"14px 4px 14px 14px":"4px 14px 14px 14px",
        background: isUser ? C.amber+"22" : C.inv_surface,
        border:`1px solid ${isUser ? C.amber+"44" : C.inv_border}`,
        color: C.inv_text, fontSize:14, lineHeight:1.75}}>
        {loading ? <span>กำลังวิเคราะห์<Cursor/></span> : content}
      </div>
    </div>
  );
}

/* ── Quick prompt chips ── */
const QUICK_PROMPT = "วิเคราะห์ที่ดินแปลงนี้ให้หน่อย";

/* ── Land context form (compact) ── */
function LandContextForm({ ctx, setCtx }) {
  const inp = {width:"100%",padding:"8px 11px",border:`1px solid ${C.inv_border}`,borderRadius:8,
    background:"rgba(255,255,255,.04)",color:C.inv_text,fontSize:13};
  return (
    <div style={{background:C.inv_surface,border:`1px solid ${C.inv_border}`,borderRadius:12,padding:"16px 18px",marginBottom:16}}>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:".14em",textTransform:"uppercase",color:C.inv_green,marginBottom:12}}>
        📍 ข้อมูลที่ดินสำหรับการวิเคราะห์
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <div>
          <label style={{fontSize:10,color:C.inv_muted,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".08em"}}>ทำเล / เขต</label>
          <input value={ctx.location} onChange={e=>setCtx(p=>({...p,location:e.target.value}))}
            placeholder="เช่น อ่อนนุช วัฒนา" style={inp}/>
        </div>
        <div>
          <label style={{fontSize:10,color:C.inv_muted,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".08em"}}>ขนาดที่ดิน</label>
          <input value={ctx.size} onChange={e=>setCtx(p=>({...p,size:e.target.value}))}
            placeholder="เช่น 2-1-40 หรือ 400 ตร.ว." style={inp}/>
        </div>
        <div>
          <label style={{fontSize:10,color:C.inv_muted,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".08em"}}>ราคาที่ดิน (บาท)</label>
          <input value={ctx.price} onChange={e=>setCtx(p=>({...p,price:e.target.value}))}
            placeholder="เช่น 38000000" style={inp}/>
        </div>
        <div>
          <label style={{fontSize:10,color:C.inv_muted,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".08em"}}>เป้าหมาย</label>
          <select value={ctx.goal} onChange={e=>setCtx(p=>({...p,goal:e.target.value}))}
            style={{...inp,color:ctx.goal?C.inv_text:C.inv_muted}}>
            <option value="">— เลือกเป้าหมาย —</option>
            <option value="พัฒนาเพื่อขาย">พัฒนาเพื่อขาย</option>
            <option value="ปล่อยเช่าระยะยาว">ปล่อยเช่าระยะยาว</option>
            <option value="สร้างอาคารพาณิชย์">สร้างอาคารพาณิชย์</option>
            <option value="วางแผนมรดก">วางแผนมรดก</option>
            <option value="ขายเลย">ขายเลย</option>
          </select>
        </div>
      </div>
      {/* L1 preview */}
      {ctx.size && (()=>{
        const p = parseLandSize(ctx.size);
        return p.land_size_wah > 0 ? (
          <div style={{marginTop:10,fontSize:11,color:C.inv_green,fontFamily:"monospace",
            background:"rgba(0,200,150,.06)",padding:"6px 10px",borderRadius:6}}>
            ✓ แปลงหน่วย: {p.land_size_wah} ตร.ว. = {p.land_size_sqm} ตร.ม.
          </div>
        ) : null;
      })()}
    </div>
  );
}

/* ══ MAIN AI AGENT SCREEN ══ */
