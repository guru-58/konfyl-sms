import OpenAI from 'openai';
import { findApprovedProductKnowledge } from '../repositories/enquiryRepository.js';
import prisma from '../config/database.js';

const createOpenAiClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new OpenAI({ apiKey });
};

const openai = createOpenAiClient();

const buildKnowledgePrompt = (data, question) => {
  const content = data.map((item) => {
    const info = item.detailedInfo || {};
    return [`Name: ${item.name}`, `Brand: ${item.brand}`, `Category: ${item.category?.name || 'N/A'}`, `Therapeutic Area: ${item.therapeuticArea?.name || 'N/A'}`, `Composition: ${item.composition}`, `Indications: ${info.indications || 'N/A'}`, `Dosage: ${info.dosage || 'N/A'}`, `Side Effects: ${info.sideEffects || 'N/A'}`, `Selling Points: ${info.sellingPoints || 'N/A'}`].join('\n');
  }).join('\n\n---\n\n');

  return `You are a KONFYL pharmaceutical assistant. Answer using only company-approved product data below. Do not hallucinate. If the answer cannot be found in the knowledge base, say that you will escalate the question to medical affairs.

Knowledge Base:\n${content}\n\nQuestion: ${question}\n\nAnswer:`;
};

export const answerWithRAG = async (question, userId = null) => {
  const productData = await findApprovedProductKnowledge(question);
  const sources = productData.map((item) => ({ id: item.id, name: item.name, brand: item.brand }));

  if (!openai) {
    // If OpenAI is not configured, provide a rich structured fallback using our local database seed knowledge
    if (productData.length > 0) {
      // Find the best match whose name is included in the query (case insensitive)
      let match = productData.find(p => question.toLowerCase().includes(p.name.toLowerCase()));
      if (!match) {
        // Otherwise try matching any word
        match = productData[0];
      }
      const info = match.detailedInfo || {};
      const answer = `[Offline Mode] Here is the company-approved information for **${match.name}** (${match.composition}):\n\n` +
        `• **Indications**: ${info.indications || 'General prescription support'}\n` +
        `• **Key Selling Points**: ${info.sellingPoints || 'WHO-GMP certified quality'}\n` +
        `• **Mechanism of Action**: ${info.mechanism || 'N/A'}\n` +
        `• **Recommended Dosage**: ${info.dosage || 'As directed by physician'}`;
      
      // Save query to chat history
      await prisma.aIChat.create({
        data: {
          userId,
          sessionToken: `session-${Date.now()}`,
          prompt: question,
          response: answer,
          sourcesUsed: sources
        }
      });
      return { answer, sources };
    }
    return {
      answer: 'The AI Coach is in offline fallback mode. Please ask about a specific product in our catalog (e.g. "Dydrofact 10" or "Cornfyl SR 200").',
      sources: []
    };
  }

  if (!productData.length) {
    return {
      answer: 'I could not find matching company-approved product information for this query. Please contact our medical affairs team for further support.',
      sources: []
    };
  }

  const prompt = buildKnowledgePrompt(productData, question);
  const completion = await openai.responses.create({
    model: 'gpt-4.1-mini',
    input: prompt,
    max_tokens: 450,
    temperature: 0.0
  });

  const answer = completion.output_text || completion.output?.[0]?.content?.[0]?.text || 'Sorry, I could not generate an answer at this time.';

  await prisma.aIChat.create({
    data: {
      userId,
      sessionToken: `session-${Date.now()}`,
      prompt: question,
      response: answer,
      sourcesUsed: sources
    }
  });

  return { answer, sources };
};
