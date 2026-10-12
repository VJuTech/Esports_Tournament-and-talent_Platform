const { prisma } = require('../config/database');
const { createReceiptPdf, deliverReceipt } = require('../services/receipt.service');

async function show(req, res, next) {
  try {
    const receipt = await prisma.receipt.findFirst({
      where: { id: req.params.id, registration: { userId: req.session.user.id } },
      include: { registration: { include: { tournament: { include: { game: true } }, user: true } }, deliveries: { orderBy: { createdAt: 'desc' } }, adjustments: true }
    });
    if (!receipt) return res.status(404).render('404', { title: 'Receipt not found' });
    return res.render('receipts/show', { title: receipt.receiptNumber, receipt });
  } catch (error) {
    return next(error);
  }
}

async function pdf(req, res, next) {
  try {
    const receipt = await prisma.receipt.findFirst({ where: { id: req.params.id, registration: { userId: req.session.user.id } } });
    if (!receipt) return res.status(404).render('404', { title: 'Receipt not found' });
    res.type('application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${receipt.receiptNumber}.pdf"`);
    return res.send(createReceiptPdf(receipt));
  } catch (error) {
    return next(error);
  }
}

async function retryDelivery(req, res, next) {
  try {
    const receipt = await prisma.receipt.findFirst({ where: { id: req.params.id, registration: { userId: req.session.user.id } } });
    if (!receipt) return res.status(404).render('404', { title: 'Receipt not found' });
    await deliverReceipt(receipt.id);
    return res.redirect(`/receipts/${receipt.id}`);
  } catch (error) {
    return next(error);
  }
}

module.exports = { show, pdf, retryDelivery };
