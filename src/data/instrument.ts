import type { RubricItem } from '../types'

export const preObservationItems: RubricItem[] = [
  ['Identitas RPP/MA', 'Lengkap: mata pelajaran, jenjang, kelas, materi pokok, alokasi waktu, dan informasi relevan lainnya.'],
  ['Identifikasi Murid (Opsional)', 'Terdapat identifikasi kesiapan murid sebelum belajar, seperti pengetahuan awal, minat, latar belakang, dan kebutuhan belajar.'],
  ['Materi Pembelajaran (Opsional)', 'Jelas jenis pengetahuan, relevansi dengan kehidupan nyata, struktur materi, tingkat kesulitan, dan integrasi nilai karakter.'],
  ['Dimensi Profil Lulusan', 'Dimensi profil lulusan ditentukan selaras dengan tujuan pembelajaran dan kegiatan yang dilakukan.'],
  ['Capaian Pembelajaran (Opsional)', 'Rumusan jelas, spesifik, menggunakan kata kerja operasional, dan sesuai dengan Capaian Pembelajaran.'],
  ['Lintas Disiplin Ilmu (Opsional)', 'Terdapat keterkaitan disiplin ilmu dan/atau mata pelajaran yang relevan dengan tujuan pembelajaran.'],
  ['Tujuan Pembelajaran', 'Mencakup kompetensi dan konten dengan kata kerja operasional yang relevan; tujuan, langkah, asesmen, dan dimensi profil lulusan selaras.'],
  ['Topik Pembelajaran (Opsional)', 'Topik pembelajaran relevan dengan capaian dan tujuan pembelajaran.'],
  ['Praktik Pedagogis', 'Praktik pedagogis tergambar pada langkah dan/atau asesmen pembelajaran, termasuk kesesuaian model, pendekatan, strategi, metode, atau teknik.'],
  ['Kemitraan Pembelajaran (Opsional)', 'Kemitraan pembelajaran tergambar pada langkah dan/atau asesmen pembelajaran.'],
  ['Lingkungan Pembelajaran', 'Lingkungan belajar yang dituliskan tergambar pada langkah pembelajaran dan/atau asesmen pembelajaran.'],
  ['Pemanfaatan Digital (Opsional)', 'Pemanfaatan digital yang dituliskan tergambar pada langkah pembelajaran dan/atau asesmen pembelajaran.'],
  ['Kegiatan Awal', 'Orientasi bermakna, apersepsi kontekstual, motivasi menggembirakan, dan prinsip berkesadaran, bermakna, serta menggembirakan tergambar.'],
  ['Kegiatan Inti', 'Memfasilitasi pengalaman belajar MEMAHAMI, MENGAPLIKASI, dan MEREFLEKSI.'],
  ['Kegiatan Akhir', 'Memfasilitasi tindakan saling MEMULIAKAN antara guru-murid, murid-guru, dan murid-murid.'],
  ['Asesmen Awal', 'Dilaksanakan untuk mengetahui kesiapan belajar: emosi, mental, pengetahuan awal, dan kebutuhan belajar.'],
  ['Asesmen Proses', 'Dilaksanakan selama proses untuk memantau perkembangan dan memberi umpan balik dengan beragam teknik.'],
  ['Asesmen Akhir', 'Direncanakan untuk mengukur pencapaian kompetensi melalui tes, portofolio, proyek, presentasi, atau cara lainnya.'],
  ['Rubrik Penilaian', 'Terdapat kriteria ketercapaian tujuan pembelajaran dari masing-masing tujuan yang dinilai.'],
  ['Lembar Kerja Murid', 'Lembar kerja murid selaras dengan tujuan dan kegiatan pembelajaran.'],
].map(([title, indicator], index) => ({ id: `pre-${index + 1}`, number: index + 1, title, indicator, section: 'Telaah RPP / Modul Ajar' }))

const observationData: Array<[string, string, string]> = [
  ['Apersepsi & Motivasi', 'Guru mengaitkan pembelajaran dengan pengalaman sehari-hari dan memberi motivasi yang menggembirakan.', 'Perencanaan di Kelas'],
  ['Penyampaian Tujuan', 'Guru menyampaikan capaian dan tujuan pembelajaran dengan jelas.', 'Perencanaan di Kelas'],
  ['Stimulus & Eksplorasi', 'Guru memberi pemantik yang relevan dan memfasilitasi eksplorasi murid.', 'Pelaksanaan Pembelajaran'],
  ['Kolaborasi & Diskusi', 'Murid terlibat aktif bekerja sama dan melakukan diskusi bermakna.', 'Pelaksanaan Pembelajaran'],
  ['Praktik & Aksi Nyata', 'Murid mempraktikkan konsep dalam konteks nyata atau proyek.', 'Pelaksanaan Pembelajaran'],
  ['Refleksi', 'Guru memandu murid melakukan evaluasi diri dan menemukan tindak lanjut.', 'Pelaksanaan Pembelajaran'],
  ['Suasana Belajar', 'Suasana kelas aman, nyaman, dan saling menghargai.', 'Pengelolaan Kelas'],
  ['Pemanfaatan Digital', 'Teknologi digunakan untuk memperkuat pembelajaran.', 'Pengelolaan Kelas'],
  ['Keselarasan Perencanaan', 'Implementasi selaras dengan perencanaan: awal, inti memahami-mengaplikasi-merefleksi, dan penutupan.', 'Implementasi Pembelajaran Mendalam'],
  ['Tujuan & Profil Lulusan', 'Upaya mencapai tujuan menuju dimensi profil lulusan selaras atau disesuaikan dengan kebutuhan belajar siswa.', 'Implementasi Pembelajaran Mendalam'],
  ['Strategi Pembelajaran', 'Strategi diimplementasikan sesuai rencana atau dimodifikasi sesuai kebutuhan untuk mencapai CP.', 'Kerangka Pembelajaran'],
  ['Lingkungan Belajar', 'Lingkungan belajar tergambar dalam langkah dan/atau asesmen pembelajaran.', 'Kerangka Pembelajaran'],
  ['Kemitraan Pembelajaran', 'Kemitraan pembelajaran tergambar dalam langkah dan/atau asesmen pembelajaran.', 'Kerangka Pembelajaran'],
  ['Pemanfaatan Digital', 'Pemanfaatan digital tergambar dalam langkah dan/atau asesmen pembelajaran.', 'Kerangka Pembelajaran'],
  ['Saling Memuliakan', 'Guru dan murid saling MEMULIAKAN melalui bahasa verbal maupun nonverbal.', 'Langkah Pembelajaran'],
  ['MEMAHAMI', 'Menghubungkan pengetahuan baru dan lama, menstimulasi berpikir, konteks nyata, eksploratif-kolaboratif, serta nilai moral dan karakter.', 'Langkah Pembelajaran'],
  ['MENGAPLIKASI', 'Menghubungkan konsep, menerapkan dalam situasi nyata, eksplorasi lanjut, berpikir kritis, dan solusi inovatif.', 'Langkah Pembelajaran'],
  ['MEREFLEKSI', 'Motivasi belajar, evaluasi diri, strategi berpikir, metakognisi, dan regulasi emosi.', 'Langkah Pembelajaran'],
  ['Prinsip Pembelajaran Mendalam', 'Berkesadaran, bermakna, dan menggembirakan tergambar pada setiap pengalaman belajar.', 'Langkah Pembelajaran'],
  ['Karakteristik Peserta Didik', 'Praktik pembelajaran mengakomodasi usia, perkembangan, kemampuan, minat, gaya belajar, dan karakteristik lainnya.', 'Langkah Pembelajaran'],
  ['Asesmen Awal', 'Dilakukan untuk mengetahui kesiapan belajar: emosi, mental, pengetahuan awal, dan kebutuhan murid.', 'Asesmen'],
  ['Asesmen Proses', 'Dilakukan untuk memantau perkembangan dan memberi umpan balik guru-murid dengan beragam teknik.', 'Asesmen'],
  ['Asesmen Hasil', 'Mengukur pencapaian kompetensi dengan tes, portofolio, proyek, presentasi, atau cara lainnya.', 'Asesmen'],
  ['Umpan Balik', 'Guru memberi umpan balik konstruktif dan mendorong perbaikan.', 'Asesmen'],
  ['Pembelajaran yang Berhasil', 'Pelajaran yang diperoleh dari implementasi pembelajaran beserta faktor pendukungnya.', 'Refleksi Guru'],
  ['Hal yang Belum Memuaskan', 'Hal-hal yang pencapaiannya belum memuaskan beserta faktor penghambatnya.', 'Refleksi Guru'],
  ['Rencana Perbaikan', 'Rencana tindak lanjut untuk perbaikan pembelajaran ke depan.', 'Refleksi Guru'],
]

export const observationItems: RubricItem[] = observationData.map(([title, indicator, section], index) => ({
  id: `obs-${index + 1}`,
  number: index + 1,
  title,
  indicator,
  section,
}))

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
