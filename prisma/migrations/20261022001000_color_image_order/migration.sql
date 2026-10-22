-- Repair only galleries with ambiguous or negative positions; retain every image.
WITH affected AS (
  SELECT "colorId" FROM "ColorImage"
  GROUP BY "colorId"
  HAVING COUNT(*) <> COUNT(DISTINCT "position") OR MIN("position") < 0
), ranked AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "colorId" ORDER BY "position", "id"
  ) - 1 AS "newPosition"
  FROM "ColorImage"
  WHERE "colorId" IN (SELECT "colorId" FROM affected)
)
UPDATE "ColorImage"
SET "position" = (SELECT "newPosition" FROM ranked WHERE ranked."id" = "ColorImage"."id")
WHERE "id" IN (SELECT "id" FROM ranked);
