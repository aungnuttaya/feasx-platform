const {defineConfig}=require('@playwright/test');
module.exports=defineConfig({
  testDir:'./tests/browser',workers:1,timeout:30000,
  outputDir:'/workspace/audits/feasx-day3/browser-results',
  use:{baseURL:'http://127.0.0.1:3103',headless:true,launchOptions:{executablePath:'/usr/bin/chromium',args:['--no-sandbox']},trace:'retain-on-failure'},
});
