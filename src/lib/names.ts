// Several people in the office share a first name. Anyone can set the name
// the rest of the office sees; the registered name stays underneath so an
// admin can still tell who the account belongs to.
export function shownName(person: {
  name: string;
  display_name?: string | null;
}): string {
  const chosen = person.display_name?.trim();
  return chosen && chosen.length > 0 ? chosen : person.name;
}
