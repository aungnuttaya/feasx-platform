const {DatabaseSync}=require('node:sqlite');
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
function createMemoryStorage(){
  const rows=new Map();
  return {transaction:fn=>fn(),get:id=>clone(rows.get(id)),values:()=>[...rows.values()].map(clone),set:job=>rows.set(job.id,clone(job)),get size(){return rows.size},close(){}};
}
function createSQLiteStorage(filename){
  const db=new DatabaseSync(filename);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, owner TEXT NOT NULL, idem TEXT NOT NULL, body TEXT NOT NULL, UNIQUE(owner,idem));');
  const get=db.prepare('SELECT body FROM jobs WHERE id=?');
  const all=db.prepare('SELECT body FROM jobs ORDER BY rowid');
  const put=db.prepare('INSERT INTO jobs(id,owner,idem,body) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body');
  return {
    transaction(fn){db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result}catch(error){db.exec('ROLLBACK');throw error}},
    get(id){const row=get.get(id);return row?JSON.parse(row.body):undefined},
    values(){return all.all().map(row=>JSON.parse(row.body))},
    set(job){put.run(job.id,job.ownerId,job.idempotencyKey,JSON.stringify(job))},
    get size(){return db.prepare('SELECT count(*) n FROM jobs').get().n},
    close(){db.close()},
  };
}
module.exports={createMemoryStorage,createSQLiteStorage};
