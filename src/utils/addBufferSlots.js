const addBufferSlots = (
  slots,
  bufferTime
) => {
  if (!bufferTime || bufferTime <= 0) {
    return slots;
  }

  const updatedSlots = [...slots];

  const lastSlot = slots[slots.length - 1];

  let [hour, minute] = lastSlot.slotEnd
    .split(":")
    .map(Number);

  const totalBufferSlots = bufferTime / 30;

  for (let i = 0; i < totalBufferSlots; i++) {
    const slotStart = `${String(hour).padStart(
      2,
      "0"
    )}:${String(minute).padStart(2, "0")}`;

    minute += 30;

    if (minute === 60) {
      hour += 1;
      minute = 0;
    }

    const slotEnd = `${String(hour).padStart(
      2,
      "0"
    )}:${String(minute).padStart(2, "0")}`;

    updatedSlots.push({
      slotStart,
      slotEnd,
      isBuffer: true,
    });
  }

  return updatedSlots;
};

module.exports = addBufferSlots;