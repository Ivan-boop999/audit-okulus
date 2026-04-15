import 'dotenv/config';
import { db } from '@/lib/db';
import { hash } from 'bcryptjs';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create Admin user
  const adminPassword = await hash('admin123', 10);
  const admin = await db.user.upsert({
    where: { email: 'admin@factory.com' },
    update: {},
    create: {
      email: 'admin@factory.com',
      name: 'Алексей Петров',
      password: adminPassword,
      role: 'ADMIN',
      department: 'Управление качеством',
      phone: '+7 900 123-45-67',
    },
  });

  // Create Auditor users
  const auditorPassword = await hash('auditor123', 10);
  const auditors = await Promise.all([
    db.user.upsert({
      where: { email: 'ivanov@factory.com' },
      update: {},
      create: {
        email: 'ivanov@factory.com',
        name: 'Сергей Иванов',
        password: auditorPassword,
        role: 'AUDITOR',
        department: 'Цех №1',
        phone: '+7 900 234-56-78',
      },
    }),
    db.user.upsert({
      where: { email: 'smirnova@factory.com' },
      update: {},
      create: {
        email: 'smirnova@factory.com',
        name: 'Елена Смирнова',
        password: auditorPassword,
        role: 'AUDITOR',
        department: 'Цех №2',
        phone: '+7 900 345-67-89',
      },
    }),
    db.user.upsert({
      where: { email: 'kozlov@factory.com' },
      update: {},
      create: {
        email: 'kozlov@factory.com',
        name: 'Дмитрий Козлов',
        password: auditorPassword,
        role: 'AUDITOR',
        department: 'Склад',
        phone: '+7 900 456-78-90',
      },
    }),
  ]);

  // Create Equipment
  const equipment = await Promise.all([
    db.equipment.create({
      data: { name: 'Пресс гидравлический ПГ-100', code: 'EQ-001', category: 'Прессы', location: 'Цех №1, линия А', description: 'Гидравлический пресс 100 тонн для формовки деталей', status: 'ACTIVE' },
    }),
    db.equipment.create({
      data: { name: 'Станок ЧПУ Fanuc M-20', code: 'EQ-002', category: 'Станки с ЧПУ', location: 'Цех №1, линия Б', description: 'Токарный станок с ЧПУ для точной обработки', status: 'ACTIVE' },
    }),
    db.equipment.create({
      data: { name: 'Конвейерная линия KL-200', code: 'EQ-003', category: 'Конвейеры', location: 'Цех №2, линия А', description: 'Конвейерная линия для сборки узлов', status: 'ACTIVE' },
    }),
    db.equipment.create({
      data: { name: 'Сварочный робот ABB IRB-1600', code: 'EQ-004', category: 'Робототехника', location: 'Цех №2, линия Б', description: 'Промышленный робот для автоматической сварки', status: 'ACTIVE' },
    }),
    db.equipment.create({
      data: { name: 'Красильная камера КК-50', code: 'EQ-005', category: 'Окрасочное оборудование', location: 'Цех №3', description: 'Камера для порошковой окраски деталей', status: 'MAINTENANCE' },
    }),
    db.equipment.create({
      data: { name: 'Кран мостовой КМ-10', code: 'EQ-006', category: 'Подъёмное оборудование', location: 'Склад', description: 'Мостовой кран грузоподъёмностью 10 тонн', status: 'ACTIVE' },
    }),
    db.equipment.create({
      data: { name: 'Компрессор Atlas Copco GA-30', code: 'EQ-007', category: 'Компрессорное оборудование', location: 'Компрессорная', description: 'Винтовой компрессор для подачи сжатого воздуха', status: 'ACTIVE' },
    }),
    db.equipment.create({
      data: { name: 'Термопечь ТП-1200', code: 'EQ-008', category: 'Термическое оборудование', location: 'Цех №1, термоблок', description: 'Электрическая печь для термообработки до 1200°C', status: 'ACTIVE' },
    }),
  ]);

  // Create Audit Templates with Questions
  const template1 = await db.auditTemplate.create({
    data: {
      title: 'Ежедневная проверка оборудования',
      description: 'Контрольное обследование состояния оборудования перед началом рабочей смены',
      category: 'Техническое обслуживание',
      status: 'ACTIVE',
      frequency: 'DAILY',
      creatorId: admin.id,
      questions: {
        create: [
          { text: 'Оборудование включено и работает без посторонних шумов?', answerType: 'YES_NO', order: 0, required: true, weight: 2 },
          { text: 'Уровень масла/смазки в норме?', answerType: 'YES_NO', order: 1, required: true, weight: 2 },
          { text: 'Все защитные ограждения на месте?', answerType: 'YES_NO', order: 2, required: true, weight: 3 },
          { text: 'Манометры показывают рабочее давление?', answerType: 'YES_NO', order: 3, required: true, weight: 2 },
          { text: 'Общее визуальное состояние оборудования', answerType: 'SCALE_1_5', order: 4, required: true, weight: 1, helpText: '1 - критичное, 5 - отличное' },
          { text: 'Замечания и комментарии', answerType: 'TEXT', order: 5, required: false, weight: 0 },
        ],
      },
    },
  });

  const template2 = await db.auditTemplate.create({
    data: {
      title: 'Аудит безопасности рабочего места',
      description: 'Комплексная проверка соблюдения требований охраны труда и техники безопасности',
      category: 'Безопасность',
      status: 'ACTIVE',
      frequency: 'WEEKLY',
      creatorId: admin.id,
      questions: {
        create: [
          { text: 'Наличие и исправность средств индивидуальной защиты (СИЗ)', answerType: 'SCALE_1_5', order: 0, required: true, weight: 3 },
          { text: 'Пути эвакуации свободны и обозначены?', answerType: 'YES_NO', order: 1, required: true, weight: 3 },
          { text: 'Огнетушители в наличии и с действующей датой?', answerType: 'YES_NO', order: 2, required: true, weight: 3 },
          { text: 'Знаки безопасности на месте и читаемы?', answerType: 'YES_NO', order: 3, required: true, weight: 2 },
          { text: 'Рабочая зона достаточно освещена?', answerType: 'SCALE_1_10', order: 4, required: true, weight: 2, helpText: 'Оценка уровня освещённости от 1 до 10' },
          { text: 'Пол сухой и чистый, без разлитых жидкостей?', answerType: 'YES_NO', order: 5, required: true, weight: 2 },
          { text: 'Электропроводка и розетки в исправном состоянии?', answerType: 'YES_NO', order: 6, required: true, weight: 3 },
          { text: 'Работники прошли инструктаж по ТБ?', answerType: 'YES_NO', order: 7, required: true, weight: 2 },
          { text: 'Аптечка первой помощи укомплектована?', answerType: 'YES_NO', order: 8, required: true, weight: 2 },
          { text: 'Уровень культуры безопасности (общая оценка)', answerType: 'SCALE_1_10', order: 9, required: true, weight: 1 },
          { text: 'Фотография выявленных нарушений', answerType: 'PHOTO', order: 10, required: false, weight: 0 },
          { text: 'Дополнительные замечания', answerType: 'TEXT', order: 11, required: false, weight: 0 },
        ],
      },
    },
  });

  const template3 = await db.auditTemplate.create({
    data: {
      title: 'Контроль качества продукции',
      description: 'Проверка качества выпускаемой продукции по ключевым параметрам',
      category: 'Качество',
      status: 'ACTIVE',
      frequency: 'DAILY',
      creatorId: admin.id,
      questions: {
        create: [
          { text: 'Визуальный осмотр поверхности (дефекты, царапины)', answerType: 'SCALE_1_5', order: 0, required: true, weight: 3 },
          { text: 'Соответствие размеров чертежу (допуски)', answerType: 'YES_NO', order: 1, required: true, weight: 3 },
          { text: 'Качество сварных швов', answerType: 'SCALE_1_5', order: 2, required: true, weight: 3 },
          { text: 'Цвет и текстура покрытия', answerType: 'SCALE_1_5', order: 3, required: true, weight: 2 },
          { text: 'Маркировка и этикетки на месте?', answerType: 'YES_NO', order: 4, required: true, weight: 1 },
          { text: 'Упаковка соответствует стандартам?', answerType: 'YES_NO', order: 5, required: true, weight: 1 },
          { text: 'Количество брака в партии', answerType: 'NUMBER', order: 6, required: true, weight: 2 },
          { text: 'Общий процент соответствия', answerType: 'SCALE_1_100', order: 7, required: true, weight: 3, helpText: 'Процент деталей, соответствующих стандартам' },
          { text: 'Комментарии инспектора', answerType: 'TEXT', order: 8, required: false, weight: 0 },
        ],
      },
    },
  });

  const template4 = await db.auditTemplate.create({
    data: {
      title: 'Аудит 5S на рабочем месте',
      description: 'Оценка системы 5S: Сортировка, Соблюдение порядка, Содержание в чистоте, Стандартизация, Совершенствование',
      category: 'Бережливое производство',
      status: 'ACTIVE',
      frequency: 'MONTHLY',
      creatorId: admin.id,
      questions: {
        create: [
          { text: 'Seiri (Сортировка): Ненужные предметы удалены?', answerType: 'SCALE_1_5', order: 0, required: true, weight: 2, helpText: 'Все ненужные предметы и инструменты убраны с рабочего места' },
          { text: 'Seiton (Соблюдение порядка): Всё на своих местах?', answerType: 'SCALE_1_5', order: 1, required: true, weight: 2, helpText: 'Инструменты и материалы размещены по принципу удобства использования' },
          { text: 'Seiso (Содержание в чистоте): Рабочее место чистое?', answerType: 'SCALE_1_5', order: 2, required: true, weight: 2, helpText: 'Поверхности, пол, оборудование очищены от загрязнений' },
          { text: 'Seiketsu (Стандартизация): Стандарты соблюдены?', answerType: 'SCALE_1_5', order: 3, required: true, weight: 2, helpText: 'Визуальные стандарты и инструкции актуальны и на видных местах' },
          { text: 'Shitsuke (Совершенствование): Постоянное улучшение?', answerType: 'SCALE_1_5', order: 4, required: true, weight: 2, helpText: 'Сотрудники участвуют в улучшении рабочего места' },
          { text: 'Общая оценка 5S', answerType: 'SCALE_1_10', order: 5, required: true, weight: 1 },
          { text: 'Предложения по улучшению', answerType: 'TEXT', order: 6, required: false, weight: 0 },
        ],
      },
    },
  });

  // Link equipment to templates
  await Promise.all([
    db.auditTemplateEquipment.create({ data: { templateId: template1.id, equipmentId: equipment[0].id } }),
    db.auditTemplateEquipment.create({ data: { templateId: template1.id, equipmentId: equipment[1].id } }),
    db.auditTemplateEquipment.create({ data: { templateId: template1.id, equipmentId: equipment[2].id } }),
    db.auditTemplateEquipment.create({ data: { templateId: template2.id, equipmentId: equipment[0].id } }),
    db.auditTemplateEquipment.create({ data: { templateId: template2.id, equipmentId: equipment[3].id } }),
    db.auditTemplateEquipment.create({ data: { templateId: template3.id, equipmentId: equipment[1].id } }),
    db.auditTemplateEquipment.create({ data: { templateId: template3.id, equipmentId: equipment[4].id } }),
    db.auditTemplateEquipment.create({ data: { templateId: template4.id, equipmentId: equipment[5].id } }),
    db.auditTemplateEquipment.create({ data: { templateId: template4.id, equipmentId: equipment[6].id } }),
  ]);

  // Create Audit Assignments
  const now = new Date();
  const dayMs = 86400000;
  
  const assignments = await Promise.all([
    // Past completed audits
    db.auditAssignment.create({
      data: {
        templateId: template1.id,
        auditorId: auditors[0].id,
        scheduledDate: new Date(now.getTime() - 5 * dayMs),
        dueDate: new Date(now.getTime() - 5 * dayMs + 8 * 3600000),
        status: 'COMPLETED',
        notes: 'Плановая ежедневная проверка',
      },
    }),
    db.auditAssignment.create({
      data: {
        templateId: template2.id,
        auditorId: auditors[1].id,
        scheduledDate: new Date(now.getTime() - 3 * dayMs),
        dueDate: new Date(now.getTime() - 3 * dayMs + 8 * 3600000),
        status: 'COMPLETED',
        notes: 'Недельный аудит безопасности',
      },
    }),
    db.auditAssignment.create({
      data: {
        templateId: template3.id,
        auditorId: auditors[0].id,
        scheduledDate: new Date(now.getTime() - 2 * dayMs),
        dueDate: new Date(now.getTime() - 2 * dayMs + 8 * 3600000),
        status: 'COMPLETED',
      },
    }),
    db.auditAssignment.create({
      data: {
        templateId: template4.id,
        auditorId: auditors[2].id,
        scheduledDate: new Date(now.getTime() - 10 * dayMs),
        dueDate: new Date(now.getTime() - 10 * dayMs + 8 * 3600000),
        status: 'COMPLETED',
      },
    }),
    db.auditAssignment.create({
      data: {
        templateId: template1.id,
        auditorId: auditors[1].id,
        scheduledDate: new Date(now.getTime() - 1 * dayMs),
        dueDate: new Date(now.getTime() - 1 * dayMs + 8 * 3600000),
        status: 'COMPLETED',
      },
    }),
    // Today's audits
    db.auditAssignment.create({
      data: {
        templateId: template1.id,
        auditorId: auditors[0].id,
        scheduledDate: new Date(now.getTime()),
        dueDate: new Date(now.getTime() + 8 * 3600000),
        status: 'SCHEDULED',
      },
    }),
    db.auditAssignment.create({
      data: {
        templateId: template3.id,
        auditorId: auditors[1].id,
        scheduledDate: new Date(now.getTime()),
        dueDate: new Date(now.getTime() + 8 * 3600000),
        status: 'IN_PROGRESS',
      },
    }),
    // Future audits
    db.auditAssignment.create({
      data: {
        templateId: template2.id,
        auditorId: auditors[2].id,
        scheduledDate: new Date(now.getTime() + 1 * dayMs),
        dueDate: new Date(now.getTime() + 1 * dayMs + 8 * 3600000),
        status: 'SCHEDULED',
      },
    }),
    db.auditAssignment.create({
      data: {
        templateId: template1.id,
        auditorId: auditors[1].id,
        scheduledDate: new Date(now.getTime() + 1 * dayMs),
        dueDate: new Date(now.getTime() + 1 * dayMs + 8 * 3600000),
        status: 'SCHEDULED',
      },
    }),
    db.auditAssignment.create({
      data: {
        templateId: template4.id,
        auditorId: auditors[0].id,
        scheduledDate: new Date(now.getTime() + 2 * dayMs),
        dueDate: new Date(now.getTime() + 2 * dayMs + 8 * 3600000),
        status: 'SCHEDULED',
      },
    }),
    db.auditAssignment.create({
      data: {
        templateId: template3.id,
        auditorId: auditors[2].id,
        scheduledDate: new Date(now.getTime() + 3 * dayMs),
        dueDate: new Date(now.getTime() + 3 * dayMs + 8 * 3600000),
        status: 'SCHEDULED',
      },
    }),
    db.auditAssignment.create({
      data: {
        templateId: template2.id,
        auditorId: auditors[0].id,
        scheduledDate: new Date(now.getTime() + 4 * dayMs),
        dueDate: new Date(now.getTime() + 4 * dayMs + 8 * 3600000),
        status: 'SCHEDULED',
      },
    }),
    db.auditAssignment.create({
      data: {
        templateId: template1.id,
        auditorId: auditors[2].id,
        scheduledDate: new Date(now.getTime() + 5 * dayMs),
        dueDate: new Date(now.getTime() + 5 * dayMs + 8 * 3600000),
        status: 'SCHEDULED',
      },
    }),
    // Overdue
    db.auditAssignment.create({
      data: {
        templateId: template2.id,
        auditorId: auditors[0].id,
        scheduledDate: new Date(now.getTime() - 2 * dayMs),
        dueDate: new Date(now.getTime() - 2 * dayMs + 8 * 3600000),
        status: 'OVERDUE',
        notes: 'Просрочен — требуется пересмотр сроков',
      },
    }),
  ]);

  // Create completed audit responses with scores
  const completedAssignments = assignments.filter(a => a.status === 'COMPLETED');
  
  for (const assignment of completedAssignments) {
    const templateWithQuestions = await db.auditTemplate.findUnique({
      where: { id: assignment.templateId },
      include: { questions: { orderBy: { order: 'asc' } } },
    });

    if (!templateWithQuestions) continue;

    const response = await db.auditResponse.create({
      data: {
        assignmentId: assignment.id,
        auditorId: assignment.auditorId,
        completedAt: new Date(assignment.scheduledDate.getTime() + 2 * 3600000),
        score: 75 + Math.random() * 25,
        maxScore: 100,
        status: 'COMPLETED',
      },
    });

    // Create answers for each question
    for (const question of templateWithQuestions.questions) {
      let answer: string | null = null;
      
      switch (question.answerType) {
        case 'YES_NO':
          answer = Math.random() > 0.2 ? 'yes' : 'no';
          break;
        case 'SCALE_1_5':
          answer = String(Math.floor(Math.random() * 3) + 3); // 3-5
          break;
        case 'SCALE_1_10':
          answer = String(Math.floor(Math.random() * 4) + 6); // 6-9
          break;
        case 'SCALE_1_100':
          answer = String(Math.floor(Math.random() * 15) + 85); // 85-99
          break;
        case 'TEXT':
          answer = Math.random() > 0.5 ? 'Всё в порядке, замечаний нет.' : null;
          break;
        case 'NUMBER':
          answer = String(Math.floor(Math.random() * 3)); // 0-2
          break;
      }

      await db.questionAnswer.create({
        data: {
          responseId: response.id,
          questionId: question.id,
          answer,
          comment: Math.random() > 0.7 ? 'Требует внимания' : null,
        },
      });
    }
  }

  // Create notifications for auditors
  await Promise.all([
    db.notification.create({ data: { userId: auditors[0].id, title: 'Новый аудит назначен', message: 'Вам назначен аудит «Ежедневная проверка оборудования» на сегодня', type: 'ASSIGNMENT', link: '#audits' } }),
    db.notification.create({ data: { userId: auditors[1].id, title: 'Аудит в процессе', message: 'Аудит «Контроль качества продукции» ожидает завершения', type: 'REMINDER', link: '#audits' } }),
    db.notification.create({ data: { userId: auditors[0].id, title: 'Просрочен аудит', message: 'Аудит безопасности просрочен. Пожалуйста, проведите его как можно скорее.', type: 'OVERDUE', link: '#audits' } }),
    db.notification.create({ data: { userId: auditors[2].id, title: 'Завтрашний аудит', message: 'Завтра запланирован аудит безопасности. Подготовьтесь заранее.', type: 'REMINDER', link: '#calendar' } }),
  ]);

  console.log('✅ Seed completed successfully!');
  console.log(`  - Admin: admin@factory.com / admin123`);
  console.log(`  - Auditors: ivanov@factory.com, smirnova@factory.com, kozlov@factory.com / auditor123`);
  console.log(`  - Equipment: ${equipment.length} items`);
  console.log(`  - Templates: 4 templates with questions`);
  console.log(`  - Assignments: ${assignments.length} assignments`);
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
