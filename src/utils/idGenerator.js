let currentDay = '';
let currentCounter = 0;

/**
 * Generates a unique sequential Enquiry ID in-memory (e.g. KNF-20260702-00001)
 * Resets the counter automatically when the day changes.
 */
export const generateEnquiryId = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // Reset counter if the day has changed
  if (currentDay !== dateStr) {
    currentDay = dateStr;
    currentCounter = 0;
  }

  currentCounter += 1;
  const paddedSeq = String(currentCounter).padStart(5, '0');

  return `KNF-${dateStr}-${paddedSeq}`;
};
