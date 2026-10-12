const { prisma } = require('../config/database');
const env = require('../config/env');

function formatReceipt(receipt) {
  return {
    number: receipt.receiptNumber,
    issuedAt: receipt.issuedAt,
    registrationId: receipt.registrationId
  };
}

function escapePdf(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function createReceiptPdf(receipt) {
  const lines = [
    receipt.companyName || env.COMPANY_NAME,
    'OFFICIAL TOURNAMENT PAYMENT RECEIPT',
    `Status: ${receipt.status}`,
    `Receipt number: ${receipt.receiptNumber}`,
    `Tournament number: ${receipt.tournamentNumber || 'Pending'}`,
    `Player: ${receipt.playerName || 'Registered player'}`,
    `Tournament: ${receipt.tournamentName || 'Tournament registration'}`,
    `Description: ${receipt.description || 'Tournament registration fee'}`,
    `Amount paid: ${receipt.currency || ''} ${receipt.amount || ''}`,
    `Payment date: ${receipt.paymentDate ? new Date(receipt.paymentDate).toISOString() : ''}`,
    `Payment reference: ${receipt.paymentReference || ''}`,
    `Issue date: ${new Date(receipt.issuedAt).toISOString()}`,
    receipt.companyContact || env.COMPANY_CONTACT
  ];
  let y = 760;
  const content = ['BT', '/F1 12 Tf'];
  for (const line of lines) {
    content.push(`1 0 0 1 54 ${y} Tm (${escapePdf(line)}) Tj`);
    y -= 34;
  }
  content.push('ET');
  const stream = content.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets[index + 1] = Buffer.byteLength(pdf);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}

async function deliverReceipt(receiptId) {
  const receipt = await prisma.receipt.findUnique({ where: { id: receiptId }, include: { registration: { include: { user: true } } } });
  if (!receipt) throw new Error('Receipt not found');
  const attempt = await prisma.receiptDeliveryAttempt.create({
    data: { receiptId, channel: 'email', status: 'PENDING', recipient: receipt.registration.user.email }
  });
  if (!env.EMAIL_PROVIDER_URL || !env.EMAIL_PROVIDER_SECRET) {
    await prisma.receiptDeliveryAttempt.update({ where: { id: attempt.id }, data: { status: 'FAILED', error: 'Email provider is not configured' } });
    return attempt;
  }
  try {
    const response = await fetch(`${env.EMAIL_PROVIDER_URL.replace(/\/$/, '')}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.EMAIL_PROVIDER_SECRET}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: receipt.registration.user.email,
        subject: `${receipt.companyName || env.COMPANY_NAME} receipt ${receipt.receiptNumber}`,
        text: `Your payment receipt is ${receipt.receiptNumber}.`,
        attachment: { filename: `${receipt.receiptNumber}.pdf`, contentType: 'application/pdf', content: createReceiptPdf(receipt).toString('base64') }
      })
    });
    if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
    return prisma.receiptDeliveryAttempt.update({ where: { id: attempt.id }, data: { status: 'SENT', sentAt: new Date() } });
  } catch (error) {
    return prisma.receiptDeliveryAttempt.update({ where: { id: attempt.id }, data: { status: 'FAILED', error: error.message } });
  }
}

module.exports = { formatReceipt, createReceiptPdf, deliverReceipt };
