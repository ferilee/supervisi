import type { RubricItem } from '../types'

const preObservationData: Array<[string, string]> = [
  ['Identitas RPP/MA', 'Lengkap: mata pelajaran, Jenjang, kelas, Materi Pokok, alokasi waktu dll'],
  ['Identifikasi Murid (Opsional)', 'Terdapat : Identifikasi kesiapan murid sebelum belajar, seperti pengetahuan awal, minat, latar belakang, dan kebutuhan belajar, serta aspek lainnya.'],
  ['Materi Pembelajaran (Opsional)', 'Jelas : Jenis Pengetahuan yang akan di capai, Relevansi dengan Kehidupan Nyata, Struktur materi, tingkat kesulitan, Integrasi Nilai Karakter dsb.'],
  ['Dimensi Profil Lulusan', 'Terdapat Dimensi Profil lulusan yang di tentukan selaras dengan tujuan pembelajaran dan kegiatan yang dilakukan.'],
  ['Capaian Pembelajaran (Opsional)', 'Terdapat Rumusan yang jelas, spesifik, dengan kata kerja operasional dan sesuai dengan Capaian pembelajaran pada CP BSKAP'],
  ['Lintas Disiplin Ilmu (Opsional)', 'Terdapat keterkaitan Disiplin ilmu dan/atau mata pelajaran yang relevan dengan tujuan pembelajaran'],
  ['Tujuan Pembelajaran', 'Mencakup kompetensi dan konten pada ruang lingkup materi dengan menggunakan kata kerja operasional yang relevan\n\nTujuan pembelajaran, langkah pembelajaran, dan asesmen pembelajaran sudah mengarah pada pencapaian Dimensi Profil Lulusan\n\nTujuan pembelajaran, langkah pembelajaran, dan asesmen pembelajaran sudah selaras'],
  ['Topik Pembelajaran (Opsional)', 'Terdapat Topik pembelajaran yang relevan dengan capaian dan tujuan pembelajaran.'],
  ['Praktek Pedagogis', 'Praktik pedagogis yang dituliskan sudah tergambar pada langkah pembelajaran dan/atau asesmen pembelajaran\n\nTergambarkan : keseduaian model, Pendekatan, strategi, metode, atau Teknik pada kegiatan pembelajaran'],
  ['Kemitraan Pembelajaran (Opsional)', 'Kemitraan pembelajaran yang dituliskan sudah tergambar pada langkah pembelajaran dan/atau asesmen pembelajaran.'],
  ['Lingkungan Pembelajaran', 'Lingkungan belajar yang dituliskan sudah tergambar pada langkah pembelajaran dan/atau asesmen pembelajaran'],
  ['Pemanfaatan Digital (Opsional)', 'Pemanfaatan digital yang dituliskan sudah tergambar pada langkah pembelajaran dan/atau asesmen pembelajaran.'],
  ['Kegiatan Awal', 'Kegiatan awal yang dituliskan meliputi orientasi yang bermakna, apersepsi yang kontekstual, dan motivasi yang menggembirakan.\n\nMemuat Prinsip pembelajaran mendalam berupa berkesadaran, bermakna, dan/atau menggembirakan sudah tergambar pada setiap pengalaman belajar.\n\nPerencanaan pembelajaran sudah mengakomodir pengalaman belajar sesuai karakteristik murid'],
  ['Kegiatan Inti', 'Langkah pembelajaran dapat memfasilitasi murid untuk merasakan pengalaman belajar MEMAHAMI (mengonstruksi pengetahuan, menghubungkan pengetahuan baru dengan yang lama, mengaitkan konteks nyata, memberi ruang eksplorasi & kolaborasi, menanamkan nilai moral & karakter)\n\nLangkah pembelajaran dapat memfasilitasi murid untuk merasakan pengalaman belajar MENGAPLIKASI (menghubungkan konsep baru, menerapkan dalam situasi nyata, eksplorasi lanjut, berpikir kritis & mencari solusi inovatif)\n\nLangkah pembelajaran dapat memfasilitasi murid untuk merasakan pengalaman belajar MEREFLEKSI (evaluasi diri, regulasi emosi, motivasi belajar, strategi berpikir, metakognisi).'],
  ['Kegiatan Akhir', 'Langkah pembelajaran dapat memfasilitasi tindakan saling MEMULIAKAN antara guru-murid, murid-guru, dan murid-murid (verbal maupun nonverbal)'],
  ['Asesmen Awal', 'Asesmen awal pembelajaran dilaksanakan untuk mengetahui kesiapan belajar (emosi, mental, pengetahuan awal, kebutuhan belajar)'],
  ['Asesmen Proses', 'Asesmen selama proses pembelajaran dilaksanakan sesuai rencana untuk memantau perkembangan, memberi umpan balik, dengan beragam Teknik'],
  ['Asesmen Akhir', 'Asesmen hasil pembelajaran direncanakan untuk mengukur pencapaian kompetensi dengan berbagai cara (tes, portofolio, proyek, presentasi, dsb.)'],
  ['Rubrik Penilaian', 'Terdapat kriteria ketercapaian tujuan pembelajaran dari masing-masing tujuan pembelajaran yang akan di nilai'],
  ['Terdapat Lembar Kerja Murid', 'Lembar kerja murid selaras dengan tujuan pembelajaran dan kegiatan pembelajaran'],
]

export const preObservationItems: RubricItem[] = preObservationData.map(([title, indicator], index) => ({ id: `pre-${index + 1}`, number: index + 1, title, indicator, section: 'Telaah RPP / Modul Ajar' }))

const observationData: Array<[string, string, string]> = [
  ['Apersepsi & Motivasi', 'Guru mengaitkan pembelajaran dengan pengalaman sehari-hari, memberi motivasi yang menggembirakan', 'Perencanaan di Kelas'],
  ['Penyampaian Tujuan', 'Guru menyampaikan capaian & tujuan pembelajaran dengan jelas', 'Perencanaan di Kelas'],
  ['Stimulus & Eksplorasi', 'Guru memberi pemantik yang relevan, memfasilitasi eksplorasi murid', 'Pelaksanaan Pembelajaran'],
  ['Kolaborasi & Diskusi', 'Murid terlibat aktif bekerja sama, diskusi bermakna', 'Pelaksanaan Pembelajaran'],
  ['Praktik & Aksi Nyata', 'Murid mempraktikkan konsep dalam konteks nyata/proyek', 'Pelaksanaan Pembelajaran'],
  ['Refleksi', 'Guru memandu murid melakukan evaluasi diri dan menemukan tindak lanjut', 'Pelaksanaan Pembelajaran'],
  ['Suasana Belajar', 'Suasana kelas aman, nyaman, saling menghargai', 'Pengelolaan Kelas'],
  ['Pemanfaatan Digital', 'Teknologi digunakan untuk memperkuat pembelajaran', 'Pengelolaan Kelas'],
  ['Keselarasan', 'Implementasi perencanaan selaras dengan perencanaan pembelajaran:\na. Awal pembelajaran\nb. Inti pembelajaran (memahami, mengaplikasi, merefleksi)\nc. Penutupan pembelajaran', 'Implementasi Pembelajaran Mendalam'],
  ['Tujuan & Profil Lulusan', 'a. Upaya mencapai tujuan pembelajaran menuju pencapaian dimensi profil lulusan selaras dengan perencanaan, atau\nb. Disesuaikan dengan konteks kebutuhan belajar siswa', 'Implementasi Pembelajaran Mendalam'],
  ['Strategi Pembelajaran', 'Strategi pembelajaran diimplementasikan sesuai perencanaan / dimodifikasi sesuai kebutuhan / tantangan dapat terlewati untuk mencapai CP', 'Kerangka Pembelajaran'],
  ['Lingkungan Belajar', 'Lingkungan belajar tergambar dalam langkah dan/atau asesmen pembelajaran', 'Kerangka Pembelajaran'],
  ['Kemitraan Pembelajaran', 'Kemitraan pembelajaran tergambar dalam langkah dan/atau asesmen pembelajaran', 'Kerangka Pembelajaran'],
  ['Pemanfaatan Digital', 'Pemanfaatan digital tergambar dalam langkah dan/atau asesmen pembelajaran', 'Kerangka Pembelajaran'],
  ['Saling Memuliakan', 'Guru dan murid saling MEMULIAKAN (bahasa verbal maupun nonverbal)', 'Langkah Pembelajaran'],
  ['MEMAHAMI', 'MEMAHAMI:\na. Menghubungkan pengetahuan baru dengan pengetahuan lama\nb. Menstimulasi proses berpikir\nc. Menghubungkan dengan konteks nyata\nd. Eksploratif & kolaboratif\ne. Menanamkan nilai moral & karakter', 'Langkah Pembelajaran'],
  ['MENGAPLIKASI', 'MENGAPLIKASI:\na. Menghubungkan konsep baru dengan pengetahuan sebelumnya\nb. Menerapkan dalam situasi nyata/bidang lain\nc. Eksplorasi lanjut\nd. Berpikir kritis & solusi inovatif', 'Langkah Pembelajaran'],
  ['MEREFLEKSI', 'MEREFLEKSI:\na. Motivasi belajar\nb. Evaluasi diri\nc. Strategi berpikir\nd. Metakognisi\ne. Regulasi emosi', 'Langkah Pembelajaran'],
  ['Prinsip Pembelajaran Mendalam', 'Prinsip pembelajaran mendalam (berkesadaran, bermakna, menggembirakan) tergambar pada setiap pengalaman belajar', 'Langkah Pembelajaran'],
  ['Karakteristik Peserta Didik', 'Praktik pembelajaran mengakomodir karakteristik peserta didik (usia, perkembangan, kemampuan, minat, gaya belajar, dll.)', 'Langkah Pembelajaran'],
  ['Asesmen Awal', 'Dilakukan untuk mengetahui kesiapan belajar (emosi, mental, pengetahuan awal, kebutuhan murid)', 'Asesmen'],
  ['Asesmen Proses', 'Dilakukan untuk memantau perkembangan, memberi umpan balik (guru ↔ murid) dengan beragam teknik', 'Asesmen'],
  ['Asesmen Hasil', 'Mengukur pencapaian kompetensi dengan tes, portofolio, proyek, presentasi, dsb.', 'Asesmen'],
  ['Umpan Balik', 'Guru memberi umpan balik konstruktif, mendorong perbaikan', 'Asesmen'],
  ['Pelajaran yang Diperoleh', 'Pelajaran yang diperoleh dari implementasi pembelajaran beserta faktor pendukungnya', 'Refleksi Guru'],
  ['Hal yang Belum Memuaskan', 'Hal-hal yang pencapaiannya belum memuaskan beserta faktor penghambatnya', 'Refleksi Guru'],
  ['Rencana Tindak Lanjut', 'Rencana tindak lanjut untuk perbaikan ke depan', 'Refleksi Guru'],
]

export const observationItems: RubricItem[] = observationData.map(([title, indicator, section], index) => ({ id: `obs-${index + 1}`, number: index + 1, title, indicator, section }))

export const reflectionQuestions = [
  ['feeling', 'Bagaimana perasaan Anda saat melaksanakan pembelajaran tadi?'],
  ['success', 'Apa yang menurut Anda sudah berjalan baik sesuai dengan rencana?'],
  ['challenge', 'Apa tantangan utama yang dihadapi selama pembelajaran?'],
  ['engagement', 'Bagaimana respon dan keterlibatan murid menurut Anda?'],
  ['next', 'Apa yang akan Anda lakukan berbeda pada pembelajaran berikutnya?'],
] as const

export const feedbackAspects = ['Perencanaan pembelajaran', 'Pelaksanaan pembelajaran', 'Pengelolaan kelas', 'Asesmen pembelajaran', 'Refleksi & tindak lanjut']
export const followUpAspects = ['Perencanaan', 'Pelaksanaan', 'Pengelolaan kelas', 'Asesmen', 'Pengembangan profesional guru']

export const scoreLabels: Record<number, string> = {
  1: 'Tidak Tampak',
  2: 'Kurang',
  3: 'Baik',
  4: 'Sangat Baik',
}
