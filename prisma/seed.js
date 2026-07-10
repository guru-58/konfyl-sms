/**
 * Prisma Seed Script — KONFYL Pharmaceutical
 * Seeds: Categories, TherapeuticAreas, Products (with DetailedInfo), Blog posts
 * Run: npx prisma db seed
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const slugify = value => String(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const splitList = value => String(value || '')
  .split(',')
  .map(item => item.trim())
  .filter(Boolean);

const buildMechanismSvg = (productName, therapeuticArea) => {
  const safeProduct = productName.replace(/[<>&"]/g, '');
  const safeArea = therapeuticArea.replace(/[<>&"]/g, '');

  return `
<svg viewBox="0 0 920 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${safeProduct} mechanism learning diagram">
  <defs>
    <linearGradient id="konfylBlue" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#eaf7fc"/>
      <stop offset="100%" stop-color="#fdeaf4"/>
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#17314c" flood-opacity="0.12"/>
    </filter>
  </defs>
  <rect width="920" height="360" rx="24" fill="url(#konfylBlue)"/>
  <g filter="url(#softShadow)">
    <rect x="54" y="82" width="190" height="128" rx="18" fill="#ffffff"/>
    <rect x="282" y="82" width="190" height="128" rx="18" fill="#ffffff"/>
    <rect x="510" y="82" width="190" height="128" rx="18" fill="#ffffff"/>
    <rect x="738" y="82" width="128" height="128" rx="18" fill="#ffffff"/>
  </g>
  <g fill="none" stroke="#1a8fc7" stroke-width="6" stroke-linecap="round">
    <path d="M244 146h38"/>
    <path d="M472 146h38"/>
    <path d="M700 146h38"/>
  </g>
  <g font-family="Plus Jakarta Sans, Arial, sans-serif" text-anchor="middle">
    <text x="149" y="128" font-size="19" font-weight="800" fill="#17314c">Clinical Need</text>
    <text x="149" y="160" font-size="15" fill="#5c7188">${safeArea}</text>
    <text x="377" y="128" font-size="19" font-weight="800" fill="#17314c">Product Fit</text>
    <text x="377" y="160" font-size="15" fill="#5c7188">${safeProduct}</text>
    <text x="605" y="128" font-size="19" font-weight="800" fill="#17314c">Therapy Action</text>
    <text x="605" y="160" font-size="15" fill="#5c7188">Mechanism + safety</text>
    <text x="802" y="128" font-size="19" font-weight="800" fill="#17314c">Follow-up</text>
    <text x="802" y="160" font-size="15" fill="#5c7188">Response</text>
    <text x="460" y="284" font-size="23" font-weight="800" fill="#0c6694">${safeProduct} MR Learning Flow</text>
  </g>
</svg>`.trim();
};

const buildMrLearningModules = ({ product, detail, categoryName, therapeuticAreaName }) => {
  const productSlug = slugify(product.name);
  const indications = splitList(detail.indications);
  const mechanismSteps = [
    {
      title: 'Identify the patient need',
      description: `Connect symptoms and diagnosis to ${therapeuticAreaName}, then confirm that the discussion remains within physician-guided use.`
    },
    {
      title: 'Explain the active composition',
      description: `${product.name} contains ${product.composition}. MR communication should explain the composition simply before brand positioning.`
    },
    {
      title: 'Link mechanism to benefit',
      description: detail.mechanism
    },
    {
      title: 'Close with safe follow-up',
      description: `Reinforce dosage, precautions, storage, expected monitoring, and the doctor's follow-up plan.`
    }
  ];
  const svg = buildMechanismSvg(product.name, therapeuticAreaName);
  const imageDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  const imagePrompt = `Premium medical education illustration for ${product.name}: ${categoryName} product training, clean white background, blue and aqua pharmaceutical style, labeled composition, clinical pathway, doctor-MR learning context.`;

  return [
    {
      id: `${productSlug}-foundation`,
      title: 'Product Foundation',
      description: `Detailed brand, composition, category, and positioning knowledge for ${product.name}.`,
      order: 1,
      estimatedTime: 22,
      lessons: [
        {
          id: `${productSlug}-overview`,
          title: 'Brand Overview and Composition',
          order: 1,
          estimatedTime: 10,
          blocks: [
            { type: 'heading', text: `${product.name} - complete MR product brief` },
            {
              type: 'paragraph',
              text: `${product.name} is a KONFYL product in ${categoryName}, used in the ${therapeuticAreaName} therapy area. The MR should first remember the product name, active composition, therapy category, core indications, and the safe physician-led context in which the product is discussed.`
            },
            {
              type: 'table',
              caption: 'Product identity card',
              columns: ['Learning point', 'MR-ready detail'],
              rows: [
                ['Brand', product.name],
                ['Company', product.brand],
                ['Composition', product.composition],
                ['Category', categoryName],
                ['Therapeutic area', therapeuticAreaName],
                ['Core positioning', detail.sellingPoints]
              ]
            },
            {
              type: 'keyTakeaways',
              items: [
                `Always introduce ${product.name} with its composition: ${product.composition}.`,
                `Position it within ${therapeuticAreaName}, not as a generic product.`,
                'Use simple clinical language, then support with dosage, safety, and evidence.'
              ]
            }
          ]
        },
        {
          id: `${productSlug}-indications`,
          title: 'Indications and Patient Profile',
          order: 2,
          estimatedTime: 12,
          blocks: [
            { type: 'heading', text: 'Where this product fits in practice' },
            {
              type: 'paragraph',
              text: `The MR should understand the patient profile before memorising product lines. For ${product.name}, the key clinical discussion starts with these indication areas and then moves to why the composition is relevant.`
            },
            { type: 'list', title: 'Primary indication areas', items: indications },
            {
              type: 'clinicalTip',
              title: 'MR field tip',
              text: 'Start with the condition the doctor commonly sees, then connect the product composition to that condition. This makes the conversation more clinical and less promotional.'
            },
            {
              type: 'warning',
              title: 'Compliance note',
              text: 'Do not promise outcomes, compare without evidence, or advise patients directly. Keep all communication doctor-facing and label-aligned.'
            }
          ]
        }
      ]
    },
    {
      id: `${productSlug}-science`,
      title: 'Mechanism, Visual Learning and Safety',
      description: `Deep mechanism, dosage, safety, image, SVG, and animation learning for ${product.name}.`,
      order: 2,
      estimatedTime: 34,
      lessons: [
        {
          id: `${productSlug}-mechanism`,
          title: 'Mechanism Made Simple',
          order: 1,
          estimatedTime: 14,
          blocks: [
            { type: 'heading', text: 'Mechanism of action' },
            { type: 'paragraph', text: detail.mechanism },
            { type: 'flowchart', title: 'Step-by-step mechanism', steps: mechanismSteps },
            {
              type: 'svg',
              title: `${product.name} mechanism diagram`,
              variant: categoryName === "Women's Wellness" ? 'hormone-cycle' : 'clinical-pathway',
              svg
            },
            {
              type: 'animation',
              title: 'Animated learning sequence',
              description: 'Frontend can render these frames as a guided animation or carousel.',
              frames: mechanismSteps.map((step, index) => ({
                order: index + 1,
                label: step.title,
                text: step.description,
                durationMs: 2400,
                highlight: index === 1 ? product.composition : therapeuticAreaName
              }))
            },
            {
              type: 'image',
              title: `${product.name} visual learning image`,
              alt: `${product.name} product training illustration`,
              src: imageDataUri,
              generationPrompt: imagePrompt,
              fallback: 'Generate or attach an approved product visual using this prompt for MR Academy.'
            }
          ]
        },
        {
          id: `${productSlug}-dosage-safety`,
          title: 'Dosage, Contraindications and Safety',
          order: 2,
          estimatedTime: 12,
          blocks: [
            { type: 'clinicalTip', title: 'Dosage language', text: detail.dosage },
            { type: 'warning', title: 'Contraindications', text: detail.contraindications },
            { type: 'warning', title: 'Side effects to remember', text: detail.sideEffects },
            { type: 'paragraph', text: `Storage instruction: ${detail.storage}` },
            {
              type: 'keyTakeaways',
              items: [
                'Never alter dose instructions in the field.',
                'If a doctor asks for deeper safety data, refer to approved medical literature or internal medical team.',
                'Storage and compliance points are useful practical reminders during detailing.'
              ]
            }
          ]
        },
        {
          id: `${productSlug}-evidence`,
          title: 'Evidence and References',
          order: 3,
          estimatedTime: 8,
          blocks: [
            { type: 'heading', text: 'Reference-backed confidence' },
            { type: 'paragraph', text: 'MRs should know which claims are evidence-backed and should avoid adding unsupported claims during doctor conversations.' },
            {
              type: 'reference',
              title: 'Clinical references',
              items: String(detail.clinicalReferences || '')
                .split(/\.\s+/)
                .map(item => item.trim())
                .filter(Boolean)
                .map(item => item.endsWith('.') ? item : `${item}.`)
            }
          ]
        }
      ]
    },
    {
      id: `${productSlug}-field-practice`,
      title: 'Doctor Detailing and Case Practice',
      description: `Doctor conversation, objections, clinical case, and MR practice for ${product.name}.`,
      order: 3,
      estimatedTime: 28,
      lessons: [
        {
          id: `${productSlug}-conversation`,
          title: 'Doctor Conversation Script',
          order: 1,
          estimatedTime: 10,
          blocks: [
            {
              type: 'doctorConversation',
              messages: [
                { role: 'MR', text: `Good morning Doctor. I wanted to briefly discuss ${product.name}, which contains ${product.composition}, for relevant ${therapeuticAreaName} cases.` },
                { role: 'Doctor', text: 'What is the key clinical relevance of this product?' },
                { role: 'MR', text: `Doctor, the main relevance is its fit in ${indications.slice(0, 3).join(', ') || therapeuticAreaName}. The composition and patient suitability are the main points I would like to highlight.` },
                { role: 'Doctor', text: 'What should I keep in mind for safety?' },
                { role: 'MR', text: `The key precautions are: ${detail.contraindications}. I can share the approved product reference for deeper review.` }
              ]
            },
            {
              type: 'clinicalTip',
              title: 'Conversation discipline',
              text: 'Keep the opening under 45 seconds. Let the doctor guide depth with questions.'
            }
          ]
        },
        {
          id: `${productSlug}-case-study`,
          title: 'Case Study',
          order: 2,
          estimatedTime: 10,
          blocks: [
            {
              type: 'caseStudy',
              title: `${product.name} case discussion`,
              scenario: `A doctor is seeing a patient profile related to ${indications[0] || therapeuticAreaName}. The MR needs to explain where ${product.name} may fit, what its composition is, and which safety boundaries should be respected.`,
              patientProfile: `Patient context: ${therapeuticAreaName}; product context: ${product.composition}.`,
              discussionPoints: [
                'What is the clinical need?',
                `How does ${product.composition} relate to that need?`,
                'Which safety or contraindication points must be remembered?',
                'What follow-up question should the MR ask the doctor?'
              ],
              idealMrResponse: `${product.name} should be discussed as a ${categoryName} product with composition ${product.composition}. The MR should connect it to relevant indications, mention safety boundaries, and invite the doctor to review approved references.`
            }
          ]
        },
        {
          id: `${productSlug}-quiz`,
          title: 'Knowledge Check',
          order: 3,
          estimatedTime: 8,
          blocks: [
            {
              type: 'quiz',
              passingScore: 80,
              questions: [
                {
                  question: `What is the composition of ${product.name}?`,
                  options: [product.composition, 'A placebo formulation', 'Only calcium carbonate', 'Only paracetamol'],
                  correctOptionIndex: 0,
                  rationale: `${product.name} contains ${product.composition}.`
                },
                {
                  question: `Which therapy area should the MR associate with ${product.name}?`,
                  options: ['Oncology only', therapeuticAreaName, 'Anaesthesia only', 'Emergency trauma only'],
                  correctOptionIndex: 1,
                  rationale: `${product.name} is seeded under ${therapeuticAreaName}.`
                },
                {
                  question: 'What is the safest MR approach during product detailing?',
                  options: ['Promise guaranteed outcomes', 'Skip contraindications', 'Stay evidence-led and doctor-facing', 'Give direct patient dosing advice'],
                  correctOptionIndex: 2,
                  rationale: 'MR communication should stay evidence-led, doctor-facing, and aligned with approved product information.'
                }
              ]
            }
          ]
        }
      ]
    }
  ];
};

const seedMrLearningModules = async ({ product, detail, categoryName, therapeuticAreaName }) => {
  const modules = buildMrLearningModules({ product, detail, categoryName, therapeuticAreaName });

  for (const module of modules) {
    await prisma.trainingModule.upsert({
      where: { id: `mr-course-${module.id}` },
      update: {
        productId: product.id,
        title: `${String(module.order).padStart(2, '0')} | ${product.name} | ${module.title}`,
        description: module.description,
        content: JSON.stringify(module),
        estimatedTime: module.estimatedTime
      },
      create: {
        id: `mr-course-${module.id}`,
        productId: product.id,
        title: `${String(module.order).padStart(2, '0')} | ${product.name} | ${module.title}`,
        description: module.description,
        content: JSON.stringify(module),
        estimatedTime: module.estimatedTime
      }
    });
  }

  return modules.length;
};

async function main() {
  console.log('🌱 Starting KONFYL database seed...');

  // ─── Categories ────────────────────────────────────────
  const categories = await Promise.all([
    prisma.category.upsert({ where: { name: "Women's Wellness" }, update: {}, create: { name: "Women's Wellness", description: 'Gynaecology and reproductive health products' } }),
    prisma.category.upsert({ where: { name: 'Nutraceuticals' }, update: {}, create: { name: 'Nutraceuticals', description: 'Nutritional supplements and wellness formulations' } }),
    prisma.category.upsert({ where: { name: 'General Physician' }, update: {}, create: { name: 'General Physician', description: 'Antibiotics, antacids, and general medicine' } }),
    prisma.category.upsert({ where: { name: 'Orthopaedics' }, update: {}, create: { name: 'Orthopaedics', description: 'Bone, joint, and muscular health products' } }),
  ]);
  const [womenWellness, nutra, general, ortho] = categories;
  const categoryById = new Map(categories.map(category => [category.id, category.name]));
  console.log('✅ Categories seeded');

  // ─── Therapeutic Areas ──────────────────────────────────
  const therapeuticAreas = await Promise.all([
    prisma.therapeuticArea.upsert({ where: { name: 'Gynaecology & Reproductive Health' }, update: {}, create: { name: 'Gynaecology & Reproductive Health', description: 'Progesterone support, fertility, menstrual health' } }),
    prisma.therapeuticArea.upsert({ where: { name: 'Fertility & Assisted Reproduction' }, update: {}, create: { name: 'Fertility & Assisted Reproduction', description: 'Ovulation induction and IVF support' } }),
    prisma.therapeuticArea.upsert({ where: { name: 'Antioxidants & Metabolic Wellness' }, update: {}, create: { name: 'Antioxidants & Metabolic Wellness', description: 'PCOS, oxidative stress, nutritional support' } }),
    prisma.therapeuticArea.upsert({ where: { name: 'Gastroenterology' }, update: {}, create: { name: 'Gastroenterology', description: 'GERD, acid reflux, gastrointestinal motility' } }),
    prisma.therapeuticArea.upsert({ where: { name: 'Anti-Infectives' }, update: {}, create: { name: 'Anti-Infectives', description: 'Antibiotics, antifungals, vaginal infections' } }),
    prisma.therapeuticArea.upsert({ where: { name: 'Bone & Vitamin Therapy' }, update: {}, create: { name: 'Bone & Vitamin Therapy', description: 'Vitamin D3, calcium absorption, osteoporosis' } }),
    prisma.therapeuticArea.upsert({ where: { name: 'Male Fertility' }, update: {}, create: { name: 'Male Fertility', description: 'Sperm health, motility, and reproductive wellness' } }),
    prisma.therapeuticArea.upsert({ where: { name: 'Vascular & Gestational Health' }, update: {}, create: { name: 'Vascular & Gestational Health', description: 'Nitric oxide support, pre-eclampsia prevention' } }),
  ]);
  const [gynaec, fertility, metabolic, gastro, antiInfective, boneVitamin, maleFertility, vascular] = therapeuticAreas;
  const therapeuticAreaById = new Map(therapeuticAreas.map(area => [area.id, area.name]));
  console.log('✅ Therapeutic areas seeded');

  // ─── Products ───────────────────────────────────────────
  const productDefs = [
    {
      name: 'Dydrofact 10', brand: 'KONFYL', composition: 'Dydrogesterone 10mg Tablets',
      categoryId: womenWellness.id, therapeuticAreaId: gynaec.id,
      keywords: ['dydrogesterone', 'progesterone', 'infertility', 'miscarriage', 'PCOS'],
      seoTitle: 'Dydrofact 10 | Dydrogesterone 10mg Tablets | KONFYL Pharmaceutical',
      seoDescription: 'Dydrofact 10 contains Dydrogesterone 10mg for female infertility, menstrual problems, PMS and endometriosis treatment.',
      seoKeywords: ['dydrogesterone', 'Dydrofact 10', 'female infertility', 'progesterone therapy'],
      detail: {
        mechanism: 'Dydrogesterone selectively binds to progesterone receptors in the uterus, producing secretory endometrium in estrogen-primed women without suppressing ovulation.',
        indications: 'Female Infertility, Menstrual Problems, Premenstrual Syndrome, Endometriosis, Threatened/Habitual Miscarriage, Luteal Phase Defect',
        contraindications: 'Undiagnosed vaginal bleeding, history of thromboembolic disorders, severe hepatic impairment, hormone-dependent tumors',
        dosage: '10mg once or twice daily as per indication. For threatened miscarriage: 40mg stat, then 10mg every 8 hours. Follow gynaecologist advice.',
        sideEffects: 'Mild headache, nausea, breast tenderness, breakthrough bleeding. Well-tolerated overall.',
        storage: 'Store below 30°C. Protect from light and moisture. Keep out of reach of children.',
        sellingPoints: 'Does not suppress ovulation — ideal for fertility patients. Excellent oral bioavailability. 18-hour half-life for stable hormone levels. Extensive clinical safety data.',
        faqs: JSON.stringify([
          { question: 'What is Dydrofact 10 used for?', answer: 'Primarily for progesterone deficiency conditions: female infertility, threatened/habitual miscarriage, PMS, dysmenorrhea, and endometriosis.' },
          { question: 'Does it prevent ovulation?', answer: 'No. At therapeutic doses, it does not suppress ovulation, making it ideal for fertility patients.' },
          { question: 'Are there side effects?', answer: 'Well-tolerated. Mild headache, nausea, or breast tenderness may occur. Consult your physician if symptoms persist.' }
        ]),
        doctorFaqs: JSON.stringify([
          { question: 'What is the mechanism vs synthetic progestogens?', answer: 'Dydrogesterone is highly selective for progesterone receptors with no androgenic, glucocorticoid, or mineralocorticoid activity, minimizing off-target effects.' },
          { question: 'Is it safe in first trimester?', answer: 'Yes, it has an extensive safety record in first-trimester use for threatened and habitual abortion.' }
        ]),
        visualAids: [],
        clinicalReferences: 'Griesinger et al. (2012). Dydrogesterone: pharmacological profile and mechanism of action as luteal phase support in ART. Reprod Biomed Online. Schindler et al. (2003). Dydrogesterone—a distinct progestogen. Maturitas.'
      }
    },
    {
      name: 'Cornfyl SR 200', brand: 'KONFYL', composition: 'Natural Micronised Progesterone Sustained Release 200mg Tablets',
      categoryId: womenWellness.id, therapeuticAreaId: gynaec.id,
      keywords: ['progesterone', 'sustained release', 'luteal phase', 'miscarriage', 'IVF'],
      seoTitle: 'Cornfyl SR 200 | Progesterone SR 200mg | KONFYL Pharmaceutical',
      seoDescription: 'Cornfyl SR 200 provides sustained progesterone support for habitual abortion, threatened abortion, and luteal phase defect.',
      seoKeywords: ['Cornfyl SR 200', 'progesterone sustained release', 'luteal phase support'],
      detail: {
        mechanism: 'Sustained-release natural micronized progesterone ensures stable serum levels, supporting endometrial development and preventing premature uterine contractions.',
        indications: 'Habitual Abortion, Threatened Abortion, Luteal Phase Defect, Premenstrual Syndrome, Secondary Amenorrhea',
        contraindications: 'Active DVT, pulmonary embolism, liver dysfunction, breast cancer, undiagnosed vaginal bleeding',
        dosage: 'Once daily at bedtime, or as prescribed. Bedtime dosing minimizes sedative effects.',
        sideEffects: 'Mild drowsiness, dizziness, bloating. Vaginal irritation if used vaginally.',
        storage: 'Store below 30°C in dry conditions. Protect from light.',
        sellingPoints: 'Sustained release for stable 24-hour coverage. Natural micronized progesterone — molecularly identical to endogenous. Bedtime dosing improves compliance.',
        faqs: JSON.stringify([
          { question: 'How is SR different from standard capsules?', answer: 'SR releases progesterone slowly, maintaining stable blood levels and minimizing side effects like dizziness.' },
          { question: 'Why take at night?', answer: 'Progesterone can cause drowsiness; bedtime dosing ensures sedative effects occur during sleep.' },
          { question: 'Is it safe in early pregnancy?', answer: 'Yes, commonly prescribed in first trimester for recurrent pregnancy loss.' }
        ]),
        doctorFaqs: JSON.stringify([
          { question: 'SR vs capsule in IVF luteal phase?', answer: 'SR tablets offer convenience of once-daily oral dosing vs vaginal pessaries in ART cycles.' }
        ]),
        visualAids: [],
        clinicalReferences: 'de Ziegler et al. Progesterone in reproductive medicine. Endocrine Reviews. Licciardi et al. Oral micronized progesterone use in ART. Fertility and Sterility.'
      }
    },
    {
      name: 'Cornfyl SR 300', brand: 'KONFYL', composition: 'Natural Micronised Progesterone Sustained Release 300mg Tablets',
      categoryId: womenWellness.id, therapeuticAreaId: fertility.id,
      keywords: ['progesterone 300mg', 'IVF', 'luteal phase', 'high risk pregnancy'],
      seoTitle: 'Cornfyl SR 300 | Progesterone 300mg SR | KONFYL Pharmaceutical',
      seoDescription: 'High-potency 300mg sustained-release natural progesterone for intense hormonal support in IVF and high-risk pregnancy.',
      seoKeywords: ['Cornfyl SR 300', 'progesterone 300mg', 'IVF luteal support'],
      detail: {
        mechanism: 'Delivers 300mg natural progesterone via SR system, mimicking corpus luteum function to prevent premature uterine contractions and support placental vascular supply.',
        indications: 'IVF luteal phase support, habitual/threatened abortion, severe luteal phase deficiency, secondary amenorrhea',
        contraindications: 'Same as Cornfyl SR 200. Monitor carefully in diabetes, asthma, epilepsy, migraine, and cardiac impairment.',
        dosage: 'One tablet daily or as directed by obstetrician. Once-daily dosing due to SR mechanism.',
        sideEffects: 'Mild drowsiness, fluid retention, bloating. Similar to 200mg formulation.',
        storage: 'Below 30°C, away from light and moisture.',
        sellingPoints: 'Higher dose for demanding clinical scenarios. Sustained release for once-daily convenience. Proven to increase live birth rates in IVF.',
        faqs: JSON.stringify([
          { question: 'When is 300mg preferred over 200mg?', answer: 'For higher hormonal support needs — IVF cycles, severe luteal phase deficiency, or strong history of recurrent loss.' },
          { question: 'Does it contain synthetic hormones?', answer: 'No, natural micronized progesterone identical to the body\'s own.' }
        ]),
        doctorFaqs: JSON.stringify([
          { question: 'Clinical evidence for 300mg SR?', answer: 'Higher dose coverage in IVF luteal phase shows substantial increases in ongoing pregnancy and live birth rates vs lower doses.' }
        ]),
        visualAids: [],
        clinicalReferences: 'Putterman et al. Progesterone supplementation in IVF. J Assist Reprod Genet. Lockwood et al. Progesterone and preterm birth. Am J Obstet Gynecol.'
      }
    },
    {
      name: 'Cornfyl-200', brand: 'KONFYL', composition: 'Natural Micronised Progesterone 200mg Soft Gelatin Capsules',
      categoryId: womenWellness.id, therapeuticAreaId: gynaec.id,
      keywords: ['progesterone softgel', 'vaginal', 'oral', 'micronized', 'IVF'],
      seoTitle: 'Cornfyl-200 | Progesterone 200mg Softgels | KONFYL Pharmaceutical',
      seoDescription: 'Cornfyl-200 softgels allow flexible oral or vaginal administration of 200mg natural micronized progesterone.',
      seoKeywords: ['Cornfyl-200', 'micronized progesterone', 'vaginal progesterone'],
      detail: {
        mechanism: 'Vaginal administration bypasses first-pass hepatic metabolism, delivering high progesterone concentrations directly to uterine tissue. Oral route provides systemic support.',
        indications: 'Luteal phase support in ART, threatened miscarriage, HRT, secondary amenorrhea',
        contraindications: 'Renal impairment, severe migraines, breast cancer, liver disease',
        dosage: '200mg–400mg daily. Vaginal: insert at bedtime. Oral: take on empty stomach (food increases absorption and dizziness).',
        sideEffects: 'Oral: drowsiness, dizziness. Vaginal: local irritation, discharge.',
        storage: 'Below 25°C, protect from light.',
        sellingPoints: 'Dual-route flexibility — oral or vaginal. Vaginal route provides direct uterine action with minimal systemic drowsiness. Higher bioavailability via micronization.',
        faqs: JSON.stringify([
          { question: 'Can Cornfyl-200 be used vaginally?', answer: 'Yes, specifically designed for oral or vaginal administration based on physician\'s instruction.' },
          { question: 'Benefits of vaginal route?', answer: 'Direct uterine delivery, lower blood concentrations elsewhere, fewer side effects like sleepiness.' }
        ]),
        doctorFaqs: JSON.stringify([
          { question: 'Oral vs vaginal route in ART?', answer: 'Vaginal is preferred in IVF luteal support for direct uterine action. Oral can be used for systemic support in HRT.' }
        ]),
        visualAids: [],
        clinicalReferences: 'Cicinelli et al. Progesterone administration by vaginal route. Eur J Obstet Gynecol Reprod Biol.'
      }
    },
    {
      name: 'Ovartifyl F', brand: 'KONFYL', composition: 'Myo-Inositol, D-Chiro-Inositol, Astaxanthin, Lycopene, Melatonin, L-Arginine, Pyridoxine HCl, Folic Acid, Vitamin B12, Iron and Zinc Tablets',
      categoryId: womenWellness.id, therapeuticAreaId: metabolic.id,
      keywords: ['PCOS', 'inositol', 'female infertility', 'ovulation', 'hormonal balance'],
      seoTitle: 'Ovartifyl F | PCOS & Female Fertility Support | KONFYL Pharmaceutical',
      seoDescription: 'Ovartifyl F combines Myo-Inositol, D-Chiro-Inositol, Astaxanthin, and essential vitamins for PCOS management and female fertility support.',
      seoKeywords: ['Ovartifyl F', 'Myo-Inositol', 'PCOS supplement', 'female fertility'],
      detail: {
        mechanism: 'Myo-Inositol and D-Chiro-Inositol in 40:1 ratio restore insulin sensitivity and FSH signaling. Antioxidants protect oocytes from oxidative stress. L-Arginine improves uterine blood flow.',
        indications: 'PCOS management, female infertility, metabolic wellness, nutritional support during ART',
        contraindications: 'Hypersensitivity to any ingredient. Do not exceed recommended daily dose.',
        dosage: 'One tablet daily, ideally for 3–6 months continuous course for best reproductive outcomes.',
        sideEffects: 'Generally well-tolerated. Rare: mild GI discomfort. Discontinue and consult if allergy occurs.',
        storage: 'Below 30°C, dry place. Keep away from children.',
        sellingPoints: 'Physiological 40:1 MI:DCI ratio. 9-ingredient comprehensive formula. Clinically validated for oocyte quality improvement. Addresses both metabolic and oxidative aspects of PCOS.',
        faqs: JSON.stringify([
          { question: 'How does it help PCOS?', answer: 'Improves insulin sensitivity, restores regular cycles, lowers androgens, and promotes healthy ovulation.' },
          { question: 'When do results appear?', answer: 'Most women notice improvements in 8–12 weeks; 3–6 months recommended for fertility support.' }
        ]),
        doctorFaqs: JSON.stringify([
          { question: 'Evidence for MI+DCI in PCOS?', answer: 'Multiple RCTs show the 40:1 ratio significantly improves ovulation, oocyte quality, and metabolic parameters vs placebo or MI alone.' }
        ]),
        visualAids: [],
        clinicalReferences: 'Unfer et al. Myo-inositol and D-chiro-inositol in PCOS. Eur Rev Med Pharmacol Sci. Colazingari et al. Combined myo-inositol+D-chiro-inositol treatment. J Ovarian Res.'
      }
    },
    {
      name: 'Ovartifyl M', brand: 'KONFYL', composition: 'L-Carnitine, Co-Enzyme Q10, Lycopene, Zinc, Selenium and Vitamin Supplement',
      categoryId: nutra.id, therapeuticAreaId: maleFertility.id,
      keywords: ['male fertility', 'sperm motility', 'CoQ10', 'L-Carnitine', 'antioxidant'],
      seoTitle: 'Ovartifyl M | Male Fertility Supplement | KONFYL Pharmaceutical',
      seoDescription: 'Ovartifyl M combines L-Carnitine, CoQ10, Lycopene, Zinc, and Selenium to optimize sperm quality, motility, and male reproductive health.',
      seoKeywords: ['Ovartifyl M', 'male fertility', 'sperm motility', 'CoQ10 supplement'],
      detail: {
        mechanism: 'L-Carnitine and CoQ10 fuel mitochondrial ATP production for sperm motility. Lycopene and Selenium protect sperm membranes from oxidative damage. Zinc is essential for spermatogenesis.',
        indications: 'Male fertility support, poor sperm motility (asthenozoospermia), oxidative stress in spermatozoa, preconception nutritional support',
        contraindications: 'Hypersensitivity to ingredients. Caution with blood thinners or prescription medications.',
        dosage: 'One tablet daily after a main meal. 3-month minimum course (covers full sperm maturation cycle ~74 days).',
        sideEffects: 'Well-tolerated. Rare GI discomfort. Take with food to improve absorption.',
        storage: 'Below 30°C, dry place.',
        sellingPoints: 'Targets all three key sperm parameters: count, motility, morphology. Fat-soluble CoQ10 and Lycopene better absorbed with food. 3-month course aligns with spermatogenesis cycle.',
        faqs: JSON.stringify([
          { question: 'Role of CoQ10?', answer: 'Energy fuel for sperm cells, improving motility while protecting sperm DNA from oxidative damage.' },
          { question: 'Can it be taken long-term?', answer: 'Yes, safe for daily consumption. Take for at least 3 months to cover a full sperm production cycle.' }
        ]),
        doctorFaqs: JSON.stringify([
          { question: 'Evidence for CoQ10 in male subfertility?', answer: 'Multiple trials show significant improvement in sperm motility and pregnancy rates with L-Carnitine + CoQ10 in male subfertility.' }
        ]),
        visualAids: [],
        clinicalReferences: 'Balercia et al. CoQ10 and male infertility. J Endocrinol Invest. Lenzi et al. L-Carnitine treatment of male infertility. Fertil Steril.'
      }
    },
    {
      name: 'RGFYL PLUS', brand: 'KONFYL', composition: 'L-Arginine, Glutathione and Proanthocyanidin Sachet',
      categoryId: nutra.id, therapeuticAreaId: vascular.id,
      keywords: ['L-Arginine', 'nitric oxide', 'gestational health', 'blood flow', 'antioxidant'],
      seoTitle: 'RGFYL PLUS | L-Arginine Glutathione Sachet | KONFYL Pharmaceutical',
      seoDescription: 'RGFYL PLUS sachets combine L-Arginine, Glutathione, and Proanthocyanidins to support vascular health and gestational wellness.',
      seoKeywords: ['RGFYL PLUS', 'L-Arginine sachet', 'nitric oxide', 'gestational supplement'],
      detail: {
        mechanism: 'L-Arginine is converted to Nitric Oxide (NO), a vasodilator improving uterine blood flow. Glutathione and Proanthocyanidins prevent NO degradation, sustaining vascular support.',
        indications: 'Pre-eclampsia prevention, IUGR, gestational blood flow support, antioxidant defense during pregnancy',
        contraindications: 'History of herpes infections, myocardial infarction. Consult obstetrician before use in pregnancy.',
        dosage: 'One sachet dissolved in ~100ml water daily. Drink immediately after mixing.',
        sideEffects: 'Generally safe. Rare: mild GI discomfort, headache. Avoid in herpes-positive patients.',
        storage: 'Store in cool dry place. Use immediately after mixing.',
        sellingPoints: 'Convenient sachet format. Triple-action: vasodilation + antioxidant + NO protection. Clinically studied for IUGR and pre-eclampsia prevention.',
        faqs: JSON.stringify([
          { question: 'How to consume?', answer: 'Dissolve sachet in ~100ml water, stir well, drink immediately.' },
          { question: 'Why L-Arginine in pregnancy?', answer: 'Improves uterine and placental circulation, ensuring fetus receives adequate oxygen and nutrients.' }
        ]),
        doctorFaqs: JSON.stringify([
          { question: 'Evidence in pre-eclampsia?', answer: 'NO donors like L-Arginine shown in clinical trials to improve uterine blood flow and reduce pre-eclampsia risk.' }
        ]),
        visualAids: [],
        clinicalReferences: 'Rytlewski et al. L-Arginine supplementation in preeclampsia. Eur J Obstet Gynecol Reprod Biol. Vadillo-Ortega et al. L-Arginine in IUGR. BMJ.'
      }
    },
    {
      name: 'CORNFYL-TZ', brand: 'KONFYL', composition: 'Clindamycin Phosphate and Clotrimazole Vaginal Suppositories',
      categoryId: womenWellness.id, therapeuticAreaId: antiInfective.id,
      keywords: ['bacterial vaginosis', 'vaginal infection', 'clindamycin', 'clotrimazole', 'antifungal'],
      seoTitle: 'CORNFYL-TZ | Clindamycin + Clotrimazole Vaginal Suppositories | KONFYL',
      seoDescription: 'CORNFYL-TZ dual-action vaginal suppositories combine Clindamycin and Clotrimazole for mixed vaginal infections treatment.',
      seoKeywords: ['CORNFYL-TZ', 'bacterial vaginosis', 'vaginal suppository', 'clindamycin clotrimazole'],
      detail: {
        mechanism: 'Clindamycin inhibits bacterial protein synthesis (against Gardnerella vaginalis). Clotrimazole disrupts fungal cell membrane (against Candida). Dual action treats mixed vaginitis locally.',
        indications: 'Bacterial vaginosis, vaginal candidiasis, mixed vaginal infections',
        contraindications: 'Avoid with latex condoms/diaphragms (may weaken). Avoid if allergy to lincosamide antibiotics or imidazoles.',
        dosage: 'One suppository deeply inserted vaginally at bedtime for 7 consecutive days. Applicator provided.',
        sideEffects: 'Local: mild irritation, burning. Systemic absorption minimal. Avoid intercourse during treatment.',
        storage: 'Below 25°C. Do not freeze.',
        sellingPoints: 'Dual-action eliminates need for two separate products. High local drug concentration with minimal systemic exposure. 7-day complete course.',
        faqs: JSON.stringify([
          { question: 'How to use?', answer: 'Wash hands, load applicator, lie on back with knees bent, insert gently, push plunger to release, wash applicator.' },
          { question: 'During menstrual period?', answer: 'Complete the course before your period; menstrual flow may reduce efficacy.' }
        ]),
        doctorFaqs: JSON.stringify([
          { question: 'Clinical cure rates?', answer: 'Combination clindamycin + clotrimazole achieves higher clinical cure rates for mixed vaginitis vs single-agent treatment.' }
        ]),
        visualAids: [],
        clinicalReferences: 'Sobel et al. Clindamycin in bacterial vaginosis. NEJM. Farr et al. Mixed vaginal infection management. ISSTDR.'
      }
    },
    {
      name: 'LETROPAL-2.5', brand: 'KONFYL', composition: 'Letrozole 2.5mg Tablets',
      categoryId: womenWellness.id, therapeuticAreaId: fertility.id,
      keywords: ['letrozole', 'ovulation induction', 'aromatase inhibitor', 'PCOS infertility', 'follicle'],
      seoTitle: 'LETROPAL-2.5 | Letrozole 2.5mg Ovulation Induction | KONFYL Pharmaceutical',
      seoDescription: 'LETROPAL-2.5 is a selective aromatase inhibitor containing Letrozole 2.5mg for ovulation induction and female infertility management.',
      seoKeywords: ['LETROPAL-2.5', 'letrozole', 'ovulation induction', 'aromatase inhibitor'],
      detail: {
        mechanism: 'Letrozole inhibits aromatase enzyme, reducing estrogen conversion from androgens. Resulting estrogen drop triggers increased FSH secretion, stimulating dominant follicle development.',
        indications: 'Ovulation induction in PCOS, anovulatory infertility, unexplained infertility',
        contraindications: 'Active pregnancy, suspected pregnancy, severe hepatic impairment.',
        dosage: '2.5mg daily for 5 days starting cycle day 3–5, under gynaecological supervision with ultrasound monitoring.',
        sideEffects: 'Mild hot flashes, fatigue, headache. Monitor follicle count to prevent hyperstimulation.',
        storage: 'Below 30°C. Protect from light.',
        sellingPoints: 'First-line for PCOS ovulation induction. Higher live-birth rates than clomiphene. Lower risk of multiple pregnancies. Shorter half-life — reduced side effects.',
        faqs: JSON.stringify([
          { question: 'How does it induce ovulation?', answer: 'Temporarily lowers estrogen, prompting pituitary to release more FSH, stimulating follicle growth and ovulation.' },
          { question: 'Which cycle day to start?', answer: 'Usually day 3–5. Follow your fertility specialist\'s instructions.' },
          { question: 'Risk of multiple pregnancy?', answer: 'Lower than other fertility drugs; ultrasound monitoring helps manage follicle count.' }
        ]),
        doctorFaqs: JSON.stringify([
          { question: 'Letrozole vs clomiphene in PCOS?', answer: 'Letrozole achieves significantly higher ovulation and live-birth rates in PCOS. Now recommended as first-line by ACOG and RCOG.' }
        ]),
        visualAids: [],
        clinicalReferences: 'Legro et al. Letrozole vs clomiphene in PCOS infertility. NEJM. Diamond et al. Letrozole vs clomiphene for ART. Fertil Steril.'
      }
    },
    {
      name: 'NVHOPE-OD', brand: 'KONFYL', composition: 'Doxylamine Succinate 20mg + Pyridoxine HCl 20mg + Folic Acid 5mg Tablets',
      categoryId: womenWellness.id, therapeuticAreaId: gynaec.id,
      keywords: ['morning sickness', 'nausea pregnancy', 'doxylamine', 'pyridoxine', 'folic acid'],
      seoTitle: 'NVHOPE-OD | Morning Sickness Relief | Doxylamine + Pyridoxine | KONFYL',
      seoDescription: 'NVHOPE-OD once-daily formulation combines Doxylamine Succinate, Pyridoxine HCl, and Folic Acid for pregnancy-induced nausea and vomiting management.',
      seoKeywords: ['NVHOPE-OD', 'morning sickness', 'doxylamine pyridoxine', 'nausea vomiting pregnancy'],
      detail: {
        mechanism: 'Doxylamine blocks H1 histamine receptors suppressing the vomiting center. Pyridoxine regulates neurotransmitter metabolism reducing nausea. Folic Acid supports neural tube development.',
        indications: 'Nausea and vomiting of pregnancy (NVP), morning sickness management in first trimester',
        contraindications: 'Concurrent use of MAO inhibitors, alcohol, CNS depressants. Caution with driving.',
        dosage: 'One tablet at bedtime on empty stomach. Dose may be adjusted by physician for severe NVP.',
        sideEffects: 'Drowsiness (take at bedtime). Avoid driving after dose. Dry mouth.',
        storage: 'Below 30°C. Away from moisture.',
        sellingPoints: 'First-line pharmacotherapy recommended by global obstetric guidelines. Proven fetal safety profile. Convenient once-daily bedtime dosing. Contains Folic Acid for neural tube protection.',
        faqs: JSON.stringify([
          { question: 'Why include Folic Acid?', answer: 'Essential during early pregnancy to prevent neural tube defects in the developing baby.' },
          { question: 'Will it cause drowsiness?', answer: 'Doxylamine can cause mild drowsiness; bedtime dosing minimizes daytime impact.' },
          { question: 'Is it safe for baby?', answer: 'Yes, extensively studied and widely recommended as safe first-line treatment for pregnancy nausea.' }
        ]),
        doctorFaqs: JSON.stringify([
          { question: 'Guideline status?', answer: 'Doxylamine + Pyridoxine combination is Category A in pregnancy by FDA and recommended first-line by ACOG guidelines for NVP.' }
        ]),
        visualAids: [],
        clinicalReferences: 'Koren et al. Doxylamine + pyridoxine for NVP safety. NEJM. ACOG Practice Bulletin No. 153: Nausea and Vomiting of Pregnancy.'
      }
    },
    {
      name: 'ESMOFYL-DSR', brand: 'KONFYL', composition: 'Esomeprazole EC 40mg + Domperidone SR 30mg Capsules',
      categoryId: general.id, therapeuticAreaId: gastro.id,
      keywords: ['GERD', 'hyperacidity', 'esomeprazole', 'domperidone', 'acid reflux', 'PPI'],
      seoTitle: 'ESMOFYL-DSR | Esomeprazole 40mg + Domperidone 30mg SR | KONFYL',
      seoDescription: 'ESMOFYL-DSR dual-action capsules combine Esomeprazole EC 40mg and Domperidone SR 30mg for GERD, hyperacidity, and nausea treatment.',
      seoKeywords: ['ESMOFYL-DSR', 'esomeprazole domperidone', 'GERD capsule', 'acid reflux treatment'],
      detail: {
        mechanism: 'Esomeprazole inhibits H+/K+-ATPase in gastric parietal cells reducing acid secretion. Domperidone increases GI motility and LES tone, preventing reflux and alleviating nausea.',
        indications: 'GERD, erosive esophagitis, hyperacidity, associated nausea and bloating, functional dyspepsia',
        contraindications: 'Cardiac conditions, hepatic impairment, hypokalemia, concurrent QT-prolonging drugs.',
        dosage: 'One capsule daily, 30–60 minutes before breakfast for optimal acid suppression.',
        sideEffects: 'Headache, diarrhea, nausea. Long-term PPI: monitor bone density and magnesium levels.',
        storage: 'Below 30°C. Protect from moisture.',
        sellingPoints: 'Dual-mechanism: acid suppression + prokinetic. Fixed-dose combination improves compliance. Sustained-release Domperidone ensures 12-hour prokinetic action.',
        faqs: JSON.stringify([
          { question: 'Why take before food?', answer: '30–60 mins before breakfast maximizes acid pump inhibition before food-stimulated acid secretion.' },
          { question: 'What is GERD?', answer: 'Chronic condition where stomach acid flows back to esophagus, causing heartburn and damage.' },
          { question: 'Can I take it long-term?', answer: 'Usually 2–4 weeks. Consult doctor if long-term medication is needed.' }
        ]),
        doctorFaqs: JSON.stringify([
          { question: 'Evidence vs PPI monotherapy?', answer: 'Esomeprazole + domperidone combination provides significantly superior symptom relief in GERD vs PPI alone in clinical trials.' }
        ]),
        visualAids: [],
        clinicalReferences: 'Hatlebakk et al. Esomeprazole in GERD. Aliment Pharmacol Ther. Talley et al. Prokinetics in functional dyspepsia. Gut.'
      }
    },
    {
      name: 'Cornfyl D3 60K', brand: 'KONFYL', composition: 'Cholecalciferol Vitamin D3 Oral Solution 60000 IU Nano Shot',
      categoryId: nutra.id, therapeuticAreaId: boneVitamin.id,
      keywords: ['Vitamin D3', 'cholecalciferol', 'bone density', 'calcium absorption', 'nano emulsion'],
      seoTitle: 'Cornfyl D3 60K | Vitamin D3 60000 IU Nano Shot | KONFYL Pharmaceutical',
      seoDescription: 'Cornfyl D3 60K provides 60000 IU Vitamin D3 in a nano-emulsion oral shot for rapid correction of Vitamin D deficiency.',
      seoKeywords: ['Cornfyl D3 60K', 'Vitamin D3 60000 IU', 'nano shot', 'cholecalciferol'],
      detail: {
        mechanism: 'Nano-emulsion droplets of D3 enhance intestinal absorption. Vitamin D3 binds VDR receptors to regulate calcium/phosphorus homeostasis, bone mineralization, and immune function.',
        indications: 'Vitamin D deficiency/insufficiency, osteoporosis prevention, calcium absorption support, immune modulation',
        contraindications: 'Hypercalcemia, hypercalciuria, severe renal impairment.',
        dosage: 'One 5ml shot weekly for 4–8 weeks for therapeutic correction, then maintenance dose as prescribed. Take with or after fat-containing meal.',
        sideEffects: 'Rare at recommended doses. Excess: hypercalcemia, nausea. Monitor serum 25(OH)D and calcium regularly.',
        storage: 'Cool dry place. Protect from light. Ready-to-drink — no preparation needed.',
        sellingPoints: 'Nano-emulsion: 3–4x faster serum D3 response vs conventional capsules. Ready-to-drink format improves compliance. Pleasant flavour. 4-shot pack for complete therapeutic course.',
        faqs: JSON.stringify([
          { question: 'Why nano shot vs regular capsule?', answer: 'Nano-emulsion dramatically increases D3 solubility and absorption, leading to faster deficiency correction.' },
          { question: 'How often to take?', answer: 'Once weekly for 4–8 weeks for deficiency correction, then maintenance as per physician.' },
          { question: 'With water?', answer: 'No — it is a ready-to-drink flavoured nano-shot. Drink directly.' }
        ]),
        doctorFaqs: JSON.stringify([
          { question: 'Nano-emulsion absorption data?', answer: 'Liquid nano-emulsion Vitamin D3 shows faster 25(OH)D rise and higher Cmax vs powder capsules in pharmacokinetic studies.' }
        ]),
        visualAids: [],
        clinicalReferences: 'Grossmann et al. Vitamin D liquid vs capsule. J Clin Endocrinol Metab. Holick et al. Vitamin D deficiency. NEJM.'
      }
    },
    {
      name: 'KONFYL-625', brand: 'KONFYL', composition: 'Amoxicillin 500mg + Potassium Clavulanate 125mg Tablets',
      categoryId: general.id, therapeuticAreaId: antiInfective.id,
      keywords: ['amoxicillin', 'clavulanate', 'antibiotic', 'infection', 'beta-lactamase'],
      seoTitle: 'KONFYL-625 | Amoxicillin 500mg + Clavulanate 125mg | KONFYL Pharmaceutical',
      seoDescription: 'KONFYL-625 broad-spectrum antibiotic tablets combine Amoxicillin 500mg and Potassium Clavulanate 125mg for bacterial infections.',
      seoKeywords: ['KONFYL-625', 'amoxicillin clavulanate', 'antibiotic tablet', 'beta-lactamase inhibitor'],
      detail: {
        mechanism: 'Amoxicillin inhibits bacterial cell wall synthesis. Clavulanate potassium inactivates beta-lactamase enzymes that destroy amoxicillin, restoring broad-spectrum antibacterial activity.',
        indications: 'Acute bacterial sinusitis, community-acquired pneumonia, UTI, skin and soft tissue infections, dental infections, post-operative infections',
        contraindications: 'Penicillin allergy, history of cholestatic jaundice or hepatic dysfunction with amoxicillin/clavulanate.',
        dosage: 'One tablet twice daily at start of meals. Complete full prescribed course even if symptoms resolve.',
        sideEffects: 'Diarrhea, nausea, vomiting. Rare: hepatotoxicity, allergic reaction. Monitor LFTs in long-term use.',
        storage: 'Below 25°C. Keep dry. Away from children.',
        sellingPoints: 'Beta-lactamase resistant — effective against resistant strains. Broad-spectrum gram+/gram- coverage. Well-established tolerability profile. Take with food reduces GI upset.',
        faqs: JSON.stringify([
          { question: 'Why two ingredients?', answer: 'Amoxicillin kills bacteria; Clavulanate prevents bacteria from destroying amoxicillin with beta-lactamase enzymes.' },
          { question: 'Can I stop early?', answer: 'No. Complete the full course to prevent antibiotic resistance.' },
          { question: 'Take with food?', answer: 'Yes, at start of meal to minimize GI upset and improve absorption.' }
        ]),
        doctorFaqs: JSON.stringify([
          { question: 'Beta-lactamase coverage scope?', answer: 'Covers TEM-1, TEM-2, SHV-1 beta-lactamases. Not effective against MRSA or extended-spectrum beta-lactamase producers.' }
        ]),
        visualAids: [],
        clinicalReferences: 'Ball et al. Amoxicillin-clavulanate pharmacology. J Antimicrob Chemother. McNulty et al. Amoxicillin-clavulanate in community infections. BMJ.'
      }
    }
  ];

  // Create all products and their detailed info
  let mrTrainingModuleCount = 0;
  for (const p of productDefs) {
    const { detail, ...productData } = p;
    const productPayload = {
      ...productData,
      slug: productData.slug || slugify(productData.name)
    };
    const product = await prisma.product.upsert({
      where: { name: productPayload.name },
      update: productPayload,
      create: productPayload
    });

    if (detail) {
      await prisma.productDetailedInfo.upsert({
        where: { productId: product.id },
        update: detail,
        create: {
          productId: product.id,
          ...detail
        }
      });
    }
    mrTrainingModuleCount += await seedMrLearningModules({
      product,
      detail,
      categoryName: categoryById.get(productPayload.categoryId) || 'Specialty Medicine',
      therapeuticAreaName: therapeuticAreaById.get(productPayload.therapeuticAreaId) || 'General Healthcare'
    });
    console.log(`  ✅ Product: ${product.name}`);
  }

  console.log('\n✅ All products seeded');
  console.log(`✅ ${mrTrainingModuleCount} MR learning modules seeded`);

  // ─── Blog Posts ─────────────────────────────────────────
  // Create a system author for blog posts
  let systemRole = await prisma.role.findUnique({ where: { id: 'ADMIN' } });
  if (!systemRole) {
    systemRole = await prisma.role.create({
      data: { id: 'ADMIN', name: 'Administrator' }
    });
  }

  let systemAuthor = await prisma.user.findUnique({ where: { email: 'content@konfylpharma.com' } });
  if (!systemAuthor) {
    systemAuthor = await prisma.user.create({
      data: {
        firebaseUid: 'system-content-author',
        email: 'content@konfylpharma.com',
        name: 'Medical Advisory Team, KONFYL',
        roleId: systemRole.id
      }
    });
  }

  const blogs = [
    {
      slug: 'pcos-awareness-hormonal-health',
      title: 'Understanding PCOS: Hormonal Imbalances and Clinical Nutrition Support',
      content: `Polycystic Ovary Syndrome (PCOS) is one of the most common endocrine disorders affecting women of reproductive age. It is characterized by anovulation, hyperandrogenism, and polycystic ovaries visible on ultrasound.

## The Role of Insulin Resistance in PCOS

Insulin resistance is a primary driver of PCOS in over 70% of affected women. Elevated systemic insulin levels stimulate the ovarian theca cells to produce excess testosterone, impairing follicle development.

## Nutritional Interventions: The Inositol Breakthrough

Clinical research has highlighted the effectiveness of specific inositol isomers:
- **Myo-Inositol (MI)**: Promotes glucose uptake, reducing systemic insulin levels and improving FSH signaling.
- **D-Chiro-Inositol (DCI)**: Helps regulate glycogen synthesis and lowers androgen levels.

Studies indicate that maintaining the physiological 40:1 ratio of Myo-Inositol to D-Chiro-Inositol synergistically improves metabolic and reproductive parameters.

## Support Nutrients & Antioxidants

Antioxidants such as Lycopene and Astaxanthin neutralize free radicals, protecting developing follicles. Folic Acid and Vitamin B12 support proper cellular division and prevent neural tube defects.`,
      authorId: systemAuthor.id,
      published: true,
      publishedAt: new Date('2026-07-01')
    },
    {
      slug: 'vitamin-d3-deficiency-bone-mineral-density',
      title: 'Vitamin D3 Deficiency: Signs, Risks, and Nano-Emulsion Correction Strategy',
      content: `Vitamin D3 (Cholecalciferol) acts as a vital hormone regulating calcium homeostasis, bone mineralization, immune function, and neuromuscular performance. Despite abundant sunlight, Vitamin D3 deficiency affects over 70% of India's population.

## Clinical Signs of Deficiency

Muscle weakness, bone pain, fatigue, frequent infections, depression, and impaired wound healing. Serum 25(OH)D below 20 ng/mL indicates deficiency; 20–30 ng/mL indicates insufficiency.

## Impact on Bone Health

Chronic deficiency leads to impaired calcium absorption, secondary hyperparathyroidism, and accelerated bone resorption — increasing fracture risk by up to 40% in osteoporotic populations.

## Why Nano-Emulsion is Superior

Standard Vitamin D3 capsules have variable absorption affected by fat content and GI health. Nano-emulsion technology reduces droplet size to < 200nm, dramatically increasing surface area and intestinal absorption efficiency — achieving 3–4x faster serum 25(OH)D response.`,
      authorId: systemAuthor.id,
      published: true,
      publishedAt: new Date('2026-06-25')
    },
    {
      slug: 'male-fertility-sperm-health-nutrition',
      title: 'Male Fertility and Sperm Health: The Role of CoQ10 and L-Carnitine',
      content: `Male infertility contributes to approximately 50% of all infertility cases, yet it remains significantly underdiagnosed. Oxidative stress is a primary culprit, damaging sperm DNA, membrane integrity, and motility.

## Oxidative Stress and Sperm Damage

Reactive Oxygen Species (ROS) cause lipid peroxidation of sperm membranes, DNA fragmentation, and mitochondrial dysfunction — directly impairing sperm count, motility (asthenozoospermia), and morphology (teratozoospermia).

## Co-Enzyme Q10: The Mitochondrial Fuel

CoQ10 is concentrated in the mitochondria of sperm midpieces — the engine room for ATP production that powers sperm swimming. Low testicular CoQ10 directly correlates with poor sperm motility.

## L-Carnitine: The Transport System

L-Carnitine transports long-chain fatty acids into mitochondria for energy production. It is present in very high concentrations in the epididymis, where sperm undergo final maturation and gain motility.

## Evidence-Based Supplementation

A minimum 3-month supplementation course with L-Carnitine + CoQ10 covers one complete spermatogenesis cycle (~74 days). Clinical studies show a 15–20% improvement in progressive sperm motility and a 10–15% increase in pregnancy rates.`,
      authorId: systemAuthor.id,
      published: true,
      publishedAt: new Date('2026-06-18')
    }
  ];

  for (const blog of blogs) {
    await prisma.blog.upsert({
      where: { slug: blog.slug },
      update: {},
      create: blog
    });
    console.log(`  ✅ Blog: ${blog.title}`);
  }

  console.log('\n🎉 KONFYL database seed complete!');
  console.log(`   ✅ ${productDefs.length} products`);
  console.log(`   ✅ ${mrTrainingModuleCount} MR learning modules`);
  console.log(`   ✅ ${blogs.length} blog posts`);
  console.log('   ✅ 4 categories');
  console.log('   ✅ 8 therapeutic areas');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
