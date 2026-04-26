export function buildPagination(page, limit, total) {
  return {
    currentPage: parseInt(page),
    totalPages: Math.ceil(total / parseInt(limit)),
    totalRecords: total,
    limit: parseInt(limit),
  };
}
