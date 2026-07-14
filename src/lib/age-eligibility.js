export function getAgeBand(dateValue, now = new Date()) {
  const parts = dateValue.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part))) return null;
  const [year, month, day] = parts;
  const birthDate = new Date(Date.UTC(year, month - 1, day));
  if (
    birthDate.getUTCFullYear() !== year ||
    birthDate.getUTCMonth() !== month - 1 ||
    birthDate.getUTCDate() !== day
  ) return null;

  let age = now.getUTCFullYear() - year;
  const birthdayHasPassed =
    now.getUTCMonth() > month - 1 ||
    (now.getUTCMonth() === month - 1 && now.getUTCDate() >= day);
  if (!birthdayHasPassed) age -= 1;
  if (age < 0 || age > 120) return null;
  if (age < 14) return "under-14";
  return age < 18 ? "14-17" : "18+";
}
