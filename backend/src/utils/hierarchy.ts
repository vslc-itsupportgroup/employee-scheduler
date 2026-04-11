import pool from '../config/database';

type Queryable = {
  query: (text: string, params?: any[]) => Promise<any>;
};

// Returns all direct and indirect reports for a manager.
export const getManagedUserIds = async (managerId: string, db: Queryable = pool): Promise<string[]> => {
  const result = await db.query(
    `WITH RECURSIVE managed_users AS (
       SELECT id, manager_id
       FROM users
       WHERE manager_id = $1

       UNION

       SELECT u.id, u.manager_id
       FROM users u
       INNER JOIN managed_users mu ON u.manager_id = mu.id
     )
     SELECT id FROM managed_users`,
    [managerId]
  );

  return (result.rows as Array<{ id: string }>).map((row) => row.id);
};

export const isUserManagedBy = async (managerId: string, userId: string, db: Queryable = pool): Promise<boolean> => {
  const result = await db.query(
    `WITH RECURSIVE managed_users AS (
       SELECT id, manager_id
       FROM users
       WHERE manager_id = $1

       UNION

       SELECT u.id, u.manager_id
       FROM users u
       INNER JOIN managed_users mu ON u.manager_id = mu.id
     )
     SELECT 1
     FROM managed_users
     WHERE id = $2
     LIMIT 1`,
    [managerId, userId]
  );

  return result.rows.length > 0;
};