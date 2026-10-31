import { db } from "./db";
import type { Athlete } from "./types";
import { isCalendarDate } from "./validation";
const normalized = (value: string) => value.trim().toLocaleLowerCase();
export function sameAthleteIdentity(a: Athlete, b: Athlete) {
  return (
    normalized(a.firstName) === normalized(b.firstName) &&
    normalized(a.lastName) === normalized(b.lastName) &&
    a.dateOfBirth === b.dateOfBirth
  );
}
export async function saveAthlete(athlete: Athlete, database = db) {
  if (
    !athlete.firstName.trim() ||
    !athlete.lastName.trim() ||
    !athlete.sport.trim() ||
    !athlete.group.trim() ||
    (athlete.dateOfBirth && !isCalendarDate(athlete.dateOfBirth))
  )
    throw new Error("Review the athlete name, sport, group and birth date.");
  await database.transaction("rw", database.athletes, async () => {
    const current = await database.athletes.toArray();
    if (
      current.some(
        (other) =>
          other.id !== athlete.id && sameAthleteIdentity(other, athlete),
      )
    )
      throw new Error(
        "An athlete with this name and birth date already exists. Review the existing profile.",
      );
    await database.athletes.put(athlete);
  });
}
