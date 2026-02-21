import library from "../../assets/library.json";

export async function getAssets({
  search = "",
  orientation = "any",
  page = 1,
  limit = 18,
}) {
  // simulate async (future DB call)
  await new Promise((res) => setTimeout(res, 200));

  let filtered = library;

  // Orientation filter
  filtered = filtered.filter(
    (a) =>
      a.orientation === "any" ||
      a.orientation === orientation
  );

  // Search filter
  if (search) {
    const s = search.toLowerCase();

    filtered = filtered.filter(
      (a) =>
        a.category?.toLowerCase().includes(s) ||
        a.tags?.some((t) =>
          t.toLowerCase().includes(s)
        )
    );
  }

  const start = (page - 1) * limit;
  const end = start + limit;

  return {
    data: filtered.slice(start, end),
    hasMore: end < filtered.length,
  };
}