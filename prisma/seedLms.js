import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('📚 Seeding Dynamic LMS Course data for Dydrofact 10...');

  // 1. Fetch Dydrofact 10 product
  const product = await prisma.product.findUnique({
    where: { name: 'Dydrofact 10' }
  });

  if (!product) {
    console.error('❌ Dydrofact 10 product not found in database. Run central seed first.');
    process.exit(1);
  }

  // 2. Delete existing Course to allow fresh seed re-runs
  await prisma.course.deleteMany({
    where: { productId: product.id }
  });

  // 3. Create rich nested course structure
  const course = await prisma.course.create({
    data: {
      productId: product.id,
      title: 'Dydrofact 10 Specialist Certification Course',
      description: 'The master training syllabus for medical representatives to build absolute clinical detailing confidence for Dydrogesterone 10mg Tablets.',
      estimatedDuration: 120,
      modules: {
        create: [
          {
            title: '1. Introduction',
            description: 'Core brand introduction, target audience, and course objectives.',
            order: 1,
            lessons: {
              create: [
                {
                  title: 'Brand and Molecule Overview',
                  description: 'Introduction to Dydrofact 10 and generic Dydrogesterone.',
                  order: 1,
                  estimatedTime: 8,
                  blocks: {
                    create: [
                      {
                        type: 'heading',
                        order: 1,
                        content: { text: 'What is Dydrofact 10?' }
                      },
                      {
                        type: 'paragraph',
                        order: 2,
                        content: { text: 'Dydrofact 10 is KONFYL\'s premium formulation of Dydrogesterone 10mg. It is an orally active progestogen molecularly related to natural progesterone, developed to treat progesterone deficiency conditions.' }
                      },
                      {
                        type: 'remember',
                        order: 3,
                        content: { text: 'Key Fact: Dydrogesterone is a retro-progesterone, meaning it is a stereoisomer of natural progesterone with a modified structure that yields high oral stability.' }
                      },
                      {
                        type: 'keyPoint',
                        order: 4,
                        content: { text: 'Target Prescribers: Primarily Gynecologists, Infertility Specialists, and Obstetricians.' }
                      }
                    ]
                  }
                }
              ]
            }
          },
          {
            title: '2. Female Reproductive Physiology',
            description: 'Comprehensive study of female reproductive anatomy, uterine lining, and hormonal cycle.',
            order: 2,
            lessons: {
              create: [
                {
                  title: 'Anatomy and the Endometrial Cycle',
                  description: 'Learn reproductive anatomy and menstrual phases from scratch.',
                  order: 1,
                  estimatedTime: 12,
                  blocks: {
                    create: [
                      {
                        type: 'heading',
                        order: 1,
                        content: { text: 'Female Reproductive Physiology' }
                      },
                      {
                        type: 'paragraph',
                        order: 2,
                        content: { text: 'The female reproductive system undergoes a tightly regulated cycle to prepare for pregnancy. The endometrium (uterine lining) grows under estrogen and undergoes secretory transformation under progesterone.' }
                      },
                      {
                        type: 'svg',
                        order: 3,
                        content: {
                          title: 'Endometrial Uterine Cycle Chart',
                          svgContent: '<svg viewBox="0 0 100 40" width="100%"><path d="M 0 30 Q 30 10 50 15 T 100 35" fill="none" stroke="#e91e63" stroke-width="2"/><text x="50" y="8" font-size="4" fill="#e91e63" text-anchor="middle">Luteal Phase Secretory Peak</text></svg>'
                        }
                      },
                      {
                        type: 'clinicalTip',
                        order: 4,
                        content: { title: 'Physiology Pearl', text: 'Without sufficient progesterone during the luteal phase, the endometrium cannot support blastocyst implantation, leading to early pregnancy loss.' }
                      }
                    ]
                  }
                }
              ]
            }
          },
          {
            title: '3. Disease Basics',
            description: 'Progesterone deficiency clinical conditions.',
            order: 3,
            lessons: {
              create: [
                {
                  title: 'Luteal Phase Defect & Infertility',
                  description: 'Clinical understanding of infertility, PMS, and miscarriages.',
                  order: 1,
                  estimatedTime: 10,
                  blocks: {
                    create: [
                      {
                        type: 'heading',
                        order: 1,
                        content: { text: 'Clinical Conditions Treated by Progesterone' }
                      },
                      {
                        type: 'paragraph',
                        order: 2,
                        content: { text: 'Deficient luteal progesterone causes Luteal Phase Defect (LPD), leading to: Infertility, Threatened Abortion (early bleeding), Habitual Abortion (recurrent losses), Premenstrual Syndrome (PMS), and Endometriosis.' }
                      },
                      {
                        type: 'warning',
                        order: 3,
                        content: { title: 'Prescribing Warning', text: 'Prescribe only when diagnostic tests confirm deficiency or clinical symptoms indicate history of luteal support failure.' }
                      }
                    ]
                  }
                }
              ]
            }
          },
          {
            title: '4. Pathophysiology',
            description: 'Disease progression from hormonal imbalance to clinical miscarriage.',
            order: 4,
            lessons: {
              create: [
                {
                  title: 'Pathway of Endometrial Instability',
                  description: 'Step-by-step pathophysiological timeline.',
                  order: 1,
                  estimatedTime: 9,
                  blocks: {
                    create: [
                      {
                        type: 'heading',
                        order: 1,
                        content: { text: 'Uterine Defect Pathway' }
                      },
                      {
                        type: 'timeline',
                        order: 2,
                        content: {
                          steps: [
                            { title: '1. Hormonal Imbalance', desc: 'Inadequate LH surge or corpus luteum failure.' },
                            { title: '2. Progesterone Deficiency', desc: 'Sub-optimal serum progesterone levels.' },
                            { title: '3. Endometrial Instability', desc: 'Uterine lining fails to mature or shed prematurely.' },
                            { title: '4. Implantation Failure', desc: 'Blastocyst cannot dock safely onto maternal blood supply.' },
                            { title: '5. Clinical Miscarriage', desc: 'Vaginal bleeding or recurrent pregnancy loss.' }
                          ]
                        }
                      }
                    ]
                  }
                }
              ]
            }
          },
          {
            title: '5. Mechanism of Action',
            description: 'Detailed interactive binding of Dydrogesterone to progesterone receptors.',
            order: 5,
            lessons: {
              create: [
                {
                  title: 'Selectivity and Uterine Binding',
                  description: 'Understand the molecular retro-isomer action of Dydrogesterone.',
                  order: 1,
                  estimatedTime: 10,
                  blocks: {
                    create: [
                      {
                        type: 'heading',
                        order: 1,
                        content: { text: 'Receptor Level Selective Stimulation' }
                      },
                      {
                        type: 'paragraph',
                        order: 2,
                        content: { text: 'Dydrogesterone binds selectively to Progesterone Receptors (PR-A and PR-B). Due to its retro-isomer shape, it does not bind to androgenic, estrogenic, or mineralocorticoid receptors, avoiding secondary side effects like weight gain or facial hair growth.' }
                      },
                      {
                        type: 'animation',
                        order: 3,
                        content: {
                          title: 'Interactive MoA Player',
                          steps: [
                            { step: 1, title: 'Tablet Ingestion', desc: 'Pill swallowed orally.' },
                            { step: 2, title: 'GI Absorption', desc: 'Rapid absorption in the gastrointestinal tract.' },
                            { step: 3, title: 'Blood Circulation', desc: 'Metabolized to active 20-alpha metabolite.' },
                            { step: 4, title: 'Receptor Binding', desc: 'Docking selectively in the uterine PR pocket.' },
                            { step: 5, title: 'Secretory Transformation', desc: 'Uterine lining matures to support pregnancy.' }
                          ]
                        }
                      }
                    ]
                  }
                }
              ]
            }
          },
          {
            title: '6. Pharmacology',
            description: 'Pharmacodynamics and pharmacokinetics data.',
            order: 6,
            lessons: {
              create: [
                {
                  title: 'Pharmacokinetic profile parameters',
                  description: 'Learn half-life, bioavailability, and clinical metabolism.',
                  order: 1,
                  estimatedTime: 8,
                  blocks: {
                    create: [
                      {
                        type: 'heading',
                        order: 1,
                        content: { text: 'Clinical Pharmacokinetics' }
                      },
                      {
                        type: 'table',
                        order: 2,
                        content: {
                          columns: ['Parameter', 'Value', 'Clinical Relevance'],
                          rows: [
                            ['Oral Bioavailability', 'High (relative to natural)', 'Allows smaller dosage levels.'],
                            ['Half-life (T1/2)', '18 Hours', 'Maintains stable blood concentration levels.'],
                            ['Active Metabolite', 'DHD (20a-dihydrodydrogesterone)', 'Extends duration of action.'],
                            ['Excretion', 'Renal (60-8% excreted in urine)', 'Safe hepatic profile.']
                          ]
                        }
                      }
                    ]
                  }
                }
              ]
            }
          },
          {
            title: '7. Product Details',
            description: 'Composition, strength, shelf life, and key selling points.',
            order: 7,
            lessons: {
              create: [
                {
                  title: 'Dydrofact 10 specifications',
                  description: 'Packaging, shelf life, and strengths.',
                  order: 1,
                  estimatedTime: 5,
                  blocks: {
                    create: [
                      {
                        type: 'heading',
                        order: 1,
                        content: { text: 'Product Snapshot & KSPs' }
                      },
                      {
                        type: 'table',
                        order: 2,
                        content: {
                          columns: ['Specification', 'Value'],
                          rows: [
                            ['Composition', 'Dydrogesterone 10mg Tablets'],
                            ['Form', 'Film Coated Tablets'],
                            ['Packaging', '10 x 10 Blister Pack'],
                            ['Shelf Life', '24 Months'],
                            ['Storage', 'Store below 30°C. Protect from moisture.']
                          ]
                        }
                      }
                    ]
                  }
                }
              ]
            }
          },
          {
            title: '8. Therapeutic Indications',
            description: 'Detailed prescribing cycles and clinical targets.',
            order: 8,
            lessons: {
              create: [
                {
                  title: 'Prescribing cycles and indications',
                  description: 'Approved clinical list.',
                  order: 1,
                  estimatedTime: 10,
                  blocks: {
                    create: [
                      {
                        type: 'heading',
                        order: 1,
                        content: { text: 'Target Prescribing Indications' }
                      },
                      {
                        type: 'list',
                        order: 2,
                        content: {
                          title: 'Indications List',
                          items: [
                            'Female Infertility due to luteal insufficiency.',
                            'Threatened Miscarriage (acute early bleeding).',
                            'Habitual Miscarriage (history of recurrent losses).',
                            'Premenstrual Syndrome (PMS).',
                            'Endometriosis and Dysmenorrhea.'
                          ]
                        }
                      }
                    ]
                  }
                }
              ]
            }
          },
          {
            title: '9. Dosage & Administration',
            description: 'Target dosing cycles per indication.',
            order: 9,
            lessons: {
              create: [
                {
                  title: 'Prescribing dosage guide',
                  description: 'Indication-wise dose requirements.',
                  order: 1,
                  estimatedTime: 7,
                  blocks: {
                    create: [
                      {
                        type: 'heading',
                        order: 1,
                        content: { text: 'Clinical Dosing Matrix' }
                      },
                      {
                        type: 'table',
                        order: 2,
                        content: {
                          columns: ['Indication', 'Standard Dosage', 'Target Treatment Cycle'],
                          rows: [
                            ['Infertility', '10mg daily', 'Days 11 to 25 of the menstrual cycle, for at least 6 cycles.'],
                            ['Threatened Abortion', '40mg stat dose', 'Then 10mg every 8 hours until symptoms remit.'],
                            ['Habitual Abortion', '10mg twice daily', 'Until week 20 of pregnancy.'],
                            ['Endometriosis', '10mg 2-3 times daily', 'Days 5 to 25 of cycle or continuously.']
                          ]
                        }
                      }
                    ]
                  }
                }
              ]
            }
          },
          {
            title: '10. Contraindications & Safety',
            description: 'Patient warnings and contraindications.',
            order: 10,
            lessons: {
              create: [
                {
                  title: 'Safety profile and precautions',
                  description: 'Warning labels.',
                  order: 1,
                  estimatedTime: 7,
                  blocks: {
                    create: [
                      {
                        type: 'heading',
                        order: 1,
                        content: { text: 'Prescribing Contraindications' }
                      },
                      {
                        type: 'warning',
                        order: 2,
                        content: { title: 'Contraindications', text: 'Do not prescribe in cases of undiagnosed vaginal bleeding, severe liver dysfunction, history of arterial thromboembolism, or hormone-dependent neoplasms.' }
                      }
                    ]
                  }
                }
              ]
            }
          },
          {
            title: '11. Clinical Evidence',
            description: 'Major R&D clinical trials and scientific publications.',
            order: 11,
            lessons: {
              create: [
                {
                  title: 'LOTUS Clinical Trials',
                  description: 'Read the double-blind trials establishing efficacy.',
                  order: 1,
                  estimatedTime: 10,
                  blocks: {
                    create: [
                      {
                        type: 'heading',
                        order: 1,
                        content: { text: 'Key Trials: LOTUS I & LOTUS II' }
                      },
                      {
                        type: 'timeline',
                        order: 2,
                        content: {
                          steps: [
                            { title: 'LOTUS I Trial (2017)', desc: 'Phase III RCT comparing oral dydrogesterone to vaginal progesterone gel. Proved equivalent pregnancy outcomes in IVF support.' },
                            { title: 'LOTUS II Trial (2018)', desc: 'Multi-center trial confirming comparable live birth rates and excellent maternal/fetal safety profiles.' }
                          ]
                        }
                      }
                    ]
                  }
                }
              ]
            }
          },
          {
            title: '12. Competitor Comparison',
            description: 'Factual matrices comparing Dydrogesterone vs Micronized Progesterone.',
            order: 12,
            lessons: {
              create: [
                {
                  title: 'Natural Micronised vs Retro-Progesterone',
                  description: 'Differentiate Dydrogesterone from competitive alternatives.',
                  order: 1,
                  estimatedTime: 8,
                  blocks: {
                    create: [
                      {
                        type: 'heading',
                        order: 1,
                        content: { text: 'Composition Comparison Matrix' }
                      },
                      {
                        type: 'comparison',
                        order: 2,
                        content: {
                          headers: ['Feature', 'Dydrofact 10', 'Natural Micronised Progesterone'],
                          rows: [
                            ['Active Molecule', 'Dydrogesterone (Retro-isomer)', 'Progesterone (identical to endogenous)'],
                            ['Administration', 'Oral (High Bioavailability)', 'Vaginal / Rectal (due to poor oral absorption)'],
                            ['Receptor Selectivity', 'Highly specific for PR-A/B', 'Binds additionally to androgenic/sedative receptors'],
                            ['Therapeutic Adherence', 'High (easy oral pill)', 'Low (messy vaginal capsules/injections)']
                          ]
                        }
                      }
                    ]
                  }
                }
              ]
            }
          },
          {
            title: '13. Doctor Detailing',
            description: 'Interactive conversation scripts for handling OB/Gyn objections.',
            order: 13,
            lessons: {
              create: [
                {
                  title: 'Objection Handling detailing scenarios',
                  description: 'Suggested detailing conversations.',
                  order: 1,
                  estimatedTime: 10,
                  blocks: {
                    create: [
                      {
                        type: 'heading',
                        order: 1,
                        content: { text: 'OB/Gyn Detailing Dialogue Script' }
                      },
                      {
                        type: 'doctorConversation',
                        order: 2,
                        content: {
                          dialogues: [
                            { role: 'Doctor', text: 'Why should I switch my patients to Dydrofact 10 when vaginal micronized progesterone is working fine?' },
                            { role: 'MR', text: 'Doctor, vaginal progesterone has high rates of vaginal irritation, leakage, and requires multiple daily administrations. Dydrofact 10 offers equivalent clinical efficacy with the superior convenience of a simple oral tablet, greatly increasing patient adherence.' },
                            { role: 'Doctor', text: 'Is oral dydrogesterone safe for first-trimester luteal support?' },
                            { role: 'MR', text: 'Yes, Doctor. The LOTUS clinical trials published in leading journals have confirmed equivalent live birth rates and no increased risk of congenital abnormalities compared to vaginal progesterone.' }
                          ]
                        }
                      }
                    ]
                  }
                }
              ]
            }
          },
          {
            title: '14. Case Studies',
            description: 'Realistic clinical scenarios for threatened miscarriage.',
            order: 14,
            lessons: {
              create: [
                {
                  title: 'Case Study: Luteal insufficiency support',
                  description: 'Step-by-step patient treatment review.',
                  order: 1,
                  estimatedTime: 10,
                  blocks: {
                    create: [
                      {
                        type: 'heading',
                        order: 1,
                        content: { text: 'Case: Threatened Pregnancy Rescue' }
                      },
                      {
                        type: 'caseStudy',
                        order: 2,
                        content: {
                          title: 'Patient Scenario',
                          scenario: 'A 28-year-old female presenting at week 7 of pregnancy with mild vaginal spotting and cramping. Patient has a history of one previous early pregnancy loss. Ultrasound confirms viable intrauterine singleton gestation with subchorionic hematoma.',
                          discussionPoints: [
                            'Identify bleeding severity.',
                            'Administer 40mg Dydrofact 10 stat.',
                            'Maintain 10mg TDS until bleeding stops, then BD.'
                          ]
                        }
                      }
                    ]
                  }
                }
              ]
            }
          },
          {
            title: '15. Visual Learning',
            description: 'High-quality pathway charts and reproductive anatomy diagrams.',
            order: 15,
            lessons: {
              create: [
                {
                  title: 'Anatomy and Uterine illustrations',
                  description: 'Clinical slides.',
                  order: 1,
                  estimatedTime: 8,
                  blocks: {
                    create: [
                      {
                        type: 'heading',
                        order: 1,
                        content: { text: 'Visual Detailing Aid' }
                      },
                      {
                        type: 'svg',
                        order: 2,
                        content: {
                          title: 'Progesterone Target receptor visual',
                          svgContent: '<svg viewBox="0 0 100 100" width="100%"><circle cx="50" cy="50" r="30" fill="none" stroke="#3164ff" stroke-width="2"/><text x="50" y="52" font-size="6" fill="#3164ff" text-anchor="middle">PR Receptor Pocket</text></svg>'
                        }
                      }
                    ]
                  }
                }
              ]
            }
          },
          {
            title: '16. Quiz',
            description: 'Interactive course assessment quiz.',
            order: 16,
            lessons: {
              create: [
                {
                  title: 'Dynamic LMS Quiz Module',
                  description: 'Assess detailing readiness.',
                  order: 1,
                  estimatedTime: 8,
                  blocks: {
                    create: [
                      {
                        type: 'heading',
                        order: 1,
                        content: { text: 'Final Quiz' }
                      },
                      {
                        type: 'quiz',
                        order: 2,
                        content: {
                          questions: [
                            {
                              question: 'What is the active composition of Dydrofact 10?',
                              options: ['Dydrogesterone 10mg Tablets', 'Placebo formulation', 'Generic multivitamin', 'Amlodipine 5mg'],
                              answer: 0
                            },
                            {
                              question: 'Which therapeutic category is Dydrofact 10 classified under?',
                              options: ['Oncology', "Women's Wellness", 'Anesthetics', 'Opioids'],
                              answer: 1
                            },
                            {
                              question: 'What is the recommended storage guideline for Dydrofact 10?',
                              options: ['Store at boiling temperatures', 'Freeze in liquid nitrogen', 'Store below 30°C. Protect from moisture.', 'Keep wet outdoors'],
                              answer: 2
                            }
                          ]
                        }
                      }
                    ]
                  }
                }
              ]
            }
          },
          {
            title: '17. AI Product Coach',
            description: 'Detailer coach configuration instructions.',
            order: 17,
            lessons: {
              create: [
                {
                  title: 'AI Practice instructions',
                  description: 'Objection handling guidelines.',
                  order: 1,
                  estimatedTime: 5,
                  blocks: {
                    create: [
                      {
                        type: 'heading',
                        order: 1,
                        content: { text: 'AI Detailing Coach' }
                      },
                      {
                        type: 'paragraph',
                        order: 2,
                        content: { text: 'Use the AI Detailing Coach to practice detailing Dydrofact 10 to a simulated doctor. The AI will critique your answers based on approved medical knowledge.' }
                      }
                    ]
                  }
                }
              ]
            }
          },
          {
            title: '18. References',
            description: 'Academic reference list of clinical studies.',
            order: 18,
            lessons: {
              create: [
                {
                  title: 'Citations and Publications',
                  description: 'Academic references list.',
                  order: 1,
                  estimatedTime: 5,
                  blocks: {
                    create: [
                      {
                        type: 'heading',
                        order: 1,
                        content: { text: 'Bibliography & Reference List' }
                      },
                      {
                        type: 'references',
                        order: 2,
                        content: {
                          citations: [
                            { title: 'Dydrogesterone: pharmacological profile and mechanism of action as luteal phase support', journal: 'Reproductive BioMedicine Online', doi: '10.1016/j.rbmo.2012.01.011', url: 'https://pubmed.ncbi.nlm.nih.gov/22421213/' },
                            { title: 'Dydrogesterone—a distinct progestogen', journal: 'Maturitas', doi: '10.1016/S0378-5122(03)00151-5', url: 'https://pubmed.ncbi.nlm.nih.gov/14643033/' }
                          ]
                        }
                      }
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    }
  });

  console.log(`✅ Seeded Course: ${course.title} successfully!`);
}

main()
  .catch((e) => {
    console.error('❌ Seed LMS failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
