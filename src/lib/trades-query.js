/**
 * Append user_id filter to a Supabase trades query builder.
 * Belt-and-suspenders alongside RLS on the trades table.
 */
export function withUserTradesQuery(query, userId) {
  return query.eq("user_id", userId);
}
