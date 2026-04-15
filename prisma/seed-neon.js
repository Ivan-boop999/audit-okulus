// Seed via single SQL batch (avoids connection reset on Windows)
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

let counter = 0;
function cuid() { counter++; return 'c' + counter.toString(36).padStart(4,'0') + Date.now().toString(36) + Math.random().toString(36).substring(2,6); }

async function seed() {
  const adminPw = await bcrypt.hash('admin123', 10);
  const audPw = await bcrypt.hash('auditor123', 10);

  const [adm,a1,a2,a3] = [cuid(),cuid(),cuid(),cuid()];
  const eq = Array.from({length:8},()=>cuid());
  const [t1,t2,t3,t4] = [cuid(),cuid(),cuid(),cuid()];
  const now = Date.now(), D = 86400000;

  // Build question IDs
  const qIds = {};
  const makeQIds = (tid, n) => { qIds[tid] = Array.from({length:n},()=>cuid()); return qIds[tid]; };
  const q1 = makeQIds(t1, 5);
  const q2 = makeQIds(t2, 5);
  const q3 = makeQIds(t3, 4);
  const q4 = makeQIds(t4, 5);

  // Build assignment IDs
  const assignDefs = [
    [t1,a1,-5,'COMPLETED'],[t2,a2,-3,'COMPLETED'],[t3,a1,-2,'COMPLETED'],
    [t4,a3,-10,'COMPLETED'],[t1,a2,-1,'COMPLETED'],
    [t1,a1,0,'SCHEDULED'],[t3,a2,0,'IN_PROGRESS'],
    [t2,a3,1,'SCHEDULED'],[t1,a2,1,'SCHEDULED'],
    [t4,a1,2,'SCHEDULED'],[t3,a3,3,'SCHEDULED'],
    [t2,a1,4,'SCHEDULED'],[t1,a3,5,'SCHEDULED'],
    [t2,a1,-2,'OVERDUE'],
  ];
  const aIds = assignDefs.map(([tid,aid,d,s]) => ({id:cuid(),tid,aid,d,s}));

  // Build entire SQL as one statement
  let sql = `
    DELETE FROM audit_comments;
    DELETE FROM action_plans;
    DELETE FROM "QuestionAnswer";
    DELETE FROM "AuditResponse";
    DELETE FROM "AuditAssignment";
    DELETE FROM "AuditTemplateEquipment";
    DELETE FROM "Question";
    DELETE FROM "AuditTemplate";
    DELETE FROM "Notification";
    DELETE FROM "Equipment";
    DELETE FROM "User";

    INSERT INTO "User" (id,email,name,password,role,department,phone,"createdAt","updatedAt") VALUES
      ('${adm}','admin@factory.com','Алексей Петров','${adminPw}','ADMIN','Управление качеством','+7 900 123-45-67',NOW(),NOW()),
      ('${a1}','ivanov@factory.com','Сергей Иванов','${audPw}','AUDITOR','Цех №1','+7 900 234-56-78',NOW(),NOW()),
      ('${a2}','smirnova@factory.com','Елена Смирнова','${audPw}','AUDITOR','Цех №2','+7 900 345-67-89',NOW(),NOW()),
      ('${a3}','kozlov@factory.com','Дмитрий Козлов','${audPw}','AUDITOR','Склад','+7 900 456-78-90',NOW(),NOW());

    INSERT INTO "Equipment" (id,name,code,category,location,status,"createdAt","updatedAt") VALUES
      ('${eq[0]}','Пресс гидравлический ПГ-100','EQ-001','Прессы','Цех №1, линия А','ACTIVE',NOW(),NOW()),
      ('${eq[1]}','Станок ЧПУ Fanuc M-20','EQ-002','Станки с ЧПУ','Цех №1, линия Б','ACTIVE',NOW(),NOW()),
      ('${eq[2]}','Конвейерная линия KL-200','EQ-003','Конвейеры','Цех №2, линия А','ACTIVE',NOW(),NOW()),
      ('${eq[3]}','Сварочный робот ABB IRB-1600','EQ-004','Робототехника','Цех №2, линия Б','ACTIVE',NOW(),NOW()),
      ('${eq[4]}','Красильная камера КК-50','EQ-005','Окрасочное','Цех №3','MAINTENANCE',NOW(),NOW()),
      ('${eq[5]}','Кран мостовой КМ-10','EQ-006','Подъёмное','Склад','ACTIVE',NOW(),NOW()),
      ('${eq[6]}','Компрессор Atlas Copco GA-30','EQ-007','Компрессоры','Компрессорная','ACTIVE',NOW(),NOW()),
      ('${eq[7]}','Термопечь ТП-1200','EQ-008','Термическое','Цех №1','ACTIVE',NOW(),NOW());

    INSERT INTO "AuditTemplate" (id,title,description,category,status,frequency,"creatorId","createdAt","updatedAt") VALUES
      ('${t1}','Ежедневная проверка оборудования','Обследование перед сменой','Техобслуживание','ACTIVE','DAILY','${adm}',NOW(),NOW()),
      ('${t2}','Аудит безопасности рабочего места','Проверка ОТ и ТБ','Безопасность','ACTIVE','WEEKLY','${adm}',NOW(),NOW()),
      ('${t3}','Контроль качества продукции','Проверка качества','Качество','ACTIVE','DAILY','${adm}',NOW(),NOW()),
      ('${t4}','Аудит 5S на рабочем месте','Оценка системы 5S','Бережливое производство','ACTIVE','MONTHLY','${adm}',NOW(),NOW());
  `;

  // Questions
  const qDefs = [
    [t1,q1[0],'Оборудование работает без шумов?','YES_NO',0,2],
    [t1,q1[1],'Уровень масла в норме?','YES_NO',1,2],
    [t1,q1[2],'Защитные ограждения на месте?','YES_NO',2,3],
    [t1,q1[3],'Манометры в рабочем диапазоне?','YES_NO',3,2],
    [t1,q1[4],'Визуальное состояние','SCALE_1_5',4,1],
    [t2,q2[0],'Наличие и исправность СИЗ','SCALE_1_5',0,3],
    [t2,q2[1],'Пути эвакуации свободны?','YES_NO',1,3],
    [t2,q2[2],'Огнетушители в наличии?','YES_NO',2,3],
    [t2,q2[3],'Освещённость рабочей зоны','SCALE_1_10',3,2],
    [t2,q2[4],'Пол чистый и сухой?','YES_NO',4,2],
    [t3,q3[0],'Визуальный осмотр поверхности','SCALE_1_5',0,3],
    [t3,q3[1],'Соответствие размеров чертежу','YES_NO',1,3],
    [t3,q3[2],'Качество сварных швов','SCALE_1_5',2,3],
    [t3,q3[3],'Количество брака в партии','NUMBER',3,2],
    [t4,q4[0],'Сортировка (Seiri)','SCALE_1_5',0,2],
    [t4,q4[1],'Порядок (Seiton)','SCALE_1_5',1,2],
    [t4,q4[2],'Чистота (Seiso)','SCALE_1_5',2,2],
    [t4,q4[3],'Стандартизация (Seiketsu)','SCALE_1_5',3,2],
    [t4,q4[4],'Совершенствование (Shitsuke)','SCALE_1_5',4,2],
  ];
  sql += `INSERT INTO "Question" (id,"templateId",text,"answerType","order",required,weight,"createdAt","updatedAt") VALUES `;
  sql += qDefs.map(([tid,qid,text,type,ord,w])=>`('${qid}','${tid}','${text.replace(/'/g,"''")}','${type}',${ord},true,${w},NOW(),NOW())`).join(',') + ';';

  // Template-Equipment links
  const links = [[t1,eq[0]],[t1,eq[1]],[t2,eq[0]],[t2,eq[3]],[t3,eq[1]],[t4,eq[5]]];
  sql += `INSERT INTO "AuditTemplateEquipment" (id,"templateId","equipmentId","createdAt") VALUES `;
  sql += links.map(([tid,eid])=>`('${cuid()}','${tid}','${eid}',NOW())`).join(',') + ';';

  // Assignments
  sql += `INSERT INTO "AuditAssignment" (id,"templateId","auditorId","scheduledDate","dueDate",status,"createdAt","updatedAt") VALUES `;
  sql += aIds.map(a => {
    const sd = new Date(now + a.d*D).toISOString();
    const dd = new Date(now + a.d*D + 8*3600000).toISOString();
    return `('${a.id}','${a.tid}','${a.aid}','${sd}','${dd}','${a.s}',NOW(),NOW())`;
  }).join(',') + ';';

  // Responses for completed
  const completed = aIds.filter(a => a.s === 'COMPLETED');
  for (const a of completed) {
    const rId = cuid();
    const score = (75 + Math.random() * 25).toFixed(1);
    sql += `INSERT INTO "AuditResponse" (id,"assignmentId","auditorId","startedAt","completedAt",score,"maxScore",status,"createdAt","updatedAt") VALUES ('${rId}','${a.id}','${a.aid}',NOW(),NOW(),${score},100,'COMPLETED',NOW(),NOW());`;
    if (qIds[a.tid]) {
      sql += `INSERT INTO "QuestionAnswer" (id,"responseId","questionId",answer,"createdAt") VALUES `;
      sql += qIds[a.tid].map(qid => `('${cuid()}','${rId}','${qid}','${Math.random()>0.2?'yes':'no'}',NOW())`).join(',') + ';';
    }
  }

  // Notifications
  sql += `
    INSERT INTO "Notification" (id,"userId",title,message,type,"createdAt") VALUES
      ('${cuid()}','${a1}','Новый аудит назначен','Вам назначен аудит на сегодня','ASSIGNMENT',NOW()),
      ('${cuid()}','${a2}','Аудит в процессе','Аудит ожидает завершения','REMINDER',NOW()),
      ('${cuid()}','${a1}','Просрочен аудит','Аудит безопасности просрочен','OVERDUE',NOW()),
      ('${cuid()}','${a3}','Завтрашний аудит','Завтра запланирован аудит','REMINDER',NOW());
  `;

  // Execute all in one shot
  const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 30000 });
  await client.connect();
  console.log('Connected. Executing batch SQL...');
  await client.query(sql);

  const counts = await client.query(`
    SELECT
      (SELECT count(*) FROM "User") as users,
      (SELECT count(*) FROM "Equipment") as equipment,
      (SELECT count(*) FROM "AuditTemplate") as templates,
      (SELECT count(*) FROM "Question") as questions,
      (SELECT count(*) FROM "AuditAssignment") as assignments,
      (SELECT count(*) FROM "AuditResponse") as responses
  `);
  console.log('Counts:', counts.rows[0]);

  await client.end();
  console.log('✅ Seed completed!');
  console.log('  Admin: admin@factory.com / admin123');
  console.log('  Auditors: ivanov/smirnova/kozlov@factory.com / auditor123');
}

seed().catch(e => { console.error('❌', e.message || e); process.exit(1); });
