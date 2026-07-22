import WeeklyReviewPage from "@/components/weekly-review/WeeklyReviewPage";

export default async function WeeklyReviewRoute({ searchParams }) {
  const params = await searchParams;
  const initialWeekEnd = params?.week || params?.weekEnd || null;
  return <WeeklyReviewPage initialWeekEnd={initialWeekEnd} />;
}
