function formatReceipt(receipt) {
  return {
    number: receipt.receiptNumber,
    issuedAt: receipt.issuedAt,
    registrationId: receipt.registrationId
  };
}

module.exports = { formatReceipt };
