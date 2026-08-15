export const TRIP_ROLES = ["owner", "editor", "viewer"] as const;
export type TripRole = (typeof TRIP_ROLES)[number];

export function isTripRoleAllowed(
  role: unknown,
  allowedRoles: readonly TripRole[] = TRIP_ROLES,
): role is TripRole {
  return (
    typeof role === "string" &&
    TRIP_ROLES.some((knownRole) => knownRole === role) &&
    allowedRoles.some((allowedRole) => allowedRole === role)
  );
}
