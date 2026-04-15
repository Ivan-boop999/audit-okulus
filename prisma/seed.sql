-- Аудит-Окулус v3.0 — Seed Data
-- Вставьте в Neon SQL Editor: https://console.neon.tech

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

-- Users (admin123 / auditor123)
INSERT INTO "User" (id,email,name,password,role,department,phone,"createdAt","updatedAt") VALUES
  ('u1','admin@factory.com','Алексей Петров','$2b$10$iqGAXUjHBELg8ztFU1GSXuDhW4sYSYnWwqaxMtEHOotYQw3pi5I4y','ADMIN','Управление качеством','+7 900 123-45-67',NOW(),NOW()),
  ('u2','ivanov@factory.com','Сергей Иванов','$2b$10$yE1FQ0yrBpyQxps9zQtZW.JEMKnelYhzHqp/TAQrmam/Om3cQxFLS','AUDITOR','Цех №1','+7 900 234-56-78',NOW(),NOW()),
  ('u3','smirnova@factory.com','Елена Смирнова','$2b$10$yE1FQ0yrBpyQxps9zQtZW.JEMKnelYhzHqp/TAQrmam/Om3cQxFLS','AUDITOR','Цех №2','+7 900 345-67-89',NOW(),NOW()),
  ('u4','kozlov@factory.com','Дмитрий Козлов','$2b$10$yE1FQ0yrBpyQxps9zQtZW.JEMKnelYhzHqp/TAQrmam/Om3cQxFLS','AUDITOR','Склад','+7 900 456-78-90',NOW(),NOW());

-- Equipment
INSERT INTO "Equipment" (id,name,code,category,location,status,"createdAt","updatedAt") VALUES
  ('e1','Пресс гидравлический ПГ-100','EQ-001','Прессы','Цех №1, линия А','ACTIVE',NOW(),NOW()),
  ('e2','Станок ЧПУ Fanuc M-20','EQ-002','Станки с ЧПУ','Цех №1, линия Б','ACTIVE',NOW(),NOW()),
  ('e3','Конвейерная линия KL-200','EQ-003','Конвейеры','Цех №2, линия А','ACTIVE',NOW(),NOW()),
  ('e4','Сварочный робот ABB IRB-1600','EQ-004','Робототехника','Цех №2, линия Б','ACTIVE',NOW(),NOW()),
  ('e5','Красильная камера КК-50','EQ-005','Окрасочное оборудование','Цех №3','MAINTENANCE',NOW(),NOW()),
  ('e6','Кран мостовой КМ-10','EQ-006','Подъёмное оборудование','Склад','ACTIVE',NOW(),NOW()),
  ('e7','Компрессор Atlas Copco GA-30','EQ-007','Компрессорное оборудование','Компрессорная','ACTIVE',NOW(),NOW()),
  ('e8','Термопечь ТП-1200','EQ-008','Термическое оборудование','Цех №1, термоблок','ACTIVE',NOW(),NOW());

-- Templates
INSERT INTO "AuditTemplate" (id,title,description,category,status,frequency,"creatorId","createdAt","updatedAt") VALUES
  ('t1','Ежедневная проверка оборудования','Контрольное обследование перед сменой','Техническое обслуживание','ACTIVE','DAILY','u1',NOW(),NOW()),
  ('t2','Аудит безопасности рабочего места','Проверка ОТ и ТБ','Безопасность','ACTIVE','WEEKLY','u1',NOW(),NOW()),
  ('t3','Контроль качества продукции','Проверка качества по параметрам','Качество','ACTIVE','DAILY','u1',NOW(),NOW()),
  ('t4','Аудит 5S на рабочем месте','Оценка системы 5S','Бережливое производство','ACTIVE','MONTHLY','u1',NOW(),NOW());

-- Questions
INSERT INTO "Question" (id,"templateId",text,"answerType","order",required,weight,"createdAt","updatedAt") VALUES
  ('q1','t1','Оборудование работает без посторонних шумов?','YES_NO',0,true,2,NOW(),NOW()),
  ('q2','t1','Уровень масла/смазки в норме?','YES_NO',1,true,2,NOW(),NOW()),
  ('q3','t1','Все защитные ограждения на месте?','YES_NO',2,true,3,NOW(),NOW()),
  ('q4','t1','Манометры показывают рабочее давление?','YES_NO',3,true,2,NOW(),NOW()),
  ('q5','t1','Общее визуальное состояние оборудования','SCALE_1_5',4,true,1,NOW(),NOW()),
  ('q6','t2','Наличие и исправность СИЗ','SCALE_1_5',0,true,3,NOW(),NOW()),
  ('q7','t2','Пути эвакуации свободны и обозначены?','YES_NO',1,true,3,NOW(),NOW()),
  ('q8','t2','Огнетушители в наличии?','YES_NO',2,true,3,NOW(),NOW()),
  ('q9','t2','Освещённость рабочей зоны','SCALE_1_10',3,true,2,NOW(),NOW()),
  ('q10','t2','Пол сухой и чистый?','YES_NO',4,true,2,NOW(),NOW()),
  ('q11','t3','Визуальный осмотр поверхности','SCALE_1_5',0,true,3,NOW(),NOW()),
  ('q12','t3','Соответствие размеров чертежу','YES_NO',1,true,3,NOW(),NOW()),
  ('q13','t3','Качество сварных швов','SCALE_1_5',2,true,3,NOW(),NOW()),
  ('q14','t3','Количество брака в партии','NUMBER',3,true,2,NOW(),NOW()),
  ('q15','t4','Сортировка (Seiri)','SCALE_1_5',0,true,2,NOW(),NOW()),
  ('q16','t4','Порядок (Seiton)','SCALE_1_5',1,true,2,NOW(),NOW()),
  ('q17','t4','Чистота (Seiso)','SCALE_1_5',2,true,2,NOW(),NOW()),
  ('q18','t4','Стандартизация (Seiketsu)','SCALE_1_5',3,true,2,NOW(),NOW()),
  ('q19','t4','Совершенствование (Shitsuke)','SCALE_1_5',4,true,2,NOW(),NOW());

-- Template-Equipment links
INSERT INTO "AuditTemplateEquipment" (id,"templateId","equipmentId","createdAt") VALUES
  ('te1','t1','e1',NOW()),('te2','t1','e2',NOW()),('te3','t2','e1',NOW()),
  ('te4','t2','e4',NOW()),('te5','t3','e2',NOW()),('te6','t4','e6',NOW());

-- Assignments
INSERT INTO "AuditAssignment" (id,"templateId","auditorId","scheduledDate","dueDate",status,"createdAt","updatedAt") VALUES
  ('a1','t1','u2',NOW()-interval '5 days',NOW()-interval '5 days'+interval '8 hours','COMPLETED',NOW(),NOW()),
  ('a2','t2','u3',NOW()-interval '3 days',NOW()-interval '3 days'+interval '8 hours','COMPLETED',NOW(),NOW()),
  ('a3','t3','u2',NOW()-interval '2 days',NOW()-interval '2 days'+interval '8 hours','COMPLETED',NOW(),NOW()),
  ('a4','t4','u4',NOW()-interval '10 days',NOW()-interval '10 days'+interval '8 hours','COMPLETED',NOW(),NOW()),
  ('a5','t1','u3',NOW()-interval '1 day',NOW()-interval '1 day'+interval '8 hours','COMPLETED',NOW(),NOW()),
  ('a6','t1','u2',NOW(),NOW()+interval '8 hours','SCHEDULED',NOW(),NOW()),
  ('a7','t3','u3',NOW(),NOW()+interval '8 hours','IN_PROGRESS',NOW(),NOW()),
  ('a8','t2','u4',NOW()+interval '1 day',NOW()+interval '1 day'+interval '8 hours','SCHEDULED',NOW(),NOW()),
  ('a9','t1','u3',NOW()+interval '1 day',NOW()+interval '1 day'+interval '8 hours','SCHEDULED',NOW(),NOW()),
  ('a10','t4','u2',NOW()+interval '2 days',NOW()+interval '2 days'+interval '8 hours','SCHEDULED',NOW(),NOW()),
  ('a11','t3','u4',NOW()+interval '3 days',NOW()+interval '3 days'+interval '8 hours','SCHEDULED',NOW(),NOW()),
  ('a12','t2','u2',NOW()+interval '4 days',NOW()+interval '4 days'+interval '8 hours','SCHEDULED',NOW(),NOW()),
  ('a13','t1','u4',NOW()+interval '5 days',NOW()+interval '5 days'+interval '8 hours','SCHEDULED',NOW(),NOW()),
  ('a14','t2','u2',NOW()-interval '2 days',NOW()-interval '2 days'+interval '8 hours','OVERDUE',NOW(),NOW());

-- Completed audit responses
INSERT INTO "AuditResponse" (id,"assignmentId","auditorId","startedAt","completedAt",score,"maxScore",status,"createdAt","updatedAt") VALUES
  ('r1','a1','u2',NOW()-interval '5 days',NOW()-interval '5 days'+interval '2 hours',92.5,100,'COMPLETED',NOW(),NOW()),
  ('r2','a2','u3',NOW()-interval '3 days',NOW()-interval '3 days'+interval '2 hours',85.3,100,'COMPLETED',NOW(),NOW()),
  ('r3','a3','u2',NOW()-interval '2 days',NOW()-interval '2 days'+interval '1 hour',78.9,100,'COMPLETED',NOW(),NOW()),
  ('r4','a4','u4',NOW()-interval '10 days',NOW()-interval '10 days'+interval '3 hours',95.1,100,'COMPLETED',NOW(),NOW()),
  ('r5','a5','u3',NOW()-interval '1 day',NOW()-interval '1 day'+interval '2 hours',88.7,100,'COMPLETED',NOW(),NOW());

-- Answers for completed audits
INSERT INTO "QuestionAnswer" (id,"responseId","questionId",answer,"createdAt") VALUES
  ('qa1','r1','q1','yes',NOW()),('qa2','r1','q2','yes',NOW()),('qa3','r1','q3','yes',NOW()),
  ('qa4','r1','q4','yes',NOW()),('qa5','r1','q5','4',NOW()),
  ('qa6','r2','q6','4',NOW()),('qa7','r2','q7','yes',NOW()),('qa8','r2','q8','yes',NOW()),
  ('qa9','r2','q9','8',NOW()),('qa10','r2','q10','yes',NOW()),
  ('qa11','r3','q11','3',NOW()),('qa12','r3','q12','yes',NOW()),
  ('qa13','r3','q13','4',NOW()),('qa14','r3','q14','2',NOW()),
  ('qa15','r4','q15','5',NOW()),('qa16','r4','q16','4',NOW()),
  ('qa17','r4','q17','5',NOW()),('qa18','r4','q18','4',NOW()),('qa19','r4','q19','4',NOW()),
  ('qa20','r5','q1','yes',NOW()),('qa21','r5','q2','yes',NOW()),
  ('qa22','r5','q3','no',NOW()),('qa23','r5','q4','yes',NOW()),('qa24','r5','q5','3',NOW());

-- Notifications
INSERT INTO "Notification" (id,"userId",title,message,type,"createdAt") VALUES
  ('n1','u2','Новый аудит назначен','Вам назначен аудит на сегодня','ASSIGNMENT',NOW()),
  ('n2','u3','Аудит в процессе','Аудит ожидает завершения','REMINDER',NOW()),
  ('n3','u2','Просрочен аудит','Аудит безопасности просрочен','OVERDUE',NOW()),
  ('n4','u4','Завтрашний аудит','Завтра запланирован аудит','REMINDER',NOW());
