const { Client } = require('@line/bot-sdk');
const { Groq } = require('groq-sdk');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

// Initialize LINE client
const lineClient = new Client({
  channelAccessToken: process.env.LINE_ACCESS_TOKEN
});

// Initialize Groq AI
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Health check route
app.get('/', (req, res) => {
  res.json({ status: 'LINE AI Bot is running! 🤖' });
});

// Webhook route
app.post('/webhook', express.json(), async (req, res) => {
  try {
    const events = req.body.events;
    
    if (!events || events.length === 0) {
      return res.status(200).send('OK');
    }
    
    await Promise.all(events.map(handleEvent));
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error');
  }
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return;
  
  const userText = event.message.text.trim();
  if (!userText) return;
  
  try {
    // Thai AI prompt
    const systemPrompt = `คุณเป็นผู้ช่วยตอบแชทลูกค้ามืออาชีพ ใช้ภาษาไทยสุภาพ มีหาง "ครับ/ค่ะ" ตามความเหมาะสม ตอบสั้น กระชับ ไม่เกิน 3 บรรทัด`;
    
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText }
      ],
      model: "llama-3.1-8b-instant",
      max_tokens: 150,
      temperature: 0.3
    });
    
    const replyText = completion.choices[0]?.message?.content || "ขออภัยครับ ระบบขัดข้องชั่วคราว";
    
    await lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: replyText
    });
  } catch (error) {
    console.error('Error:', error);
    await lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: 'ขออภัยครับ เกิดข้อขัดข้องชั่วคราว'
    });
  }
}

// Export for Vercel
module.exports = app;

// Start server locally
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Bot running on port ${port}`);
  });
}
