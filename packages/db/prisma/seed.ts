import { PrismaClient, PublishStatus, TryoutStatus, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { slugify } from "../../core/src/utils";

const prisma = new PrismaClient();

async function main() {
  const defaultPassword = process.env.DEFAULT_SEED_PASSWORD || process.env.SEED_DEFAULT_PASSWORD || "Admin123!";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const userInputs = [
    {
      key: "superAdmin",
      fullName: "Super Admin Sains Masemba",
      email: process.env.SEED_SUPER_ADMIN_EMAIL || "superadmin@sh.local",
      role: UserRole.SUPER_ADMIN,
      phone: "081200000001",
    },
    {
      key: "guru",
      fullName: "Guru Demo Sains Masemba",
      email: process.env.SEED_GURU_EMAIL || "guru@sh.local",
      role: UserRole.GURU,
      phone: "081200000002",
    },
    {
      key: "siswa",
      fullName: "Siswa Demo Sains Masemba",
      email: process.env.SEED_SISWA_EMAIL || "siswa@sh.local",
      role: UserRole.SISWA,
      phone: "081200000003",
    },
    {
      key: "orangTua",
      fullName: "Orang Tua Demo Sains Masemba",
      email: process.env.SEED_ORANG_TUA_EMAIL || "orangtua@sh.local",
      role: UserRole.ORANG_TUA,
      phone: "081200000004",
    },
  ] as const;

  const users: Record<string, Awaited<ReturnType<typeof prisma.user.upsert>>> = {};
  for (const user of userInputs) {
    users[user.key] = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        passwordHash,
        status: "ACTIVE",
      },
      create: {
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        passwordHash,
        status: "ACTIVE",
      },
    });
  }

  await prisma.parentStudentLink.upsert({
    where: {
      parentId_studentId: {
        parentId: users.orangTua.id,
        studentId: users.siswa.id,
      },
    },
    update: { relationType: "Ibu", isActive: true },
    create: {
      parentId: users.orangTua.id,
      studentId: users.siswa.id,
      relationType: "Ibu",
      isActive: true,
    },
  });

  const topicInputs = [
    { title: "Gaya dan Gerak", description: "Konsep gaya, gerak lurus, dan pengaruh gaya.", orderNo: 1 },
    { title: "Kalor dan Perubahan Wujud", description: "Perpindahan kalor dan perubahan wujud zat.", orderNo: 2 },
    { title: "Ekosistem", description: "Interaksi makhluk hidup dengan lingkungannya.", orderNo: 3 },
  ];

  await prisma.appSetting.upsert({
    where: { key: 'theme' },
    update: { value: 'ocean' },
    create: { key: 'theme', value: 'ocean' },
  });
  await prisma.appSetting.upsert({
    where: { key: 'motto' },
    update: { value: 'OJO KUMINTER MUNDAK KEBLINGER, OJO CIDRA MUNDAK CILAKA' },
    create: { key: 'motto', value: 'OJO KUMINTER MUNDAK KEBLINGER, OJO CIDRA MUNDAK CILAKA' },
  });

  const topics = [];
  for (const input of topicInputs) {
    const topic = await prisma.topic.upsert({
      where: { slug: slugify(input.title) },
      update: input,
      create: { ...input, slug: slugify(input.title), subject: "IPA SMP" },
    });
    topics.push(topic);
  }

  const blueprint = await prisma.blueprint.upsert({
    where: { code: "IPA-SMP-GERAK-001" },
    update: {
      topicId: topics[0].id,
      competency: "Menganalisis pengaruh gaya terhadap gerak benda",
      indicator: "Siswa mampu menentukan perubahan gerak akibat gaya pada benda",
      cognitiveLevel: "C3-C4",
      targetDifficulty: "Sedang",
      targetQuestionCount: 3,
      materialName: "Gaya dan Gerak",
      blueprintText: "Gunakan stimulus benda bergerak dan perubahan kecepatan.",
      periodName: "TKA IPA SMP",
      testGroup: "IPA",
    },
    create: {
      code: "IPA-SMP-GERAK-001",
      topicId: topics[0].id,
      competency: "Menganalisis pengaruh gaya terhadap gerak benda",
      indicator: "Siswa mampu menentukan perubahan gerak akibat gaya pada benda",
      cognitiveLevel: "C3-C4",
      targetDifficulty: "Sedang",
      targetQuestionCount: 3,
      materialName: "Gaya dan Gerak",
      blueprintText: "Gunakan stimulus benda bergerak dan perubahan kecepatan.",
      periodName: "TKA IPA SMP",
      testGroup: "IPA",
    },
  });

  const material = await prisma.material.upsert({
    where: { id: "materi-demo-gaya" },
    update: {
      title: "Ringkasan Gaya dan Gerak",
      topicId: topics[0].id,
      authorId: users.guru.id,
      summaryText: "Gaya dapat mengubah bentuk, arah, dan kecepatan benda.",
      summaryHtml: "<p><strong>Gaya</strong> dapat mengubah bentuk, arah, dan kecepatan benda. Rumus sederhana: $$F = m.a$$</p>",
      level: "SMP",
      status: PublishStatus.PUBLISHED,
    },
    create: {
      id: "materi-demo-gaya",
      title: "Ringkasan Gaya dan Gerak",
      topicId: topics[0].id,
      authorId: users.guru.id,
      summaryText: "Gaya dapat mengubah bentuk, arah, dan kecepatan benda.",
      summaryHtml: "<p><strong>Gaya</strong> dapat mengubah bentuk, arah, dan kecepatan benda. Rumus sederhana: $$F = m.a$$</p>",
      level: "SMP",
      status: PublishStatus.PUBLISHED,
    },
  });

  await prisma.materialSection.deleteMany({ where: { materialId: material.id } });
  await prisma.learningObjective.deleteMany({ where: { materialId: material.id } });

  await prisma.materialSection.createMany({
    data: [
      {
        materialId: material.id,
        orderNo: 1,
        title: "Konsep Inti",
        contentText: "Gaya membuat benda diam menjadi bergerak, atau sebaliknya.",
        contentHtml: "<p>Gaya dapat membuat benda diam menjadi bergerak atau mengubah arah geraknya.</p>",
      },
      {
        materialId: material.id,
        orderNo: 2,
        title: "Contoh",
        contentText: "Mendorong meja adalah contoh pemberian gaya.",
        contentHtml: "<p>Mendorong meja adalah contoh <em>gaya sentuh</em>.</p>",
      },
    ],
  });

  await prisma.learningObjective.createMany({
    data: [
      { materialId: material.id, orderNo: 1, objective: "Memahami pengaruh gaya terhadap gerak." },
      { materialId: material.id, orderNo: 2, objective: "Membedakan perubahan arah dan perubahan kecepatan." },
    ],
  });

  const question = await prisma.question.upsert({
    where: { code: "Q-IPA-001" },
    update: {
      topicId: topics[0].id,
      blueprintId: blueprint.id,
      authorId: users.guru.id,
      questionText: "Sebuah bola diam ditendang hingga bergerak ke depan. Pernyataan yang tepat adalah ...",
      questionHtml: "<p>Sebuah bola diam ditendang hingga bergerak ke depan. Pernyataan yang tepat adalah ...</p>",
      explanation: "<p>Gaya dapat mengubah keadaan benda dari diam menjadi bergerak.</p>",
      difficulty: "Sedang",
      status: PublishStatus.PUBLISHED,
      stimulusOrder: 1,
    },
    create: {
      code: "Q-IPA-001",
      topicId: topics[0].id,
      blueprintId: blueprint.id,
      authorId: users.guru.id,
      questionText: "Sebuah bola diam ditendang hingga bergerak ke depan. Pernyataan yang tepat adalah ...",
      questionHtml: "<p>Sebuah bola diam ditendang hingga bergerak ke depan. Pernyataan yang tepat adalah ...</p>",
      explanation: "<p>Gaya dapat mengubah keadaan benda dari diam menjadi bergerak.</p>",
      difficulty: "Sedang",
      status: PublishStatus.PUBLISHED,
      stimulusOrder: 1,
    },
  });

  await prisma.questionOption.deleteMany({ where: { questionId: question.id } });
  await prisma.questionOption.createMany({
    data: [
      { questionId: question.id, label: "A", optionText: "Gaya hanya mengubah warna benda", isCorrect: false },
      { questionId: question.id, label: "B", optionText: "Gaya dapat mengubah benda diam menjadi bergerak", isCorrect: true },
      { questionId: question.id, label: "C", optionText: "Gaya tidak berpengaruh pada gerak", isCorrect: false },
      { questionId: question.id, label: "D", optionText: "Bola bergerak tanpa gaya", isCorrect: false },
    ],
  });

  const question2 = await prisma.question.upsert({
    where: { code: "Q-IPA-002" },
    update: {
      topicId: topics[1].id,
      authorId: users.guru.id,
      questionText: "Perubahan wujud dari cair menjadi gas disebut ...",
      questionHtml: "<p>Perubahan wujud dari cair menjadi gas disebut ...</p>",
      explanation: "<p>Perubahan cair menjadi gas disebut menguap.</p>",
      difficulty: "Mudah",
      status: PublishStatus.PUBLISHED,
      stimulusOrder: 1,
    },
    create: {
      code: "Q-IPA-002",
      topicId: topics[1].id,
      authorId: users.guru.id,
      questionText: "Perubahan wujud dari cair menjadi gas disebut ...",
      questionHtml: "<p>Perubahan wujud dari cair menjadi gas disebut ...</p>",
      explanation: "<p>Perubahan cair menjadi gas disebut menguap.</p>",
      difficulty: "Mudah",
      status: PublishStatus.PUBLISHED,
      stimulusOrder: 1,
    },
  });
  await prisma.questionOption.deleteMany({ where: { questionId: question2.id } });
  await prisma.questionOption.createMany({
    data: [
      { questionId: question2.id, label: "A", optionText: "Membeku", isCorrect: false },
      { questionId: question2.id, label: "B", optionText: "Mengembun", isCorrect: false },
      { questionId: question2.id, label: "C", optionText: "Menguap", isCorrect: true },
      { questionId: question2.id, label: "D", optionText: "Mencair", isCorrect: false },
    ],
  });

  const tryout = await prisma.tryout.upsert({
    where: { id: "tryout-demo-ipa-1" },
    update: {
      authorId: users.guru.id,
      title: "Tryout Demo IPA SMP",
      description: "Simulasi CBT IPA dengan mode anti-curang dan monitoring guru.",
      durationMinutes: 45,
      status: TryoutStatus.OPEN,
      rulesHtml: "<ul><li>Dilarang berpindah tab.</li><li>Copy/paste diblok saat ujian.</li><li>Jawaban tersimpan otomatis.</li></ul>",
    },
    create: {
      id: "tryout-demo-ipa-1",
      authorId: users.guru.id,
      title: "Tryout Demo IPA SMP",
      description: "Simulasi CBT IPA dengan mode anti-curang dan monitoring guru.",
      durationMinutes: 45,
      status: TryoutStatus.OPEN,
      rulesHtml: "<ul><li>Dilarang berpindah tab.</li><li>Copy/paste diblok saat ujian.</li><li>Jawaban tersimpan otomatis.</li></ul>",
    },
  });

  await prisma.tryoutQuestion.deleteMany({ where: { tryoutId: tryout.id } });
  await prisma.tryoutQuestion.createMany({
    data: [
      { tryoutId: tryout.id, questionId: question.id, orderNo: 1 },
      { tryoutId: tryout.id, questionId: question2.id, orderNo: 2 },
    ],
  });

  console.log("Seed selesai.");
  console.log({
    superAdmin: process.env.SEED_SUPER_ADMIN_EMAIL || "superadmin@sh.local",
    guru: process.env.SEED_GURU_EMAIL || "guru@sh.local",
    siswa: process.env.SEED_SISWA_EMAIL || "siswa@sh.local",
    orangTua: process.env.SEED_ORANG_TUA_EMAIL || "orangtua@sh.local",
    password: defaultPassword,
    tryoutDemo: tryout.title,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
