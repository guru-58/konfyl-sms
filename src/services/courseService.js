import { getProductById } from './productService.js';
import prisma from '../config/database.js';

/**
 * @typedef {Object} CourseBlock
 * @property {string} type Render hint for LMS clients, e.g. heading, paragraph, timeline, table, quiz.
 */

const splitList = value => String(value || '')
  .split(',')
  .map(item => item.trim())
  .filter(Boolean);

const parseTrainingModuleContent = trainingModule => {
  try {
    const parsed = JSON.parse(trainingModule.content);
    return {
      id: parsed.id || trainingModule.id,
      title: parsed.title || trainingModule.title,
      description: parsed.description || trainingModule.description,
      order: parsed.order || 999,
      estimatedTime: parsed.estimatedTime || trainingModule.estimatedTime,
      lessons: Array.isArray(parsed.lessons) ? parsed.lessons : []
    };
  } catch {
    return null;
  }
};

const getDbCourseModules = product => (product.trainingModules || [])
  .map(parseTrainingModuleContent)
  .filter(Boolean)
  .sort((first, second) => first.order - second.order);

const fallbackInfo = product => ({
  indications: product.detailedInfo?.indications || 'General clinical conditions requiring therapy.',
  mechanism: product.detailedInfo?.mechanism || 'Pharmacological path of target receptor binding and systemic absorption.',
  contraindications: product.detailedInfo?.contraindications || 'Known hypersensitivity to any of the active ingredients.',
  dosage: product.detailedInfo?.dosage || 'Take as directed by your physician.',
  sideEffects: product.detailedInfo?.sideEffects || 'Mild gastrointestinal discomfort or headache in rare cases.',
  storage: product.detailedInfo?.storage || 'Store in a cool, dry place away from direct sunlight.',
  sellingPoints: product.detailedInfo?.sellingPoints || 'WHO-GMP certified, high efficacy and safety profile.',
  clinicalReferences: product.detailedInfo?.clinicalReferences || 'Data on file. Supported by clinical literature and physician-guided use.'
});

const buildLegacyModules = (product, info) => [
  {
    id: 'intro',
    title: '1. Introduction',
    icon: 'Info',
    description: `Get introduced to ${product.name}, its medical class, and clinical overview.`,
    content: {
      name: product.name,
      brand: product.brand,
      composition: product.composition,
      categoryName: product.category?.name || 'Specialty Medicine',
      therapeuticArea: product.therapeuticArea?.name || 'General Healthcare',
      overview: `**${product.name}** contains **${product.composition}**. It is a premier formulation developed to address key concerns in **${product.therapeuticArea?.name || 'modern clinical medicine'}**. This module reviews its clinical relevance, drug class properties, and core therapeutic objectives.`
    }
  },
  {
    id: 'disease',
    title: '2. Disease Basics',
    icon: 'BookOpen',
    description: 'Understand the underlying clinical condition and symptoms.',
    content: {
      indications: info.indications,
      patientProfile: `Typically indicated for patients experiencing conditions categorized under ${product.therapeuticArea?.name || 'specialist care'}. Diagnosis usually presents with primary symptoms managed through targeted hormonal or metabolic intervention.`
    }
  },
  {
    id: 'pathophysiology',
    title: '3. Pathophysiology',
    icon: 'Activity',
    description: 'Learn how the condition affects the patient body at a cellular level.',
    content: {
      details: `In patients presenting with these indications, the pathophysiology involves cellular disruptions or target hormonal deficiencies. Progestogen, steroid hormone, or biochemical imbalances impair normal receptor stimulation, leading to symptoms. Administering ${product.name} restores receptor affinity and regulates normal endocrine or metabolic pathways.`
    }
  },
  {
    id: 'mechanism',
    title: '4. Mechanism of Action',
    icon: 'GitCommit',
    description: 'Discover how the active composition works inside the body.',
    content: {
      mechanism: info.mechanism,
      steps: [
        { title: 'Oral/Local Absorption', description: `Active molecules of ${product.composition} enter systemic circulation with high bioavailability.` },
        { title: 'Receptor Binding', description: 'Selective affinity binding to target receptors or biochemical pathways.' },
        { title: 'Therapeutic Action', description: 'Triggers targeted physiological support and symptom relief.' },
        { title: 'Clinical Stabilization', description: 'Supports measurable improvement under physician supervision.' }
      ]
    }
  },
  {
    id: 'specs',
    title: '5. Product Specifications',
    icon: 'Sliders',
    description: 'Technical specs, pack sizes, shelf life, and storage.',
    content: {
      composition: product.composition,
      brand: product.brand,
      storage: info.storage,
      sellingPoints: info.sellingPoints
    }
  },
  {
    id: 'indications',
    title: '6. Therapeutic Indications',
    icon: 'Heart',
    description: 'Approved clinical conditions and usage guidelines.',
    content: {
      list: splitList(info.indications),
      overview: `Approved for target clinical therapies requiring premium ${product.category?.name || 'healthcare'} interventions.`
    }
  },
  {
    id: 'dosage',
    title: '7. Dosage & Administration',
    icon: 'Clock',
    description: 'Dosing schedules, administration guidelines, and missed doses.',
    content: {
      dosage: info.dosage,
      administration: 'To be used only as directed by a registered medical practitioner.'
    }
  },
  {
    id: 'safety',
    title: '8. Contraindications & Safety',
    icon: 'ShieldAlert',
    description: 'Contraindications, side effects, and warnings.',
    content: {
      contraindications: info.contraindications,
      sideEffects: info.sideEffects
    }
  },
  {
    id: 'evidence',
    title: '9. Clinical Evidence',
    icon: 'TrendingUp',
    description: 'Key clinical studies, references, and trials.',
    content: {
      references: info.clinicalReferences
    }
  },
  {
    id: 'competitors',
    title: '10. Competitor Comparison',
    icon: 'Users',
    description: 'Detailed analysis of competitor brands in the market.',
    content: {
      competitors: (product.competitors || []).map(c => ({
        brand: c.name,
        manufacturer: c.manufacturer,
        composition: c.composition,
        strength: c.strength,
        price: c.price,
        notes: c.comparisonNotes
      }))
    }
  },
  {
    id: 'detailing',
    title: '11. Doctor Detailing Pitch',
    icon: 'MessageSquare',
    description: 'Suggested conversational flow to pitch the product.',
    content: {
      pitch: [
        { role: 'MR', text: `Good morning Doctor. Today I would like to introduce **${product.name}**, containing **${product.composition}**.` },
        { role: 'Doctor', text: 'What makes your brand different from standard competitor formulations?' },
        { role: 'MR', text: `Doctor, ${product.name} is positioned around quality manufacturing, clear clinical fit, and practical patient compliance.` }
      ]
    }
  },
  {
    id: 'journey',
    title: '12. Patient Journey',
    icon: 'Milestone',
    description: 'Patient experience timeline from symptoms to clinical outcome.',
    content: {
      timeline: [
        { step: 1, title: 'Onset of Symptoms', description: 'Patient experiences category-specific symptoms or clinical concerns.' },
        { step: 2, title: 'Physician Consultation', description: 'Doctor evaluates history, diagnostics, and therapeutic suitability.' },
        { step: 3, title: 'Initiating Therapy', description: `Patient is prescribed ${product.name} as per clinical judgement.` },
        { step: 4, title: 'Follow-up Outcome', description: 'Doctor monitors response, tolerability, and adherence.' }
      ]
    }
  },
  {
    id: 'cases',
    title: '13. Clinical Case Studies',
    icon: 'FolderOpen',
    description: 'Practical clinical scenarios and case analyses.',
    content: {
      scenario: `A patient presents with a history related to ${product.name}'s main indications. Clinical review identifies a need for therapy in ${product.therapeuticArea?.name || 'the relevant therapeutic area'}. Initiating ${product.name} under supervision supports structured patient management and follow-up.`
    }
  },
  {
    id: 'visuals',
    title: '14. Visual Learning Aids',
    icon: 'Eye',
    description: 'Educational vector illustrations and anatomy cards.',
    content: {
      diagramType: product.category?.name === "Women's Wellness" ? 'HormoneCycle' : 'CellTargeting',
      labels: ['Clinical Need', 'Product Fit', 'Therapy Start', 'Follow-up']
    }
  },
  {
    id: 'videos',
    title: '15. Training Videos',
    icon: 'Video',
    description: 'Watch visual detailing lectures and video guides.',
    content: {
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      title: `${product.name} Detailing Video Course`,
      duration: '5:00'
    }
  },
  {
    id: 'quiz',
    title: '16. Course Assessment Quiz',
    icon: 'Award',
    description: 'Test your understanding and unlock your certificate.',
    content: {
      questions: buildQuizQuestions(product, info)
    }
  },
  {
    id: 'ai-coach',
    title: '17. AI Detailing Coach',
    icon: 'Cpu',
    description: 'Practice detailing the product dynamically with AI.',
    content: {
      welcomeMessage: `Welcome! I am your AI Coach. Ask me anything about ${product.name}, including indications, mechanism, safety, and selling points.`
    }
  },
  {
    id: 'certificate',
    title: '18. Qualification Certificate',
    icon: 'FileText',
    description: 'Download your certified product specialist badge.',
    content: {
      certName: `${product.name} Product Specialist Certification`,
      signatureLeft: 'Medical Director',
      signatureRight: 'HR Operations'
    }
  }
];

const buildQuizQuestions = (product, info) => [
  {
    question: `What is the active composition of ${product.name}?`,
    options: [product.composition, 'Placebo formulation', 'Generic multivitamin', 'Amlodipine 5mg'],
    answer: 0,
    correctOptionIndex: 0,
    rational: `${product.name} contains ${product.composition} as its active pharmaceutical ingredient.`,
    rationale: `${product.name} contains ${product.composition} as its active pharmaceutical ingredient.`
  },
  {
    question: `Which therapeutic category is ${product.name} classified under?`,
    options: ['Oncology', product.category?.name || 'General Specialty', 'Anesthetics', 'Opioids'],
    answer: 1,
    correctOptionIndex: 1,
    rational: `Based on clinical specifications, ${product.name} belongs to the ${product.category?.name || 'general specialty'} department.`,
    rationale: `Based on clinical specifications, ${product.name} belongs to the ${product.category?.name || 'general specialty'} department.`
  },
  {
    question: `What is the recommended storage guideline for ${product.name}?`,
    options: ['Store at boiling temperatures', 'Freeze in liquid nitrogen', info.storage, 'Keep wet outdoors'],
    answer: 2,
    correctOptionIndex: 2,
    rational: 'Standard pharmaceutical safety guidelines require storing medicines in appropriate dry, temperature-controlled conditions.',
    rationale: 'Standard pharmaceutical safety guidelines require storing medicines in appropriate dry, temperature-controlled conditions.'
  }
];

const buildCourseModules = (product, info, legacyModules) => {
  const indications = splitList(info.indications);
  const competitors = legacyModules.find(module => module.id === 'competitors')?.content.competitors || [];
  const timeline = legacyModules.find(module => module.id === 'journey')?.content.timeline || [];
  const mechanismSteps = legacyModules.find(module => module.id === 'mechanism')?.content.steps || [];
  const quizQuestions = buildQuizQuestions(product, info);

  return [
    {
      id: 'foundation',
      title: 'Product Foundation',
      description: `Build a confident clinical introduction for ${product.name}.`,
      order: 1,
      estimatedTime: 18,
      lessons: [
        {
          id: 'foundation-overview',
          title: 'Brand, Composition and Positioning',
          order: 1,
          estimatedTime: 8,
          blocks: [
            { type: 'heading', text: `${product.name} Product Overview` },
            { type: 'paragraph', text: `${product.name} contains ${product.composition}. It belongs to ${product.category?.name || 'Specialty Medicine'} and supports care in ${product.therapeuticArea?.name || 'General Healthcare'}.` },
            {
              type: 'table',
              caption: 'Product snapshot',
              columns: ['Field', 'Details'],
              rows: [
                ['Brand', product.brand],
                ['Composition', product.composition],
                ['Category', product.category?.name || 'Specialty Medicine'],
                ['Therapeutic Area', product.therapeuticArea?.name || 'General Healthcare']
              ]
            },
            { type: 'keyTakeaways', items: [product.composition, product.category?.name || 'Specialty Medicine', info.sellingPoints] }
          ]
        },
        {
          id: 'foundation-indications',
          title: 'Therapeutic Indications',
          order: 2,
          estimatedTime: 10,
          blocks: [
            { type: 'heading', text: 'Where the Product Fits' },
            { type: 'paragraph', text: `Use this lesson to connect ${product.name} with relevant patient needs and physician conversations.` },
            { type: 'clinicalTip', title: 'Detailing tip', text: 'Lead with the clinical problem before introducing brand differentiation.' },
            { type: 'list', title: 'Indications', items: indications.length ? indications : ['Physician-guided specialty therapy'] },
            { type: 'warning', title: 'Responsible communication', text: 'All prescription discussions must remain aligned with approved use and physician judgement.' }
          ]
        }
      ]
    },
    {
      id: 'clinical-science',
      title: 'Clinical Science',
      description: 'Understand mechanism, patient journey, safety, and evidence.',
      order: 2,
      estimatedTime: 28,
      lessons: [
        {
          id: 'clinical-mechanism',
          title: 'Mechanism of Action',
          order: 1,
          estimatedTime: 10,
          blocks: [
            { type: 'heading', text: 'How It Works' },
            { type: 'paragraph', text: info.mechanism },
            { type: 'flowchart', title: 'Therapeutic flow', steps: mechanismSteps },
            { type: 'animation', title: 'Mechanism sequence', frames: mechanismSteps.map((step, index) => ({ order: index + 1, label: step.title, text: step.description })) },
            {
              type: 'svg',
              title: 'Conceptual pathway',
              variant: product.category?.name === "Women's Wellness" ? 'hormone-cycle' : 'cell-targeting',
              labels: mechanismSteps.map(step => step.title)
            }
          ]
        },
        {
          id: 'clinical-safety',
          title: 'Dosage, Safety and Follow-up',
          order: 2,
          estimatedTime: 9,
          blocks: [
            { type: 'heading', text: 'Administration and Safety' },
            { type: 'clinicalTip', title: 'Dosage', text: info.dosage },
            { type: 'warning', title: 'Contraindications', text: info.contraindications },
            { type: 'paragraph', text: `Common safety considerations: ${info.sideEffects}` },
            { type: 'paragraph', text: `Storage: ${info.storage}` }
          ]
        },
        {
          id: 'clinical-journey',
          title: 'Patient Journey and Evidence',
          order: 3,
          estimatedTime: 9,
          blocks: [
            { type: 'timeline', title: 'Patient journey', items: timeline },
            { type: 'reference', title: 'Clinical references', items: splitReferences(info.clinicalReferences) },
            { type: 'image', title: 'Visual learning aid', alt: `${product.name} visual aid`, src: product.detailedInfo?.visualAids?.[0] || null, fallback: 'Use an approved visual aid from the product library.' }
          ]
        }
      ]
    },
    {
      id: 'field-detailing',
      title: 'MR Detailing Practice',
      description: 'Convert product knowledge into confident doctor communication.',
      order: 3,
      estimatedTime: 24,
      lessons: [
        {
          id: 'detailing-conversation',
          title: 'Doctor Conversation',
          order: 1,
          estimatedTime: 8,
          blocks: [
            { type: 'heading', text: 'Suggested Conversation Flow' },
            {
              type: 'doctorConversation',
              messages: legacyModules.find(module => module.id === 'detailing')?.content.pitch || []
            },
            { type: 'clinicalTip', title: 'MR coach note', text: 'Ask a short diagnostic question before presenting the product message.' }
          ]
        },
        {
          id: 'detailing-case-study',
          title: 'Case Study Practice',
          order: 2,
          estimatedTime: 8,
          blocks: [
            {
              type: 'caseStudy',
              title: `${product.name} clinical scenario`,
              scenario: legacyModules.find(module => module.id === 'cases')?.content.scenario,
              discussionPoints: [
                'Identify the patient need.',
                'Map the product to the clinical objective.',
                'Plan a safe follow-up conversation.'
              ]
            }
          ]
        },
        {
          id: 'detailing-competitors',
          title: 'Competitor and Objection Handling',
          order: 3,
          estimatedTime: 8,
          blocks: [
            { type: 'heading', text: 'Comparison Readiness' },
            {
              type: 'table',
              caption: 'Competitor comparison',
              columns: ['Brand', 'Manufacturer', 'Composition', 'Notes'],
              rows: competitors.map(item => [item.brand, item.manufacturer, item.composition, item.notes])
            },
            { type: 'keyTakeaways', items: ['Stay evidence-led.', 'Avoid unsupported superiority claims.', 'Anchor responses in composition, quality, and patient suitability.'] }
          ]
        }
      ]
    },
    {
      id: 'assessment',
      title: 'Assessment and Certification',
      description: 'Complete quiz, practice with AI coach, and unlock certification.',
      order: 4,
      estimatedTime: 15,
      lessons: [
        {
          id: 'assessment-video',
          title: 'Video and Review Assets',
          order: 1,
          estimatedTime: 5,
          blocks: [
            { type: 'video', title: `${product.name} Detailing Video Course`, url: 'https://www.w3schools.com/html/mov_bbb.mp4', duration: '5:00' },
            { type: 'download', title: `${product.name} detailer checklist`, fileName: `${product.name}-detailing-checklist.pdf`, url: null, availability: 'coming-soon' }
          ]
        },
        {
          id: 'assessment-quiz',
          title: 'Course Quiz',
          order: 2,
          estimatedTime: 7,
          blocks: [
            { type: 'quiz', passingScore: 80, questions: quizQuestions }
          ]
        },
        {
          id: 'assessment-certificate',
          title: 'AI Coach and Certificate',
          order: 3,
          estimatedTime: 3,
          blocks: [
            { type: 'paragraph', text: `Use the AI coach to practice ${product.name} indications, mechanism, safety, and objection handling.` },
            { type: 'download', title: `${product.name} Product Specialist Certificate`, fileName: `${product.name}-certificate.pdf`, url: null, availability: 'after-passing-quiz' }
          ]
        }
      ]
    }
  ];
};

const splitReferences = value => String(value || '')
  .split(/\.\s+/)
  .map(item => item.trim())
  .filter(Boolean)
  .map(item => item.endsWith('.') ? item : `${item}.`);

const buildCourse = (product, info, legacyModules) => {
  const dbCourseModules = getDbCourseModules(product);
  const courseModules = dbCourseModules.length ? dbCourseModules : buildCourseModules(product, info, legacyModules);
  const totalLessons = courseModules.reduce((total, module) => total + module.lessons.length, 0);
  const estimatedDuration = courseModules.reduce((total, module) => total + module.estimatedTime, 0);

  return {
    id: `course-${product.id}`,
    productId: product.id,
    title: `${product.name} Product Specialist Course`,
    subtitle: `Structured LMS training for Medical Representatives on ${product.name}.`,
    level: 'Field-ready',
    estimatedDuration,
    progress: {
      completedLessons: 0,
      totalLessons,
      percent: 0
    },
    hero: {
      eyebrow: 'MR Academy',
      title: `${product.name} Product Specialist Course`,
      description: `Learn composition, indications, mechanism, safety, detailing conversations, case practice, and assessment for ${product.name}.`,
      badges: [
        product.category?.name || 'Specialty Medicine',
        product.therapeuticArea?.name || 'General Healthcare',
        `${totalLessons} lessons`
      ]
    },
    modules: courseModules
  };
};

export const buildProductCourse = async productId => {
  const product = await getProductById(productId);
  if (!product) return null;

  // Check if a dynamic Course exists in the database
  const dbCourse = await prisma.course.findUnique({
    where: { productId },
    include: {
      modules: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' },
            include: {
              blocks: { orderBy: { order: 'asc' } },
              references: true
            }
          }
        }
      }
    }
  });

  if (dbCourse) {
    return {
      productId: product.id,
      productName: product.name,
      composition: product.composition,
      category: product.category?.name,
      course: dbCourse,
      isDynamicLms: true
    };
  }

  const info = fallbackInfo(product);
  const modules = buildLegacyModules(product, info);

  return {
    productId: product.id,
    productName: product.name,
    composition: product.composition,
    category: product.category?.name,
    course: buildCourse(product, info, modules),
    modules
  };
};
