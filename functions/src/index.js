const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

const db = admin.firestore();

const transporter = nodemailer.createTransport({
  service: 'SendGrid',
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY
  }
});

exports.distributeUsers = onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const usersSnapshot = await db.collection('users')
      .where('profileCompleted', '==', true)
      .where('assignedTo', '==', null)
      .get();

    const users = [];
    usersSnapshot.forEach(doc => {
      users.push({ id: doc.id, ...doc.data() });
    });

    if (users.length < 2) {
      return res.status(400).json({ error: 'Недостаточно участников (минимум 2)' });
    }

    const shuffled = shuffleArray(users);
    const pairs = [];
    const batch = db.batch();

    for (let i = 0; i < shuffled.length; i++) {
      const giver = shuffled[i];
      const receiver = shuffled[(i + 1) % shuffled.length];

      pairs.push({ giverId: giver.id, receiverId: receiver.id });

      const giverRef = db.collection('users').doc(giver.id);
      batch.update(giverRef, { assignedTo: receiver.id, distributionLocked: true });
    }

    await batch.commit();

    await db.collection('distributions').add({
      pairs,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      totalParticipants: users.length
    });

    for (const pair of pairs) {
      await sendNotificationEmail(pair.receiverId, 'distribution', {
        recipientName: users.find(u => u.id === pair.receiverId)?.fullName
      });
    }

    res.json({ success: true, pairs: pairs.length });
  } catch (error) {
    console.error('Ошибка распределения:', error);
    res.status(500).json({ error: error.message });
  }
});

exports.onLetterCreated = onDocumentCreated('letters/{letterId}', async (event) => {
  const letter = event.data.data();

  try {
    await sendNotificationEmail(letter.to, 'new_letter', {
      senderAnonymous: true
    });
  } catch (error) {
    console.error('Ошибка отправки уведомления:', error);
  }
});

async function sendNotificationEmail(userId, type, data) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return;

    const user = userDoc.data();
    let subject, html;

    switch (type) {
      case 'distribution':
        subject = 'Ваш тайный друг назначен!';
        html = `
          <h1>Привет, ${user.fullName}!</h1>
          <p>Ваш получатель для письма уже назначен.</p>
          <p>Войдите в личный кабинет, чтобы увидеть анкету получателя и написать письмо.</p>
          <a href="${process.env.APP_URL}/dashboard">Перейти в личный кабинет</a>
        `;
        break;
      case 'new_letter':
        subject = 'Вы получили письмо от тайного друга!';
        html = `
          <h1>Привет, ${user.fullName}!</h1>
          <p>Вам пришло новое письмо от тайного друга.</p>
          <p>Войдите в личный кабинет, чтобы прочитать его.</p>
          <a href="${process.env.APP_URL}/dashboard/letters">Прочитать письмо</a>
        `;
        break;
      default:
        return;
    }

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject,
      html
    });
  } catch (error) {
    console.error('Ошибка отправки email:', error);
  }
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
