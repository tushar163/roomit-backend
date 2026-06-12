const generateSlots = (startTime, endTime) => {
  const slots = [];

  let [startHour, startMinute] = startTime
    .split(":")
    .map(Number);

  let [endHour, endMinute] = endTime
    .split(":")
    .map(Number);

  while (
    startHour < endHour ||
    (startHour === endHour &&
      startMinute < endMinute)
  ) {
    const slotStart = `${String(startHour).padStart(
      2,
      "0"
    )}:${String(startMinute).padStart(2, "0")}`;

    startMinute += 30;

    if (startMinute === 60) {
      startHour += 1;
      startMinute = 0;
    }

    const slotEnd = `${String(startHour).padStart(
      2,
      "0"
    )}:${String(startMinute).padStart(2, "0")}`;

    slots.push({
      slotStart,
      slotEnd,
    });
  }

  return slots;
};

module.exports = generateSlots;