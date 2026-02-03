import { withTransaction } from "../config/database.js";

export async function testDbController(req, res) {
  const result = await withTransaction(
    async (client) => {
      const { rows } = await client.query(
        "SELECT COUNT(*)::int AS employee_count FROM app.employees"
      );
      return rows[0];
    },
    req.dbContext
  );

  res.json(result);
}
