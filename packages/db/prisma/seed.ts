import { PrismaClient, PublishStatus, QuestionType, ScoringMode, TryoutStatus, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { slugify } from "../../core/src/utils";

const prisma = new PrismaClient();

async function main() {
  const defaultPassword = process.env.DEFAULT_SEED_PASSWORD || process.env.SEED_DEFAULT_PASSWORD;
  if (!defaultPassword || defaultPassword.length < 12 || !/[a-z]/.test(defaultPassword) || !/[A-Z]/.test(defaultPassword) || !/\d/.test(defaultPassword) || !/[^A-Za-z0-9]/.test(defaultPassword)) {
    throw new Error('DEFAULT_SEED_PASSWORD wajib diisi minimal 12 karakter serta memuat huruf besar, huruf kecil, angka, dan simbol.');
  }
  const passwordHash = await bcrypt.hash(defaultPassword, 12);

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
      className: "Kelas 9A",
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
    const className = user.role === UserRole.SISWA && 'className' in user ? user.className : null;
    users[user.key] = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        className,
        passwordHash,
        authVersion: { increment: 1 },
        status: "ACTIVE",
      },
      create: {
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        className,
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

  const tkadTipInputs = [
    {
      id: "tkad-tip-01",
      category: "Strategi Inti",
      title: "Baca yang ditanyakan terlebih dahulu",
      contentHtml: "<p>Temukan target jawaban sebelum membaca stimulus panjang. Cara ini membantu memisahkan informasi penting dari data pengalih.</p>",
      orderNo: 1,
    },
    {
      id: "tkad-tip-02",
      category: "Strategi Inti",
      title: "Tandai kata kunci dan data relevan",
      contentHtml: "<p>Cari angka, satuan, istilah ilmiah, hubungan sebab-akibat, dan kalimat pembanding yang berkaitan langsung dengan pertanyaan.</p>",
      orderNo: 2,
    },
    {
      id: "tkad-tip-03",
      category: "Analisis Soal",
      title: "Tentukan konsep sebelum memakai rumus",
      contentHtml: "<p>Ubah konteks soal menjadi konsep IPA yang tepat. Gunakan rumus hanya setelah hubungan antardata sudah dipahami.</p>",
      orderNo: 3,
    },
    {
      id: "tkad-tip-04",
      category: "Manajemen Waktu",
      title: "Gunakan sistem tiga putaran",
      contentHtml: "<ol><li>Amankan soal yang mudah.</li><li>Kembali ke soal yang membutuhkan analisis.</li><li>Periksa jawaban, satuan, dan opsi kompleks.</li></ol>",
      orderNo: 4,
    },
    {
      id: "tkad-tip-05",
      category: "Pemeriksaan Akhir",
      title: "Cek kewajaran jawaban",
      contentHtml: "<p>Pastikan hasil sesuai data, satuan benar, kata negatif tidak terlewat, dan kesimpulan tidak lebih luas daripada bukti pada stimulus.</p>",
      orderNo: 5,
    },
  ];

  for (const tip of tkadTipInputs) {
    await prisma.tkadTip.upsert({
      where: { id: tip.id },
      update: {
        authorId: users.guru.id,
        category: tip.category,
        title: tip.title,
        contentHtml: tip.contentHtml,
        orderNo: tip.orderNo,
        status: PublishStatus.PUBLISHED,
      },
      create: {
        ...tip,
        authorId: users.guru.id,
        status: PublishStatus.PUBLISHED,
      },
    });
  }

  const question = await prisma.question.upsert({
    where: { code: "Q-IPA-001" },
    update: {
      topicId: topics[0].id,
      blueprintId: blueprint.id,
      authorId: users.guru.id,
      questionType: QuestionType.SINGLE_CHOICE,
      scoringMode: ScoringMode.EXACT_MATCH,
      maxScore: 1,
      questionText: "Sebuah sepeda bermassa 20 kg mengalami percepatan 2 m/s². Besar gaya yang bekerja pada sepeda adalah ...",
      questionHtml: "<p>Sebuah sepeda bermassa 20 kg mengalami percepatan 2 m/s². Besar gaya yang bekerja pada sepeda adalah ...</p>",
      explanation: "<p>Gunakan Hukum II Newton, yaitu F = m × a. Jadi F = 20 × 2 = 40 N.</p>",
      difficulty: "Mudah",
      status: PublishStatus.PUBLISHED,
      stimulusOrder: 1,
    },
    create: {
      code: "Q-IPA-001",
      topicId: topics[0].id,
      blueprintId: blueprint.id,
      authorId: users.guru.id,
      questionType: QuestionType.SINGLE_CHOICE,
      scoringMode: ScoringMode.EXACT_MATCH,
      maxScore: 1,
      questionText: "Sebuah sepeda bermassa 20 kg mengalami percepatan 2 m/s². Besar gaya yang bekerja pada sepeda adalah ...",
      questionHtml: "<p>Sebuah sepeda bermassa 20 kg mengalami percepatan 2 m/s². Besar gaya yang bekerja pada sepeda adalah ...</p>",
      explanation: "<p>Gunakan Hukum II Newton, yaitu F = m × a. Jadi F = 20 × 2 = 40 N.</p>",
      difficulty: "Mudah",
      status: PublishStatus.PUBLISHED,
      stimulusOrder: 1,
    },
  });

  await prisma.questionOption.deleteMany({ where: { questionId: question.id } });
  await prisma.questionOption.createMany({
    data: [
      { questionId: question.id, label: "A", optionText: "10 N", isCorrect: false },
      { questionId: question.id, label: "B", optionText: "20 N", isCorrect: false },
      { questionId: question.id, label: "C", optionText: "40 N", isCorrect: true },
      { questionId: question.id, label: "D", optionText: "80 N", isCorrect: false },
    ],
  });

  const question2 = await prisma.question.upsert({
    where: { code: "Q-IPA-002" },
    update: {
      topicId: topics[1].id,
      authorId: users.guru.id,
      questionType: QuestionType.MULTIPLE_CHOICE,
      scoringMode: ScoringMode.PARTIAL_NO_PENALTY,
      maxScore: 1,
      questionText: "Pernyataan yang benar tentang energi pada benda yang jatuh dari ketinggian tertentu adalah ...",
      questionHtml: "<p>Pernyataan yang benar tentang energi pada benda yang jatuh dari ketinggian tertentu adalah ...</p>",
      explanation: "<p>Energi potensial bergantung pada m, g, dan h. Saat benda jatuh, energi kinetik bertambah. Jika hambatan udara diabaikan, energi mekanik tetap.</p>",
      difficulty: "Sedang",
      status: PublishStatus.PUBLISHED,
      stimulusOrder: 1,
    },
    create: {
      code: "Q-IPA-002",
      topicId: topics[1].id,
      authorId: users.guru.id,
      questionType: QuestionType.MULTIPLE_CHOICE,
      scoringMode: ScoringMode.PARTIAL_NO_PENALTY,
      maxScore: 1,
      questionText: "Pernyataan yang benar tentang energi pada benda yang jatuh dari ketinggian tertentu adalah ...",
      questionHtml: "<p>Pernyataan yang benar tentang energi pada benda yang jatuh dari ketinggian tertentu adalah ...</p>",
      explanation: "<p>Energi potensial bergantung pada m, g, dan h. Saat benda jatuh, energi kinetik bertambah. Jika hambatan udara diabaikan, energi mekanik tetap.</p>",
      difficulty: "Sedang",
      status: PublishStatus.PUBLISHED,
      stimulusOrder: 1,
    },
  });
  await prisma.questionOption.deleteMany({ where: { questionId: question2.id } });
  await prisma.questionOption.createMany({
    data: [
      { questionId: question2.id, label: "A", optionText: "Energi potensial bergantung pada massa, gravitasi, dan ketinggian.", isCorrect: true },
      { questionId: question2.id, label: "B", optionText: "Energi kinetik selalu nol selama benda bergerak jatuh.", isCorrect: false },
      { questionId: question2.id, label: "C", optionText: "Energi kinetik bertambah saat kecepatan benda meningkat.", isCorrect: true },
      { questionId: question2.id, label: "D", optionText: "Energi mekanik tetap jika hambatan udara diabaikan.", isCorrect: true },
    ],
  });

  const question3 = await prisma.question.upsert({
    where: { code: "Q-IPA-003" },
    update: {
      topicId: topics[2].id,
      authorId: users.guru.id,
      questionType: QuestionType.TRUE_FALSE,
      scoringMode: ScoringMode.PARTIAL_NO_PENALTY,
      maxScore: 1,
      questionText: "Tentukan benar atau salah untuk setiap pernyataan tentang susunan atom oksigen.",
      questionHtml: "<p>Tentukan benar atau salah untuk setiap pernyataan tentang susunan atom oksigen.</p>",
      explanation: "<p>Atom oksigen netral memiliki 8 proton dan 8 elektron. Jika nomor massanya 16, jumlah neutronnya 8. Susunan elektronnya 2 pada kulit K dan 6 pada kulit L.</p>",
      difficulty: "Sedang",
      status: PublishStatus.PUBLISHED,
      stimulusOrder: 1,
    },
    create: {
      code: "Q-IPA-003",
      topicId: topics[2].id,
      authorId: users.guru.id,
      questionType: QuestionType.TRUE_FALSE,
      scoringMode: ScoringMode.PARTIAL_NO_PENALTY,
      maxScore: 1,
      questionText: "Tentukan benar atau salah untuk setiap pernyataan tentang susunan atom oksigen.",
      questionHtml: "<p>Tentukan benar atau salah untuk setiap pernyataan tentang susunan atom oksigen.</p>",
      explanation: "<p>Atom oksigen netral memiliki 8 proton dan 8 elektron. Jika nomor massanya 16, jumlah neutronnya 8. Susunan elektronnya 2 pada kulit K dan 6 pada kulit L.</p>",
      difficulty: "Sedang",
      status: PublishStatus.PUBLISHED,
      stimulusOrder: 1,
    },
  });
  await prisma.questionOption.deleteMany({ where: { questionId: question3.id } });
  await prisma.questionOption.createMany({
    data: [
      { questionId: question3.id, label: "A", optionText: "Atom oksigen netral memiliki 8 elektron.", isCorrect: true },
      { questionId: question3.id, label: "B", optionText: "Jika nomor massanya 16, atom oksigen memiliki 7 neutron.", isCorrect: false },
      { questionId: question3.id, label: "C", optionText: "Kulit L pada atom oksigen berisi 6 elektron.", isCorrect: true },
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
      { tryoutId: tryout.id, questionId: question3.id, orderNo: 3 },
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
